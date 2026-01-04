import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCodexSectionNamesFromDB,
  getCompletedCodexContent,
  getDependencyCodexName,
  getCodexQuestionIds,
} from "../_shared/codex-db-helper.ts";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  /* ---------- CORS ---------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  /* ---------- HARD GUARD ---------- */
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST method required" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    /* ---------- ENV VALIDATION ---------- */
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env vars missing" }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ---------- SAFE JSON PARSE ---------- */
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400 }
      );
    }

    const { personaRunId, codexId } = body;

    if (!personaRunId) {
      return new Response(
        JSON.stringify({ error: "personaRunId is required" }),
        { status: 400 }
      );
    }

    console.log("🚀 Orchestration started:", { personaRunId, codexId });

    /* ---------- UPDATE RUN STATUS ---------- */
    await supabase
      .from("persona_runs")
      .update({ status: "generating", started_at: new Date().toISOString() })
      .eq("id", personaRunId);

    /* ---------- LOAD CODEXES ---------- */
    const { data: codexes, error } = await supabase
      .from("codexes")
      .select(
        `*, codex_prompt:codex_prompts!inner(id, depends_on_transcript)`
      )
      .eq("persona_run_id", personaRunId)
      .order("codex_order", { ascending: true });

    if (error || !codexes) {
      throw new Error("Failed to load codexes");
    }

    const validCodexes = codexes.filter((c) => c.total_sections > 0);

    let codexToProcess =
      codexId
        ? validCodexes.find((c) => c.id === codexId)
        : validCodexes.find(
          (c) =>
            !["ready", "ready_with_errors", "failed", "completed"].includes(
              c.status
            )
        );

    /* ---------- NOTHING LEFT ---------- */
    if (!codexToProcess) {
      await supabase
        .from("persona_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", personaRunId);

      return new Response(
        JSON.stringify({ success: true, message: "Run completed" }),
        { headers: corsHeaders }
      );
    }

    console.log("🧠 Processing codex:", codexToProcess.codex_name);

    /* ---------- DEPENDENCIES ---------- */
    const dependencies: string[] = [];
    const promptId = codexToProcess.codex_prompt?.id;

    if (promptId) {
      const { data } = await supabase
        .from("codex_prompt_dependencies")
        .select("depends_on_codex_id")
        .eq("codex_prompt_id", promptId);

      if (data) {
        for (const d of data) {
          const name = await getDependencyCodexName(
            supabase,
            d.depends_on_codex_id
          );
          if (name) dependencies.push(name);
        }
      }
    }

    for (const dep of dependencies) {
      const depCodex = validCodexes.find((c) => c.codex_name === dep);
      if (depCodex && !["ready", "ready_with_errors"].includes(depCodex.status)) {
        throw new Error(`Dependency ${dep} not ready`);
      }
    }

    /* ---------- PREPARE CONTENT ---------- */
    const { data: run } = await supabase
      .from("persona_runs")
      .select("answers_json, original_transcript")
      .eq("id", personaRunId)
      .single();

    const answers = run?.answers_json || {};
    let dependentContent: string | null = null;

    if (codexToProcess.codex_prompt?.depends_on_transcript) {
      dependentContent = run?.original_transcript || null;
    } else {
      let combined = "";
      for (const dep of dependencies) {
        const c = await getCompletedCodexContent(
          supabase,
          personaRunId,
          dep
        );
        if (c) combined += `\n=== ${dep.toUpperCase()} ===\n${c}`;
      }
      dependentContent = combined || null;
    }

    /* ---------- SECTION GENERATION ---------- */
    await supabase
      .from("codexes")
      .update({ status: "generating" })
      .eq("id", codexToProcess.id);

    const questionIds = await getCodexQuestionIds(supabase, promptId);
    const filteredAnswers =
      questionIds.length > 0
        ? Object.fromEntries(
          Object.entries(answers).filter(([k]) =>
            questionIds.includes(k)
          )
        )
        : answers;

    for (let i = 0; i < codexToProcess.total_sections; i++) {
      await fetch(`${supabaseUrl}/functions/v1/generate-codex-section`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codexId: codexToProcess.id,
          sectionIndex: i,
          userAnswers: filteredAnswers,
          dependentCodexContent: dependentContent,
        }),
      });
    }

    await supabase
      .from("codexes")
      .update({ status: "ready" })
      .eq("id", codexToProcess.id);

    /* ---------- AUTO CHAIN ---------- */
    if (!codexId) {
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/orchestrate-codexes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personaRunId }),
        })
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("❌ Orchestrate error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: corsHeaders }
    );
  }
});