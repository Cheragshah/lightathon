
-- Phase 1: Add default section prompts for all active codex prompts that don't have sections
-- First, insert a default section for each active codex_prompt that has no sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_index, section_name, section_prompt, word_count_target, is_active)
SELECT 
  cp.id,
  1,
  cp.codex_name || ' - Main Content',
  cp.system_prompt,
  COALESCE(cp.word_count_min, 1000),
  true
FROM codex_prompts cp
WHERE cp.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM codex_section_prompts csp 
  WHERE csp.codex_prompt_id = cp.id AND csp.is_active = true
);

-- Phase 2a: Drop the old source_type constraint and add new one with more valid values
ALTER TABLE persona_runs DROP CONSTRAINT IF EXISTS persona_runs_source_type_check;
ALTER TABLE persona_runs ADD CONSTRAINT persona_runs_source_type_check 
  CHECK (source_type IN ('questionnaire', 'transcript', 'admin_triggered', 'batch'));

-- Phase 2b: Update the default title from 'My Coach Persona' to 'Your Persona'
ALTER TABLE persona_runs ALTER COLUMN title SET DEFAULT 'Your Persona';

-- Update any existing runs with the old title
UPDATE persona_runs SET title = 'Your Persona' WHERE title = 'My Coach Persona';
