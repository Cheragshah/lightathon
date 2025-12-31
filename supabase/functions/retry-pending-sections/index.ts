import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { personaRunId, autoRetry } = await req.json();

    console.log("Retrying pending sections", autoRetry ? "(auto-retry)" : `for persona run: ${personaRunId}`);

    // Find all pending sections older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    let query = supabase
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
    
    // If personaRunId is provided, filter by it
    if (personaRunId) {
      query = query.eq("codex.persona_run_id", personaRunId);
    }
    
    const { data: pendingSections, error: sectionsError } = await query;

    if (sectionsError) {
      throw new Error(`Failed to fetch pending sections: ${sectionsError.message}`);
    }

    if (!pendingSections || pendingSections.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending sections found to retry",
          retried: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${pendingSections.length} pending sections to retry`);

    // Process sections with controlled concurrency (5 at a time)
    const BATCH_SIZE = 5;
    let retriedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingSections.length; i += BATCH_SIZE) {
      const batch = pendingSections.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (section: any) => {
        try {
          const codex = section.codex;
          const userAnswers = codex.persona_run?.answers_json || {};

          console.log(`Retrying ${codex.codex_name} - Section ${section.section_index + 1} (ID: ${section.id})`);

          // Mark as generating before retry
          await supabase
            .from("codex_sections")
            .update({ 
              status: "generating",
              retries: section.retries + 1,
              error_message: null
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
                error_message: `Retry failed: ${(error as Error).message}`
              })
              .eq("id", section.id);
          }
          
          return { success: false, sectionId: section.id, error: (error as Error).message };
        }
      });

      await Promise.all(batchPromises);
      
      // Add a small delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < pendingSections.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Retry complete: ${retriedCount} succeeded, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Retried ${pendingSections.length} sections`,
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
