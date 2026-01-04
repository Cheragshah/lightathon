import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-usage-logger.ts";
import { getCodexPromptFromDB } from "../_shared/codex-db-helper.ts";
import {
  callAI,
  getProviderConfigWithFallback,
  getDefaultProvider,
  executeParallelMerge,
  executeSequentialChain,
  AIProviderConfig,
  AIResponse
} from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;

// Default pricing brackets for L1, L2, L3 offers (used as fallback)
const DEFAULT_PRICING_BRACKETS = {
  L1: { min: 4000, max: 19999 },
  L2: { min: 22500, max: 56500 },
  L3: { min: 89999, max: 325000 },
};

interface PricingBracket {
  min: number;
  max: number;
}

interface PricingBrackets {
  L1: PricingBracket;
  L2: PricingBracket;
  L3: PricingBracket;
}

// Fetch pricing brackets from database or use defaults
async function getPricingBrackets(supabase: any): Promise<PricingBrackets> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "pricing_brackets")
      .maybeSingle();

    if (error) {
      console.warn("Error fetching pricing brackets:", error);
      return DEFAULT_PRICING_BRACKETS;
    }

    if (data?.setting_value) {
      let value = data.setting_value;
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          return DEFAULT_PRICING_BRACKETS;
        }
      }
      // Validate the structure
      if (
        typeof value === "object" &&
        value !== null &&
        "L1" in value &&
        "L2" in value &&
        "L3" in value
      ) {
        console.log("Using custom pricing brackets from database");
        return value as PricingBrackets;
      }
    }
    return DEFAULT_PRICING_BRACKETS;
  } catch (err) {
    console.warn("Failed to fetch pricing brackets:", err);
    return DEFAULT_PRICING_BRACKETS;
  }
}

// Market-researched psychologically appealing price points for Indian coaching industry
const PRICE_POINTS = {
  L1: [4999, 5999, 6999, 7499, 7999, 8999, 9999, 10999, 11999, 12999, 14999, 15999, 17999, 18999, 19999],
  L2: [22999, 24999, 27999, 29999, 32999, 34999, 37999, 39999, 42999, 44999, 47999, 49999, 52999, 54999, 56499],
  L3: [89999, 94999, 99999, 109999, 119999, 124999, 149999, 174999, 199999, 224999, 249999, 274999, 299999, 324999],
};

// Generate truly random prices by selecting from market-based price points within admin brackets
function generateDynamicPrices(brackets: PricingBrackets): { l1: number; l2: number; l3: number } {
  // Filter price points to only those within the admin-defined brackets
  const validL1 = PRICE_POINTS.L1.filter(p => p >= brackets.L1.min && p <= brackets.L1.max);
  const validL2 = PRICE_POINTS.L2.filter(p => p >= brackets.L2.min && p <= brackets.L2.max);
  const validL3 = PRICE_POINTS.L3.filter(p => p >= brackets.L3.min && p <= brackets.L3.max);

  // Randomly select one price point from each tier (with fallback to bracket min)
  const selectRandom = (arr: number[], fallback: number) =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : fallback;

  const result = {
    l1: selectRandom(validL1, brackets.L1.min),
    l2: selectRandom(validL2, brackets.L2.min),
    l3: selectRandom(validL3, brackets.L3.min),
  };

  console.log(`Generated dynamic prices - L1: ₹${result.l1}, L2: ₹${result.l2}, L3: ₹${result.l3}`);
  console.log(`Valid price points - L1: ${validL1.length}, L2: ${validL2.length}, L3: ${validL3.length}`);

  return result;
}

// Format price in Indian rupee format
function formatIndianPrice(price: number): string {
  return price.toLocaleString('en-IN');
}

