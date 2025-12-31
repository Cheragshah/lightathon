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
    const { codexId } = await req.json();

    if (!codexId) {
      throw new Error('codexId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch codex with persona_run and sections
    const { data: codex, error: codexError } = await supabase
      .from('codexes')
      .select(`
        *,
        persona_run:persona_runs(*),
        sections:codex_sections(*)
      `)
      .eq('id', codexId)
      .single();

    if (codexError || !codex) {
      console.error('Error fetching codex:', codexError);
      return new Response(JSON.stringify({ error: 'Codex not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership or admin
    if (codex.persona_run.user_id !== user.id) {
      const { data: hasAdminRole } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (!hasAdminRole) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch active PDF template for branding
    const { data: template } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('is_active', true)
      .single();

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Load logo if available
    let logoImage = null;
    if (template?.logo_url) {
      try {
        const logoResponse = await fetch(template.logo_url);
        const logoBytes = await logoResponse.arrayBuffer();
        const logoExt = template.logo_url.split('.').pop()?.toLowerCase();
        
        if (logoExt === 'png') {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (logoExt === 'jpg' || logoExt === 'jpeg') {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    }
    
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    const margin = template?.page_margin || 50;
    const maxWidth = width - (margin * 2);
    const headerHeight = 70; // Increased to prevent overlap
    const footerHeight = 40;
    const contentTop = height - margin - headerHeight;
    const contentBottom = margin + footerHeight;
    let yPosition = contentTop;
    
    // Helper to add header
    const addHeader = (page: any) => {
      if (!template?.show_header) return;
      
      // Add logo if available (left side)
      if (logoImage) {
        const logoScale = 0.1; // Reduced size
        const logoWidth = logoImage.width * logoScale;
        const logoHeight = logoImage.height * logoScale;
        page.drawImage(logoImage, {
          x: margin,
          y: height - margin - logoHeight - 5,
          width: logoWidth,
          height: logoHeight,
        });
      }
      
      // Add company name (right side, aligned)
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
      
      // Draw separator line
      page.drawLine({
        start: { x: margin, y: height - margin - headerHeight + 10 },
        end: { x: width - margin, y: height - margin - headerHeight + 10 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    };
    
    // Helper to add footer with page numbers
    const addFooter = (page: any, pageNum: number, totalPages: number) => {
      if (!template?.show_footer) return;
      
      // Draw separator line
      page.drawLine({
        start: { x: margin, y: margin + footerHeight - 10 },
        end: { x: width - margin, y: margin + footerHeight - 10 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      
      // Add page numbers
      if (template?.show_page_numbers) {
        const pageText = `Page ${pageNum} of ${totalPages}`;
        const pageTextWidth = timesRomanFont.widthOfTextAtSize(pageText, 10);
        page.drawText(pageText, {
          x: width - margin - pageTextWidth,
          y: margin + 10,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      // Add codex name in footer
      page.drawText(codex.codex_name, {
        x: margin,
        y: margin + 10,
        size: 9,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    };
    
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
        .replace(/[^\x20-\x7E\n\r\t]/g, ''); // Remove any other non-ASCII printable characters
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
            console.error('Error measuring text width:', e);
            testWidth = testLine.length * fontSize * 0.5; // Fallback estimate
          }
          
          if (testWidth > maxWidth && line !== '') {
            // Draw current line
            try {
              currentPage.drawText(line.trim(), { x: margin, y: yPosition, size: fontSize, font, color: rgb(0, 0, 0) });
            } catch (e) {
              console.error('Error drawing text:', e);
            }
            yPosition -= fontSize + 5;
            line = word + ' ';
            
            // Add new page if needed
            if (yPosition < contentBottom) {
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
          
          // Check if we need a new page after drawing
          if (yPosition < contentBottom) {
            currentPage = pdfDoc.addPage();
            addHeader(currentPage);
            yPosition = contentTop;
          }
        }
      }
    };
    
    // Add header to first page
    addHeader(currentPage);
    
    // Generate custom cover page if enabled
    if (template?.show_cover_page) {
      // Apply background color
      if (template.cover_bg_color_r !== undefined) {
        currentPage.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: height,
          color: rgb(
            template.cover_bg_color_r || 1,
            template.cover_bg_color_g || 1,
            template.cover_bg_color_b || 1
          ),
        });
      }
      
      // Add background image if available
      if (template?.cover_bg_image_url) {
        try {
          const bgResponse = await fetch(template.cover_bg_image_url);
          const bgBytes = await bgResponse.arrayBuffer();
          const bgExt = template.cover_bg_image_url.split('.').pop()?.toLowerCase();
          
          let bgImage = null;
          if (bgExt === 'png') {
            bgImage = await pdfDoc.embedPng(bgBytes);
          } else if (bgExt === 'jpg' || bgExt === 'jpeg') {
            bgImage = await pdfDoc.embedJpg(bgBytes);
          }
          
          if (bgImage) {
            const imgScale = Math.min(width / bgImage.width, height / bgImage.height);
            const imgWidth = bgImage.width * imgScale;
            const imgHeight = bgImage.height * imgScale;
            currentPage.drawImage(bgImage, {
              x: (width - imgWidth) / 2,
              y: (height - imgHeight) / 2,
              width: imgWidth,
              height: imgHeight,
              opacity: 0.2,
            });
          }
        } catch (error) {
          console.error('Failed to load background image:', error);
        }
      }
      
      // Re-add header on top of background
      addHeader(currentPage);
      
      // Center the title on cover page
      const titleY = height / 2 + 100;
      const titleSize = template?.title_font_size || 32;
      const titleWidth = timesRomanBoldFont.widthOfTextAtSize(codex.codex_name, titleSize);
      
      currentPage.drawText(codex.codex_name, {
        x: (width - titleWidth) / 2,
        y: titleY,
        size: titleSize,
        font: timesRomanBoldFont,
        color: rgb(
          template?.title_color_r || 0,
          template?.title_color_g || 0,
          template?.title_color_b || 0
        ),
      });
      
      // Add subtitle if provided
      if (template?.cover_subtitle) {
        const subtitleSize = (template?.title_font_size || 32) * 0.6;
        const subtitleWidth = timesRomanFont.widthOfTextAtSize(template.cover_subtitle, subtitleSize);
        currentPage.drawText(template.cover_subtitle, {
          x: (width - subtitleWidth) / 2,
          y: titleY - subtitleSize - 20,
          size: subtitleSize,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      
      // Add metadata centered below title
      const metaY = height / 2 - 50;
      const metaSize = 11;
      
      const personaText = `Persona: ${codex.persona_run.title}`;
      const personaWidth = timesRomanFont.widthOfTextAtSize(personaText, metaSize);
      currentPage.drawText(personaText, {
        x: (width - personaWidth) / 2,
        y: metaY,
        size: metaSize,
        font: timesRomanFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      const dateText = `Generated: ${new Date(codex.created_at).toLocaleDateString()}`;
      const dateWidth = timesRomanFont.widthOfTextAtSize(dateText, metaSize);
      currentPage.drawText(dateText, {
        x: (width - dateWidth) / 2,
        y: metaY - 20,
        size: metaSize,
        font: timesRomanFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Add footer to cover page
      addFooter(currentPage, 1, 1); // Placeholder page count
      
      // Start new page for TOC or content
      currentPage = pdfDoc.addPage();
      addHeader(currentPage);
      yPosition = contentTop;
    }
    
    // Generate Table of Contents if enabled
    const tocEntries: Array<{ title: string; page: number }> = [];
    
    if (template?.show_toc) {
      // Title page with TOC
      yPosition -= 20; // Extra space after header
      currentPage.drawText('Table of Contents', {
        x: margin,
        y: yPosition,
        size: template?.title_font_size || 24,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 50;
      
      // Add TOC entries (we'll update page numbers later)
      const sortedSections = (codex.sections || []).sort((a: any, b: any) => a.section_index - b.section_index);
      sortedSections.forEach((section: any, index: number) => {
        tocEntries.push({ title: section.section_name, page: 0 }); // placeholder
        const entry = `${index + 1}. ${section.section_name}`;
        currentPage.drawText(entry, {
          x: margin + 10,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        if (yPosition < contentBottom) {
          currentPage = pdfDoc.addPage();
          addHeader(currentPage);
          yPosition = contentTop;
        }
      });
      
      // New page for content
      currentPage = pdfDoc.addPage();
      addHeader(currentPage);
      yPosition = contentTop;
    } else if (!template?.show_cover_page && !template?.show_toc) {
      // No cover page and no TOC - add title directly
      yPosition -= 20;
      try {
        currentPage.drawText(codex.codex_name, {
          x: margin,
          y: yPosition,
          size: template?.title_font_size || 24,
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
      yPosition -= 50;
      
      // Add metadata using direct drawing (not addText to avoid recursion)
      const metaY = yPosition;
      try {
        currentPage.drawText(`Persona: ${codex.persona_run.title}`, {
          x: margin,
          y: metaY,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        currentPage.drawText(`Generated: ${new Date(codex.created_at).toLocaleDateString()}`, {
          x: margin,
          y: metaY - 15,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        currentPage.drawText(`Status: ${codex.status}`, {
          x: margin,
          y: metaY - 30,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      } catch (e) {
        console.error('Error drawing metadata:', e);
      }
      yPosition = metaY - 50;
    }
    
    // Sort sections and add them
    const sortedSections = (codex.sections || []).sort((a: any, b: any) => a.section_index - b.section_index);
    
    for (let i = 0; i < sortedSections.length; i++) {
      const section = sortedSections[i];
      
      // Record page number for TOC
      if (template?.show_toc && tocEntries[i]) {
        tocEntries[i].page = pdfDoc.getPageCount();
      }
      
      // Add section title
      currentPage.drawText(section.section_name, {
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
      yPosition -= (template?.heading_font_size || 16) + 15;
      
      // Add section content
      const content = section.content || 'Content not yet generated';
      const paragraphs = content.split('\n\n');
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim()) {
          addText(paragraph.trim(), template?.body_font_size || 11, timesRomanFont);
          yPosition -= template?.section_spacing || 15;
          
          // Add new page if needed
          if (yPosition < contentBottom) {
            currentPage = pdfDoc.addPage();
            addHeader(currentPage);
            yPosition = contentTop;
          }
        }
      }
      
      yPosition -= template?.section_spacing || 20;
    }
    
    // Add footers to all pages with correct page numbers
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    pages.forEach((page, index) => {
      addFooter(page, index + 1, totalPages);
    });
    
    const pdfBytes = await pdfDoc.save();
    const uint8Array = new Uint8Array(pdfBytes);
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    const base64Pdf = btoa(binary);

    return new Response(JSON.stringify({ pdf: base64Pdf }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating CODEX PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
