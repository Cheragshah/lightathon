-- Insert 3 default PDF templates
INSERT INTO pdf_templates (
  template_name, is_active, 
  title_font, title_font_size, title_color_r, title_color_g, title_color_b,
  heading_font_size, heading_color_r, heading_color_g, heading_color_b,
  body_font, body_font_size, body_color_r, body_color_g, body_color_b,
  page_margin, line_spacing, section_spacing,
  show_cover_page, show_header, show_footer, show_page_numbers, show_toc,
  cover_bg_color_r, cover_bg_color_g, cover_bg_color_b,
  company_name, cover_subtitle
) VALUES 
(
  'Professional', true,
  'TimesRomanBold', 24, 0.1, 0.1, 0.3,
  16, 0.2, 0.24, 0.31,
  'TimesRoman', 11, 0.1, 0.1, 0.1,
  50, 5, 20,
  true, true, true, true, true,
  0.95, 0.95, 0.98,
  'Your Company', 'Professional Document'
),
(
  'Modern Minimal', false,
  'Helvetica', 28, 0.0, 0.0, 0.0,
  18, 0.2, 0.2, 0.2,
  'Helvetica', 10, 0.3, 0.3, 0.3,
  60, 6, 25,
  true, false, true, true, false,
  1.0, 1.0, 1.0,
  'Your Company', 'Clean & Simple'
),
(
  'Executive Premium', false,
  'TimesRomanBold', 26, 0.0, 0.15, 0.35,
  17, 0.1, 0.25, 0.4,
  'TimesRoman', 11, 0.15, 0.15, 0.15,
  55, 5, 22,
  true, true, true, true, true,
  0.05, 0.1, 0.2,
  'Your Company', 'Executive Report'
);