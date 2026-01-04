SELECT id, codex_name, status, updated_at FROM codexes WHERE status = 'generating';
SELECT id, codex_id, section_index, status, updated_at FROM codex_sections WHERE status = 'generating';
