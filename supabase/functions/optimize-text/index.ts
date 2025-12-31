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

    const { text, type } = await req.json();

    if (!text || !type) {
      return new Response(JSON.stringify({ error: "Missing text or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get default AI provider - prefer Lovable AI if available
    const { data: lovableProvider, error: lovableError } = await supabase
      .from("ai_providers")
      .select("id, provider_code, base_url, available_models, default_model")
      .eq("provider_code", "lovable")
      .eq("is_active", true)
      .single();

    console.log("Lovable provider query result:", lovableProvider ? "found" : "not found", lovableError?.message);

    const { data: defaultProvider, error: providerError } = await supabase
      .from("ai_providers")
      .select("id, provider_code, base_url, available_models, default_model, is_default")
      .eq("is_default", true)
      .single();

    console.log("Default provider query result:", defaultProvider?.provider_code || "not found", providerError?.message);

    // Use Lovable AI if available, otherwise fall back to default provider
    const provider = lovableProvider || defaultProvider;
    
    console.log("Selected provider:", provider?.provider_code);

    if (!provider) {
      return new Response(JSON.stringify({ error: "No AI provider configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Lovable AI, use the LOVABLE_API_KEY from env
    let apiKey: string | undefined;
    if (provider.provider_code === "lovable") {
      apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Get API key for the provider
      const { data: keyData, error: keyError } = await supabase
        .from("ai_provider_keys")
        .select("api_key_encrypted")
        .eq("provider_id", provider.id)
        .single();

      if (keyError || !keyData) {
        return new Response(JSON.stringify({ error: "No API key configured for provider" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiKey = keyData.api_key_encrypted;
    }

    const models = provider.available_models as any[];
    const model = provider.default_model || models?.[0]?.id || "google/gemini-2.5-flash";

    // Build the optimization prompt based on type
    let systemPrompt = "";
    if (type === "question") {
      systemPrompt = `You are an expert at writing clear, concise, and effective questionnaire questions. 
Your task is to optimize the given question to be more:
- Clear and unambiguous
- Concise without losing meaning
- Professional and engaging
- Focused on extracting valuable information

Return ONLY the optimized question text, nothing else.`;
    } else if (type === "prompt" || type === "system_prompt") {
      systemPrompt = `You are an expert at writing effective AI prompts. 
Your task is to optimize the given prompt to be more:
- Clear and specific in its instructions
- Well-structured with clear expectations
- Effective at guiding the AI to produce quality output
- Free of ambiguity

Return ONLY the optimized prompt text, nothing else.`;
    } else if (type === "section_prompt") {
      systemPrompt = `You are an expert at writing effective AI section prompts for document generation. 
Your task is to optimize the given section prompt to be more:
- Clear about what content should be generated
- Specific about tone, style, and format
- Structured to produce coherent, well-organized output
- Effective at leveraging provided context

Return ONLY the optimized section prompt text, nothing else.`;
    } else if (type === "merge_prompt") {
      systemPrompt = `You are an expert at writing effective merge prompts for combining AI outputs. 
Your task is to optimize the given merge prompt to be more:
- Clear about how to combine multiple inputs
- Specific about maintaining consistency
- Effective at producing a unified, coherent output

Return ONLY the optimized merge prompt text, nothing else.`;
    }

    // Call the AI provider
    let optimizedText = "";
    const providerCode = provider.provider_code;

    if (providerCode === "lovable") {
      // Use Lovable AI Gateway
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Optimize this ${type}:\n\n${text}` },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Lovable AI credits exhausted. Please add credits.");
        }
        const errorText = await response.text();
        throw new Error(`Lovable AI error: ${errorText}`);
      }

      const data = await response.json();
      optimizedText = data.choices?.[0]?.message?.content || "";
    } else if (providerCode === "openai" || providerCode === "deepseek" || providerCode === "perplexity") {
      const baseUrl = provider.base_url || "https://api.openai.com/v1";
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Optimize this ${type}:\n\n${text}` },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      optimizedText = data.choices?.[0]?.message?.content || "";
    } else if (providerCode === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            { role: "user", content: `Optimize this ${type}:\n\n${text}` },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      optimizedText = data.content?.[0]?.text || "";
    } else if (providerCode === "google") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nOptimize this ${type}:\n\n${text}` }] }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      optimizedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    console.log(`Optimized ${type} using ${providerCode}/${model}`);

    return new Response(
      JSON.stringify({ success: true, optimizedText: optimizedText.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error optimizing text:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
