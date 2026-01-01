-- Add awaiting_answers status to codexes
-- First, let's ensure the status field can accept the new value by updating existing check if any

-- Also add question_id column to help track which questions have been answered
COMMENT ON COLUMN codexes.status IS 'Status values: not_started, awaiting_answers, pending, generating, ready, ready_with_errors, failed';