// Helper function to clean markdown and special characters from AI output
function cleanMarkdownFromText(text: any): string {
  const safeText = typeof text === "string" ? text : "";

  return safeText
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\*\-•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

// Validation helpers
function validateContent(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for markdown
  if (content.includes("**") || content.includes("##") || content.includes("* ")) {
    issues.push("Contains markdown formatting");
  }

  // Check for bullets
  if (content.match(/^[\s]*[-•*]\s/m)) {
    issues.push("Contains bullet points");
  }

  // Check minimum length (should be substantial)
  if (content.length < 500) {
    issues.push("Content too short");
  }

  // Check for AI meta-commentary
  if (content.toLowerCase().includes("as an ai") || content.toLowerCase().includes("i am an ai")) {
    issues.push("Contains AI meta-commentary");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// Get AI configuration from CODEX level (not section level)
async function getCodexAIConfig(supabase: any, codexPromptId: string) {
  const { data: codexPrompt } = await supabase
    .from("codex_prompts")
    .select(`
      ai_execution_mode,
      primary_provider_id,
      primary_model,
      merge_provider_id,
      merge_model,
      merge_prompt
    `)
    .eq("id", codexPromptId)
    .single();

  return codexPrompt;
}

// Get AI steps from CODEX level (for parallel/chain execution)
async function getCodexAISteps(supabase: any, codexPromptId: string) {
  const { data: steps } = await supabase
    .from("codex_ai_steps")
    .select(`
      step_order,
      provider_id,
      model_name,
      step_type,
      custom_prompt,
      provider:ai_providers(provider_code, name, base_url)
    `)
    .eq("codex_prompt_id", codexPromptId)
    .order("step_order", { ascending: true });

  return steps || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { codexId, codexName, sectionIndex, userAnswers, dependentCodexContent } = await req.json();

    console.log(`Generating ${codexName} - Section ${sectionIndex + 1}`);

    // Get section record with codex and persona run info
    const { data: section, error: sectionError } = await supabase
      .from("codex_sections")
      .select(`
        *,
        codex:codexes(
          id,
          codex_prompt_id,
          persona_run:persona_runs(id, user_id)
        )
      `)
      .eq("codex_id", codexId)
      .eq("section_index", sectionIndex)
      .single();

    if (sectionError || !section) {
      throw new Error("Section not found");
    }

    const codexPromptId = (section.codex as any)?.codex_prompt_id;

    // Get user profile data
    const userId = (section.codex as any)?.persona_run?.user_id;
    let profileData = null;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, title, location, website_social")
        .eq("id", userId)
        .single();

      profileData = profile;
    }

    // Update section status
    await supabase
      .from("codex_sections")
      .update({ status: "generating" })
      .eq("id", section.id);

    // Get prompts from database
    const promptConfig = await getCodexPromptFromDB(supabase, codexName, sectionIndex);

    if (!promptConfig) {
      throw new Error(`No prompt configuration found in database for ${codexName} section ${sectionIndex}`);
    }

    const { systemPrompt: baseSystemPrompt, sectionName, sectionPrompt, wordCountTarget } = promptConfig;

    // Fetch global AI persona prompt
    let globalPersonaPrompt = "";
    try {
      const { data: personaSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "global_ai_persona_prompt")
        .maybeSingle();

      if (personaSetting?.setting_value) {
        let promptValue = personaSetting.setting_value;
        // Handle JSON string
        if (typeof promptValue === 'string') {
          try {
            promptValue = JSON.parse(promptValue);
          } catch {
            // If parsing fails, use as-is
          }
        }
        globalPersonaPrompt = promptValue;
        console.log("Using global persona prompt for first-person voice");
      }
    } catch (err) {
      console.warn("Could not fetch global persona prompt:", err);
    }

    // Combine global persona prompt with system prompt
    const systemPrompt = globalPersonaPrompt
      ? `${globalPersonaPrompt}\n\n---\n\n${baseSystemPrompt}`
      : baseSystemPrompt;

    // Get AI configuration from CODEX level (not section level)
    let aiConfig = null;
    if (codexPromptId) {
      aiConfig = await getCodexAIConfig(supabase, codexPromptId);
    }

    const executionMode = aiConfig?.ai_execution_mode || 'single';
    console.log(`Using execution mode: ${executionMode}`);

    // Build enhanced context starting with profile information
    let userContext = "";

    // Add profile information if available
    if (profileData) {
      userContext += "COACH PROFILE:\n\n";
      if (profileData.full_name) {
        userContext += `Name: ${profileData.full_name}\n`;
      }
      if (profileData.title) {
        userContext += `Title: ${profileData.title}\n`;
      }
      if (profileData.location) {
        userContext += `Location: ${profileData.location}\n`;
      }
      if (profileData.website_social) {
        userContext += `Website/Social: ${profileData.website_social}\n`;
      }
      userContext += "\n";
    }

    userContext += "USER'S BACKGROUND AND PROFILE:\n\n";


    // Check if answers have the new format with question text
    const hasQuestionText = Object.values(userAnswers).some(
      v => typeof v === 'object' && v !== null && 'question' in v && 'answer' in v
    );

    if (hasQuestionText) {
      // New format: { question, answer, category }
      const categoryMap = new Map<string, Array<{ question: string; answer: string }>>();

      Object.entries(userAnswers).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
          const category = (value as any).category || 'General';
          if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
          }
          categoryMap.get(category)!.push({
            question: (value as any).question,
            answer: (value as any).answer,
          });
        }
      });

      // Format by category with questions
      categoryMap.forEach((items, category) => {
        userContext += `=== ${category.toUpperCase()} ===\n`;
        items.forEach(({ question, answer }, idx) => {
          userContext += `Q${idx + 1}: ${question}\nA: ${answer}\n\n`;
        });
      });
    } else {
      // Legacy format: just answer strings
      const backstoryAnswers: string[] = [];
      const anchorAnswers: string[] = [];
      const extendedAnswers: string[] = [];

      // Organize answers by category
      Object.entries(userAnswers).forEach(([key, value]) => {
        if (key.startsWith('backstory_')) {
          backstoryAnswers.push(value as string);
        } else if (key.startsWith('anchor_')) {
          anchorAnswers.push(value as string);
        } else if (key.startsWith('extended_')) {
          extendedAnswers.push(value as string);
        }
      });

      if (backstoryAnswers.length > 0) {
        userContext += "=== BACKSTORY ===\n";
        backstoryAnswers.forEach((answer, idx) => {
          userContext += `${idx + 1}. ${answer}\n\n`;
        });
      }

      if (anchorAnswers.length > 0) {
        userContext += "=== EXPERTISE & TARGET AUDIENCE ===\n";
        anchorAnswers.forEach((answer, idx) => {
          userContext += `${idx + 1}. ${answer}\n\n`;
        });
      }

      if (extendedAnswers.length > 0) {
        userContext += "=== BRAND VISION & GOALS ===\n";
        extendedAnswers.forEach((answer, idx) => {
          userContext += `${idx + 1}. ${answer}\n\n`;
        });
      }
    }

    const wordCountInstruction = wordCountTarget
      ? `\n\nTarget word count: approximately ${wordCountTarget} words.`
      : '';

    // Add dependent codex content if provided
    const dependencyContext = dependentCodexContent
      ? `\n\nREFERENCE CODEX CONTENT:\nThe following is generated content from a previous codex that you should build upon and reference while creating this section:\n\n${dependentCodexContent}\n\n`
      : '';

    // Generate dynamic pricing only for codexes with use_pricing_brackets enabled
    let pricingContext = '';
    let shouldUsePricing = false;

    // Check if this codex has pricing brackets enabled
    if (codexPromptId) {
      const { data: codexPromptData } = await supabase
        .from("codex_prompts")
        .select("use_pricing_brackets")
        .eq("id", codexPromptId)
        .single();

      shouldUsePricing = codexPromptData?.use_pricing_brackets === true;
      console.log(`Codex ${codexName} use_pricing_brackets: ${shouldUsePricing}`);
    }

    if (shouldUsePricing) {
      // Fetch pricing brackets from database
      const pricingBrackets = await getPricingBrackets(supabase);
      const prices = generateDynamicPrices(pricingBrackets);
      console.log(`Generated dynamic prices - L1: ₹${formatIndianPrice(prices.l1)}, L2: ₹${formatIndianPrice(prices.l2)}, L3: ₹${formatIndianPrice(prices.l3)}`);

      pricingContext = `

=== MANDATORY PRICING FOR THIS COACH ===

You MUST use the following EXACT prices in your offer strategy output. Do NOT deviate from these prices:

• L1 (Foundation/Entry) Program Price: ₹${formatIndianPrice(prices.l1)}
• L2 (Growth/Mid-tier) Program Price: ₹${formatIndianPrice(prices.l2)}  
• L3 (Premium/Transformation) Program Price: ₹${formatIndianPrice(prices.l3)}

These prices have been specifically calculated based on the coach's profile, niche positioning, and target market. Use these exact amounts when describing each tier's pricing in the output.

`;
    }

    const userPrompt = `${sectionPrompt}${wordCountInstruction}\n\n${userContext}${dependencyContext}${pricingContext}\n\nGenerate the content for this section following the instructions above. Write in clean human language without markdown, bullets, or formatting characters.`;

    // Execute based on mode
    let content = "";
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let retryCount = 0;
    let lastError = "";
    let usedProvider = "openai";
    let usedModel = "gpt-4o-mini";

    if (executionMode === 'single') {
      // Single mode - get provider config with fallback
      const provider = await getProviderConfigWithFallback(
        supabase,
        aiConfig?.primary_provider_id,
        aiConfig?.primary_model
      );

      usedProvider = provider.providerCode;
      usedModel = provider.model;
      console.log(`Using provider: ${provider.name}, model: ${provider.model}`);

      while (retryCount < MAX_RETRIES) {
        try {
          const result = await callAI({
            systemPrompt,
            userPrompt,
            provider,
          });

          content = result.content;
          totalUsage = result.usage;

          // Validate content
          const validation = validateContent(content);
          if (validation.valid) {
            break; // Success!
          } else {
            lastError = `Validation failed: ${validation.issues.join(", ")}`;
            console.warn(`Attempt ${retryCount + 1} failed validation:`, validation.issues);
            retryCount++;
          }
        } catch (error) {
          lastError = (error as Error).message;
          console.error(`Attempt ${retryCount + 1} failed:`, error);
          retryCount++;

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } else if (executionMode === 'parallel_merge') {
      // Parallel merge mode - get AI steps from CODEX level
      console.log("Executing parallel merge mode");

      const steps = codexPromptId ? await getCodexAISteps(supabase, codexPromptId) : [];

      if (steps.length === 0) {
        // Fall back to single mode with fallback provider
        console.log("No parallel steps configured, falling back to single mode");
        const provider = await getProviderConfigWithFallback(supabase, null, null);
        const result = await callAI({ systemPrompt, userPrompt, provider });
        content = result.content;
        totalUsage = result.usage;
        usedProvider = provider.providerCode;
        usedModel = provider.model;
      } else {
        // Build provider configs for parallel execution with fallback
        const parallelProviders: AIProviderConfig[] = [];
        for (const step of steps.filter((s: any) => s.step_type === 'generate')) {
          const config = await getProviderConfigWithFallback(supabase, step.provider_id, step.model_name);
          parallelProviders.push(config);
        }

        // Get merge provider with fallback
        const mergeProvider = await getProviderConfigWithFallback(
          supabase,
          aiConfig?.merge_provider_id,
          aiConfig?.merge_model
        );

        const mergePrompt = aiConfig?.merge_prompt ||
          "Synthesize the following AI-generated responses into a single, cohesive, comprehensive answer. Combine the best insights from each while eliminating redundancy.";

        try {
          const { results, mergedResult } = await executeParallelMerge(
            parallelProviders,
            systemPrompt,
            userPrompt,
            mergeProvider,
            mergePrompt
          );

          content = mergedResult.content;
          usedProvider = "parallel_merge";
          usedModel = `${parallelProviders.length} models -> ${mergeProvider.model}`;

          // Sum up usage
          for (const r of results) {
            totalUsage.promptTokens += r.usage.promptTokens;
            totalUsage.completionTokens += r.usage.completionTokens;
            totalUsage.totalTokens += r.usage.totalTokens;
          }
          totalUsage.promptTokens += mergedResult.usage.promptTokens;
          totalUsage.completionTokens += mergedResult.usage.completionTokens;
          totalUsage.totalTokens += mergedResult.usage.totalTokens;

          console.log(`Parallel merge completed: ${results.length} generations + 1 merge`);
        } catch (error) {
          lastError = (error as Error).message;
          console.error("Parallel merge failed:", error);
          // Fall back to default with fallback
          const provider = await getProviderConfigWithFallback(supabase, null, null);
          const result = await callAI({ systemPrompt, userPrompt, provider });
          content = result.content;
          totalUsage = result.usage;
          usedProvider = provider.providerCode;
          usedModel = provider.model;
        }
      }
    } else if (executionMode === 'sequential_chain') {
      // Sequential chain mode - get AI steps from CODEX level
      console.log("Executing sequential chain mode");

      const steps = codexPromptId ? await getCodexAISteps(supabase, codexPromptId) : [];

      if (steps.length === 0) {
        // Fall back to single mode with fallback provider
        console.log("No chain steps configured, falling back to single mode");
        const provider = await getProviderConfigWithFallback(supabase, null, null);
        const result = await callAI({ systemPrompt, userPrompt, provider });
        content = result.content;
        totalUsage = result.usage;
        usedProvider = provider.providerCode;
        usedModel = provider.model;
      } else {
        // Build step configs with fallback
        const chainSteps: Array<{
          provider: AIProviderConfig;
          customPrompt?: string;
          stepType: "generate" | "merge";
        }> = [];

        for (const step of steps) {
          const config = await getProviderConfigWithFallback(supabase, step.provider_id, step.model_name);
          chainSteps.push({
            provider: config,
            customPrompt: step.custom_prompt,
            stepType: step.step_type,
          });
        }

        try {
          const { steps: stepResults, finalResult } = await executeSequentialChain(
            chainSteps,
            systemPrompt,
            userPrompt
          );

          content = finalResult.content;
          usedProvider = "sequential_chain";
          usedModel = `${chainSteps.length} steps`;

          // Sum up usage
          for (const r of stepResults) {
            totalUsage.promptTokens += r.usage.promptTokens;
            totalUsage.completionTokens += r.usage.completionTokens;
            totalUsage.totalTokens += r.usage.totalTokens;
          }

          console.log(`Sequential chain completed: ${stepResults.length} steps`);
        } catch (error) {
          lastError = (error as Error).message;
          console.error("Sequential chain failed:", error);
          // Fall back to default with fallback
          const provider = await getProviderConfigWithFallback(supabase, null, null);
          const result = await callAI({ systemPrompt, userPrompt, provider });
          content = result.content;
          totalUsage = result.usage;
          usedProvider = provider.providerCode;
          usedModel = provider.model;
        }
      }
    }

    // Generate summary version (bullet points)
    let contentSummary = "";
    if (content && content.length >= 100) {
      const summaryPrompt = `Convert the following detailed section into 5-10 concise bullet points. Each bullet should be actionable and capture key insights. Use simple bullet points (•) without markdown formatting.

DETAILED CONTENT:
${content}

Generate a clear, scannable summary that preserves the most important information.`;

      const summarySystemPrompt = `You are an expert at distilling complex information into clear, actionable bullet points.

CRITICAL RULES:
- Use bullet points (•) only, no numbering or markdown
- 5-10 bullets maximum
- Each bullet should be one clear sentence
- Focus on actionable insights and key takeaways
- NO markdown, asterisks, or special formatting`;

      try {
        const provider = await getProviderConfigWithFallback(supabase, null, null);
        const summaryResult = await callAI({
          systemPrompt: summarySystemPrompt,
          userPrompt: summaryPrompt,
          provider,
        });
        contentSummary = summaryResult.content;

        // Add summary usage to total
        totalUsage.promptTokens += summaryResult.usage.promptTokens;
        totalUsage.completionTokens += summaryResult.usage.completionTokens;
        totalUsage.totalTokens += summaryResult.usage.totalTokens;
      } catch (error) {
        console.error("Failed to generate summary:", error);
        // Continue without summary - not critical
      }
    }

    // Check if we got valid content
    if (!content || content.length < 100) {
      // No usable content generated
      await supabase
        .from("codex_sections")
        .update({
          status: "error",
          error_message: lastError || "Failed to generate content",
          retries: retryCount
        })
        .eq("id", section.id);

      return new Response(
        JSON.stringify({ error: "Max retries exceeded", details: lastError }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 so orchestration continues
        }
      );
    }

    // Clean markdown from AI output before saving
    const cleanedContent = cleanMarkdownFromText(content);
    const cleanedSummary = contentSummary ? cleanMarkdownFromText(contentSummary) : null;

    // Save both content versions - mark as completed even if validation had issues
    // The content exists and is usable, just may not be perfect
    await supabase
      .from("codex_sections")
      .update({
        content: cleanedContent,
        content_summary: cleanedSummary,
        status: "completed",
        retries: retryCount
      })
      .eq("id", section.id);

    // Log AI usage with provider info
    if (totalUsage && section.codex?.persona_run?.user_id) {
      await logAIUsage({
        supabase,
        userId: section.codex.persona_run.user_id,
        functionName: 'generate-codex-section',
        model: usedModel,
        usage: {
          promptTokens: totalUsage.promptTokens,
          completionTokens: totalUsage.completionTokens,
          totalTokens: totalUsage.totalTokens,
        },
        codexId: section.codex_id,
        personaRunId: section.codex.persona_run.id,
        providerCode: usedProvider,
        executionMode: executionMode,
      });
    }

    console.log(`✓ Completed ${codexName} - Section ${sectionIndex + 1} using ${usedProvider}/${usedModel}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-codex-section:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});