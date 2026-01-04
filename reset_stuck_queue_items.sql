-- Reset stuck 'processing' items in the queue to 'pending'
-- This allows them to be re-processed by the fixed admin-trigger-codex-generation function.

UPDATE codex_generation_queue
SET status = 'pending',
    started_at = NULL,
    error_message = NULL
WHERE status = 'processing';
