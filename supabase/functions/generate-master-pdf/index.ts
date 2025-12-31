import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personaId } = await req.json();

    if (!personaId) {
      throw new Error('personaId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Generate comprehensive HTML
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; page-break-after: avoid; }
          h2 { color: #34495e; margin-top: 40px; page-break-after: avoid; }
          h3 { color: #7f8c8d; margin-top: 25px; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .persona-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .codex-section { margin-top: 50px; page-break-before: always; }
          .label { font-weight: bold; color: #7f8c8d; margin-top: 15px; }
          .content { margin-top: 5px; margin-bottom: 15px; }
          .score { font-size: 24px; color: #3498db; font-weight: bold; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <h1>Coach Persona Blueprint & CODEXes</h1>
        <p><strong>Title:</strong> ${persona.title_or_label}</p>
        <p><strong>Generated:</strong> ${new Date(persona.created_at).toLocaleDateString()}</p>
    `;

    // Add Persona Section
    htmlContent += `
      <div class="persona-section">
        <h2>Coach Persona Blueprint</h2>
        ${persona.coach_readiness_score ? `<p><strong>Readiness Score:</strong> <span class="score">${persona.coach_readiness_score}/100</span></p>` : ''}
        <div class="content">${persona.generated_persona_text || 'Not generated yet'}</div>
      </div>
    `;

    // Add all CODEXes
    const codexTypes = [
      'niche_clarity',
      'systems_setup',
      'life_automation',
      'meta_ads',
      'brand_story',
      'curriculum_design',
      'rapid_clarity',
      'webinar_selling'
    ];

    for (const codexType of codexTypes) {
      const codexData = persona[`${codexType}_codex`];
      if (!codexData) continue;

      const codexName = codexType.split('_').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      htmlContent += `
        <div class="codex-section">
          <h2>${codexName} CODEX</h2>
      `;

      for (const [key, value] of Object.entries(codexData)) {
        if (typeof value === 'string') {
          htmlContent += `
            <div class="section">
              <div class="label">${key.replace(/_/g, ' ').toUpperCase()}</div>
              <div class="content">${value}</div>
            </div>
          `;
        } else if (Array.isArray(value)) {
          htmlContent += `
            <div class="section">
              <div class="label">${key.replace(/_/g, ' ').toUpperCase()}</div>
              <ul>
                ${value.map((item: any) => {
                  if (typeof item === 'string') {
                    return `<li>${item}</li>`;
                  } else if (typeof item === 'object') {
                    return `<li><pre>${JSON.stringify(item, null, 2)}</pre></li>`;
                  }
                  return '';
                }).join('')}
              </ul>
            </div>
          `;
        } else if (typeof value === 'object' && value !== null) {
          htmlContent += `
            <div class="section">
              <div class="label">${key.replace(/_/g, ' ').toUpperCase()}</div>
              <div class="content">
                ${Object.entries(value).map(([k, v]) => `
                  <div style="margin-left: 15px; margin-top: 10px;">
                    <strong>${k}:</strong> ${typeof v === 'object' ? `<pre>${JSON.stringify(v, null, 2)}</pre>` : v}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }

      htmlContent += `</div>`;
    }

    htmlContent += `
      </body>
      </html>
    `;

    // Generate PDF
    const pdfResponse = await fetch('https://pdf.lovable.app/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        }
      })
    });

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return new Response(JSON.stringify({ pdf: base64Pdf }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating master PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
