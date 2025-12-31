import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { personaRunId } = await req.json();

    if (!personaRunId) {
      throw new Error('personaRunId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch persona run with all codexes and sections
    const { data: personaRun, error: runError } = await supabase
      .from('persona_runs')
      .select(`
        *,
        codexes:codexes(
          *,
          sections:codex_sections(*)
        )
      `)
      .eq('id', personaRunId)
      .single();

    if (runError || !personaRun) {
      return new Response(JSON.stringify({ error: 'Persona run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership or admin
    const isOwner = personaRun.user_id === user.id;
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate PDFs for all codexes
    const pdfPromises = personaRun.codexes
      .sort((a: any, b: any) => a.codex_order - b.codex_order)
      .map(async (codex: any) => {
        const sections = (codex.sections || []).sort((a: any, b: any) => a.section_index - b.section_index);
        
        let htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
              h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
              h2 { color: #34495e; margin-top: 40px; page-break-after: avoid; }
              .section { margin-bottom: 30px; page-break-inside: avoid; }
              .content { margin-top: 10px; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${codex.codex_name}</h1>
            <p><strong>Generated:</strong> ${new Date(codex.created_at).toLocaleDateString()}</p>
        `;

        for (const section of sections) {
          htmlContent += `
            <div class="section">
              <h2>${section.section_name}</h2>
              <div class="content">${section.content || 'Not yet generated'}</div>
            </div>
          `;
        }

        htmlContent += `</body></html>`;

        const pdfResponse = await fetch('https://pdf.lovable.app/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlContent,
            options: {
              format: 'A4',
              margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
              printBackground: true,
            }
          }),
        });

        const responseText = await pdfResponse.text();
        
        if (!pdfResponse.ok) {
          console.error(`PDF generation failed for ${codex.codex_name}:`, responseText.substring(0, 500));
          throw new Error(`PDF generation failed for ${codex.codex_name}: ${pdfResponse.status}`);
        }

        let pdfData;
        try {
          pdfData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`Invalid JSON response for ${codex.codex_name}:`, responseText.substring(0, 500));
          throw new Error(`PDF service returned invalid response for ${codex.codex_name}`);
        }

        return {
          name: `${codex.codex_order}_${codex.codex_name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          content: pdfData.pdf
        };
      });

    const pdfs = await Promise.all(pdfPromises);

    // Return array of PDFs (client will handle ZIP creation)
    return new Response(
      JSON.stringify({ pdfs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating ZIP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
