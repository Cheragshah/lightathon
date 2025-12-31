import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCodexSectionNamesFromDB, getCompletedCodexContent, getDependencyCodexName, getCodexQuestionIds, getCodexDependencies, getDependencyCodexNames } from "../_shared/codex-db-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personaRunId } = await req.json();

    console.log("Starting orchestration for persona run:", personaRunId);

    // Update persona run status
    await supabase
      .from("persona_runs")
      .update({ status: "generating", started_at: new Date().toISOString() })
      .eq("id", personaRunId);

    // Get all codexes for this run with dependency info
    const { data: codexes, error: codexError } = await supabase
      .from("codexes")
      .select(`
        *,
        codex_prompt:codex_prompts!inner(id, depends_on_codex_id, depends_on_transcript)
      `)
      .eq("persona_run_id", personaRunId)
      .order("codex_order", { ascending: true });

    if (codexError || !codexes) {
      throw new Error("Failed to load codexes");
    }

    // Filter out codexes with 0 sections
    const validCodexes = codexes.filter(c => c.total_sections > 0);
    const skippedCodexes = codexes.filter(c => c.total_sections === 0);
    
    if (skippedCodexes.length > 0) {
      console.log(`⏭️ Skipping ${skippedCodexes.length} codexes with 0 sections:`, 
        skippedCodexes.map(c => c.codex_name));
    }

    console.log(`Found ${validCodexes.length} codexes to generate`);

    // Get persona run data including transcript
    const { data: personaRun } = await supabase
      .from("persona_runs")
      .select("answers_json, original_transcript")
      .eq("id", personaRunId)
      .single();

    const userAnswers = personaRun?.answers_json || {};
    const originalTranscript = personaRun?.original_transcript || null;

    // Build dependency-aware processing order and load question mappings
    const codexDependencies = new Map<string, string[]>();
    const codexTranscriptDeps = new Map<string, boolean>();
    const codexQuestionMappings = new Map<string, string[]>();
    
    for (const codex of validCodexes) {
      const codexPromptId = (codex.codex_prompt as any)?.id;
      const dependsOnTranscript = (codex.codex_prompt as any)?.depends_on_transcript || false;
      
      codexTranscriptDeps.set(codex.codex_name, dependsOnTranscript);
      
      if (codexPromptId) {
        // Get multiple dependencies from junction table
        const { data: deps } = await supabase
          .from('codex_prompt_dependencies')
          .select('depends_on_codex_id')
          .eq('codex_prompt_id', codexPromptId)
          .order('display_order', { ascending: true });
        
        if (deps && deps.length > 0) {
          const depIds = deps.map(d => d.depends_on_codex_id);
          const depNames: string[] = [];
          for (const depId of depIds) {
            const name = await getDependencyCodexName(supabase, depId);
            if (name) depNames.push(name);
          }
          codexDependencies.set(codex.codex_name, depNames);
        } else {
          codexDependencies.set(codex.codex_name, []);
        }

        // Load question mappings for this codex
        const questionIds = await getCodexQuestionIds(supabase, codexPromptId);
        codexQuestionMappings.set(codex.codex_name, questionIds);
      }
    }

    console.log("Codex dependencies:", Object.fromEntries(codexDependencies));
    console.log("Codex transcript dependencies:", Object.fromEntries(codexTranscriptDeps));
    console.log("Codex question mappings:", Object.fromEntries(codexQuestionMappings));

    // Helper function to filter answers by question IDs
    const filterAnswersByQuestionIds = (answers: any, questionIds: string[]) => {
      if (questionIds.length === 0) return answers;
      const filtered: any = {};
      for (const qId of questionIds) {
        if (answers[qId] !== undefined) {
          filtered[qId] = answers[qId];
        }
      }
      return filtered;
    };

    // Process codexes sequentially respecting dependencies
    const SECTION_BATCH_SIZE = 5; // Process 5 sections at a time per codex
    const completedCodexes = new Set<string>();
    
    // Pre-populate with already completed codexes
    for (const codex of validCodexes) {
      if (codex.status === 'ready' || codex.status === 'ready_with_errors') {
        completedCodexes.add(codex.codex_name);
        console.log(`✅ ${codex.codex_name} already completed, adding to dependency set`);
      }
    }

    for (const codex of validCodexes) {
      // Skip if already complete
      if (completedCodexes.has(codex.codex_name)) {
        console.log(`⏭️ Skipping ${codex.codex_name} - already complete`);
        continue;
      }
      
      // Check if this codex has dependencies that need to complete first
      const dependsOn = codexDependencies.get(codex.codex_name) || [];
      if (dependsOn.length > 0) {
        // Wait for ALL dependencies to complete
        for (const depName of dependsOn) {
          if (!completedCodexes.has(depName)) {
            console.log(`⏸️ ${codex.codex_name} waiting for ${depName} to complete...`);
            let waitCount = 0;
            while (!completedCodexes.has(depName) && waitCount < 60) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              waitCount++;
            }
          }
        }
      }

      // Get dependent content (codex or transcript)
      let dependentContent: string | null = null;
      
      // Check if depends on transcript
      if (codexTranscriptDeps.get(codex.codex_name) && originalTranscript) {
        console.log(`📄 Using original transcript for ${codex.codex_name}`);
        dependentContent = `ORIGINAL TRANSCRIPT:\n\n${originalTranscript}`;
      } 
      // Otherwise check for codex dependencies
      else if (dependsOn.length > 0) {
        console.log(`📥 Fetching content from ${dependsOn.length} codex(es) for ${codex.codex_name}`);
        let combinedContent = "";
        for (const depName of dependsOn) {
          const content = await getCompletedCodexContent(supabase, personaRunId, depName);
          if (content) {
            combinedContent += `\n=== CONTENT FROM: ${depName.toUpperCase()} ===\n\n${content}\n`;
          } else {
            console.warn(`⚠️ Could not fetch content from ${depName}`);
          }
        }
        dependentContent = combinedContent || null;
      }

      // Filter answers based on question mappings
      const questionIds = codexQuestionMappings.get(codex.codex_name) || [];
      const filteredAnswers = filterAnswersByQuestionIds(userAnswers, questionIds);
      
      if (questionIds.length > 0) {
        console.log(`📝 Using ${Object.keys(filteredAnswers).length} selected Q&A for ${codex.codex_name}`);
      } else {
        console.log(`📝 Using all Q&A for ${codex.codex_name} (no question filter)`);
      }

      // Process this codex
      try {
        console.log(`Starting generation for: ${codex.codex_name}`);

        // Update codex status to generating
        await supabase
          .from("codexes")
          .update({ status: "generating" })
          .eq("id", codex.id);

        // Get section names from database
        const sectionNames = await getCodexSectionNamesFromDB(supabase, codex.codex_name);
        if (!sectionNames || sectionNames.length === 0) {
          throw new Error(`No section names found in database for ${codex.codex_name}`);
        }
        
        // Check if sections already exist (e.g., from full re-run)
        const { data: existingSections } = await supabase
          .from("codex_sections")
          .select("id")
          .eq("codex_id", codex.id);

        // Only create sections if they don't exist
        if (!existingSections || existingSections.length === 0) {
          const sectionRecords = [];
          for (let i = 0; i < codex.total_sections; i++) {
            sectionRecords.push({
              codex_id: codex.id,
              section_name: sectionNames[i] || `Section ${i + 1}`,
              section_index: i,
              status: "pending",
            });
          }

          await supabase.from("codex_sections").insert(sectionRecords);
          console.log(`Created ${sectionRecords.length} sections for ${codex.codex_name}`);
        } else {
          console.log(`Using ${existingSections.length} existing sections for ${codex.codex_name}`);
        }

        // Generate sections in controlled batches
        let successCount = 0;
        let errorCount = 0;

        for (let sectionIndex = 0; sectionIndex < codex.total_sections; sectionIndex += SECTION_BATCH_SIZE) {
          const sectionBatch = [];
          const batchEnd = Math.min(sectionIndex + SECTION_BATCH_SIZE, codex.total_sections);
          
          for (let idx = sectionIndex; idx < batchEnd; idx++) {
            sectionBatch.push(
              (async (index) => {
                try {
                  console.log(`Generating ${codex.codex_name} - Section ${index + 1}`);

                  const response = await fetch(`${supabaseUrl}/functions/v1/generate-codex-section`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${supabaseKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      codexId: codex.id,
                      codexName: codex.codex_name,
                      sectionIndex: index,
                      userAnswers: filteredAnswers,
                      dependentCodexContent: dependentContent,
                    }),
                  });

                  if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Section generation failed: ${response.status} - ${errorText}`);
                  }

                  const result = await response.json();
                  
                  if (result.error) {
                    console.error(`Error in section ${index}:`, result.error);
                    return { success: false, index, error: result.error };
                  }
                  
                  return { success: true, index };
                } catch (sectionError) {
                  console.error(`Failed to generate section ${index}:`, sectionError);
                  
                  // Mark section as error in database
                  await supabase
                    .from("codex_sections")
                    .update({ 
                      status: "error",
                      error_message: (sectionError as Error).message
                    })
                    .eq("codex_id", codex.id)
                    .eq("section_index", index);
                  
                  return { success: false, index, error: (sectionError as Error).message };
                }
              })(idx)
            );
          }

          // Wait for this batch to complete
          const batchResults = await Promise.all(sectionBatch);
          successCount += batchResults.filter(r => r.success).length;
          errorCount += batchResults.filter(r => !r.success).length;
          
          console.log(`${codex.codex_name} batch complete: ${successCount}/${codex.total_sections} successful, ${errorCount} errors`);
          
          // Small delay between section batches
          if (batchEnd < codex.total_sections) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log(`✅ Completed ${codex.codex_name} - ${successCount}/${codex.total_sections} sections successful`);
        
        // Mark this codex as complete for dependencies
        completedCodexes.add(codex.codex_name);
      } catch (codexError) {
        console.error(`Failed to generate codex ${codex.codex_name}:`, codexError);
        await supabase
          .from("codexes")
          .update({ 
            status: "failed"
          })
          .eq("id", codex.id);
      }
    }

    // Check if all codexes are complete
    const { data: updatedCodexes } = await supabase
      .from("codexes")
      .select("status")
      .eq("persona_run_id", personaRunId);

    const allComplete = updatedCodexes?.every(c => 
      c.status === "ready" || c.status === "ready_with_errors" || c.status === "failed"
    );

    if (allComplete) {
      // Get persona run user_id for notification
      const { data: personaRunData } = await supabase
        .from("persona_runs")
        .select("user_id")
        .eq("id", personaRunId)
        .single();

      await supabase
        .from("persona_runs")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", personaRunId);

      console.log("Persona run completed!");

      // Send email notification to user
      if (personaRunData?.user_id) {
        try {
          const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-codex-notification`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personaRunId: personaRunId,
              userId: personaRunData.user_id,
            }),
          });

          if (notificationResponse.ok) {
            console.log("Email notification sent successfully");
          } else {
            console.log("Email notification skipped or failed:", await notificationResponse.text());
          }
        } catch (notifyError) {
          console.error("Error sending email notification:", notifyError);
          // Don't fail the whole process for notification errors
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Generation complete" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in orchestrate-codexes:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
