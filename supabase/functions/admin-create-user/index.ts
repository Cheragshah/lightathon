import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { email, full_name, role, send_reset_email } = await req.json();

    if (!email || !full_name) {
      throw new Error('Email and full name are required');
    }

    // Create user with default password
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: 'codex@123',
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    // Insert profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Clean up user if profile creation fails
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw profileError;
    }

    // Assign role if provided
    if (role && ['admin', 'moderator', 'user'].includes(role)) {
      const { error: roleAssignError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role
        });

      if (roleAssignError) {
        console.error('Error assigning role:', roleAssignError);
      }
    }

    // Send password reset email if requested
    if (send_reset_email) {
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (resetError) {
        console.error('Error sending reset email:', resetError);
      }
    }

    // Log admin activity
    await supabaseClient
      .from('admin_activity_log')
      .insert({
        admin_id: user.id,
        action: 'create_user',
        target_user_id: newUser.user.id,
        details: { email, full_name, role }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in admin-create-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});