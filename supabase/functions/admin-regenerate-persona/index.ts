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

    const { personaRunId } = await req.json();

    if (!personaRunId) {
      throw new Error('Missing required field: personaRunId');
    }

    console.log(`Admin ${user.id} regenerating stuck sections for persona run ${personaRunId}`);

    // Get the existing persona run
    const { data: existingRun, error: fetchError } = await supabase
      .from('persona_runs')
      .select('*')
      .eq('id', personaRunId)
      .single();

    if (fetchError || !existingRun) {
      throw new Error('Persona run not found');
    }

    // Get all codexes with their sections
    const { data: codexes } = await supabase
      .from('codexes')
      .select(`
        id,
        codex_name,
        persona_run_id,
        codex_sections (
          id,
          section_index,
          status
        )
      `)
      .eq('persona_run_id', personaRunId);

    if (!codexes || codexes.length === 0) {
      throw new Error('No codexes found for this persona run');
    }

    // Find and reset only stuck/failed sections (not completed ones)
    let resetCount = 0;
    for (const codex of codexes) {
      const stuckSections = (codex.codex_sections as any[]).filter(
        (section: any) => section.status !== 'completed'
      );

      if (stuckSections.length > 0) {
        const sectionIds = stuckSections.map((s: any) => s.id);
        
        // Reset stuck sections to pending
        await supabase
          .from('codex_sections')
          .update({
            status: 'pending',
            content: null,
            error_message: null,
            retries: 0
          })
          .in('id', sectionIds);

        resetCount += stuckSections.length;
        console.log(`Reset ${stuckSections.length} stuck sections in codex ${codex.codex_name}`);
      }

      // Update codex status to generating if it has stuck sections
      if (stuckSections.length > 0) {
        await supabase
          .from('codexes')
          .update({ status: 'generating' })
          .eq('id', codex.id);
      }
    }

    console.log(`Total stuck sections reset: ${resetCount}`);

    // Update persona run status to generating
    const { error: updateError } = await supabase
      .from('persona_runs')
      .update({
        status: 'generating',
        is_cancelled: false
      })
      .eq('id', personaRunId);

    if (updateError) throw updateError;

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
      action: 'regenerate_persona',
      target_persona_id: personaRunId,
      details: { user_id: existingRun.user_id }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-regenerate-persona:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
