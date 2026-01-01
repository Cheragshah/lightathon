import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getActiveCodexesFromDB(supabase: SupabaseClient) {
  const { data: codexes, error } = await supabase
    .from('codex_prompts')
    .select(`
      *,
      sections:codex_section_prompts(*)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error loading codexes from database:", error);
    throw error;
  }

  // Transform to match expected format
  const codexMap: Record<string, any> = {};
  
  for (const codex of codexes || []) {
    const sections = (codex.sections as any[])
      .filter(s => s.is_active)
      .sort((a, b) => a.section_index - b.section_index)
      .map(s => ({
        name: s.section_name,
        prompt: s.section_prompt,
        wordCountTarget: s.word_count_target
      }));

    codexMap[codex.codex_name] = {
      systemPrompt: codex.system_prompt,
      wordCountMin: codex.word_count_min,
      wordCountMax: codex.word_count_max,
      sections
    };
  }

  return codexMap;
}

export async function getCodexPromptFromDB(
  supabase: SupabaseClient,
  codexName: string,
  sectionIndex: number
) {
  // Get codex
  const { data: codex, error: codexError } = await supabase
    .from('codex_prompts')
    .select('*')
    .eq('codex_name', codexName)
    .eq('is_active', true)
    .single();

  if (codexError || !codex) {
    console.error("Codex not found:", codexName);
    return null;
  }

  // Get section
  const { data: section, error: sectionError } = await supabase
    .from('codex_section_prompts')
    .select('*')
    .eq('codex_prompt_id', codex.id)
    .eq('section_index', sectionIndex)
    .eq('is_active', true)
    .single();

  if (sectionError || !section) {
    console.error(`Section ${sectionIndex} not found for codex:`, codexName);
    return null;
  }

  return {
    systemPrompt: codex.system_prompt,
    sectionName: section.section_name,
    sectionPrompt: section.section_prompt,
    wordCountTarget: section.word_count_target,
    wordCountMin: codex.word_count_min,
    wordCountMax: codex.word_count_max
  };
}

export async function getCodexSectionNamesFromDB(
  supabase: SupabaseClient,
  codexName: string
): Promise<string[]> {
  const { data: codex } = await supabase
    .from('codex_prompts')
    .select('id')
    .eq('codex_name', codexName)
    .single();

  if (!codex) return [];

  const { data: sections } = await supabase
    .from('codex_section_prompts')
    .select('section_name')
    .eq('codex_prompt_id', codex.id)
    .eq('is_active', true)
    .order('section_index', { ascending: true });

  return sections?.map(s => s.section_name) || [];
}

// Get active codex configuration for creating persona runs
// IMPORTANT: Always fetches the LATEST configuration from the database
export async function getActiveCodexConfigFromDB(supabase: SupabaseClient) {
  // First get all active codex prompts
  const { data: codexes, error } = await supabase
    .from('codex_prompts')
    .select(`
      id,
      codex_name,
      display_order,
      depends_on_codex_id
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error loading active codexes:", error);
    throw error;
  }

  // Get section counts separately to ensure we only count ACTIVE sections
  const codexConfigs = [];
  for (const codex of codexes || []) {
    const { count, error: countError } = await supabase
      .from('codex_section_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('codex_prompt_id', codex.id)
      .eq('is_active', true);

    if (countError) {
      console.error(`Error counting sections for ${codex.codex_name}:`, countError);
    }

    codexConfigs.push({
      id: codex.id,
      name: codex.codex_name,
      order: codex.display_order,
      sections: count || 0,
      dependsOnCodexId: codex.depends_on_codex_id
    });
  }

  console.log(`Loaded ${codexConfigs.length} active codex configs with sections:`, 
    codexConfigs.map(c => `${c.name}: ${c.sections} sections`).join(', '));

  return codexConfigs;
}

// Get completed codex content for use as dependency context
export async function getCompletedCodexContent(
  supabase: SupabaseClient,
  personaRunId: string,
  codexName: string
): Promise<string | null> {
  // Get the codex ID
  const { data: codex } = await supabase
    .from('codexes')
    .select('id')
    .eq('persona_run_id', personaRunId)
    .eq('codex_name', codexName)
    .single();

  if (!codex) return null;

  // Get all completed sections
  const { data: sections } = await supabase
    .from('codex_sections')
    .select('section_name, content')
    .eq('codex_id', codex.id)
    .eq('status', 'completed')
    .order('section_index', { ascending: true });

  if (!sections || sections.length === 0) return null;

  // Concatenate all sections into a single context string
  let fullContent = `GENERATED CONTENT FROM ${codexName.toUpperCase()}:\n\n`;
  
  sections.forEach(section => {
    fullContent += `=== ${section.section_name} ===\n${section.content}\n\n`;
  });

  return fullContent;
}

// Get all dependency codex IDs for a codex prompt
export async function getCodexDependencies(
  supabase: SupabaseClient,
  codexPromptId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('codex_prompt_dependencies')
    .select('depends_on_codex_id')
    .eq('codex_prompt_id', codexPromptId)
    .order('display_order', { ascending: true });

  return (data || []).map(d => d.depends_on_codex_id);
}

// Get dependency codex name from codex ID
export async function getDependencyCodexName(
  supabase: SupabaseClient,
  dependsOnCodexId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('codex_prompts')
    .select('codex_name')
    .eq('id', dependsOnCodexId)
    .single();

  return data?.codex_name || null;
}

// Get multiple dependency codex names from their IDs
export async function getDependencyCodexNames(
  supabase: SupabaseClient,
  dependencyIds: string[]
): Promise<string[]> {
  if (dependencyIds.length === 0) return [];
  
  const { data } = await supabase
    .from('codex_prompts')
    .select('id, codex_name')
    .in('id', dependencyIds);

  // Return names in the same order as input IDs
  const nameMap = new Map((data || []).map(d => [d.id, d.codex_name]));
  return dependencyIds.map(id => nameMap.get(id)).filter(Boolean) as string[];
}

// Get completed content from multiple codexes for use as dependency context
export async function getMultipleCodexContent(
  supabase: SupabaseClient,
  personaRunId: string,
  codexNames: string[]
): Promise<string | null> {
  if (codexNames.length === 0) return null;

  let fullContent = "";
  
  for (const codexName of codexNames) {
    const content = await getCompletedCodexContent(supabase, personaRunId, codexName);
    if (content) {
      fullContent += `\n=== CONTENT FROM: ${codexName.toUpperCase()} ===\n\n${content}\n`;
    }
  }

  return fullContent || null;
}

// Get selected question IDs for a codex
export async function getCodexQuestionIds(
  supabase: SupabaseClient,
  codexPromptId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('codex_question_mappings')
    .select('question_id')
    .eq('codex_prompt_id', codexPromptId);

  return (data || []).map(d => d.question_id);
}

// Get active codex configuration with question mappings
export async function getActiveCodexConfigWithQuestions(supabase: SupabaseClient) {
  const { data: codexes, error } = await supabase
    .from('codex_prompts')
    .select(`
      id,
      codex_name,
      display_order,
      depends_on_codex_id,
      sections:codex_section_prompts(id),
      question_mappings:codex_question_mappings(question_id)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error loading active codexes with questions:", error);
    throw error;
  }

  // Transform to codex configuration format
  return (codexes || []).map(codex => ({
    id: codex.id,
    name: codex.codex_name,
    order: codex.display_order,
    sections: (codex.sections as any[]).filter(s => s.id).length,
    dependsOnCodexId: codex.depends_on_codex_id,
    questionIds: (codex.question_mappings as any[]).map(qm => qm.question_id)
  }));
}
