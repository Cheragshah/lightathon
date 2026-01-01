import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartLightathonRequest {
  userId: string;
  personaRunId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to verify admin status
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: isAdmin } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, personaRunId }: StartLightathonRequest = await req.json();

    if (!userId || !personaRunId) {
      return new Response(JSON.stringify({ error: 'userId and personaRunId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting Lightathon for user ${userId}, persona run ${personaRunId}`);

    // Check if enrollment already exists
    const { data: existingEnrollment } = await supabase
      .from('lightathon_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('persona_run_id', personaRunId)
      .single();

    if (existingEnrollment) {
      return new Response(JSON.stringify({ 
        error: 'User already enrolled in Lightathon for this persona run' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the "21 Days Lightathon" codex content for this persona run
    const { data: lightathonCodex, error: codexError } = await supabase
      .from('codexes')
      .select(`
        id,
        codex_name,
        codex_sections (
          id,
          section_name,
          section_index,
          content,
          status
        )
      `)
      .eq('persona_run_id', personaRunId)
      .ilike('codex_name', '%21 Days Lightathon%')
      .single();

    if (codexError || !lightathonCodex) {
      console.error('Lightathon codex not found:', codexError);
      return new Response(JSON.stringify({ 
        error: '21 Days Lightathon codex not found for this persona run' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('lightathon_enrollments')
      .insert({
        user_id: userId,
        persona_run_id: personaRunId,
        enabled_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return new Response(JSON.stringify({ error: 'Failed to create enrollment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse codex sections to extract daily missions
    // Each section might contain content for one or more days
    const sections = lightathonCodex.codex_sections || [];
    const completedSections = sections
      .filter((s: any) => s.status === 'completed' && s.content)
      .sort((a: any, b: any) => a.section_index - b.section_index);

    // Create 21 daily progress records
    const dailyProgressRecords = [];
    const now = new Date();
    
    for (let day = 1; day <= 21; day++) {
      // Extract mission content from sections
      // Try to find a section that contains "Day X" content
      let missionTitle = `Day ${day} Mission`;
      let missionContent = '';

      // Look through sections for day-specific content
      for (const section of completedSections) {
        const content = section.content || '';
        // Look for patterns like "Day 1:", "Day 1 -", "## Day 1"
        const dayPattern = new RegExp(`(?:^|\\n)(?:#+\\s*)?Day\\s*${day}[:\\s-]([\\s\\S]*?)(?=(?:\\n(?:#+\\s*)?Day\\s*\\d|$))`, 'i');
        const match = content.match(dayPattern);
        if (match) {
          missionContent = match[1].trim();
          // Extract title if present
          const titleMatch = missionContent.match(/^([^\n]+)/);
          if (titleMatch) {
            missionTitle = `Day ${day}: ${titleMatch[1].substring(0, 100)}`;
          }
          break;
        }
      }

      // If no specific day content found, use section content directly based on day number
      if (!missionContent && completedSections[day - 1]) {
        missionContent = completedSections[day - 1].content || '';
        missionTitle = `Day ${day}: ${completedSections[day - 1].section_name || 'Mission'}`;
      }

      dailyProgressRecords.push({
        enrollment_id: enrollment.id,
        day_number: day,
        mission_title: missionTitle,
        mission_content: missionContent || `Complete your Day ${day} Lightathon exercise.`,
        status: day === 1 ? 'unlocked' : 'locked',
        unlocked_at: day === 1 ? now.toISOString() : null
      });
    }

    // Insert all daily progress records
    const { error: progressError } = await supabase
      .from('lightathon_daily_progress')
      .insert(dailyProgressRecords);

    if (progressError) {
      console.error('Error creating daily progress:', progressError);
      // Clean up enrollment
      await supabase.from('lightathon_enrollments').delete().eq('id', enrollment.id);
      return new Response(JSON.stringify({ error: 'Failed to create daily progress records' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Lightathon started successfully for user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      enrollmentId: enrollment.id,
      message: 'Lightathon started successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in admin-start-lightathon:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
