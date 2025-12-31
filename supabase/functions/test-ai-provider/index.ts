import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, AIProviderConfig } from "../_shared/ai-gateway.ts";

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

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { providerId, apiKey, model } = await req.json();

    if (!providerId || !apiKey || !model) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get provider info
    const { data: provider, error: providerError } = await supabase
      .from("ai_providers")
      .select("provider_code, name, base_url")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config: AIProviderConfig = {
      providerCode: provider.provider_code,
      name: provider.name,
      baseUrl: provider.base_url,
      apiKey,
      model,
    };

    console.log(`Testing ${provider.name} with model ${model}`);

    // Test with a simple prompt
    const result = await callAI({
      systemPrompt: "You are a helpful assistant.",
      userPrompt: "Say 'Hello, the API connection is working!' in exactly one sentence.",
      provider: config,
    });

    // Update key status in database if key was saved
    const { data: existingKey } = await supabase
      .from("ai_provider_keys")
      .select("id")
      .eq("provider_id", providerId)
      .single();

    if (existingKey) {
      await supabase
        .from("ai_provider_keys")
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: "success",
        })
        .eq("id", existingKey.id);
    }

    console.log(`✓ ${provider.name} test successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: result.content,
        usage: result.usage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Test failed:", error);

    // Try to update status to failed
    try {
      const { providerId } = await req.json();
      if (providerId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: existingKey } = await supabase
          .from("ai_provider_keys")
          .select("id")
          .eq("provider_id", providerId)
          .single();

        if (existingKey) {
          await supabase
            .from("ai_provider_keys")
            .update({
              last_tested_at: new Date().toISOString(),
              test_status: "failed",
            })
            .eq("id", existingKey.id);
        }
      }
    } catch {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so frontend can handle error gracefully
      }
    );
  }
});
