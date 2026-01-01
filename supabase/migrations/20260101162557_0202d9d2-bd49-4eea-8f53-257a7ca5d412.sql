-- Phase 1: Fix section_index mismatch - all sections should start at index 0
UPDATE codex_section_prompts 
SET section_index = 0 
WHERE section_index = 1 AND is_active = true;

-- Phase 2: Add missing codexes to persona run bd79f905-cac6-492c-8dcb-570890d8f7f9
INSERT INTO codexes (persona_run_id, codex_name, codex_order, codex_prompt_id, total_sections, status)
SELECT 
  'bd79f905-cac6-492c-8dcb-570890d8f7f9',
  cp.codex_name,
  cp.display_order,
  cp.id,
  (SELECT COUNT(*) FROM codex_section_prompts csp WHERE csp.codex_prompt_id = cp.id AND csp.is_active = true),
  'generating'
FROM codex_prompts cp
WHERE cp.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM codexes c 
  WHERE c.persona_run_id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9' 
  AND c.codex_prompt_id = cp.id
);

-- Phase 3: Reset the persona run status to allow regeneration
UPDATE persona_runs 
SET status = 'generating', 
    is_cancelled = false,
    started_at = now(),
    completed_at = NULL
WHERE id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9';

-- Phase 4: Update any existing codexes with correct total_sections count and reset status
UPDATE codexes c
SET total_sections = (
  SELECT COUNT(*) 
  FROM codex_section_prompts csp 
  WHERE csp.codex_prompt_id = c.codex_prompt_id AND csp.is_active = true
),
status = 'generating',
completed_sections = 0
WHERE c.persona_run_id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9';

-- Phase 5: Delete any old codex_sections for this run to start fresh
DELETE FROM codex_sections 
WHERE codex_id IN (
  SELECT id FROM codexes WHERE persona_run_id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9'
);