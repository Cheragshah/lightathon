import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to clean markdown and special characters from AI output
function cleanMarkdownFromText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
    .replace(/\*(.*?)\*/g, '$1')       // Remove italic
    .replace(/^#{1,6}\s+/gm, '')       // Remove headers
    .replace(/^[\*\-•]\s+/gm, '')      // Remove bullet points
    .replace(/^\d+\.\s+/gm, '')        // Remove numbered lists
    .replace(/`(.*?)`/g, '$1')         // Remove inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .trim();
}

const SYSTEM_PROMPT = `You are an expert Mind Architect and Coach Persona Strategist.

You receive a coach's life story and answers to 13 questions. From this, you must generate a complete, highly detailed 'Coach Persona Blueprint' for that person.

Write in natural, human, conversational language.
Avoid all AI meta-commentary. Never mention that you are a model or AI.

Do not use any markdown formatting characters such as asterisks, hash symbols, bullet points, or numbered list markers.
Organize the content using clear section titles written as text lines followed by paragraphs.

The tone should be clear, grounded, confident, empathetic, and practical.
Write as if you are a mentor speaking directly to the coach.

Use as much detail as needed. There is no strict word limit. Aim for deep analysis and explanation, ten thousand words or more if required.

You must create the following sections in this exact order and with these exact section title lines:

SECTION 1: COACH READINESS AND SCORE
SECTION 2: POSITIONING AND IDENTITY
SECTION 3: SUPERPOWERS AND UNIQUE STYLE
SECTION 4: IDEAL CUSTOMER PERSONA
SECTION 5: COMMON MISTAKES AND THE VILLAIN
SECTION 6: CORE FRAMEWORKS AND THREE SECRETS
SECTION 7: PRODUCT AND OFFER LADDER
SECTION 8: PROMOTION AND GROWTH STRATEGY
SECTION 9: MILESTONES, METRICS, AND VISION

For each section, write rich narrative paragraphs.
Explain not just what, but why.

Here is how to construct each section:

SECTION 1: COACH READINESS AND SCORE
Analyze the person's story, setbacks, first wins, and inner motivations.
Give them a readiness score between 0 and 100 that reflects how prepared they are to coach others today.
Start this section with the exact line: Readiness Score: [NUMBER] out of 100
Then explain the score in detail.
Describe their strengths, emotional maturity, resilience, self awareness, and blind spots.
Explain how ready they are to hold space for others and where they still need growth.

SECTION 2: POSITIONING AND IDENTITY
Based on their life story, inspiration, role models, and what excites them, propose their official designation, community name, mission, core belief, the change they want to bring, reasons people should listen, legacy, and a powerful quote.
Write this as narrative paragraphs describing their identity and positioning.

SECTION 3: SUPERPOWERS AND UNIQUE STYLE
From the story and anchor answers, infer their top superpowers and natural strengths.
Describe what makes their approach different and what clients will admire most.
Infer whether they are more logic-oriented or emotion-oriented and explain why.

SECTION 4: IDEAL CUSTOMER PERSONA
Infer who their coaching is meant for.
Describe the ideal client's role, gender range, age range, income level, location.
Describe their top three problems, frustrations, fears, what they've tried before, and the transformation they seek.
Write as if painting a vivid picture of one real person.

SECTION 5: COMMON MISTAKES AND THE VILLAIN
From the coach's journey, identify common mistakes people make in this area.
Explain myths to bust, toxic patterns, and define the real villain.

SECTION 6: CORE FRAMEWORKS AND THREE SECRETS
From their turning points and wins, infer signature frameworks step by step.
Identify three core secrets or principles they teach.
Describe tools, practices, and phases their program would use.

SECTION 7: PRODUCT AND OFFER LADDER
Propose a complete offer ladder from L0 to L5 plus an optional retreat.
For each level describe who it is for, the main promise, structure, and depth.
Then describe bonuses and support structures.

SECTION 8: PROMOTION AND GROWTH STRATEGY
Propose a strong webinar title.
Suggest ad hook angles woven into paragraphs.
Describe which platforms work best and how to position their sales message.

SECTION 9: MILESTONES, METRICS, AND VISION
Propose clear student milestones, quarterly revenue goals for four quarters, success metrics, and a vivid two to three year vision.

Always write directly to the coach as 'you' and keep the tone encouraging but honest.

Now use the following answers as your only input and generate the full Coach Persona Blueprint.`;

