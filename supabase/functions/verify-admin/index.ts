import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ isAdmin: false, error: 'No authorization header' }), {
        status: 200, // Return 200 with isAdmin: false instead of 401
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create anon client to verify the user's JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from JWT using the auth client
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError) {
      console.error('JWT verification error:', userError.message);
      return new Response(JSON.stringify({ isAdmin: false, error: 'Invalid session' }), {
        status: 200, // Return 200 with isAdmin: false to avoid breaking the UI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.log('No user found from JWT');
      return new Response(JSON.stringify({ isAdmin: false, error: 'No user found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User verified:', user.id);

    // Check if user has admin or moderator role using service role client
    const { data: hasAdminRole, error: adminRoleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    const { data: hasModeratorRole, error: modRoleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'moderator' });

    if (adminRoleError || modRoleError) {
      console.error('Error checking roles:', adminRoleError || modRoleError);
      return new Response(JSON.stringify({ isAdmin: false, isModerator: false, error: 'Error checking role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Role check - isAdmin:', hasAdminRole, 'isModerator:', hasModeratorRole);

    // Must be at least moderator to access dashboard
    if (!hasAdminRole && !hasModeratorRole) {
      return new Response(JSON.stringify({ isAdmin: false, isModerator: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If admin, fetch admin-only data using service role client
    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      throw authUsersError;
    }

    // Get roles for all users
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      throw rolesError;
    }

    // Get blocked users
    const { data: blockedUsers } = await supabaseAdmin
      .from('user_blocks')
      .select('user_id');

    const blockedUserIds = new Set(blockedUsers?.map(b => b.user_id) || []);

    // Get user profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*');

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get unlimited runs permissions
    const { data: unlimitedRuns } = await supabaseAdmin
      .from('user_unlimited_runs')
      .select('user_id');

    const unlimitedRunsSet = new Set(unlimitedRuns?.map(u => u.user_id) || []);

    const [runsResponse, activeRunsResponse, usageStatsResponse, recentUsageResponse, aiUsageLogsResponse] = await Promise.all([
      supabaseAdmin.from('persona_runs').select('id, title, status, created_at, user_id'),
      supabaseAdmin.from('persona_runs').select('id').eq('status', 'generating'),
      supabaseAdmin.from('ai_usage_logs')
        .select('total_tokens, estimated_cost')
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('ai_usage_logs')
        .select('function_name, total_tokens, estimated_cost, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin.from('ai_usage_logs')
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
      const profile = profilesMap.get(u.id);
      const isBlocked = blockedUserIds.has(u.id);
      const hasUnlimitedRuns = unlimitedRunsSet.has(u.id);
      
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
        is_blocked: isBlocked,
        has_unlimited_runs: hasUnlimitedRuns,
        profile: profile || null,
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
