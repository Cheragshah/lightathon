import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- TYPES ---------------- */

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

/* ---------------- SAFETY HELPERS ---------------- */

function safeString(value: any, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function ensureChatCompletionsUrl(baseUrl: any): string {
  const safeBase = safeString(baseUrl).trim();

  if (!safeBase) {
    throw new Error("AI provider baseUrl is missing or null");
  }

  const url = safeBase.replace(/\/+$/, "");

  if (url.endsWith("/chat/completions")) return url;
  if (url.endsWith("/v1")) return `${url}/chat/completions`;

  return `${url}/chat/completions`;
}

/* ---------------- PROVIDER CALLS ---------------- */

async function callOpenAI(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

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
    throw new Error(await response.text());
  }

  const data = await response.json();

  return {
    content: safeString(data?.choices?.[0]?.message?.content),
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

/* ---------------- ROUTER ---------------- */

export async function callAI(params: AICallParams): Promise<AIResponse> {
  const code = params.provider.providerCode;

  if (!params.provider.baseUrl) {
    throw new Error(`Provider ${code} has no baseUrl`);
  }

  switch (code) {
    case "openai":
    case "deepseek":
    case "perplexity":
      return callOpenAI(params);

    default:
      throw new Error(`Unsupported AI provider: ${code}`);
  }
}

/* ---------------- PROVIDER RESOLUTION ---------------- */

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
    .maybeSingle();

  if (!provider?.base_url) return null;

  const { data: key } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .maybeSingle();

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
      ai_provider_keys(api_key_encrypted)
    `)
    .eq("is_active", true)
    .limit(1);

  const p = data?.[0];
  const key = p?.ai_provider_keys?.[0]?.api_key_encrypted;

  if (!p?.base_url || !key) return null;

  return {
    providerCode: p.provider_code,
    name: p.name,
    baseUrl: p.base_url,
    apiKey: key,
    model: p.default_model ?? "gpt-4o-mini",
  };
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

export async function getProviderConfigWithFallback(
  supabase: SupabaseClient,
  providerId: string | null,
  modelName: string | null
): Promise<AIProviderConfig> {
  if (providerId && modelName) {
    const c = await getProviderConfig(supabase, providerId, modelName);
    if (c) return c;
  }

  const fallback = await getFirstAvailableProvider(supabase);
  if (fallback) return fallback;

  return getDefaultProvider();
}
