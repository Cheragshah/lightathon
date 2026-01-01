import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractionResult {
  backstory_answers: string[];
  anchor_answers: string[];
  extraction_confidence: 'high' | 'medium' | 'low';
  missing_questions: number[];
  notes: string;
}

interface ExtractionResponse {
  result: ExtractionResult;
  usage: any;
}

async function extractAnswersFromTranscript(transcriptText: string, apiKey: string): Promise<ExtractionResponse> {
  const systemPrompt = `You are an expert at analyzing conversation transcripts and extracting specific information.

Analyze the following transcript and extract answers to these 13 questions:

BACKSTORY QUESTIONS (10):
1. Tell me about your early life. Where did you grow up? What values shaped you?
2. What did your parents or mentors do and how did they influence your career?
3. What was your education and first career choice?
4. What were your turning points? (career, finance, family, life lessons)
5. When and how did you get exposed to your current niche or skill?
6. What failures or setbacks pushed you toward coaching or teaching?
7. What is the real reason you started this business?
8. Who was your inspiration or role model in this space?
9. What was your first win in this industry?
10. When did you feel 'Yes, I can teach this'?

ANCHOR QUESTIONS (3):
11. What topics or problems do people naturally come to you for help with?
12. What excites you the most to teach or guide others about?
13. Who do you feel most called to help? (describe in one or two lines)

Return ONLY a JSON object with this exact structure:
{
  "backstory_answers": ["answer1", "answer2", ..., "answer10"],
  "anchor_answers": ["answer11", "answer12", "answer13"],
  "extraction_confidence": "high|medium|low",
  "missing_questions": [list of question numbers where information wasn't found],
  "notes": "Any important observations about the transcript quality"
}

IMPORTANT RULES:
- If information for a specific question is not found in the transcript, write "Information not found in transcript" for that answer.
- Extract as much relevant detail as possible from the conversation.
- Be thorough and capture the person's story, struggles, and motivations.
- If the transcript contains multiple speakers, focus on extracting the coach/business owner's responses.
- Ensure all answers are detailed and substantial (at least 2-3 sentences each when information is available).`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `TRANSCRIPT:\n\n${transcriptText}` }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      model: 'gpt-5-mini-2025-08-07'
    });
    throw new Error(`AI extraction failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  // Parse the JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }
  
  return { 
    result: JSON.parse(jsonMatch[0]),
    usage 
  };
}

serve(async (req) => {
  console.log('🚀 PROCESS-TRANSCRIPT FUNCTION INVOKED:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get auth header and extract JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's JWT to verify authentication
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript_text, pdf_base64, target_user_id } = await req.json();

    // Handle PDF extraction if PDF is provided
    let processedTranscript = transcript_text;
    
    if (pdf_base64) {
      try {
        console.log('Processing PDF file...');
        // Use OpenAI's vision capability to read the PDF
        const pdfResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini-2025-08-07',
            messages: [
              { 
                role: 'system', 
                content: 'Extract all text content from this PDF document. Preserve the structure and formatting as much as possible.' 
              },
              {
                role: 'user',
                content: `Please extract all text from this PDF: data:application/pdf;base64,${pdf_base64}`
              }
            ],
          }),
        });
        
        if (!pdfResponse.ok) {
          throw new Error(`PDF extraction failed: ${pdfResponse.status}`);
        }
        
        const pdfData = await pdfResponse.json();
        processedTranscript = pdfData.choices[0].message.content;
        console.log('PDF text extracted:', processedTranscript.length, 'characters');
      } catch (error: any) {
        console.error('PDF extraction error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to extract text from PDF',
          details: error.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    if (!processedTranscript || typeof processedTranscript !== 'string') {
      return new Response(JSON.stringify({ error: 'transcript_text or pdf_base64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target user (for admin uploads)
    const targetUserId = target_user_id || user.id;

    // Check if user is admin when uploading for someone else
    if (targetUserId !== user.id) {
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
        return new Response(JSON.stringify({ error: 'Only admins can upload transcripts for other users' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Processing transcript for user:', targetUserId);
    console.log('Transcript length:', processedTranscript.length, 'characters');

    // Extract answers using AI
    console.log('Extracting answers from transcript...');
    const extractionResponse = await extractAnswersFromTranscript(processedTranscript, openaiApiKey);
    const extractionResult = extractionResponse.result;
    const usage = extractionResponse.usage;
    
    console.log('Extraction complete:', {
      confidence: extractionResult.extraction_confidence,
      missing: extractionResult.missing_questions,
      tokens: usage.total_tokens,
    });

    // Check extraction quality
    if (extractionResult.missing_questions.length > 8) {
      return new Response(JSON.stringify({
        error: 'Transcript quality too low',
        message: 'Could not extract enough information from the transcript. Please ensure the transcript is complete and covers the necessary topics.',
        extraction_result: extractionResult,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build answers object in the same format as questionnaire
    const answers: Record<string, string> = {};
    extractionResult.backstory_answers.forEach((answer, idx) => {
      answers[`backstory_${idx + 1}`] = answer;
    });
    extractionResult.anchor_answers.forEach((answer, idx) => {
      answers[`anchor_${idx + 1}`] = answer;
    });

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create persona run
    const { data: personaRun, error: runError } = await supabaseAdmin
      .from("persona_runs")
      .insert({
        user_id: targetUserId,
        title: "Your Persona (from Transcript)",
        answers_json: answers,
        status: "pending",
        source_type: "transcript",
        original_transcript: processedTranscript,
      })
      .select()
      .single();

    if (runError) {
      console.error("Error creating persona run:", runError);
      return new Response(JSON.stringify({ error: 'Failed to create persona run' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Persona run created:', personaRun.id);

    // Get active codex prompts with IDs
    const { data: activeCodexPrompts, error: promptsError } = await supabaseAdmin
      .from('codex_prompts')
      .select('id, codex_name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (promptsError || !activeCodexPrompts || activeCodexPrompts.length === 0) {
      console.error("Error loading active codex prompts:", promptsError);
      return new Response(JSON.stringify({ error: 'No active codexes found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating ${activeCodexPrompts.length} codexes with sections`);

    // Create each codex with its sections
    for (const prompt of activeCodexPrompts) {
      // Get section prompts for this codex
      const { data: sectionPrompts, error: sectionsError } = await supabaseAdmin
        .from('codex_section_prompts')
        .select('id, section_name, section_index')
        .eq('codex_prompt_id', prompt.id)
        .eq('is_active', true)
        .order('section_index', { ascending: true });

      if (sectionsError) {
        console.error(`Error loading sections for ${prompt.codex_name}:`, sectionsError);
        return new Response(JSON.stringify({ 
          error: `Failed to load sections for ${prompt.codex_name}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create the codex with link to prompt
      const { data: createdCodex, error: insertCodexError } = await supabaseAdmin
        .from('codexes')
        .insert({
          persona_run_id: personaRun.id,
          codex_name: prompt.codex_name,
          codex_order: prompt.display_order,
          codex_prompt_id: prompt.id,
          status: 'not_started',
          total_sections: sectionPrompts?.length || 0,
          completed_sections: 0,
        })
        .select('id')
        .single();

      if (insertCodexError || !createdCodex) {
        console.error(`Error creating codex ${prompt.codex_name}:`, insertCodexError);
        return new Response(JSON.stringify({ 
          error: `Failed to create codex ${prompt.codex_name}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create all sections for this codex
      if (sectionPrompts && sectionPrompts.length > 0) {
        const sectionRecords = sectionPrompts.map(section => ({
          codex_id: createdCodex.id,
          section_name: section.section_name,
          section_index: section.section_index,
          status: 'pending',
        }));

        const { error: insertSectionsError } = await supabaseAdmin
          .from('codex_sections')
          .insert(sectionRecords);

        if (insertSectionsError) {
          console.error(`Error creating sections for ${prompt.codex_name}:`, insertSectionsError);
          return new Response(JSON.stringify({ 
            error: `Failed to create sections for ${prompt.codex_name}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Created ${sectionRecords.length} sections for ${prompt.codex_name}`);
      }
    }

    console.log(`Created ${activeCodexPrompts.length} codexes with sections`);

    // Log admin activity if admin uploaded for someone else
    if (targetUserId !== user.id) {
      await supabaseAdmin
        .from('admin_activity_log')
        .insert({
          admin_id: user.id,
          action: 'transcript_upload',
          target_user_id: targetUserId,
          details: {
            extraction_confidence: extractionResult.extraction_confidence,
            missing_questions: extractionResult.missing_questions,
            transcript_length: transcript_text.length,
            persona_run_id: personaRun.id,
          },
        });
    }

    // Trigger codex orchestration
    console.log('Triggering codex orchestration...');
    
    fetch(`${supabaseUrl}/functions/v1/orchestrate-codexes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ personaRunId: personaRun.id }),
    }).catch(err => console.error("Failed to trigger orchestration:", err));

    return new Response(JSON.stringify({
      success: true,
      personaRunId: personaRun.id,
      extraction_result: extractionResult,
      message: `Transcript processed successfully. ${activeCodexPrompts.length} CODEXes are being generated.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-transcript function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
