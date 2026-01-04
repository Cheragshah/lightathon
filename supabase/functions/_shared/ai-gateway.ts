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

// Helper to ensure URL has /chat/completions endpoint
function ensureChatCompletionsUrl(baseUrl: string): string {
  const url = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  return `${url}/chat/completions`;
}

// Provider-specific API call implementations
async function callOpenAI(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

  const url = ensureChatCompletionsUrl(provider.baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(maxTokens && { max_tokens: maxTokens }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

async function callAnthropic(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

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
      messages: [
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";

  return {
    content,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

async function callGoogleGemini(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider } = params;

  // Google Gemini uses a different URL structure
  const url = `${provider.baseUrl}/${provider.model}:generateContent?key=${provider.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    content,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}

async function callDeepSeek(params: AICallParams): Promise<AIResponse> {
  // DeepSeek uses OpenAI-compatible API
  return callOpenAI(params);
}

async function callPerplexity(params: AICallParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, provider, maxTokens } = params;

  const url = ensureChatCompletionsUrl(provider.baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(maxTokens && { max_tokens: maxTokens }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    provider: provider.providerCode,
    model: provider.model,
  };
}



// Main router function
export async function callAI(params: AICallParams): Promise<AIResponse> {
  const { provider } = params;

  switch (provider.providerCode) {

    case "openai":
      return callOpenAI(params);
    case "anthropic":
      return callAnthropic(params);
    case "google":
      return callGoogleGemini(params);
    case "deepseek":
      return callDeepSeek(params);
    case "perplexity":
      return callPerplexity(params);
    default:
      throw new Error(`Unsupported AI provider: ${provider.providerCode}`);
  }
}

// Helper to get provider config from database
export async function getProviderConfig(
  supabase: SupabaseClient,
  providerId: string,
  modelName: string
): Promise<AIProviderConfig | null> {
  // Get provider info
  const { data: provider, error: providerError } = await supabase
    .from("ai_providers")
    .select("id, provider_code, name, base_url")
    .eq("id", providerId)
    .eq("is_active", true)
    .single();

  if (providerError || !provider) {
    console.error("Provider not found:", providerError);
    return null;
  }

  // Get API key
  const { data: keyData, error: keyError } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted")
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .single();

  if (keyError || !keyData) {
    console.error("API key not found for provider:", provider.provider_code);
    return null;
  }

  return {
    providerCode: provider.provider_code,
    name: provider.name,
    baseUrl: provider.base_url,
    apiKey: keyData.api_key_encrypted, // In production, this would be decrypted
    model: modelName,
  };
}



// Get the first available provider with an API key configured
export async function getFirstAvailableProvider(
  supabase: SupabaseClient
): Promise<AIProviderConfig | null> {


  // Get all active providers that have API keys
  const { data: providers } = await supabase
    .from("ai_providers")
    .select(`
      id, 
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

  if (!providers || providers.length === 0) {
    console.log("No providers with API keys found");
    return null;
  }

  const provider = providers[0];
  const apiKey = (provider.ai_provider_keys as any)?.[0]?.api_key_encrypted;

  if (!apiKey) {
    return null;
  }

  return {
    providerCode: provider.provider_code,
    name: provider.name,
    baseUrl: provider.base_url,
    apiKey: apiKey,
    model: provider.default_model || "gpt-4o-mini",
  };
}

// Get provider config with automatic fallback if not available
export async function getProviderConfigWithFallback(
  supabase: SupabaseClient,
  providerId: string | null,
  modelName: string | null
): Promise<AIProviderConfig> {
  // Try requested provider first
  if (providerId && modelName) {
    const config = await getProviderConfig(supabase, providerId, modelName);
    if (config) {
      console.log(`Using configured provider: ${config.name} / ${config.model}`);
      return config;
    }
    console.log(`Provider ${providerId} not available, falling back...`);
  }

  // Try to find any available provider from database
  const availableProvider = await getFirstAvailableProvider(supabase);
  if (availableProvider) {
    console.log(`Fallback to available provider: ${availableProvider.name} / ${availableProvider.model}`);
    return availableProvider;
  }

  // Last resort: use default OpenAI from environment
  console.log("No database providers available, using default OpenAI");
  return getDefaultProvider();
}

// Get default provider - fallback to OpenAI
export function getDefaultProvider(): AIProviderConfig {
  // Fallback to OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("No AI provider API key configured (OPENAI_API_KEY)");
  }

  return {
    providerCode: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: openaiKey,
    model: "gpt-4o-mini",
  };
}

// Execute parallel AI calls and merge results
export async function executeParallelMerge(
  providers: AIProviderConfig[],
  systemPrompt: string,
  userPrompt: string,
  mergeProvider: AIProviderConfig,
  mergePrompt: string
): Promise<{ results: AIResponse[]; mergedResult: AIResponse }> {
  // Execute all providers in parallel
  const promises = providers.map(provider =>
    callAI({ systemPrompt, userPrompt, provider })
  );

  const results = await Promise.all(promises);

  // Build merge context
  const mergeContext = results.map((r, i) =>
    `=== RESULT FROM ${providers[i].name} (${providers[i].model}) ===\n${r.content}`
  ).join("\n\n");

  const mergeUserPrompt = `${mergePrompt}\n\n${mergeContext}`;

  // Call merge model
  const mergedResult = await callAI({
    systemPrompt: "You are an expert at synthesizing and merging multiple AI-generated responses into a cohesive, comprehensive answer.",
    userPrompt: mergeUserPrompt,
    provider: mergeProvider,
  });

  return { results, mergedResult };
}

// Execute sequential chain
export async function executeSequentialChain(
  steps: Array<{
    provider: AIProviderConfig;
    customPrompt?: string;
    stepType: "generate" | "merge";
  }>,
  systemPrompt: string,
  initialUserPrompt: string
): Promise<{ steps: AIResponse[]; finalResult: AIResponse }> {
  const stepResults: AIResponse[] = [];
  let currentInput = initialUserPrompt;

  for (const step of steps) {
    const prompt = step.customPrompt
      ? `${step.customPrompt}\n\nPrevious output:\n${currentInput}`
      : currentInput;

    const result = await callAI({
      systemPrompt,
      userPrompt: prompt,
      provider: step.provider,
    });

    stepResults.push(result);
    currentInput = result.content;
  }

  return {
    steps: stepResults,
    finalResult: stepResults[stepResults.length - 1],
  };
}