// CODEX Generation Functions
async function generateNicheClarityCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Niche Clarity & Business Strategy CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "mission": "The one big mission in life",
  "topics_to_study": ["6 topics they love to study"],
  "childhood_talents": ["Top 6 talents/skills from childhood"],
  "passions": ["6 topics always passionate about"],
  "subjects_studied": ["6 subjects studied in-depth"],
  "experience_areas": ["6 areas with lots of experience"],
  "role_models": ["3 examples of who they want to become"],
  "skills_to_learn": ["6 new skills to learn"],
  "market_understanding": "Deep understanding of their market",
  "unique_selling_proposition": "What makes them unique",
  "positioning_statement": "Clear positioning statement",
  "signature_framework": "Their signature methodology"
}

Write 3000-5000 words across all sections. Be specific, detailed, and insightful.`;

  return await callAI(apiKey, prompt);
}

async function generateSystemsSetupCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Systems Setup CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "narrative": "Refined expert narrative statement",
  "tam_sam_som": {
    "tam": "Total addressable market description and size",
    "sam": "Serviceable available market description and size",
    "som": "Serviceable obtainable market with 5-year projections"
  },
  "target_market": {
    "demographics": "Age, location, income, profession details",
    "psychographics": "Inner desires, pain points, what they want"
  },
  "micro_positioning": "Unique positioning that bridges gaps",
  "content_themes": ["10 core content themes"],
  "business_plan": {
    "funnel_structure": "L0 to L5 funnel description",
    "platforms": "Content platforms and strategy"
  },
  "systems_needed": ["Key systems to implement"],
  "team_roles": ["Essential team members and roles"],
  "metrics": "Key metrics to track"
}

Write 4000-6000 words. Be strategic and data-driven.`;

  return await callAI(apiKey, prompt);
}

async function generateLifeAutomationCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Life Automation CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "business_goals": ["Top 3 business goals for 6 months"],
  "health_goals": ["Top 3 health goals for 6 months"],
  "personal_goals": ["Top 3 personal goals for 6 months"],
  "not_productive_activities": ["Top 6 activities to eliminate"],
  "productive_activities": ["Top 6 productive activities"],
  "super_productive_activities": ["Top 6 super-productive activities"],
  "areas_to_improve": ["6 areas needing improvement"],
  "strengths": ["Top 3 unique abilities"],
  "income_producing_activities": ["Top 3 income-producing activities"]
}

Write 2000-3000 words. Be actionable and specific.`;

  return await callAI(apiKey, prompt);
}

async function generateMetaAdsCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Meta Ads CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "webinar_title": "Compelling webinar title",
  "hooks": ["3 powerful webinar hooks"],
  "three_secrets": ["3 secrets to teach"],
  "credibility_factors": ["3 credibility statements"],
  "major_outcome": "One major outcome promise",
  "target_segments": ["Top 3 target segments"],
  "values": ["Top 3 values in life"],
  "gifts": ["3 gifts at end of webinar"],
  "industry_stats": ["3 industry stats with sources"],
  "mission_vision_story": "Compelling mission/vision narrative",
  "case_studies": ["3 proof of concept case studies"],
  "problems": ["6 problems target market faces"],
  "turning_point_principles": ["3 principles that helped them"],
  "ad_angles": ["10 different ad hook angles"]
}

Write 4000-5000 words. Focus on conversion and persuasion.`;

  return await callAI(apiKey, prompt);
}

