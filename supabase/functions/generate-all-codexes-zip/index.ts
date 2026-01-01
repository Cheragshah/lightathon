import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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

    console.log(`Starting PDF generation for persona run: ${personaRunId}`);

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
      console.error('Error fetching persona run:', runError);
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

    // Fetch active PDF template for branding
    const { data: template } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('is_active', true)
      .single();

    console.log(`Generating PDFs for ${personaRun.codexes?.length || 0} codexes`);

    // Helper function to sanitize text for WinAnsi encoding
    const sanitizeText = (text: string): string => {
      return text
        .replace(/→/g, '->')
        .replace(/←/g, '<-')
        .replace(/↑/g, '^')
        .replace(/↓/g, 'v')
        .replace(/•/g, '*')
        .replace(/–/g, '-')
        .replace(/—/g, '--')
        .replace(/'/g, "'")
        .replace(/'/g, "'")
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/…/g, '...')
        .replace(/[^\x20-\x7E\n\r\t]/g, '');
    };

    // Generate PDF for each codex using pdf-lib
    const sortedCodexes = (personaRun.codexes || []).sort((a: any, b: any) => a.codex_order - b.codex_order);
    const pdfs = [];

    for (const codex of sortedCodexes) {
      try {
        console.log(`Generating PDF for: ${codex.codex_name}`);
        
        const pdfDoc = await PDFDocument.create();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        let currentPage = pdfDoc.addPage();
        const { width, height } = currentPage.getSize();
        const margin = template?.page_margin || 50;
        const maxWidth = width - (margin * 2);
        const headerHeight = 70;
        const footerHeight = 40;
        const contentTop = height - margin - headerHeight;
        const contentBottom = margin + footerHeight;
        let yPosition = contentTop;

        // Helper to add header
        const addHeader = (page: any) => {
          if (template?.company_name) {
            const companyText = template.company_name;
            const textWidth = timesRomanBoldFont.widthOfTextAtSize(companyText, 11);
            page.drawText(companyText, {
              x: width - margin - textWidth,
              y: height - margin - 25,
              size: 11,
              font: timesRomanBoldFont,
              color: rgb(0.2, 0.2, 0.2),
            });
          }
          
          page.drawLine({
            start: { x: margin, y: height - margin - headerHeight + 10 },
            end: { x: width - margin, y: height - margin - headerHeight + 10 },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          });
        };

        // Helper to add footer
        const addFooter = (page: any, pageNum: number) => {
          page.drawLine({
            start: { x: margin, y: margin + footerHeight - 10 },
            end: { x: width - margin, y: margin + footerHeight - 10 },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          });
          
          const pageText = `Page ${pageNum}`;
          const pageTextWidth = timesRomanFont.widthOfTextAtSize(pageText, 10);
          page.drawText(pageText, {
            x: width - margin - pageTextWidth,
            y: margin + 10,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          const codexNameSafe = sanitizeText(codex.codex_name);
          page.drawText(codexNameSafe, {
            x: margin,
            y: margin + 10,
            size: 9,
            font: timesRomanFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        };

        // Helper function to add text with word wrap
        const addText = (text: string, fontSize: number, font: any) => {
          text = sanitizeText(text);
          const lines = text.split(/\n+/);
          
          for (const lineText of lines) {
            if (!lineText.trim()) continue;
            
            const words = lineText.split(' ');
            let line = '';
            
            for (const word of words) {
              const testLine = line + word + ' ';
              let testWidth = 0;
              
              try {
                testWidth = font.widthOfTextAtSize(testLine, fontSize);
              } catch (e) {
                testWidth = testLine.length * fontSize * 0.5;
              }
              
              if (testWidth > maxWidth && line !== '') {
                try {
                  currentPage.drawText(line.trim(), { x: margin, y: yPosition, size: fontSize, font, color: rgb(0, 0, 0) });
                } catch (e) {
                  console.error('Error drawing text:', e);
                }
                yPosition -= fontSize + 5;
                line = word + ' ';
                
                if (yPosition < contentBottom) {
                  addFooter(currentPage, pdfDoc.getPageCount());
                  currentPage = pdfDoc.addPage();
                  addHeader(currentPage);
                  yPosition = contentTop;
                }
              } else {
                line = testLine;
              }
            }
            
            if (line.trim() !== '') {
              try {
                currentPage.drawText(line.trim(), { x: margin, y: yPosition, size: fontSize, font, color: rgb(0, 0, 0) });
              } catch (e) {
                console.error('Error drawing text:', e);
              }
              yPosition -= fontSize + 5;
              
              if (yPosition < contentBottom) {
                addFooter(currentPage, pdfDoc.getPageCount());
                currentPage = pdfDoc.addPage();
                addHeader(currentPage);
                yPosition = contentTop;
              }
            }
          }
        };

        // Add header to first page
        addHeader(currentPage);

        // Add title
        yPosition -= 20;
        const titleSize = template?.title_font_size || 24;
        try {
          currentPage.drawText(sanitizeText(codex.codex_name), {
            x: margin,
            y: yPosition,
            size: titleSize,
            font: timesRomanBoldFont,
            color: rgb(
              template?.title_color_r || 0,
              template?.title_color_g || 0,
              template?.title_color_b || 0
            ),
          });
        } catch (e) {
          console.error('Error drawing title:', e);
        }
        yPosition -= titleSize + 30;

        // Add metadata
        try {
          currentPage.drawText(`Persona: ${sanitizeText(personaRun.title)}`, {
            x: margin,
            y: yPosition,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= 15;
          currentPage.drawText(`Generated: ${new Date(codex.created_at).toLocaleDateString()}`, {
            x: margin,
            y: yPosition,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.4, 0.4, 0.4),
          });
        } catch (e) {
          console.error('Error drawing metadata:', e);
        }
        yPosition -= 40;

        // Add sections
        const sortedSections = (codex.sections || []).sort((a: any, b: any) => a.section_index - b.section_index);
        
        for (const section of sortedSections) {
          // Add section title
          try {
            currentPage.drawText(sanitizeText(section.section_name), {
              x: margin,
              y: yPosition,
              size: template?.heading_font_size || 16,
              font: timesRomanBoldFont,
              color: rgb(
                template?.heading_color_r || 0.2,
                template?.heading_color_g || 0.24,
                template?.heading_color_b || 0.31
              ),
            });
          } catch (e) {
            console.error('Error drawing section title:', e);
          }
          yPosition -= (template?.heading_font_size || 16) + 15;

          // Add section content
          if (section.content) {
            addText(section.content, template?.body_font_size || 11, timesRomanFont);
          } else {
            addText('Content not yet generated.', template?.body_font_size || 11, timesRomanFont);
          }
          
          yPosition -= template?.section_spacing || 20;
          
          if (yPosition < contentBottom) {
            addFooter(currentPage, pdfDoc.getPageCount());
            currentPage = pdfDoc.addPage();
            addHeader(currentPage);
            yPosition = contentTop;
          }
        }

        // Add footer to last page
        addFooter(currentPage, pdfDoc.getPageCount());

        // Get PDF bytes and convert to base64
        const pdfBytes = await pdfDoc.save();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

        pdfs.push({
          name: `${String(codex.codex_order).padStart(2, '0')}_${codex.codex_name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          content: base64
        });

        console.log(`Successfully generated PDF for: ${codex.codex_name}`);
      } catch (pdfError) {
        console.error(`Error generating PDF for ${codex.codex_name}:`, pdfError);
        // Continue with other PDFs even if one fails
      }
    }

    console.log(`Successfully generated ${pdfs.length} PDFs`);

    return new Response(
      JSON.stringify({ pdfs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating PDFs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});