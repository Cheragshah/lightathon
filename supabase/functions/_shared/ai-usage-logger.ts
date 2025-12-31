import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface LogUsageParams {
  supabase: SupabaseClient;
  userId: string;
  functionName: string;
  model: string;
  usage: UsageData;
  personaRunId?: string;
  codexId?: string;
  status?: "success" | "error";
  errorMessage?: string;
  providerCode?: string;
  executionMode?: string;
  parentRunId?: string;
}

// OpenAI pricing per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "o1": { input: 15.0, output: 60.0 },
  "o1-mini": { input: 3.0, output: 12.0 },
  // Anthropic Claude
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  // Google Gemini (estimated)
  "gemini-2.0-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  // DeepSeek
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  // Perplexity (estimated)
  "sonar": { input: 1.0, output: 1.0 },
  "sonar-pro": { input: 3.0, output: 15.0 },
  "sonar-reasoning": { input: 1.0, output: 5.0 },
  // Legacy models
  "gpt-5-2025-08-07": { input: 3.0, output: 15.0 },
  "gpt-5-mini-2025-08-07": { input: 0.3, output: 1.2 },
  "gpt-5-nano-2025-08-07": { input: 0.1, output: 0.4 },
  "gpt-4.1-2025-04-14": { input: 2.5, output: 10.0 },
  "gpt-4.1-mini-2025-04-14": { input: 0.15, output: 0.6 },
  "o3-2025-04-16": { input: 10.0, output: 40.0 },
  "o4-mini-2025-04-16": { input: 1.1, output: 4.4 },
};

function calculateCost(model: string, usage: UsageData): number {
  const pricing = PRICING[model] || { input: 0, output: 0 };

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

export async function logAIUsage({
  supabase,
  userId,
  functionName,
  model,
  usage,
  personaRunId,
  codexId,
  status = "success",
  errorMessage,
  providerCode,
  executionMode,
  parentRunId,
}: LogUsageParams): Promise<void> {
  try {
    const estimatedCost = calculateCost(model, usage);

    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      function_name: functionName,
      model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost: estimatedCost,
      persona_run_id: personaRunId,
      codex_id: codexId,
      status,
      error_message: errorMessage,
      provider_code: providerCode,
      model_name: model,
      execution_mode: executionMode,
      parent_run_id: parentRunId,
    });

    console.log(`Logged AI usage: ${functionName}, ${providerCode || 'openai'}/${model}, ${usage.totalTokens} tokens, $${estimatedCost.toFixed(6)}`);
  } catch (error) {
    console.error("Failed to log AI usage:", error);
    // Don't throw - logging should not break the main flow
  }
}
