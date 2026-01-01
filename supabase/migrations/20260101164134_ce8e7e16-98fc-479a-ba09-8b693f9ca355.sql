-- Add more sections to each codex prompt for expanded content generation
-- Each codex will now have 3-5 detailed sections

-- First, let's check existing sections and add more for each codex

-- Generation Money Trauma sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '664e82b3-caa7-486b-ab45-c79e9b2cf734',
  'Root Causes Analysis',
  1,
  'Analyze the deep-seated root causes of the money trauma identified in this persona. Explore childhood experiences, family dynamics, cultural influences, and pivotal life events that shaped their relationship with money. Be specific and compassionate.',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '664e82b3-caa7-486b-ab45-c79e9b2cf734' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '664e82b3-caa7-486b-ab45-c79e9b2cf734',
  'Healing Pathway',
  2,
  'Provide a detailed healing pathway for overcoming this money trauma. Include specific exercises, mindset shifts, and practical steps they can take. Make it actionable and transformative.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '664e82b3-caa7-486b-ab45-c79e9b2cf734' AND section_index = 2
);

-- Money Leak sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'a7e65248-3eae-4660-b633-cc551ded424b',
  'Leak Identification',
  1,
  'Identify and analyze the specific money leaks in this persona''s financial life. Examine spending patterns, emotional triggers, and unconscious behaviors that cause financial drain.',
  750,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'a7e65248-3eae-4660-b633-cc551ded424b' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'a7e65248-3eae-4660-b633-cc551ded424b',
  'Plug the Leaks Strategy',
  2,
  'Create a comprehensive strategy to plug these money leaks. Include practical tools, habit changes, and accountability measures. Make it sustainable and realistic.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'a7e65248-3eae-4660-b633-cc551ded424b' AND section_index = 2
);

-- Financial Ceiling sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '5e566f99-9c83-4665-9d32-538494b37d82',
  'Ceiling Identification',
  1,
  'Identify the specific financial ceiling this persona has imposed on themselves. Analyze the beliefs, fears, and self-imposed limitations that keep them from earning or receiving more.',
  750,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '5e566f99-9c83-4665-9d32-538494b37d82' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '5e566f99-9c83-4665-9d32-538494b37d82',
  'Breaking Through',
  2,
  'Provide a powerful strategy to break through this financial ceiling. Include mindset work, identity shifts, and practical action steps to expand their capacity for wealth.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '5e566f99-9c83-4665-9d32-538494b37d82' AND section_index = 2
);

-- Money OS Score Card sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'c3bc7bfe-a04f-4fc3-89d9-7b3005d99bad',
  'Score Breakdown',
  1,
  'Provide a detailed breakdown of their Money OS score across different dimensions: earning, saving, investing, spending, and giving. Rate each area and explain the reasoning.',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'c3bc7bfe-a04f-4fc3-89d9-7b3005d99bad' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'c3bc7bfe-a04f-4fc3-89d9-7b3005d99bad',
  'Improvement Priorities',
  2,
  'Based on the scorecard, identify the top 3 priority areas for improvement. Create a 90-day action plan focusing on quick wins and sustainable changes.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'c3bc7bfe-a04f-4fc3-89d9-7b3005d99bad' AND section_index = 2
);

-- Money Wound sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '857a43f3-f932-4870-9e08-bdd9074c6f92',
  'Wound Discovery',
  1,
  'Explore the money wound in depth. What specific experiences created this wound? How has it manifested in their financial decisions and life patterns?',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '857a43f3-f932-4870-9e08-bdd9074c6f92' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '857a43f3-f932-4870-9e08-bdd9074c6f92',
  'Healing Protocol',
  2,
  'Create a specific healing protocol for this money wound. Include emotional healing exercises, forgiveness practices, and new money stories to adopt.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '857a43f3-f932-4870-9e08-bdd9074c6f92' AND section_index = 2
);

-- Financial Frequency sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'e0f8290d-578f-4c73-9a6e-4abe994c6cb3',
  'Current Frequency Analysis',
  1,
  'Analyze their current financial frequency. What energy do they bring to money? What vibration are they operating at when it comes to wealth and abundance?',
  750,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'e0f8290d-578f-4c73-9a6e-4abe994c6cb3' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'e0f8290d-578f-4c73-9a6e-4abe994c6cb3',
  'Frequency Elevation',
  2,
  'Provide specific practices and rituals to elevate their financial frequency. Include daily habits, affirmations, and energy practices that align with abundance.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'e0f8290d-578f-4c73-9a6e-4abe994c6cb3' AND section_index = 2
);

-- Perfect Day Design sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '9cb3dfba-2d13-4b95-9cf9-b4f5d1bb9643',
  'Vision Crafting',
  1,
  'Help them craft a vivid, detailed vision of their perfect day. Include all aspects: morning routine, work, relationships, health, wealth, and evening practices.',
  900,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '9cb3dfba-2d13-4b95-9cf9-b4f5d1bb9643' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '9cb3dfba-2d13-4b95-9cf9-b4f5d1bb9643',
  'Bridge to Reality',
  2,
  'Create a practical bridge from their current reality to their perfect day. What specific changes, decisions, and actions will get them there? Include timeline and milestones.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '9cb3dfba-2d13-4b95-9cf9-b4f5d1bb9643' AND section_index = 2
);

