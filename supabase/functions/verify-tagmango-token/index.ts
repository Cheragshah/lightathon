import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TagMangoUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicUrl?: string;
  host?: string;
}

interface TagMangoResponse {
  result: TagMangoUser;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      console.error('No refresh token provided');
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying TagMango token...');

    // Call TagMango API to verify token
    const tagMangoResponse = await fetch(
      `https://api-prod-new.tagmango.com/api/v1/external/auth/verify-token?token=${encodeURIComponent(refreshToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tagMangoResponse.ok) {
      const errorText = await tagMangoResponse.text();
      console.error('TagMango API error:', tagMangoResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tagMangoData: TagMangoResponse = await tagMangoResponse.json();
    const tagMangoUser = tagMangoData.result;

    console.log('TagMango user verified:', tagMangoUser._id, tagMangoUser.email);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists by tagmango_id or email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .or(`tagmango_id.eq.${tagMangoUser._id},email.eq.${tagMangoUser.email}`)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking existing profile:', profileError);
    }

    let userId: string;

    if (existingProfile) {
      // User exists - update their profile with latest TagMango data
      userId = existingProfile.id;
      console.log('Existing user found:', userId);

      // Parse name into first and last name
      const nameParts = tagMangoUser.name?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tagmango_id: tagMangoUser._id,
          tagmango_host: tagMangoUser.host,
          first_name: firstName,
          last_name: lastName,
          full_name: tagMangoUser.name,
          phone_whatsapp: tagMangoUser.phone,
          photograph_url: tagMangoUser.profilePicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    } else {
      // New user - create auth user and profile
      console.log('Creating new user for:', tagMangoUser.email);

      // Generate a random password (user won't use it - they use TagMango SSO)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tagMangoUser.email,
        password: randomPassword,
        email_confirm: true, // Auto-confirm since they're verified via TagMango
        user_metadata: {
          tagmango_id: tagMangoUser._id,
          full_name: tagMangoUser.name,
        },
      });

      if (authError) {
        // Check if user already exists with this email
        if (authError.message?.includes('already been registered')) {
          console.log('User already exists, fetching by email...');
          
          // Get the existing auth user
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          
          if (listError) {
            console.error('Error listing users:', listError);
            throw listError;
          }
          
          const existingAuthUser = users?.find(u => u.email === tagMangoUser.email);
          
          if (!existingAuthUser) {
            throw new Error('Could not find existing user');
          }
          
          userId = existingAuthUser.id;
          
          // Update profile with TagMango data
          const nameParts = tagMangoUser.name?.split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              tagmango_id: tagMangoUser._id,
              tagmango_host: tagMangoUser.host,
              first_name: firstName,
              last_name: lastName,
              full_name: tagMangoUser.name,
              phone_whatsapp: tagMangoUser.phone,
              photograph_url: tagMangoUser.profilePicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating existing profile:', updateError);
          }
        } else {
          console.error('Error creating auth user:', authError);
          throw authError;
        }
      } else {
        userId = authData.user.id;

        // Parse name
        const nameParts = tagMangoUser.name?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create profile
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: tagMangoUser.email,
            tagmango_id: tagMangoUser._id,
            tagmango_host: tagMangoUser.host,
            first_name: firstName,
            last_name: lastName,
            full_name: tagMangoUser.name,
            phone_whatsapp: tagMangoUser.phone,
            photograph_url: tagMangoUser.profilePicUrl,
          });

        if (profileInsertError) {
          console.error('Error creating profile:', profileInsertError);
        }

        // Assign default 'user' role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'user',
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
        }

        console.log('New user created with user role:', userId);
      }
    }

    // Generate a magic link or session for the user
    // We'll use generateLink to create a magic link that auto-signs in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: tagMangoUser.email,
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      throw linkError;
    }

    // Extract the token from the action link
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    console.log('Generated sign-in link for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: tagMangoUser.email,
        token,
        type,
        actionLink,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-tagmango-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
