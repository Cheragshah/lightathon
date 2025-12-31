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

    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      throw new Error('Users array is required');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>
    };

    for (const userData of users) {
      try {
        const { name, email, role } = userData;

        if (!email || !name) {
          results.failed++;
          results.errors.push({ email: email || 'unknown', error: 'Missing email or name' });
          continue;
        }

        // Create user with default password
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email,
          password: 'codex@123',
          email_confirm: true,
          user_metadata: { full_name: name }
        });

        if (createError) {
          results.failed++;
          results.errors.push({ email, error: createError.message });
          continue;
        }

        // Insert profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: newUser.user.id,
            full_name: name
          });

        if (profileError) {
          // Clean up user if profile creation fails
          await supabaseClient.auth.admin.deleteUser(newUser.user.id);
          results.failed++;
          results.errors.push({ email, error: profileError.message });
          continue;
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
            console.error('Error assigning role for', email, ':', roleAssignError);
          }
        }

        results.success++;

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ email: userData.email || 'unknown', error: errorMessage });
      }
    }

    // Log admin activity
    await supabaseClient
      .from('admin_activity_log')
      .insert({
        admin_id: user.id,
        action: 'bulk_import_users',
        details: { 
          total: users.length,
          success: results.success,
          failed: results.failed
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in admin-bulk-import-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});