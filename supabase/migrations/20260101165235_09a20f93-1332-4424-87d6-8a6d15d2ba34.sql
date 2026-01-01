-- First, delete codex_sections for codexes that are NOT "Generation Money Trauma"
DELETE FROM public.codex_sections
WHERE codex_id IN (
  SELECT id FROM public.codexes 
  WHERE persona_run_id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9'
  AND codex_name != 'Generation Money Trauma'
);

-- Then delete the codexes themselves (except Generation Money Trauma)
DELETE FROM public.codexes
WHERE persona_run_id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9'
AND codex_name != 'Generation Money Trauma';

-- Update persona run status to reflect only the remaining codex
UPDATE public.persona_runs
SET status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = 'bd79f905-cac6-492c-8dcb-570890d8f7f9';