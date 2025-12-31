import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personaRunId } = await req.json();

    console.log('Retrying error sections', personaRunId ? `for persona run ${personaRunId}` : '(all)');

    // Get codex IDs for this persona run if specified
    let filterCodexIds: string[] | null = null;
    if (personaRunId) {
      const { data: codexes, error: codexError } = await supabase
        .from('codexes')
        .select('id')
        .eq('persona_run_id', personaRunId);
      
      if (codexError) {
        console.error('Error fetching codexes:', codexError);
        throw codexError;
      }
      
      filterCodexIds = codexes?.map(c => c.id) || [];
    }

    // Find error sections older than 5 minutes
    let query = supabase
      .from('codex_sections')
      .select('id, codex_id, section_name, section_index, retries')
      .eq('status', 'error')
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (filterCodexIds && filterCodexIds.length > 0) {
      query = query.in('codex_id', filterCodexIds);
    }

    const { data: errorSections, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching error sections:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${errorSections?.length || 0} error sections to retry`);

    if (!errorSections || errorSections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No error sections found to retry', retried: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      retried: 0,
      errors: [] as string[],
    };

    // Reset error sections to pending status
    const sectionIds = errorSections.map(s => s.id);
    const { error: updateError } = await supabase
      .from('codex_sections')
      .update({ 
        status: 'pending',
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .in('id', sectionIds);

    if (updateError) {
      console.error('Error resetting sections to pending:', updateError);
      throw updateError;
    }

    console.log(`Reset ${sectionIds.length} error sections to pending`);

    // Also reset any codexes with ready_with_errors status to generating
    const updateCodexIds = [...new Set(errorSections.map(s => s.codex_id))];
    if (updateCodexIds.length > 0) {
      const { error: codexUpdateError } = await supabase
        .from('codexes')
        .update({ 
          status: 'generating',
          updated_at: new Date().toISOString()
        })
        .in('id', updateCodexIds)
        .eq('status', 'ready_with_errors');

      if (codexUpdateError) {
        console.error('Error updating codex status:', codexUpdateError);
      }
    }

    // Now call retry-pending-sections to process them
    const retryResponse = await supabase.functions.invoke('retry-pending-sections', {
      body: { 
        personaRunId,
        autoRetry: true 
      }
    });

    if (retryResponse.error) {
      console.error('Error calling retry-pending-sections:', retryResponse.error);
      results.errors.push(retryResponse.error.message);
    } else {
      results.retried = retryResponse.data?.retried || sectionIds.length;
    }

    console.log(`Successfully initiated retry for ${results.retried} error sections`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in retry-error-sections:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
