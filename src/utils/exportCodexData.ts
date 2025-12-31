import { supabase } from "@/integrations/supabase/client";

export const exportCodexConfigurations = async () => {
  try {
    // Fetch all codex prompts
    const { data: codexPrompts, error: codexError } = await supabase
      .from('codex_prompts')
      .select('*')
      .order('display_order', { ascending: true });

    if (codexError) throw codexError;

    // Fetch all sections
    const { data: sections, error: sectionsError } = await supabase
      .from('codex_section_prompts')
      .select('*')
      .order('section_index', { ascending: true });

    if (sectionsError) throw sectionsError;

    // Fetch all question mappings
    const { data: questionMappings, error: mappingsError } = await supabase
      .from('codex_question_mappings')
      .select(`
        id,
        codex_prompt_id,
        question_id,
        questionnaire_questions(question_text, category_id)
      `);

    if (mappingsError) throw mappingsError;

    // Organize data structure
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      codexes: (codexPrompts || []).map(codex => ({
        ...codex,
        sections: (sections || [])
          .filter(s => s.codex_prompt_id === codex.id)
          .map(({ id, created_at, updated_at, ...rest }) => rest),
        questionMappings: (questionMappings || [])
          .filter((m: any) => m.codex_prompt_id === codex.id)
          .map((m: any) => ({
            question_id: m.question_id,
            question_text: m.questionnaire_questions?.question_text,
            category_id: m.questionnaire_questions?.category_id
          }))
      }))
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codex-configurations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error };
  }
};
