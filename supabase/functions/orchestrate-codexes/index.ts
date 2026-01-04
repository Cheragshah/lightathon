import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCodexSectionNamesFromDB, getCompletedCodexContent, getDependencyCodexName, getCodexQuestionIds, getCodexDependencies, getDependencyCodexNames } from "../_shared/codex-db-helper.ts";

// Declare EdgeRuntime for Supabase background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
};

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

    const { personaRunId, codexId } = await req.json();

    console.log("Starting orchestration for persona run:", personaRunId);
    if (codexId) {
      console.log("🎯 Targeting specific codex:", codexId);
    } else {
      console.log("🔄 Auto-sequencing mode: Finding next pending codex");
    }

    // Update persona run status if not already generating
    await supabase
      .from("persona_runs")
      .update({ status: "generating", started_at: new Date().toISOString() })
      .eq("id", personaRunId);

    // Fetch ALL codexes for this run to determine state
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

    const validCodexes = codexes.filter(c => c.total_sections > 0);

    // Determine which codex to process
    let codexToProcess: any = null;

    if (codexId) {
      // Single mode: Run specific codex
      codexToProcess = validCodexes.find(c => c.id === codexId);
      if (!codexToProcess) {
        console.error(`Target codex ${codexId} not found in run`);
      }
    } else {
      // Auto mode: Find first pending codex
      codexToProcess = validCodexes.find(c =>
        !['ready', 'ready_with_errors', 'failed', 'completed'].includes(c.status)
      );
    }

    // If no codex to process, check if run is complete
    if (!codexToProcess) {
      const allComplete = validCodexes.every(c =>
        ['ready', 'ready_with_errors', 'failed', 'completed'].includes(c.status)
      );

      if (allComplete) {
        console.log("✅ All codexes completed! Finishing persona run.");

        await supabase
          .from("persona_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", personaRunId);

        // Send notification
        const { data: personaRunData } = await supabase
          .from("persona_runs")
          .select("user_id")
          .eq("id", personaRunId)
          .single();

        if (personaRunData?.user_id) {
          EdgeRuntime.waitUntil(
            fetch(`${supabaseUrl}/functions/v1/send-codex-notification`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                personaRunId: personaRunId,
                userId: personaRunData.user_id,
              }),
            }).catch(e => console.error("Notification error:", e))
          );
        }

        return new Response(JSON.stringify({ success: true, message: "Run completed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("⚠️ No pending codex found, but run not fully complete? (Maybe awaiting answers)");
      return new Response(JSON.stringify({ success: true, message: "No actionable codex found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🚀 Processing codex: ${codexToProcess.codex_name} (${codexToProcess.status})`);

    // --- Dependency Check ---
    const codexPromptId = codexToProcess.codex_prompt?.id;
    const dependsOnTranscript = codexToProcess.codex_prompt?.depends_on_transcript || false;
    const dependencies: string[] = [];

    if (codexPromptId) {
      const { data: deps } = await supabase
        .from('codex_prompt_dependencies')
        .select('depends_on_codex_id')
        .eq('codex_prompt_id', codexPromptId)
        .order('display_order', { ascending: true });

      if (deps) {
        for (const d of deps) {
          const name = await getDependencyCodexName(supabase, d.depends_on_codex_id);
          if (name) dependencies.push(name);
        }
      }
    }

    // Verify dependencies are ready
    for (const depName of dependencies) {
      const depCodex = validCodexes.find(c => c.codex_name === depName);
      if (depCodex && !['ready', 'ready_with_errors'].includes(depCodex.status)) {
        console.log(`⏸️ Dependency ${depName} not ready (${depCodex.status}). Waiting...`);
        // In sequential mode, if dependencies aren't ready, we generally can't proceed.
        // However, since we process in order, previous ones SHOULD be ready.
        // If they failed, we might be stuck.
        if (depCodex.status === 'failed') {
          throw new Error(`Dependency ${depName} failed. Cannot proceed with ${codexToProcess.codex_name}`);
        }
        // If still generating/pending, we wait (or exit if auto-chained, but recursion happens AFTER completion)
        // If we are here in auto-mode, it means this is the FIRST pending one.
        // If its dependency is NOT ready, but also NOT pending (e.g. it was skipped?), something is wrong.
        // But usually deps are earlier in the list.

        // Allow a short poll just in case of slight race/db lag
        let retries = 0;
        while (retries < 5) {
          const { data: freshStatus } = await supabase.from('codexes').select('status').eq('id', depCodex.id).single();
          if (['ready', 'ready_with_errors'].includes(freshStatus.status)) break;
          await new Promise(r => setTimeout(r, 2000));
          retries++;
        }
        if (retries >= 5) throw new Error(`Timeout waiting for dependency ${depName}`);
      }
    }

    // --- Prepare Content ---
    const { data: personaRun } = await supabase
      .from("persona_runs")
      .select("answers_json, original_transcript")
      .eq("id", personaRunId)
      .single();

    const userAnswers = personaRun?.answers_json || {};
    const originalTranscript = personaRun?.original_transcript || null;
    let dependentContent: string | null = null;

    if (dependsOnTranscript && originalTranscript) {
      dependentContent = `ORIGINAL TRANSCRIPT:\n\n${originalTranscript}`;
    } else if (dependencies.length > 0) {
      let combined = "";
      for (const depName of dependencies) {
        const content = await getCompletedCodexContent(supabase, personaRunId, depName);
        combined += content ? `\n=== CONTENT FROM: ${depName.toUpperCase()} ===\n\n${content}\n` : "";
      }
      dependentContent = combined || null;
    }

    const questionIds = await getCodexQuestionIds(supabase, codexPromptId);
    const filteredAnswers = questionIds.length > 0
      ? Object.fromEntries(Object.entries(userAnswers).filter(([k]) => questionIds.includes(k)))
      : userAnswers;

    // --- Execute Generation ---
    await supabase.from("codexes").update({ status: "generating" }).eq("id", codexToProcess.id);

    // Create sections if needed
    const { data: existingSections } = await supabase
      .from("codex_sections")
      .select("id")
      .eq("codex_id", codexToProcess.id);

    if (!existingSections || existingSections.length === 0) {
      const sectionNames = await getCodexSectionNamesFromDB(supabase, codexToProcess.codex_name);
      const sectionRecords = Array.from({ length: codexToProcess.total_sections }).map((_, i) => ({
        codex_id: codexToProcess.id,
        section_name: sectionNames?.[i] || `Section ${i + 1}`,
        section_index: i,
        status: "pending",
      }));
      await supabase.from("codex_sections").insert(sectionRecords);
    }

    // Generate sections
    let successCount = 0;
    const BATCH_SIZE = 5; // Sequential batching for this codex

    for (let i = 0; i < codexToProcess.total_sections; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, codexToProcess.total_sections); j++) {
        batch.push(
          fetch(`${supabaseUrl}/functions/v1/generate-codex-section`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              codexId: codexToProcess.id,
              codexName: codexToProcess.codex_name,
              sectionIndex: j,
              userAnswers: filteredAnswers,
              dependentCodexContent: dependentContent,
            }),
          }).then(async res => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          }).catch(async err => {
            console.error(`Section ${j} error:`, err);
            await supabase.from("codex_sections").update({ status: "error", error_message: err.message }).eq("codex_id", codexToProcess.id).eq("section_index", j);
            return { error: err.message };
          })
        );
      }
      const results = await Promise.all(batch);
      successCount += results.filter(r => !r.error).length;
      // Wait a bit between batches
      if (i + BATCH_SIZE < codexToProcess.total_sections) await new Promise(r => setTimeout(r, 1000));
    }

    // Update status
    const isSuccess = successCount === codexToProcess.total_sections;
    if (isSuccess) {
      await supabase.from("codexes").update({ status: "ready", completed_sections: successCount }).eq("id", codexToProcess.id);
      console.log(`✅ Codex ${codexToProcess.codex_name} completed successfully.`);
    } else {
      await supabase.from("codexes").update({ status: "ready_with_errors", completed_sections: successCount }).eq("id", codexToProcess.id);
      console.warn(`⚠️ Codex ${codexToProcess.codex_name} completed with errors.`);
    }

    // --- Recursive Chain Trigger ---
    if (!codexId) { // Only if in Auto Mode
      console.log("🔄 Triggering next codex in sequence...");
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/orchestrate-codexes`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personaRunId
          }),
        })
      );
    }

    // Watchdog for this specific codex (cleanup)
    EdgeRuntime.waitUntil(
      new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)).then(() =>
        fetch(`${supabaseUrl}/functions/v1/retry-pending-sections`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ personaRunId, codexId: codexToProcess.id, autoRetry: true }),
        })
      ).catch(console.error)
    );

    return new Response(JSON.stringify({ success: true, message: `Processed ${codexToProcess.codex_name}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in orchestrate-codexes:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
