-- Create user_category_assignments table for per-user category overrides
CREATE TABLE public.user_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.questionnaire_categories(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  enabled_by UUID,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable Row-Level Security
ALTER TABLE public.user_category_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for user_category_assignments
CREATE POLICY "Admins can manage user category assignments" 
ON public.user_category_assignments
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own assignments" 
ON public.user_category_assignments
FOR SELECT 
USING (auth.uid() = user_id);

-- Enable realtime for generation status tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.persona_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.codexes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.codex_sections;