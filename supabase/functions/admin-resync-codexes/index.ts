import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { personaRunId } = await req.json();

    if (!personaRunId) {
      return new Response(JSON.stringify({ error: 'personaRunId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[admin-resync-codexes] Starting resync for persona run: ${personaRunId}`);

    // Fetch persona run
    const { data: personaRun, error: runError } = await supabase
      .from('persona_runs')
      .select('*')
      .eq('id', personaRunId)
      .single();

    if (runError || !personaRun) {
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active codex prompts with their section prompts
    const { data: codexPrompts, error: promptsError } = await supabase
      .from('codex_prompts')
      .select(`
        id,
        codex_name,
        display_order,
        codex_section_prompts!inner(id, section_name, section_index, is_active)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (promptsError) {
      console.error('[admin-resync-codexes] Error fetching codex prompts:', promptsError);
      throw promptsError;
    }

    console.log(`[admin-resync-codexes] Found ${codexPrompts?.length || 0} active codex prompts`);

    // Fetch existing codexes for this persona run
    const { data: existingCodexes } = await supabase
      .from('codexes')
      .select('id, codex_prompt_id, codex_name')
      .eq('persona_run_id', personaRunId);

    const existingPromptIds = new Set(existingCodexes?.map(c => c.codex_prompt_id) || []);

    let addedCodexes = 0;
    let updatedCodexes = 0;
    let addedSections = 0;

    for (const prompt of codexPrompts || []) {
      // Filter active sections
      const activeSections = (prompt.codex_section_prompts as any[]).filter(s => s.is_active);
      const totalSections = activeSections.length;

      if (totalSections === 0) {
        console.log(`[admin-resync-codexes] Skipping ${prompt.codex_name} - no active sections`);
        continue;
      }

      if (!existingPromptIds.has(prompt.id)) {
        // Create new codex
        const { data: newCodex, error: insertError } = await supabase
          .from('codexes')
          .insert({
            persona_run_id: personaRunId,
            codex_prompt_id: prompt.id,
            codex_name: prompt.codex_name,
            codex_order: prompt.display_order,
            status: 'not_started',
            total_sections: totalSections,
            completed_sections: 0
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`[admin-resync-codexes] Error creating codex ${prompt.codex_name}:`, insertError);
          continue;
        }

        console.log(`[admin-resync-codexes] Created codex: ${prompt.codex_name} with ${totalSections} sections`);
        addedCodexes++;

        // Create sections for new codex
        for (const section of activeSections) {
          const { error: sectionError } = await supabase
            .from('codex_sections')
            .insert({
              codex_id: newCodex.id,
              section_name: section.section_name,
              section_index: section.section_index,
              status: 'pending'
            });

          if (!sectionError) {
            addedSections++;
          }
        }
      } else {
        // Check if existing codex needs section updates
        const existingCodex = existingCodexes?.find(c => c.codex_prompt_id === prompt.id);
        if (existingCodex) {
          // Fetch existing sections
          const { data: existingSections } = await supabase
            .from('codex_sections')
            .select('id, section_index')
            .eq('codex_id', existingCodex.id);

          const existingSectionIndexes = new Set(existingSections?.map(s => s.section_index) || []);

          // Add missing sections
          for (const section of activeSections) {
            if (!existingSectionIndexes.has(section.section_index)) {
              const { error: sectionError } = await supabase
                .from('codex_sections')
                .insert({
                  codex_id: existingCodex.id,
                  section_name: section.section_name,
                  section_index: section.section_index,
                  status: 'pending'
                });

              if (!sectionError) {
                addedSections++;
                console.log(`[admin-resync-codexes] Added section ${section.section_name} to ${existingCodex.codex_name}`);
              }
            }
          }

          // Update total_sections count
          const { data: currentSections } = await supabase
            .from('codex_sections')
            .select('id')
            .eq('codex_id', existingCodex.id);

          await supabase
            .from('codexes')
            .update({ total_sections: currentSections?.length || totalSections })
            .eq('id', existingCodex.id);

          updatedCodexes++;
        }
      }
    }

    console.log(`[admin-resync-codexes] Resync complete: ${addedCodexes} codexes added, ${updatedCodexes} updated, ${addedSections} sections added`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Codexes resynced successfully',
        addedCodexes,
        updatedCodexes,
        addedSections
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin-resync-codexes] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
