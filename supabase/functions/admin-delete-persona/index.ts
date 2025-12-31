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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { personaRunId } = await req.json();

    if (!personaRunId) {
      throw new Error('Missing required field: personaRunId');
    }

    console.log(`Admin ${user.id} deleting persona run ${personaRunId}`);

    // Delete all related data in order
    // 1. Delete codex sections
    const { data: codexes } = await supabase
      .from('codexes')
      .select('id')
      .eq('persona_run_id', personaRunId);

    if (codexes && codexes.length > 0) {
      const codexIds = codexes.map(c => c.id);
      await supabase
        .from('codex_sections')
        .delete()
        .in('codex_id', codexIds);
    }

    // 2. Delete codexes
    await supabase
      .from('codexes')
      .delete()
      .eq('persona_run_id', personaRunId);

    // 3. Delete shared links
    await supabase
      .from('shared_links')
      .delete()
      .eq('persona_run_id', personaRunId);

    // 4. Delete PDF exports
    await supabase
      .from('pdf_exports')
      .delete()
      .eq('persona_run_id', personaRunId);

    // 5. Delete analytics events
    await supabase
      .from('analytics_events')
      .delete()
      .eq('persona_run_id', personaRunId);

    // 6. Delete AI usage logs
    await supabase
      .from('ai_usage_logs')
      .delete()
      .eq('persona_run_id', personaRunId);

    // 7. Finally delete the persona run itself
    const { error } = await supabase
      .from('persona_runs')
      .delete()
      .eq('id', personaRunId);

    if (error) throw error;

    // Log the activity
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'delete_persona_run',
      target_persona_id: personaRunId,
      details: { deleted_all_related_data: true }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-delete-persona:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});