async function generateBrandStoryCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Brand Story CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "origin_story": "Detailed origin story (1000+ words)",
  "philosophy": "Core philosophy and beliefs",
  "values": ["Core values"],
  "vision": "Long-term vision statement",
  "voice": "Brand voice description",
  "message_to_humanity": "Powerful message to the world",
  "transformational_pillars": ["Key transformation pillars"],
  "brand_themes": ["Core brand content themes"],
  "signature_programs": ["Key programs and their essence"]
}

Write 5000-8000 words. Make it deeply emotional and inspiring.`;

  return await callAI(apiKey, prompt);
}

async function generateWebinarSellingCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Webinar Selling CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "narrative": "Expert narrative for webinars",
  "target_avatar": "Detailed ideal buyer persona",
  "hot_buttons": ["Top 10 emotional triggers"],
  "webinar_titles": ["10 compelling webinar titles"],
  "webinar_structure": {
    "hook": "Opening hook",
    "promise": "Main promise",
    "secrets": ["3 secrets framework"],
    "offer": "Offer structure",
    "close": "Closing strategy"
  },
  "objection_handling": ["Common objections and responses"],
  "testimonial_structure": "How to present social proof",
  "urgency_elements": ["Scarcity and urgency tactics"]
}

Write 4000-6000 words. Focus on conversion psychology.`;

  return await callAI(apiKey, prompt);
}

async function generateCurriculumDesignCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Curriculum Design CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "program_overview": "Complete program philosophy",
  "offer_ladder": {
    "l0": "Free lead magnet details",
    "l1": "Entry program details",
    "l2": "Core program details",
    "l3": "Advanced program details",
    "l4": "Certification details",
    "l5": "Mastermind details"
  },
  "curriculum_structure": {
    "l1_curriculum": ["Week by week content"],
    "l2_curriculum": ["Week by week content"],
    "l3_curriculum": ["Week by week content"]
  },
  "transformation_journey": "Student transformation path",
  "retreat_concept": "Retreat/immersion program details",
  "certification_process": "How students get certified"
}

Write 6000-8000 words. Be detailed and comprehensive.`;

  return await callAI(apiKey, prompt);
}

async function generateRapidClarityCodex(apiKey: string, backstory: string[], anchor: string[], persona: string) {
  const prompt = `Based on the coach's backstory and persona, generate a detailed Rapid Clarity CODEX in JSON format.

BACKSTORY: ${backstory.join('\n\n')}
ANCHOR: ${anchor.join('\n\n')}
MAIN PERSONA: ${persona.substring(0, 2000)}

Generate a comprehensive JSON object with these sections:
{
  "soul_signature": "Elemental nature and character traits analysis",
  "dharma_compass": "Soul-purpose and alignment analysis",
  "superpower_map": "Top 3 micro-niches and best aligned one",
  "dharma_narrative": "Powerful mission-centered narrative",
  "highest_vision": "Vision for people they serve",
  "essence_word": "One word describing their essence",
  "dharma_aligned_day": "Description of perfect aligned day",
  "perfect_day_description": "1000-word perfect day visualization",
  "posthumous_biography": "5000-word inspiring life story as if looking back"
}

