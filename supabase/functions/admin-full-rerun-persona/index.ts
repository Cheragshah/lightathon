import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
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

    // Verify admin role
    const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !hasAdminRole) {
      console.error('Role verification failed:', roleError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { personaRunId } = await req.json();

    if (!personaRunId) {
      return new Response(JSON.stringify({ error: 'Persona run ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting full re-run for persona run: ${personaRunId}`);

    // Fetch the persona run to verify it exists
    const { data: personaRun, error: fetchError } = await supabase
      .from('persona_runs')
      .select('*')
      .eq('id', personaRunId)
      .single();

    if (fetchError || !personaRun) {
      console.error('Error fetching persona run:', fetchError);
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all codex IDs for this persona run
    const { data: existingCodexes, error: codexFetchError } = await supabase
      .from('codexes')
      .select('id')
      .eq('persona_run_id', personaRunId);

    if (codexFetchError) {
      console.error('Error fetching codexes:', codexFetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch existing codexes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const codexIds = existingCodexes?.map(c => c.id) || [];

    // Delete all existing codex sections
    if (codexIds.length > 0) {
      const { error: deleteSectionsError } = await supabase
        .from('codex_sections')
        .delete()
        .in('codex_id', codexIds);

      if (deleteSectionsError) {
        console.error('Error deleting codex sections:', deleteSectionsError);
        return new Response(JSON.stringify({ error: 'Failed to delete existing sections' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Deleted sections for ${codexIds.length} codexes`);
    }

    // Delete all existing codexes
    const { error: deleteCodexesError } = await supabase
      .from('codexes')
      .delete()
      .eq('persona_run_id', personaRunId);

    if (deleteCodexesError) {
      console.error('Error deleting codexes:', deleteCodexesError);
      return new Response(JSON.stringify({ error: 'Failed to delete existing codexes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleted all existing codexes');

    // Get current active codex prompts configuration
    const { data: activeCodexPrompts, error: promptsError } = await supabase
      .from('codex_prompts')
      .select('id, codex_name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (promptsError || !activeCodexPrompts || activeCodexPrompts.length === 0) {
      console.error('Error fetching active codex prompts:', promptsError);
      return new Response(JSON.stringify({ error: 'No active codex prompts found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating ${activeCodexPrompts.length} new codexes based on current configuration`);

    // Create new codex records and their sections based on current configuration
    for (const prompt of activeCodexPrompts) {
      // Get section prompts for this codex
      const { data: sectionPrompts, error: sectionPromptsError } = await supabase
        .from('codex_section_prompts')
        .select('*')
        .eq('codex_prompt_id', prompt.id)
        .eq('is_active', true)
        .order('section_index', { ascending: true });

      if (sectionPromptsError) {
        console.error('Error fetching section prompts:', sectionPromptsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch section prompts' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create the codex with link to prompt
      const { data: createdCodex, error: insertCodexError } = await supabase
        .from('codexes')
        .insert({
          persona_run_id: personaRunId,
          codex_name: prompt.codex_name,
          codex_order: prompt.display_order,
          codex_prompt_id: prompt.id,
          status: 'not_started',
          total_sections: sectionPrompts?.length || 0,
          completed_sections: 0,
        })
        .select()
        .single();

      if (insertCodexError || !createdCodex) {
        console.error('Error creating codex:', insertCodexError);
        return new Response(JSON.stringify({ error: 'Failed to create new codex' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create sections for this codex
      if (sectionPrompts && sectionPrompts.length > 0) {
        const sectionsToCreate = sectionPrompts.map(section => ({
          codex_id: createdCodex.id,
          section_name: section.section_name,
          section_index: section.section_index,
          status: 'pending',
          retries: 0,
          regeneration_count: 0,
        }));

        const { error: sectionsError } = await supabase
          .from('codex_sections')
          .insert(sectionsToCreate);

        if (sectionsError) {
          console.error('Error creating sections:', sectionsError);
          return new Response(JSON.stringify({ error: 'Failed to create codex sections' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Created ${sectionsToCreate.length} sections for codex: ${createdCodex.codex_name}`);
      }
    }

    // Reset persona run status
    const { error: updateRunError } = await supabase
      .from('persona_runs')
      .update({
        status: 'pending',
        is_cancelled: false,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', personaRunId);

    if (updateRunError) {
      console.error('Error updating persona run status:', updateRunError);
      return new Response(JSON.stringify({ error: 'Failed to update persona run status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Reset persona run status to pending');

    // Log admin activity
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'full_rerun_persona',
      target_persona_id: personaRunId,
      details: {
        codex_count: activeCodexPrompts.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Trigger orchestration
    console.log('Triggering orchestration for persona run:', personaRunId);
    
    const { error: orchestrateError } = await supabase.functions.invoke('orchestrate-codexes', {
      body: { personaRunId },
    });

    if (orchestrateError) {
      console.error('Error triggering orchestration:', orchestrateError);
      return new Response(JSON.stringify({ 
        error: 'Codexes created but orchestration failed. Please retry generation.',
        details: orchestrateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully triggered full re-run');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Full re-run initiated successfully',
        codexCount: activeCodexPrompts.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
