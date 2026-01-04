import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST required" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // 1️⃣ ENV CHECK
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Supabase env vars missing");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 2️⃣ SAFE BODY PARSE
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const personaRunId = String(body.personaRunId || "").trim();
    const codexId = body.codexId ? String(body.codexId) : null;

    if (!personaRunId) {
      throw new Error("personaRunId is required");
    }

    console.log("▶ Orchestrate start", { personaRunId, codexId });

    // 3️⃣ LOAD CODEXES
    const { data: codexes, error } = await supabase
      .from("codexes")
      .select("*")
      .eq("persona_run_id", personaRunId)
      .order("codex_order", { ascending: true });

    if (error || !codexes || codexes.length === 0) {
      throw new Error("No codexes found");
    }

    const codexToProcess =
      codexId
        ? codexes.find(c => c.id === codexId)
        : codexes.find(
          c => !["ready", "ready_with_errors", "failed"].includes(c.status)
        );

    if (!codexToProcess) {
      await supabase
        .from("persona_runs")
        .update({ status: "completed" })
        .eq("id", personaRunId);

      return new Response(
        JSON.stringify({ success: true, message: "Run completed" }),
        { headers: corsHeaders }
      );
    }

    // 4️⃣ LOAD RUN DATA
    const { data: run } = await supabase
      .from("persona_runs")
      .select("answers_json, original_transcript")
      .eq("id", personaRunId)
      .single();

    const userAnswers = run?.answers_json || {};
    const transcript = run?.original_transcript || "";

    // 🔒 GUARANTEE STRINGS
    const safeTranscript = typeof transcript === "string" ? transcript : "";

    // 5️⃣ GENERATE SECTIONS
    await supabase
      .from("codexes")
      .update({ status: "generating" })
      .eq("id", codexToProcess.id);

    const total = Number(codexToProcess.total_sections || 0);

    for (let i = 0; i < total; i++) {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-codex-section`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codexId: String(codexToProcess.id),
            sectionIndex: i,
            userAnswers,
            dependentCodexContent: safeTranscript, // 🔑 NEVER NULL
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Section ${i} failed: ${text}`);
      }
    }

    await supabase
      .from("codexes")
      .update({ status: "ready" })
      .eq("id", codexToProcess.id);

    // 6️⃣ AUTO CHAIN
    if (!codexId) {
      EdgeRuntime.waitUntil(
        fetch(`${SUPABASE_URL}/functions/v1/orchestrate-codexes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
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
    console.error("❌ Orchestrate error", err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
