-- Drop the restrictive old constraint that blocks admin_triggered source type
ALTER TABLE persona_runs DROP CONSTRAINT IF EXISTS valid_source_type;