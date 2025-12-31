-- Add batch field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch TEXT;

-- Create batches table for managing user groups
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS on batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for batches
CREATE POLICY "Admins can manage batches"
ON public.batches
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active batches"
ON public.batches
FOR SELECT
USING (is_active = true);

-- Create questionnaire_assignments table for enabling categories per batch
CREATE TABLE public.questionnaire_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.questionnaire_categories(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  enabled_by UUID,
  UNIQUE(batch_id, category_id)
);

-- Enable RLS on questionnaire_assignments
ALTER TABLE public.questionnaire_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for questionnaire_assignments
CREATE POLICY "Admins can manage questionnaire assignments"
ON public.questionnaire_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view their batch assignments"
ON public.questionnaire_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.batches b ON p.batch = b.batch_name
    WHERE p.id = auth.uid() AND b.id = questionnaire_assignments.batch_id
  )
);

-- Create codex_generation_queue table for admin-triggered generation
CREATE TABLE public.codex_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  codex_prompt_id UUID REFERENCES public.codex_prompts(id) ON DELETE CASCADE NOT NULL,
  persona_run_id UUID REFERENCES public.persona_runs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  ai_provider_id UUID REFERENCES public.ai_providers(id),
  ai_model TEXT,
  error_message TEXT,
  triggered_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS on codex_generation_queue
ALTER TABLE public.codex_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for codex_generation_queue
CREATE POLICY "Admins can manage generation queue"
ON public.codex_generation_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own queue items"
ON public.codex_generation_queue
FOR SELECT
USING (user_id = auth.uid());

-- Create trigger for updated_at on batches
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();