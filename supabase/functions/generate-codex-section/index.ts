// --- SAFE STRING HELPERS ---
const safe = (v: any) => (typeof v === "string" ? v : v ? String(v) : "");

// ---------------------------------------------

// Combine global persona prompt with system prompt
const systemPrompt = safe(
  globalPersonaPrompt
    ? `${safe(globalPersonaPrompt)}\n\n---\n\n${safe(baseSystemPrompt)}`
    : safe(baseSystemPrompt)
);

// ---------------------------------------------

const userPrompt = safe(
  `${safe(sectionPrompt)}${wordCountInstruction}\n\n${safe(userContext)}${safe(dependencyContext)}${safe(pricingContext)}\n\nGenerate the content for this section following the instructions above. Write in clean human language without markdown, bullets, or formatting characters.`
);

// ---------------------------------------------

// SINGLE MODE
const result = await callAI({
  systemPrompt: safe(systemPrompt),
  userPrompt: safe(userPrompt),
  provider,
});

// ---------------------------------------------

// PARALLEL MERGE MODE
const mergePromptSafe = safe(
  aiConfig?.merge_prompt ||
  "Synthesize the following AI-generated responses into a single, cohesive, comprehensive answer."
);

const { results, mergedResult } = await executeParallelMerge(
  parallelProviders,
  safe(systemPrompt),
  safe(userPrompt),
  mergeProvider,
  mergePromptSafe
);

// ---------------------------------------------

// SEQUENTIAL CHAIN MODE
const chainSteps = steps.map(step => ({
  provider: await getProviderConfigWithFallback(
    supabase,
    step.provider_id,
    step.model_name
  ),
  customPrompt: safe(step.custom_prompt),
  stepType: step.step_type,
}));

const { finalResult } = await executeSequentialChain(
  chainSteps,
  safe(systemPrompt),
  safe(userPrompt)
);