Write 7000-10000 words total. Make it deeply spiritual and inspiring.`;

  return await callAI(apiKey, prompt);
}

async function callAI(apiKey: string, prompt: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: "You are an expert CODEX generator. Always return valid JSON objects with rich, detailed content." },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 8000,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return { error: "Failed to generate" };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse as JSON, if fails return as text
    try {
      return JSON.parse(content);
    } catch {
      return { content };
    }
  } catch (error) {
    console.error("Error calling AI:", error);
    return { error: "Generation failed" };
  }
}

serve(async (req) => {
  console.log('🚀 GENERATE-PERSONA FUNCTION INVOKED:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  console.log('🔍 Environment check:', {
    hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
    hasSupabaseAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
    hasOpenAIApiKey: !!Deno.env.get("OPENAI_API_KEY")
  });

  if (req.method === "OPTIONS") {
    console.log('✅ Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📝 Entering main try block...');

  try {
    console.log('📝 Step 1: Creating Supabase client');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log('🔐 Step 2: Authenticating user');
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('✅ User authenticated:', user.id);
    console.log('📦 Step 3: Parsing request body');
    const { personaId, backstoryAnswers, anchorAnswers } = await req.json();

    if (!personaId || !backstoryAnswers || !anchorAnswers) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('✅ Request data valid. PersonaId:', personaId);
    console.log('👤 Step 4: Checking admin status');

    // Check if user is admin first
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!userRoles;

    // Validate persona access - admins can access any persona
    const personaQuery = supabaseClient
      .from("personas")
      .select("*")
      .eq("id", personaId);

    // If not admin, enforce user_id check
    if (!isAdmin) {
      personaQuery.eq("user_id", user.id);
    }

    const { data: persona, error: fetchError } = await personaQuery.maybeSingle();

    if (fetchError) {
      console.error("Error fetching persona:", fetchError);
      return new Response(JSON.stringify({ error: "Error fetching persona" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check (skip for admins)
    if (!isAdmin && persona.last_regenerated_at) {
      const { data: settings } = await supabaseClient
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "regeneration_cooldown_minutes")
        .maybeSingle();

      const cooldownMinutes = settings?.setting_value ? Number(settings.setting_value) : 60;
      const lastRegenTime = new Date(persona.last_regenerated_at).getTime();
      const now = Date.now();
      const minutesSinceRegen = (now - lastRegenTime) / (1000 * 60);

      if (minutesSinceRegen < cooldownMinutes) {
        const remainingMinutes = Math.ceil(cooldownMinutes - minutesSinceRegen);
        return new Response(
          JSON.stringify({
            error: `Rate limit exceeded. Please wait ${remainingMinutes} more minute(s) before regenerating.`,
            cooldownMinutes: remainingMinutes
          }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Store current version before regenerating (if persona has content)
    if (persona.generated_persona_text) {
      const versionNumber = (persona.regeneration_count || 0) + 1;
      await supabaseClient
        .from("persona_versions")
        .insert({
          persona_id: personaId,
          version_number: versionNumber,
          generated_persona_text: persona.generated_persona_text,
          coach_readiness_score: persona.coach_readiness_score,
          coach_readiness_summary: persona.coach_readiness_summary,
          niche_clarity_codex: persona.niche_clarity_codex,
          systems_setup_codex: persona.systems_setup_codex,
          life_automation_codex: persona.life_automation_codex,
          meta_ads_codex: persona.meta_ads_codex,
          brand_story_codex: persona.brand_story_codex,
          webinar_selling_codex: persona.webinar_selling_codex,
          curriculum_design_codex: persona.curriculum_design_codex,
          rapid_clarity_codex: persona.rapid_clarity_codex,
          created_by: user.id,
        });
    }

    // Build user prompt with all answers
    const userPrompt = `
BACKSTORY QUESTIONS:

1. Tell me about your early life. Where did you grow up? What values shaped you?
${backstoryAnswers[0]}

2. What did your parents or mentors do and how did they influence your career?
${backstoryAnswers[1]}

3. What was your education and first career choice?
${backstoryAnswers[2]}

4. What were your turning points? (career, finance, family, life lessons)
${backstoryAnswers[3]}

5. When and how did you get exposed to your current niche or skill?
${backstoryAnswers[4]}

6. What failures or setbacks pushed you toward coaching or teaching?
${backstoryAnswers[5]}

7. What is the real reason you started this business?
${backstoryAnswers[6]}

8. Who was your inspiration or role model in this space?
${backstoryAnswers[7]}

9. What was your first win in this industry?
${backstoryAnswers[8]}

10. When did you feel 'Yes, I can teach this'?
${backstoryAnswers[9]}

ANCHOR QUESTIONS:

11. What topics or problems do people naturally come to you for help with?
${anchorAnswers[0]}

12. What excites you the most to teach or guide others about?
${anchorAnswers[1]}

