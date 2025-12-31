import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callAI(apiKey: string, prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Import CODEX generation prompts
const CODEX_PROMPTS: Record<string, string> = {
  niche_clarity: `Based on the coach's backstory and persona, generate a detailed Niche Clarity & Business Strategy CODEX in JSON format.

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
Write 3000-5000 words across all sections. Be specific, detailed, and insightful.`,

  systems_setup: `Based on the coach's backstory and persona, generate a detailed Systems Setup CODEX in JSON format.

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
Write 4000-6000 words. Be strategic and data-driven.`,

  life_automation: `Based on the coach's backstory and persona, generate a detailed Life Automation CODEX in JSON format.

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
Write 2000-3000 words. Be actionable and specific.`,

  meta_ads: `Based on the coach's backstory and persona, generate a detailed Meta Ads CODEX in JSON format.

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
Write 4000-5000 words. Focus on conversion and persuasion.`,

  brand_story: `Based on the coach's backstory and persona, generate a detailed Brand Story CODEX in JSON format.

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
Write 5000-8000 words. Make it deeply emotional and inspiring.`,

  webinar_selling: `Based on the coach's backstory and persona, generate a detailed Webinar Selling CODEX in JSON format.

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
Write 4000-6000 words. Focus on conversion psychology.`,

  curriculum_design: `Based on the coach's backstory and persona, generate a detailed Curriculum Design CODEX in JSON format.

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
Write 6000-8000 words. Be detailed and comprehensive.`,

  rapid_clarity: `Based on the coach's backstory and persona, generate a detailed Rapid Clarity CODEX in JSON format.

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
Write 7000-10000 words total. Make it deeply spiritual and inspiring.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personaId, codexType } = await req.json();

    if (!personaId || !codexType) {
      throw new Error('personaId and codexType are required');
    }

    if (!CODEX_PROMPTS[codexType]) {
      throw new Error(`Invalid codex type: ${codexType}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader },
    });
    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = await userResponse.json();

    // Fetch persona
    const personaResponse = await fetch(
      `${supabaseUrl}/rest/v1/personas?id=eq.${personaId}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const personas = await personaResponse.json();
    const persona = personas[0];

    if (!persona) {
      return new Response(JSON.stringify({ error: 'Persona not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    if (persona.user_id !== user.id) {
      const rolesResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const roles = await rolesResponse.json();
      const isAdmin = roles?.some((r: any) => r.role === 'admin');
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Regenerating ${codexType} CODEX for persona ${personaId}`);

    // Build context from persona
    const personaContext = `
COACH PERSONA:
${persona.generated_persona_text || 'No persona text available'}

BACKSTORY ANSWERS:
${JSON.stringify(persona.backstory_answers, null, 2)}

ANCHOR ANSWERS:
${JSON.stringify(persona.anchor_answers, null, 2)}
    `;

    // Generate new CODEX
    const codexPrompt = CODEX_PROMPTS[codexType] + "\n\n" + personaContext;
    const newCodex = await callAI(openaiApiKey, codexPrompt);

    // Update the specific CODEX
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/personas?id=eq.${personaId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          [`${codexType}_codex`]: newCodex,
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Failed to update CODEX');
    }

    return new Response(JSON.stringify({
      success: true,
      codex: newCodex,
      message: `${codexType} CODEX regenerated successfully`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error regenerating CODEX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
