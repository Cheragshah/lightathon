import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin status from Authorization header
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
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    console.log('Admin verified, processing generation queue...');

    // Check for optional request body parameters
    let awaitAnswers = false;
    try {
      const body = await req.json();
      awaitAnswers = body?.awaitAnswers === true;
      console.log('awaitAnswers mode:', awaitAnswers);
    } catch {
      // No body or invalid JSON, proceed with defaults
    }
    // Get pending queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('codex_generation_queue')
      .select(`
        *,
        codex_prompts:codex_prompt_id (
          id,
          codex_name,
          system_prompt,
          display_order
        ),
        ai_providers:ai_provider_id (
          id,
          name,
          provider_code,
          base_url
        )
      `)
      .eq('status', 'pending')
      .order('created_at')
      .limit(10);

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('No pending items in queue');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending items to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${queueItems.length} pending items to process`);

    // Group items by user to create persona runs
    const userQueueMap = new Map<string, typeof queueItems>();
    for (const item of queueItems) {
      const existing = userQueueMap.get(item.user_id) || [];
      existing.push(item);
      userQueueMap.set(item.user_id, existing);
    }

    let processedCount = 0;

    for (const [userId, items] of userQueueMap) {
      // Collect all created codex IDs for this user to invoke orchestration once
      const createdCodexIds: string[] = [];
      let personaRunId: string | null = null;

      try {
        // Check if user already has ANY persona run (use most recent)
        const { data: existingRun } = await supabase
          .from('persona_runs')
          .select('id, answers_json, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let answersJson: any;

        if (existingRun) {
          // Use existing run - add new codex to it
          personaRunId = existingRun.id;
          answersJson = existingRun.answers_json;
          console.log(`Using existing persona run ${personaRunId} (status: ${existingRun.status}) for user ${userId}`);
          
          // If run was completed, update it to generating status
          if (existingRun.status === 'completed' || existingRun.status === 'ready') {
            await supabase
              .from('persona_runs')
              .update({ 
                status: 'generating',
                started_at: new Date().toISOString()
              })
              .eq('id', personaRunId);
            console.log(`Updated persona run ${personaRunId} status from ${existingRun.status} to generating`);
          }
        } else {
          // No existing run - need to create one
          // First check if we have answers from somewhere
          console.log(`No existing persona run for user ${userId}, creating new one`);
          
          // For admin-triggered without existing run, we need the user to have answered questions
          // Mark queue items as failed since we have no answers
          console.log(`No answers found for user ${userId}, skipping`);
          for (const item of items) {
            await supabase
              .from('codex_generation_queue')
              .update({ 
                status: 'failed', 
                error_message: 'No existing persona run with answers found for user',
                completed_at: new Date().toISOString()
              })
              .eq('id', item.id);
          }
          continue;
        }

        // Update queue items with persona run id and mark as processing
        for (const item of items) {
          await supabase
            .from('codex_generation_queue')
            .update({ 
              status: 'processing',
              persona_run_id: personaRunId,
              started_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }

        // Update persona run status to generating
        await supabase
          .from('persona_runs')
          .update({ 
            status: 'generating',
            started_at: new Date().toISOString()
          })
          .eq('id', personaRunId);

        // Create codex entries for each selected codex
        for (const item of items) {
          const codexPrompt = item.codex_prompts;
          if (!codexPrompt) {
            console.log(`No codex prompt found for queue item ${item.id}`);
            continue;
          }

          // Check if codex already exists for this persona run
          const { data: existingCodex } = await supabase
            .from('codexes')
            .select('id')
            .eq('persona_run_id', personaRunId)
            .eq('codex_prompt_id', codexPrompt.id)
            .single();

          if (existingCodex) {
            console.log(`Codex already exists for persona run ${personaRunId} and prompt ${codexPrompt.id}`);
            // Mark queue item as completed
            await supabase
              .from('codex_generation_queue')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', item.id);
            continue;
          }

          // Get the actual section count from codex_section_prompts
          const { data: sectionPrompts, error: sectionError } = await supabase
            .from('codex_section_prompts')
            .select('id')
            .eq('codex_prompt_id', codexPrompt.id)
            .eq('is_active', true);
          
          const actualSectionCount = sectionPrompts?.length || 1;

          // Create the codex with correct section count
          // If awaitAnswers is true, set status to 'awaiting_answers' instead of 'generating'
          const codexStatus = awaitAnswers ? 'awaiting_answers' : 'generating';
          
          const { data: newCodex, error: codexError } = await supabase
            .from('codexes')
            .insert({
              persona_run_id: personaRunId,
              codex_prompt_id: codexPrompt.id,
              codex_name: codexPrompt.codex_name,
              codex_order: codexPrompt.display_order,
              status: codexStatus,
              total_sections: actualSectionCount,
              completed_sections: 0,
            })
            .select('id')
            .single();

          if (codexError) {
            console.error(`Error creating codex:`, codexError);
            await supabase
              .from('codex_generation_queue')
              .update({ 
                status: 'failed',
                error_message: codexError.message,
                completed_at: new Date().toISOString()
              })
              .eq('id', item.id);
            continue;
          }

          console.log(`Created codex ${newCodex.id} for ${codexPrompt.codex_name} with status ${codexStatus} and ${actualSectionCount} sections`);

          // Collect codex ID for batch orchestration
          createdCodexIds.push(newCodex.id);

          if (awaitAnswers) {
            console.log(`Codex ${newCodex.id} set to awaiting_answers - waiting for user input`);
          }

          // Mark queue item as completed (actual generation happens async)
          await supabase
            .from('codex_generation_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          processedCount++;
        }

        // After all codexes are created, invoke orchestration ONCE with all codex IDs
        // This ensures sequential processing in codex_order
        if (!awaitAnswers && createdCodexIds.length > 0 && personaRunId) {
          try {
            console.log(`Invoking orchestrate-codexes for ${createdCodexIds.length} codexes sequentially`);
            const { error: generateError } = await supabase.functions.invoke('orchestrate-codexes', {
              body: { 
                personaRunId,
                codexIds: createdCodexIds, // Pass all codex IDs for sequential processing
              }
            });

            if (generateError) {
              console.error(`Error invoking orchestrate-codexes:`, generateError);
            }
          } catch (invokeError) {
            console.error(`Failed to invoke orchestrate-codexes:`, invokeError);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`Processed ${processedCount} queue items`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Triggered generation for ${processedCount} codex(es)`,
      processed: processedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in admin-trigger-codex-generation:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
