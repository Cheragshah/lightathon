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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ isAdmin: false, error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ isAdmin: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin or moderator role
    const { data: hasAdminRole, error: adminRoleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    const { data: hasModeratorRole, error: modRoleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'moderator' });

    if (adminRoleError || modRoleError) {
      console.error('Error checking roles:', adminRoleError || modRoleError);
      return new Response(JSON.stringify({ isAdmin: false, isModerator: false, error: 'Error checking role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Must be at least moderator to access dashboard
    if (!hasAdminRole && !hasModeratorRole) {
      return new Response(JSON.stringify({ isAdmin: false, isModerator: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If admin, fetch admin-only data
    // Get all users with their roles and persona counts
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      throw authUsersError;
    }

    // Get roles for all users
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      throw rolesError;
    }

    // Get blocked users
    const { data: blockedUsers } = await supabase
      .from('user_blocks')
      .select('user_id');

    const blockedUserIds = new Set(blockedUsers?.map(b => b.user_id) || []);

    const [runsResponse, activeRunsResponse, usageStatsResponse, recentUsageResponse, aiUsageLogsResponse] = await Promise.all([
      supabase.from('persona_runs').select('id, title, status, created_at, user_id'),
      supabase.from('persona_runs').select('id').eq('status', 'generating'),
      supabase.from('ai_usage_logs')
        .select('total_tokens, estimated_cost')
        .order('created_at', { ascending: false }),
      supabase.from('ai_usage_logs')
        .select('function_name, total_tokens, estimated_cost, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('ai_usage_logs')
        .select('user_id, estimated_cost, total_tokens')
    ]);

    const runsData = runsResponse.data || [];
    const activeData = activeRunsResponse.data || [];
    const usageData = usageStatsResponse.data || [];
    const recentUsage = recentUsageResponse.data || [];
    const aiUsageLogs = aiUsageLogsResponse.data || [];

    // Combine user data
    const usersWithData = authUsers.users.map(u => {
      const roles = userRoles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
      const userPersonaRuns = runsData?.filter(p => p.user_id === u.id) || [];
      const userAiUsage = aiUsageLogs?.filter(log => log.user_id === u.id) || [];
      
      const aiUsage = userAiUsage.length > 0 ? {
        total_cost: userAiUsage.reduce((sum, log) => sum + (parseFloat(log.estimated_cost) || 0), 0),
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
      };
    });

    console.log('Admin data loaded:', {
      usersCount: usersWithData.length,
      runsCount: runsData.length,
      activeCount: activeData.length
    });

    // Calculate AI usage stats
    const totalCost = usageData.reduce((sum: number, log: any) => sum + parseFloat(log.estimated_cost || 0), 0);
    const totalTokens = usageData.reduce((sum: number, log: any) => sum + (log.total_tokens || 0), 0);
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const requestsToday = usageData.filter((log: any) => log.created_at > oneDayAgo).length;

    // Map persona runs with user emails
    const runsWithEmails = runsData.map((run: any) => {
      const user = usersWithData.find((u: any) => u.id === run.user_id);
      return {
        ...run,
        user_email: user?.email
      };
    });

    return new Response(
      JSON.stringify({
        isAdmin: hasAdminRole || false,
        isModerator: hasModeratorRole || false,
        stats: {
          totalUsers: usersWithData.length,
          totalPersonaRuns: runsData.length,
          activeGenerations: activeData.length,
          totalAICost: totalCost,
        },
        aiUsage: {
          totalCost,
          totalTokens,
          requestsToday,
          recentUsage,
        },
        users: usersWithData,
        personaRuns: runsWithEmails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-admin:', error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
