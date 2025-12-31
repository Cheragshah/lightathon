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

    console.log('Admin user accessing user list:', user.id);

    // Get all users with their roles and persona counts
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    // Get roles for all users
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      throw rolesError;
    }

    // Get persona run counts for all users
    const { data: personaRuns, error: personaRunsError } = await supabase
      .from('persona_runs')
      .select('user_id, id, title, status, created_at');

    if (personaRunsError) {
      throw personaRunsError;
    }

    // Get AI usage for all users
    const { data: aiUsageLogs, error: aiUsageError } = await supabase
      .from('ai_usage_logs')
      .select('user_id, estimated_cost, total_tokens');

    if (aiUsageError) {
      throw aiUsageError;
    }

    // Get blocked users
    const { data: blockedUsers, error: blockedError } = await supabase
      .from('user_blocks')
      .select('user_id');

    if (blockedError) {
      throw blockedError;
    }

    // Get users with unlimited runs permission
    const { data: unlimitedRunsUsers, error: unlimitedError } = await supabase
      .from('user_unlimited_runs')
      .select('user_id');

    if (unlimitedError) {
      throw unlimitedError;
    }

    const blockedUserIds = new Set(blockedUsers?.map(b => b.user_id) || []);
    const unlimitedRunsUserIds = new Set(unlimitedRunsUsers?.map(u => u.user_id) || []);

    // Combine data
    const usersWithData = users.users.map(u => {
      const roles = userRoles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
      const userPersonaRuns = personaRuns?.filter(p => p.user_id === u.id) || [];
      const userAiUsage = aiUsageLogs?.filter(log => log.user_id === u.id) || [];
      
      const aiUsage = userAiUsage.length > 0 ? {
        total_cost: userAiUsage.reduce((sum, log) => sum + (log.estimated_cost || 0), 0),
        total_tokens: userAiUsage.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
        request_count: userAiUsage.length,
      } : undefined;

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: roles,
        persona_run_count: userPersonaRuns.length,
        persona_runs: userPersonaRuns,
        ai_usage: aiUsage,
        is_blocked: blockedUserIds.has(u.id),
        has_unlimited_runs: unlimitedRunsUserIds.has(u.id),
      };
    });

    return new Response(JSON.stringify({ users: usersWithData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-get-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});