-- Create early_signups table for email collection
CREATE TABLE public.early_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.early_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can signup for early access" ON public.early_signups FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view signups" ON public.early_signups FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create app_settings table for dynamic configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES ('countdown_target_date', '"2025-02-01T00:00:00Z"');
INSERT INTO public.app_settings (key, value) VALUES ('coming_soon_enabled', 'true');