import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const inputSchema = z.object({
      personaRunId: z.string().uuid(),
      password: z.string().min(1).max(100).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
    });

    const { personaRunId, password, expiresInDays } = inputSchema.parse(await req.json());

    if (!personaRunId) {
      throw new Error('personaRunId is required');
    }

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

    // Verify ownership
    const { data: personaRun, error: runError } = await supabase
      .from('persona_runs')
      .select('id, user_id')
      .eq('id', personaRunId)
      .single();

    if (runError) {
      console.error('Error fetching persona run:', runError);
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!personaRun) {
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (personaRun.user_id !== user.id) {
      console.error('Ownership check failed:', { personaRunUserId: personaRun.user_id, currentUserId: user.id });
      return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this persona run' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique share token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const shareToken = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash password if provided using PBKDF2
    let passwordHash = null;
    if (password) {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const passwordData = encoder.encode(password);
      
      const key = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        key,
        256
      );
      
      const hashArray = Array.from(new Uint8Array(derivedBits));
      const saltArray = Array.from(salt);
      
      // Store as salt:hash format
      passwordHash = saltArray.map(b => b.toString(16).padStart(2, '0')).join('') + 
                     ':' + 
                     hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresInDays);
      expiresAt = expDate.toISOString();
    }

    // Create share link
    const { data: shareLink, error: createError } = await supabase
      .from('shared_links')
      .insert({
        persona_run_id: personaRunId,
        share_token: shareToken,
        password_hash: passwordHash,
        expires_at: expiresAt,
        created_by: user.id
      })
      .select()
      .single();

    if (createError) throw createError;

    // Log analytics
    await supabase.from('analytics_events').insert({
      event_type: 'share_link_created',
      user_id: user.id,
      persona_run_id: personaRunId,
      metadata: { has_password: !!password, expires_in_days: expiresInDays }
    });

    return new Response(
      JSON.stringify({ 
        shareToken,
        shareUrl: `${supabaseUrl.replace('supabase.co', 'supabase.co')}/share/${shareToken}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating share link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
