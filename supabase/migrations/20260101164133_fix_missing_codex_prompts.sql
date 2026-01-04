-- Fix missing codex_prompts data required by 20260101164134...
-- These records were missing from the migration history.

INSERT INTO codex_prompts (id, codex_name, system_prompt, display_order, is_active)
VALUES
  ('664e82b3-caa7-486b-ab45-c79e9b2cf734', 'Generation Money Trauma', 'Placeholder system prompt - updated by migration fix', 1, true),
  ('a7e65248-3eae-4660-b633-cc551ded424b', 'Money Leak', 'Placeholder system prompt - updated by migration fix', 2, true),
  ('5e566f99-9c83-4665-9d32-538494b37d82', 'Financial Ceiling', 'Placeholder system prompt - updated by migration fix', 3, true),
  ('c3bc7bfe-a04f-4fc3-89d9-7b3005d99bad', 'Money OS Score Card', 'Placeholder system prompt - updated by migration fix', 4, true),
  ('857a43f3-f932-4870-9e08-bdd9074c6f92', 'Money Wound', 'Placeholder system prompt - updated by migration fix', 5, true),
  ('e0f8290d-578f-4c73-9a6e-4abe994c6cb3', 'Financial Frequency', 'Placeholder system prompt - updated by migration fix', 6, true),
  ('9cb3dfba-2d13-4b95-9cf9-b4f5d1bb9643', 'Perfect Day Design', 'Placeholder system prompt - updated by migration fix', 7, true),
  ('d6127e5d-cae5-434c-a2b9-220a57e44c45', 'Light OS Money Blueprint', 'Placeholder system prompt - updated by migration fix', 8, true),
  ('fcdc74cc-b26b-4167-8012-faac7e5ad3d1', '21 Days Lightathon', 'Placeholder system prompt - updated by migration fix', 9, true),
  ('5397e0d1-1096-4e93-8492-d7fffa8611c9', 'LightOS Scorecard', 'Placeholder system prompt - updated by migration fix', 10, true),
  ('d9360254-14a0-4d26-9c50-7a048430e7b5', 'Personal Affirmation', 'Placeholder system prompt - updated by migration fix', 11, true),
  ('01b4e073-adf7-40b7-9c5a-83c3b3e7cd24', 'LightOS Activation', 'Placeholder system prompt - updated by migration fix', 12, true),
  ('d1f3cc78-fbfb-439c-8fe8-18fc7499d4f8', 'Final Summary', 'Placeholder system prompt - updated by migration fix', 13, true)
ON CONFLICT (id) DO NOTHING;
