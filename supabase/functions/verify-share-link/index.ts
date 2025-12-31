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
      shareToken: z.string().min(1).max(200),
      password: z.string().min(1).max(100).optional(),
    });

    const { shareToken, password } = inputSchema.parse(await req.json());

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Rate limiting: Check recent attempts from this IP for this token
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('share_link_attempts')
      .select('*')
      .eq('share_token', shareToken)
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Error checking rate limit:', attemptsError);
    }

    // Count failed attempts in the last hour
    const failedAttempts = recentAttempts?.filter(a => !a.success).length || 0;
    
    // Rate limit: Max 10 failed attempts per hour
    if (failedAttempts >= 10) {
      // Log the blocked attempt
      await supabase.from('share_link_attempts').insert({
        share_token: shareToken,
        ip_address: ipAddress,
        attempt_type: 'verification',
        success: false
      });

      return new Response(JSON.stringify({ 
        error: 'Too many attempts. Please try again later.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get share link
    const { data: shareLink, error: linkError } = await supabase
      .from('shared_links')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();

    if (linkError || !shareLink) {
      // Log failed verification attempt
      await supabase.from('share_link_attempts').insert({
        share_token: shareToken,
        ip_address: ipAddress,
        attempt_type: 'verification',
        success: false
      });

      return new Response(JSON.stringify({ error: 'Invalid or expired share link' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      // Log failed attempt
      await supabase.from('share_link_attempts').insert({
        share_token: shareToken,
        ip_address: ipAddress,
        attempt_type: 'verification',
        success: false
      });

      return new Response(JSON.stringify({ error: 'Share link has expired' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password if required
    if (shareLink.password_hash) {
      if (!password) {
        return new Response(JSON.stringify({ 
          requiresPassword: true,
          error: 'Password required' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract salt and hash from stored format (salt:hash)
      const [saltHex, storedHashHex] = shareLink.password_hash.split(':');
      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
      
      const encoder = new TextEncoder();
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
      
      const passwordHash = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (passwordHash !== storedHashHex) {
        // Log failed password attempt
        await supabase.from('share_link_attempts').insert({
          share_token: shareToken,
          ip_address: ipAddress,
          attempt_type: 'password',
          success: false
        });

        return new Response(JSON.stringify({ error: 'Incorrect password' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Log successful verification
    await supabase.from('share_link_attempts').insert({
      share_token: shareToken,
      ip_address: ipAddress,
      attempt_type: password ? 'password' : 'verification',
      success: true
    });

    // Increment view count
    await supabase
      .from('shared_links')
      .update({ view_count: shareLink.view_count + 1 })
      .eq('id', shareLink.id);

    // Get persona run with all codexes and sections
    const { data: personaRun, error: runError } = await supabase
      .from('persona_runs')
      .select(`
        *,
        codexes:codexes(
          *,
          sections:codex_sections(*)
        )
      `)
      .eq('id', shareLink.persona_run_id)
      .single();

    if (runError || !personaRun) {
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log analytics
    await supabase.from('analytics_events').insert({
      event_type: 'share_link_viewed',
      persona_run_id: shareLink.persona_run_id,
      metadata: { share_link_id: shareLink.id }
    });

    return new Response(
      JSON.stringify({ personaRun }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying share link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
