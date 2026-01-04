import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to reconcile codex and persona run statuses after retry
async function reconcileStatuses(supabase: any, personaRunId: string) {
  console.log("Reconciling statuses for persona run:", personaRunId);

  // Get all codexes for this run
  const { data: codexes, error: codexError } = await supabase
    .from("codexes")
    .select("id, status, total_sections, completed_sections, codex_name")
    .eq("persona_run_id", personaRunId);

  if (codexError || !codexes) {
    console.error("Error fetching codexes for reconciliation:", codexError);
    return;
  }

  let allCodexesDone = true;

  for (const codex of codexes) {
    // Check actual section counts
    const { data: sections, error: sectionsError } = await supabase
      .from("codex_sections")
      .select("status")
      .eq("codex_id", codex.id);

    if (sectionsError || !sections) {
      console.error(`Error fetching sections for codex ${codex.id}:`, sectionsError);
      continue;
    }

    const completed = sections.filter((s: any) => s.status === "completed").length;
    const errors = sections.filter((s: any) => s.status === "error").length;
    const pending = sections.filter((s: any) => s.status === "pending" || s.status === "generating").length;
    const total = sections.length;

    // Update codex status if all sections are done (completed or error)
    if (pending === 0 && total > 0) {
      const newStatus = errors > 0 ? "ready_with_errors" : "ready";
      if (codex.status !== newStatus && codex.status !== "ready" && codex.status !== "ready_with_errors") {
        console.log(`Updating codex ${codex.codex_name} status to ${newStatus} (completed: ${completed}, errors: ${errors})`);
        await supabase
          .from("codexes")
          .update({
            status: newStatus,
            completed_sections: completed
          })
          .eq("id", codex.id);
      }
    } else {
      allCodexesDone = false;
    }

    // Check if codex is done
    const isDone = ["ready", "ready_with_errors", "failed"].includes(codex.status);
    if (!isDone && pending > 0) {
      allCodexesDone = false;
    }
  }

  // Check if all codexes are now done
  if (allCodexesDone && codexes.length > 0) {
    // Re-fetch to get updated statuses
    const { data: updatedCodexes } = await supabase
      .from("codexes")
      .select("status")
      .eq("persona_run_id", personaRunId);

    const allComplete = updatedCodexes?.every((c: any) =>
      ["ready", "ready_with_errors", "failed"].includes(c.status)
    );

    if (allComplete) {
      console.log("All codexes complete, updating persona run status to completed");
      await supabase
        .from("persona_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", personaRunId)
        .eq("status", "generating"); // Only update if still generating
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personaRunId, codexId, autoRetry } = await req.json();

    console.log("Retrying stuck sections", autoRetry ? "(auto-retry)" : `for persona run: ${personaRunId}`, codexId ? `(Codex: ${codexId})` : "");

    // Find all pending sections older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Also find sections stuck in "generating" for over 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Query for pending sections older than 5 minutes
    let pendingQuery = supabase
      .from("codex_sections")
      .select(`
        *,
        codex:codexes(
          id,
          codex_name,
          persona_run_id,
          persona_run:persona_runs(answers_json)
        )
      `)
      .eq("status", "pending")
      .lt("created_at", fiveMinutesAgo);

    // Query for stuck generating sections (older than 10 minutes)
    let stuckGeneratingQuery = supabase
      .from("codex_sections")
      .select(`
        *,
        codex:codexes(
          id,
          codex_name,
          persona_run_id,
          persona_run:persona_runs(answers_json)
        )
      `)
      .eq("status", "generating")
      .lt("updated_at", tenMinutesAgo);

    // If personaRunId is provided, filter by it
    if (personaRunId) {
      pendingQuery = pendingQuery.eq("codex.persona_run_id", personaRunId);
      stuckGeneratingQuery = stuckGeneratingQuery.eq("codex.persona_run_id", personaRunId);
    }

    // If codexId is provided, filter by it
    if (codexId) {
      pendingQuery = pendingQuery.eq("codex_id", codexId);
      stuckGeneratingQuery = stuckGeneratingQuery.eq("codex_id", codexId);
    }

    const [pendingResult, stuckResult] = await Promise.all([
      pendingQuery,
      stuckGeneratingQuery
    ]);

    if (pendingResult.error) {
      throw new Error(`Failed to fetch pending sections: ${pendingResult.error.message}`);
    }
    if (stuckResult.error) {
      throw new Error(`Failed to fetch stuck generating sections: ${stuckResult.error.message}`);
    }

    const pendingSections = pendingResult.data || [];
    const stuckGeneratingSections = stuckResult.data || [];

    // Combine both types of stuck sections
    const allStuckSections = [...pendingSections, ...stuckGeneratingSections];

    if (allStuckSections.length === 0) {
      // Even if no stuck sections, reconcile statuses if personaRunId is provided
      if (personaRunId) {
        await reconcileStatuses(supabase, personaRunId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "No stuck sections found to retry",
          retried: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${pendingSections.length} pending and ${stuckGeneratingSections.length} stuck generating sections to retry`);

    // Process sections with controlled concurrency (5 at a time)
    const BATCH_SIZE = 5;
    let retriedCount = 0;
    let errorCount = 0;

    // Collect unique persona run IDs for reconciliation
    const affectedPersonaRunIds = new Set<string>();

    for (let i = 0; i < allStuckSections.length; i += BATCH_SIZE) {
      const batch = allStuckSections.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (section: any) => {
        try {
          const codex = section.codex;
          const userAnswers = codex.persona_run?.answers_json || {};

          affectedPersonaRunIds.add(codex.persona_run_id);

          console.log(`Retrying ${codex.codex_name} - Section ${section.section_index + 1} (ID: ${section.id}, was: ${section.status})`);

          // Mark as generating before retry
          await supabase
            .from("codex_sections")
            .update({
              status: "generating",
              retries: section.retries + 1,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", section.id);

          const response = await fetch(`${supabaseUrl}/functions/v1/generate-codex-section`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              codexId: codex.id,
              codexName: codex.codex_name,
              sectionIndex: section.section_index,
              userAnswers,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Section retry failed: ${response.status} - ${errorText}`);
          }

          const result = await response.json();

          if (result.error) {
            throw new Error(result.error);
          }

          retriedCount++;
          console.log(`Successfully retried section ${section.id}`);
          return { success: true, sectionId: section.id };
        } catch (error) {
          errorCount++;
          console.error(`Failed to retry section ${section.id}:`, error);

          // Mark section as error if retries exceeded
          if (section.retries >= 2) {
            await supabase
              .from("codex_sections")
              .update({
                status: "error",
                error_message: `Retry failed: ${(error as Error).message}`,
                updated_at: new Date().toISOString()
              })
              .eq("id", section.id);
          } else {
            // Reset to pending for another attempt
            await supabase
              .from("codex_sections")
              .update({
                status: "pending",
                error_message: `Retry attempt ${section.retries + 1} failed: ${(error as Error).message}`,
                updated_at: new Date().toISOString()
              })
              .eq("id", section.id);
          }

          return { success: false, sectionId: section.id, error: (error as Error).message };
        }
      });

      await Promise.all(batchPromises);

      // Add a small delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < allStuckSections.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Retry complete: ${retriedCount} succeeded, ${errorCount} failed`);

    // Reconcile statuses for all affected persona runs
    for (const runId of affectedPersonaRunIds) {
      await reconcileStatuses(supabase, runId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Retried ${allStuckSections.length} sections`,
        retried: retriedCount,
        errors: errorCount
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in retry-pending-sections:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});