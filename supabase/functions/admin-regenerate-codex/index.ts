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

    const { codexId } = await req.json();

    if (!codexId) {
      throw new Error('Missing required field: codexId');
    }

    console.log(`Admin ${user.id} regenerating codex ${codexId}`);

    // Get the existing codex
    const { data: existingCodex, error: fetchError } = await supabase
      .from('codexes')
      .select('*, persona_runs(id, user_id)')
      .eq('id', codexId)
      .single();

    if (fetchError || !existingCodex) {
      throw new Error('Codex not found');
    }

    const personaRunId = existingCodex.persona_run_id;

    // Reset all sections for this codex to pending
    const { error: resetError } = await supabase
      .from('codex_sections')
      .update({
        status: 'pending',
        content: null,
        content_summary: null,
        error_message: null,
        retries: 0
      })
      .eq('codex_id', codexId);

    if (resetError) {
      console.error('Error resetting sections:', resetError);
      throw new Error('Failed to reset codex sections');
    }

    console.log(`Reset all sections for codex ${codexId} to pending`);

    // Update codex status to generating
    const { error: updateCodexError } = await supabase
      .from('codexes')
      .update({
        status: 'generating',
        completed_sections: 0
      })
      .eq('id', codexId);

    if (updateCodexError) {
      console.error('Error updating codex status:', updateCodexError);
      throw new Error('Failed to update codex status');
    }

    // Update persona run status to generating if not already
    const { error: updateRunError } = await supabase
      .from('persona_runs')
      .update({
        status: 'generating',
        is_cancelled: false
      })
      .eq('id', personaRunId);

    if (updateRunError) {
      console.error('Error updating persona run status:', updateRunError);
    }

    // Trigger retry for pending sections
    const { error: retryError } = await supabase.functions.invoke('retry-pending-sections', {
      body: {
        personaRunId: personaRunId
      }
    });

    if (retryError) {
      console.error('Error triggering retry:', retryError);
    }

    // Log the activity
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'regenerate_codex',
      target_persona_id: personaRunId,
      details: { 
        codex_id: codexId,
        codex_name: existingCodex.codex_name,
        user_id: existingCodex.persona_runs?.user_id 
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Codex "${existingCodex.codex_name}" is being regenerated`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-regenerate-codex:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
