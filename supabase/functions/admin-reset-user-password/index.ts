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
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const jwt = authHeader.replace('Bearer ', '');
    
    // Check if the token is just the anon key (not a user JWT)
    if (jwt.includes('"role":"anon"') || !jwt.includes('"sub"')) {
      console.error('Received anon key instead of user JWT');
      return new Response(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      throw new Error('targetUserId is required');
    }

    // Get target user's email
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId);
    
    if (getUserError || !targetUser) {
      throw new Error('Target user not found');
    }

    // Generate password reset link and send email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetUser.user.email!,
      {
        redirectTo: `${supabaseUrl}/auth/v1/verify`,
      }
    );

    if (resetError) {
      throw new Error(`Failed to send password reset email: ${resetError.message}`);
    }

    // Log the admin action
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'reset_user_password',
      target_user_id: targetUserId,
      details: {
        user_email: targetUser.user.email,
        timestamp: new Date().toISOString(),
      }
    });

    console.log(`Password reset email sent for user: ${targetUser.user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Password reset email sent to ${targetUser.user.email}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in admin-reset-user-password:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});