-- Light OS Money Blueprint sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd6127e5d-cae5-434c-a2b9-220a57e44c45',
  'Blueprint Foundation',
  1,
  'Establish the foundational elements of their Light OS Money Blueprint. Define their core money values, wealth philosophy, and guiding principles for financial decisions.',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd6127e5d-cae5-434c-a2b9-220a57e44c45' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd6127e5d-cae5-434c-a2b9-220a57e44c45',
  'Implementation Strategy',
  2,
  'Create a detailed implementation strategy for their Money Blueprint. Include specific financial structures, systems, and habits to put in place.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd6127e5d-cae5-434c-a2b9-220a57e44c45' AND section_index = 2
);

-- 21 Days Lightathon sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'fcdc74cc-b26b-4167-8012-faac7e5ad3d1',
  'Week 1: Foundation',
  1,
  'Design the first week of their Lightathon focusing on foundation-building. Include daily practices, challenges, and reflection prompts for days 1-7.',
  900,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'fcdc74cc-b26b-4167-8012-faac7e5ad3d1' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'fcdc74cc-b26b-4167-8012-faac7e5ad3d1',
  'Week 2: Transformation',
  2,
  'Design the second week focusing on transformation and deeper work. Include escalating challenges and breakthrough exercises for days 8-14.',
  900,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'fcdc74cc-b26b-4167-8012-faac7e5ad3d1' AND section_index = 2
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'fcdc74cc-b26b-4167-8012-faac7e5ad3d1',
  'Week 3: Integration',
  3,
  'Design the final week focusing on integration and sustainable change. Include practices to cement new habits and celebrate wins for days 15-21.',
  900,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'fcdc74cc-b26b-4167-8012-faac7e5ad3d1' AND section_index = 3
);

-- LightOS Scorecard sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '5397e0d1-1096-4e93-8492-d7fffa8611c9',
  'Life Areas Assessment',
  1,
  'Assess their LightOS scores across key life areas: health, wealth, relationships, purpose, and spiritual growth. Provide detailed scores and explanations for each.',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '5397e0d1-1096-4e93-8492-d7fffa8611c9' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '5397e0d1-1096-4e93-8492-d7fffa8611c9',
  'Growth Roadmap',
  2,
  'Based on the scorecard, create a personalized growth roadmap. Identify the highest-leverage improvements and create a quarterly plan.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '5397e0d1-1096-4e93-8492-d7fffa8611c9' AND section_index = 2
);

-- Personal Affirmation sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd9360254-14a0-4d26-9c50-7a048430e7b5',
  'Core Identity Affirmations',
  1,
  'Create powerful core identity affirmations that address who they are becoming. These should be deeply personal and emotionally resonant based on their story.',
  600,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd9360254-14a0-4d26-9c50-7a048430e7b5' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd9360254-14a0-4d26-9c50-7a048430e7b5',
  'Wealth & Success Affirmations',
  2,
  'Create specific wealth and success affirmations tailored to their goals and current challenges. Make them believable yet stretching.',
  600,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd9360254-14a0-4d26-9c50-7a048430e7b5' AND section_index = 2
);

-- LightOS Activation sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '01b4e073-adf7-40b7-9c5a-83c3b3e7cd24',
  'Activation Ceremony',
  1,
  'Design a powerful activation ceremony for them to step into their new LightOS identity. Include specific rituals, declarations, and symbolic actions.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '01b4e073-adf7-40b7-9c5a-83c3b3e7cd24' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  '01b4e073-adf7-40b7-9c5a-83c3b3e7cd24',
  'Daily Activation Practice',
  2,
  'Create a sustainable daily activation practice that keeps their LightOS running optimally. Include morning, midday, and evening micro-practices.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = '01b4e073-adf7-40b7-9c5a-83c3b3e7cd24' AND section_index = 2
);

-- Final Summary sections
INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd1f3cc78-fbfb-439c-8fe8-18fc7499d4f8',
  'Journey Overview',
  1,
  'Provide a comprehensive overview of their entire transformation journey. Summarize key insights, patterns, and breakthroughs discovered across all codexes.',
  800,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd1f3cc78-fbfb-439c-8fe8-18fc7499d4f8' AND section_index = 1
);

INSERT INTO codex_section_prompts (codex_prompt_id, section_name, section_index, section_prompt, word_count_target, is_active)
SELECT 
  'd1f3cc78-fbfb-439c-8fe8-18fc7499d4f8',
  'Next Steps & Commitment',
  2,
  'Outline clear next steps and invite them to make specific commitments. Include accountability structures and support resources available to them.',
  700,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM codex_section_prompts 
  WHERE codex_prompt_id = 'd1f3cc78-fbfb-439c-8fe8-18fc7499d4f8' AND section_index = 2
);