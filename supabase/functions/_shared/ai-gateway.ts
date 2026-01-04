import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIProviderConfig {
  providerCode: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
}

export interface AICallParams {
  systemPrompt: string;
  userPrompt: string;
  provider: AIProviderConfig;
  maxTokens?: number;
}

/* =========================
   SAFE URL BUILDER
========================= */
function ensureChatCompletionsUrl(baseUrl: string | null): string {
  if (!baseUrl) {
    throw new Error("AI provider baseUrl is missing. Check ai_providers table.");
  }

  const url = baseUrl.replace(/\/+$/, "");

  if (url.endsWith("/chat/completions")) {
    return url;
  }

  if (url.endsWith("/v1")) {
    return `${url}/chat/completions`;
  }

  return `${url}/chat/completions`;
}

/* =========================
   OPENAI / COMPATIBLE
========================= */
async function callOpenAI(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

  if (!provider.baseUrl) {
    throw new Error(`AI provider ${provider.providerCode} has no baseUrl configured`);
  }

  const url = ensureChatCompletionsUrl(provider.baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI-compatible API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    content: data?.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

/* =========================
   ANTHROPIC
========================= */
async function callAnthropic(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

  if (!provider.baseUrl) {
    throw new Error(`Anthropic provider baseUrl missing`);
  }

  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    content: data?.content?.[0]?.text ?? "",
    usage: {
      promptTokens: data?.usage?.input_tokens ?? 0,
      completionTokens: data?.usage?.output_tokens ?? 0,
      totalTokens:
        (data?.usage?.input_tokens ?? 0) +
        (data?.usage?.output_tokens ?? 0),
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

/* =========================
   GOOGLE GEMINI
========================= */
async function callGoogleGemini(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider } = params;

  if (!provider.baseUrl) {
    throw new Error(`Google provider baseUrl missing`);
  }

  const url = `${provider.baseUrl}/${provider.model}:generateContent?key=${provider.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Gemini error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    content: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    usage: {
      promptTokens: data?.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

/* =========================
   ROUTER
========================= */
export async function callAI(params: AICallParams): Promise<AIResponse> {
  switch (params.provider.providerCode) {
    case "openai":
    case "deepseek":
    case "perplexity":
      return callOpenAI(params);
    case "anthropic":
      return callAnthropic(params);
    case "google":
      return callGoogleGemini(params);
    default:
      throw new Error(`Unsupported AI provider: ${params.provider.providerCode}`);
  }
}

/* =========================
   PROVIDER FETCHING
========================= */
export async function getProviderConfig(
  supabase: SupabaseClient,
  providerId: string,
  modelName: string
): Promise<AIProviderConfig | null> {
  const { data: provider } = await supabase
    .from("ai_providers")
    .select("provider_code, name, base_url")
    .eq("id", providerId)
    .eq("is_active", true)
    .single();

  if (!provider?.base_url) return null;

  const { data: key } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .single();

  if (!key?.api_key_encrypted) return null;

  return {
    providerCode: provider.provider_code,
    name: provider.name,
    baseUrl: provider.base_url,
    apiKey: key.api_key_encrypted,
    model: modelName,
  };
}

export async function getFirstAvailableProvider(
  supabase: SupabaseClient
): Promise<AIProviderConfig | null> {
  const { data } = await supabase
    .from("ai_providers")
    .select(`
      provider_code,
      name,
      base_url,
      default_model,
      ai_provider_keys!inner(api_key_encrypted)
    `)
    .eq("is_active", true)
    .eq("ai_provider_keys.is_active", true)
    .order("is_default", { ascending: false })
    .limit(1);

  if (!data?.[0]?.base_url) return null;

  return {
    providerCode: data[0].provider_code,
    name: data[0].name,
    baseUrl: data[0].base_url,
    apiKey: data[0].ai_provider_keys[0].api_key_encrypted,
    model: data[0].default_model || "gpt-4o-mini",
  };
}

export async function getProviderConfigWithFallback(
  supabase: SupabaseClient,
  providerId: string | null,
  modelName: string | null
): Promise<AIProviderConfig> {
  if (providerId && modelName) {
    const cfg = await getProviderConfig(supabase, providerId, modelName);
    if (cfg) return cfg;
  }

  const fallback = await getFirstAvailableProvider(supabase);
  if (fallback) return fallback;

  return getDefaultProvider();
}

export function getDefaultProvider(): AIProviderConfig {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY missing");

  return {
    providerCode: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: key,
    model: "gpt-4o-mini",
  };
}
