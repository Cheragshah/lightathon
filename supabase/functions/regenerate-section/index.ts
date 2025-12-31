import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
      sectionId: z.string().uuid(),
    });

    const { sectionId } = inputSchema.parse(await req.json());

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

    // Get section with codex and persona run
    const { data: section, error: sectionError } = await supabase
      .from('codex_sections')
      .select(`
        *,
        codex:codexes(
          *,
          persona_run:persona_runs(id, user_id, answers_json)
        )
      `)
      .eq('id', sectionId)
      .single();

    if (sectionError || !section) {
      console.error('Section not found:', sectionError);
      return new Response(JSON.stringify({ error: 'Section not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const isOwner = section.codex.persona_run.user_id === user.id;
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Regenerating section ${sectionId} (${section.section_name}) for codex ${section.codex_id}`);

    // Reset section status and increment regeneration count
    const { error: updateError } = await supabase
      .from('codex_sections')
      .update({
        status: 'generating',
        content: null,
        error_message: null,
        regeneration_count: (section.regeneration_count || 0) + 1,
        last_regenerated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId);

    if (updateError) {
      console.error('Failed to update section status:', updateError);
    }

    // Log analytics
    await supabase.from('analytics_events').insert({
      event_type: 'section_regenerated',
      user_id: user.id,
      persona_run_id: section.codex.persona_run.id,
      codex_id: section.codex_id,
      metadata: { section_id: sectionId, section_name: section.section_name }
    });

    // Get dependent codex content if this codex has dependencies
    let dependentCodexContent = "";
    
    if (section.codex.codex_prompt_id) {
      // Check for dependencies
      const { data: dependencies } = await supabase
        .from('codex_prompt_dependencies')
        .select('depends_on_codex_id')
        .eq('codex_prompt_id', section.codex.codex_prompt_id)
        .order('display_order');

      if (dependencies && dependencies.length > 0) {
        // Get content from dependent codexes
        for (const dep of dependencies) {
          const { data: depCodex } = await supabase
            .from('codexes')
            .select('codex_name, id')
            .eq('persona_run_id', section.codex.persona_run.id)
            .eq('codex_prompt_id', dep.depends_on_codex_id)
            .single();

          if (depCodex) {
            const { data: depSections } = await supabase
              .from('codex_sections')
              .select('section_name, content')
              .eq('codex_id', depCodex.id)
              .eq('status', 'completed')
              .order('section_index');

            if (depSections && depSections.length > 0) {
              dependentCodexContent += `\n=== ${depCodex.codex_name} ===\n`;
              for (const ds of depSections) {
                if (ds.content) {
                  dependentCodexContent += `\n--- ${ds.section_name} ---\n${ds.content}\n`;
                }
              }
            }
          }
        }
      }
    }

    // Trigger regeneration by calling generate-codex-section with correct parameters
    // The generate-codex-section expects: codexId, codexName, sectionIndex, userAnswers, dependentCodexContent
    const { error: genError } = await supabase.functions.invoke('generate-codex-section', {
      body: {
        codexId: section.codex_id,
        codexName: section.codex.codex_name,
        sectionIndex: section.section_index,
        userAnswers: section.codex.persona_run.answers_json,
        dependentCodexContent: dependentCodexContent || undefined
      }
    });

    if (genError) {
      console.error('Error triggering regeneration:', genError);
      
      // Update section with error status
      await supabase
        .from('codex_sections')
        .update({
          status: 'error',
          error_message: genError.message || 'Failed to trigger regeneration',
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
      
      return new Response(JSON.stringify({ error: 'Failed to trigger regeneration', details: genError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully triggered regeneration for section ${section.section_name}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in regenerate-section:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});