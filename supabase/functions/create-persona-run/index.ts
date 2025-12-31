import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getActiveCodexConfigFromDB } from "../_shared/codex-db-helper.ts";

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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is blocked
    const { data: isBlocked } = await supabase.rpc("is_user_blocked", {
      user_id: user.id
    });

    if (isBlocked) {
      return new Response(
        JSON.stringify({ error: "Your account has been blocked from generating personas. Please contact support." }), 
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase.rpc("get_user_role", {
      _user_id: user.id
    });
    const isAdmin = userRole === 'admin';

    // If not admin, check run limits
    if (!isAdmin) {
      // Check existing persona runs count
      const { count: existingRunsCount } = await supabase
        .from("persona_runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check if user has unlimited runs permission
      const { data: unlimitedPermission } = await supabase
        .from("user_unlimited_runs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if ((existingRunsCount || 0) >= 1 && !unlimitedPermission) {
        return new Response(
          JSON.stringify({ 
            error: "You have already created a persona run. Please contact the administrator if you need to create another one." 
          }), 
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { title, answers } = await req.json();

    // Validate input - support both new format (object with question/answer) and legacy format (string)
    // Increased limit to 50000 characters to allow for longer, detailed responses
    const answerSchema = z.union([
      z.string().max(50000), // Legacy format
      z.object({
        question: z.string(),
        answer: z.string().max(50000),
        category: z.string(),
      }), // New format
    ]);

    const inputSchema = z.object({
      title: z.string().trim().min(1).max(200).optional(),
      answers: z.record(answerSchema),
    });

    let validatedInput;
    try {
      validatedInput = inputSchema.parse({ title, answers });
    } catch (validationError: any) {
      if (validationError.name === 'ZodError') {
        const issue = validationError.issues[0];
        const field = issue.path.join(' -> ');
        console.error('Validation error:', issue);
        return new Response(
          JSON.stringify({ 
            error: `Validation error: ${issue.message}${field ? ` (in ${field})` : ''}` 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw validationError;
    }

    console.log("Creating persona run for user:", user.id);

    // Create persona run
    const { data: personaRun, error: runError } = await supabase
      .from("persona_runs")
      .insert({
        user_id: user.id,
        title: validatedInput.title || "My Coach Persona",
        answers_json: validatedInput.answers,
        status: "pending",
        source_type: "questionnaire",
      })
      .select()
      .single();

    if (runError) {
      console.error("Error creating persona run:", runError);
      throw runError;
    }

    console.log("Persona run created:", personaRun.id);

    // Get active codex configuration from database
    const activeCodexConfig = await getActiveCodexConfigFromDB(supabase);
    
    if (!activeCodexConfig || activeCodexConfig.length === 0) {
      throw new Error("No active codexes found in database");
    }

    // Create codex records for all active codexes
    const codexRecords = activeCodexConfig.map((config) => ({
      persona_run_id: personaRun.id,
      codex_name: config.name,
      codex_order: config.order,
      status: "not_started",
      total_sections: config.sections,
      completed_sections: 0,
      codex_prompt_id: config.id,
    }));

    const { error: codexError } = await supabase
      .from("codexes")
      .insert(codexRecords);

    if (codexError) {
      console.error("Error creating codexes:", codexError);
      throw codexError;
    }

    console.log(`Created ${activeCodexConfig.length} active codex records`);

    // Start orchestration in background
    console.log("Triggering codex orchestration...");
    
    // Call orchestration function (fire and forget)
    fetch(`${supabaseUrl}/functions/v1/orchestrate-codexes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ personaRunId: personaRun.id }),
    }).catch(err => console.error("Failed to trigger orchestration:", err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        personaRunId: personaRun.id,
        message: "Persona run created. Generation starting..."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-persona-run:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
