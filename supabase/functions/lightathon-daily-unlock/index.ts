import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function should be run daily at 4:30 AM IST (11:00 PM UTC previous day)
// It unlocks the next day's mission for users who completed their previous day

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running daily Lightathon unlock job...');

    // Get all active enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('lightathon_enrollments')
      .select('id, user_id')
      .eq('is_active', true);

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return new Response(JSON.stringify({ error: 'Failed to fetch enrollments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('No active enrollments found');
      return new Response(JSON.stringify({ message: 'No active enrollments' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let unlockedCount = 0;
    let skippedCount = 0;

    for (const enrollment of enrollments) {
      // Get the latest completed day for this enrollment
      const { data: latestCompleted } = await supabase
        .from('lightathon_daily_progress')
        .select('day_number')
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'completed')
        .order('day_number', { ascending: false })
        .limit(1)
        .single();

      // Get the current unlocked day (if any)
      const { data: currentUnlocked } = await supabase
        .from('lightathon_daily_progress')
        .select('day_number')
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'unlocked')
        .single();

      // If there's already an unlocked day that's not completed, skip
      if (currentUnlocked) {
        console.log(`Enrollment ${enrollment.id}: Day ${currentUnlocked.day_number} still unlocked, skipping`);
        skippedCount++;
        continue;
      }

      // Determine the next day to unlock
      const nextDay = latestCompleted ? latestCompleted.day_number + 1 : 1;

      // If we've completed all 21 days, mark enrollment as inactive
      if (nextDay > 21) {
        await supabase
          .from('lightathon_enrollments')
          .update({ is_active: false })
          .eq('id', enrollment.id);
        console.log(`Enrollment ${enrollment.id}: All 21 days completed, marked inactive`);
        continue;
      }

      // Unlock the next day
      const { error: unlockError } = await supabase
        .from('lightathon_daily_progress')
        .update({ 
          status: 'unlocked',
          unlocked_at: new Date().toISOString()
        })
        .eq('enrollment_id', enrollment.id)
        .eq('day_number', nextDay);

      if (unlockError) {
        console.error(`Error unlocking day ${nextDay} for enrollment ${enrollment.id}:`, unlockError);
      } else {
        console.log(`Unlocked Day ${nextDay} for enrollment ${enrollment.id}`);
        unlockedCount++;
      }
    }

    console.log(`Daily unlock complete. Unlocked: ${unlockedCount}, Skipped: ${skippedCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      unlockedCount,
      skippedCount,
      totalEnrollments: enrollments.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in lightathon-daily-unlock:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
