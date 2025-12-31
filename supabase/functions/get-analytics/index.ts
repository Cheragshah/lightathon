import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all persona runs with completion times
    const { data: personaRuns } = await supabase
      .from('persona_runs')
      .select('id, status, created_at, completed_at, started_at');

    // Calculate average completion time
    const completedRuns = personaRuns?.filter(r => r.status === 'completed' && r.started_at && r.completed_at) || [];
    const avgCompletionTime = completedRuns.length > 0
      ? completedRuns.reduce((sum, run) => {
          const start = new Date(run.started_at!).getTime();
          const end = new Date(run.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedRuns.length
      : 0;

    // Get codex statistics
    const { data: codexes } = await supabase
      .from('codexes')
      .select('codex_name, status, created_at');

    // Count by codex name and status
    const codexStats = codexes?.reduce((acc: any, codex) => {
      if (!acc[codex.codex_name]) {
        acc[codex.codex_name] = { total: 0, completed: 0, generating: 0, failed: 0 };
      }
      acc[codex.codex_name].total++;
      if (codex.status === 'ready') acc[codex.codex_name].completed++;
      if (codex.status === 'generating') acc[codex.codex_name].generating++;
      if (codex.status === 'failed') acc[codex.codex_name].failed++;
      return acc;
    }, {});

    // Get recent analytics events
    const { data: recentEvents } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Count events by type
    const eventCounts = recentEvents?.reduce((acc: any, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});

    // Get regeneration statistics
    const { data: sections } = await supabase
      .from('codex_sections')
      .select('regeneration_count, codex_id');

    const totalRegenerations = sections?.reduce((sum, s) => sum + (s.regeneration_count || 0), 0) || 0;
    const sectionsWithRegenerations = sections?.filter(s => s.regeneration_count > 0).length || 0;

    // Get share link statistics
    const { data: shareLinks } = await supabase
      .from('shared_links')
      .select('view_count, created_at, is_active, password_hash');

    const shareStats = {
      total: shareLinks?.length || 0,
      active: shareLinks?.filter(s => s.is_active).length || 0,
      totalViews: shareLinks?.reduce((sum, s) => sum + s.view_count, 0) || 0,
      withPassword: shareLinks?.filter(s => s.password_hash).length || 0
    };

    // Get user growth over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const userGrowth = userRoles?.reduce((acc: any, ur) => {
      const date = new Date(ur.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return new Response(
      JSON.stringify({
        generationMetrics: {
          totalRuns: personaRuns?.length || 0,
          completedRuns: completedRuns.length,
          averageCompletionTimeMs: Math.round(avgCompletionTime),
          averageCompletionTimeMinutes: Math.round(avgCompletionTime / 60000)
        },
        codexStats,
        eventCounts,
        regenerationStats: {
          totalRegenerations,
          sectionsWithRegenerations,
          averageRegenerationsPerSection: sectionsWithRegenerations > 0 
            ? (totalRegenerations / sectionsWithRegenerations).toFixed(2)
            : 0
        },
        shareStats,
        userGrowth
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
