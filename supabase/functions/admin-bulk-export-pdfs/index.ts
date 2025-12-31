import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { personaRunIds } = await req.json();

    if (!personaRunIds || !Array.isArray(personaRunIds) || personaRunIds.length === 0) {
      throw new Error('Missing or invalid personaRunIds array');
    }

    console.log('Admin bulk exporting PDFs:', { adminId: user.id, count: personaRunIds.length });

    // Generate PDFs for each persona run
    const pdfPromises = personaRunIds.map(async (runId) => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-master-pdf', {
          body: { personaRunId: runId }
        });

        if (error) {
          console.error(`Error generating PDF for ${runId}:`, error);
          return { runId, error: error.message };
        }

        return { runId, success: true, pdf: data };
      } catch (error) {
        console.error(`Exception generating PDF for ${runId}:`, error);
        return { runId, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(pdfPromises);

    // Log the action
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'bulk_pdf_export',
      details: { 
        persona_run_ids: personaRunIds,
        success_count: results.filter(r => r.success).length,
        error_count: results.filter(r => r.error).length
      }
    });

    return new Response(JSON.stringify({ 
      results,
      summary: {
        total: personaRunIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-bulk-export-pdfs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
