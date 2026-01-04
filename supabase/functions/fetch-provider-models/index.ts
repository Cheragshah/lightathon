import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Curated top 5 models per provider - only the most useful ones
const CURATED_MODELS = {

  openai: [
    { id: "gpt-5", name: "GPT-5", context_window: 128000, supports_vision: true },
    { id: "gpt-5-mini", name: "GPT-5 Mini", context_window: 128000, supports_vision: true },
    { id: "gpt-5-turbo", name: "GPT-5 Turbo", context_window: 128000, supports_vision: true },
    { id: "o3", name: "o3 Reasoning", context_window: 200000, supports_vision: false },
    { id: "o1", name: "o1 Reasoning", context_window: 200000, supports_vision: false },
  ],
  anthropic: [
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", context_window: 200000, supports_vision: true },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", context_window: 200000, supports_vision: true },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", context_window: 200000, supports_vision: true },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", context_window: 200000, supports_vision: true },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", context_window: 200000, supports_vision: true },
  ],
  google: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context_window: 2000000, supports_vision: true },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context_window: 1000000, supports_vision: true },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", context_window: 1000000, supports_vision: true },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", context_window: 2000000, supports_vision: true },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", context_window: 1000000, supports_vision: true },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek Chat", context_window: 64000, supports_vision: false },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner", context_window: 64000, supports_vision: false },
    { id: "deepseek-coder", name: "DeepSeek Coder", context_window: 64000, supports_vision: false },
  ],
  perplexity: [
    { id: "llama-3.1-sonar-small-128k-online", name: "Sonar Small Online", context_window: 128000, supports_vision: false },
    { id: "llama-3.1-sonar-large-128k-online", name: "Sonar Large Online", context_window: 128000, supports_vision: false },
    { id: "llama-3.1-sonar-huge-128k-online", name: "Sonar Huge Online", context_window: 128000, supports_vision: false },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { providerId } = await req.json();

    if (!providerId) {
      return new Response(JSON.stringify({ error: "Missing providerId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get provider details
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("id, provider_code, base_url")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use curated models - no need to call external APIs
    const providerCode = provider.provider_code as keyof typeof CURATED_MODELS;
    const models = CURATED_MODELS[providerCode] || [];

    // Update the provider's available_models in database
    if (models.length > 0) {
      const { error: updateError } = await supabase
        .from("ai_providers")
        .update({ available_models: models, updated_at: new Date().toISOString() })
        .eq("id", providerId);

      if (updateError) {
        console.error("Error updating models:", updateError);
      }
    }

    console.log(`Loaded ${models.length} curated models for provider ${provider.provider_code}`);

    return new Response(
      JSON.stringify({ success: true, models }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