13. Who do you feel most called to help? (describe in one or two lines)
${anchorAnswers[2]}
`;

    console.log("Calling AI to generate persona...");

    // Call OpenAI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let generatedText = aiData.choices[0].message.content;

    // Post-process: remove markdown characters
    generatedText = generatedText
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^#+\s+/gm, "")
      .replace(/^[-•]\s+/gm, "");

    // Extract readiness score
    const scoreMatch = generatedText.match(/Readiness Score:\s*(\d+)\s*out of 100/i);
    const readinessScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

    // Extract first 2-3 sentences of SECTION 1 as summary
    const section1Match = generatedText.match(/SECTION 1:.*?\n(.*?)(?=\n\nSECTION 2:|$)/s);
    let readinessSummary = "";
    if (section1Match) {
      const section1Text = section1Match[1].trim();
      const sentences = section1Text.split(/[.!?]+/).slice(0, 3);
      readinessSummary = sentences.join(". ").trim();
      if (readinessSummary && !readinessSummary.endsWith(".")) {
        readinessSummary += ".";
      }
    }

    const wordCount = generatedText.split(/\s+/).length;

    console.log("Updating persona with main text...");

    // First, update persona with main text and scores
    const { error: updateMainError } = await supabaseClient
      .from("personas")
      .update({
        generated_persona_text: generatedText,
        coach_readiness_score: readinessScore,
        coach_readiness_summary: readinessSummary,
        word_count: wordCount,
        regeneration_count: (persona.regeneration_count || 0) + 1,
        last_regenerated_at: new Date().toISOString(),
        regeneration_requested_by: user.id,
        codexes_generated: false, // Mark as in-progress
      })
      .eq("id", personaId);

    if (updateMainError) {
      console.error("Error updating persona with main text:", updateMainError);
      throw updateMainError;
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Generating CODEXes in 3 batches...");

    // BATCH 1: Core positioning CODEXes (2 CODEXes)
    console.log("Generating Batch 1: Niche Clarity + Systems Setup...");
    const [nicheClarityCodex, systemsSetupCodex] = await Promise.all([
      generateNicheClarityCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
      generateSystemsSetupCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
    ]);

    await supabaseClient
      .from("personas")
      .update({
        niche_clarity_codex: nicheClarityCodex,
        systems_setup_codex: systemsSetupCodex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personaId);

    // BATCH 2: Operational CODEXes (3 CODEXes)
    console.log("Generating Batch 2: Life Automation + Meta Ads + Brand Story...");
    const [lifeAutomationCodex, metaAdsCodex, brandStoryCodex] = await Promise.all([
      generateLifeAutomationCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
      generateMetaAdsCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
      generateBrandStoryCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
    ]);

    await supabaseClient
      .from("personas")
      .update({
        life_automation_codex: lifeAutomationCodex,
        meta_ads_codex: metaAdsCodex,
        brand_story_codex: brandStoryCodex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personaId);

    // BATCH 3: Advanced CODEXes (3 CODEXes)
    console.log("Generating Batch 3: Webinar + Curriculum + Rapid Clarity...");
    const [webinarSellingCodex, curriculumDesignCodex, rapidClarityCodex] = await Promise.all([
      generateWebinarSellingCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
      generateCurriculumDesignCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
      generateRapidClarityCodex(OPENAI_API_KEY, backstoryAnswers, anchorAnswers, generatedText),
    ]);

    // Final update with all CODEXes
    const { error: updateError } = await supabaseClient
      .from("personas")
      .update({
        webinar_selling_codex: webinarSellingCodex,
        curriculum_design_codex: curriculumDesignCodex,
        rapid_clarity_codex: rapidClarityCodex,
        codexes_generated: true,
        codex_generation_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", personaId);

    if (updateError) {
      console.error("Error updating persona with final CODEXes:", updateError);
      throw updateError;
    }

    console.log("All CODEXes generated successfully!")

    console.log(`Persona generated successfully. Word count: ${wordCount}`);

    return new Response(
      JSON.stringify({ success: true, wordCount, readinessScore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-persona function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});