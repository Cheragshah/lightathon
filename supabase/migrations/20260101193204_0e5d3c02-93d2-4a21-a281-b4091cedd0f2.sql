-- Create lightathon_enrollments table
CREATE TABLE public.lightathon_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  persona_run_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  enabled_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, persona_run_id)
);

-- Create lightathon_daily_progress table
CREATE TABLE public.lightathon_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.lightathon_enrollments(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 21),
  mission_title TEXT,
  mission_content TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_reflection TEXT,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, day_number)
);

-- Enable RLS on both tables
ALTER TABLE public.lightathon_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightathon_daily_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for lightathon_enrollments
CREATE POLICY "Admins can manage enrollments"
ON public.lightathon_enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own enrollments"
ON public.lightathon_enrollments
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for lightathon_daily_progress
CREATE POLICY "Admins can manage daily progress"
ON public.lightathon_daily_progress
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own daily progress"
ON public.lightathon_daily_progress
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lightathon_enrollments
  WHERE lightathon_enrollments.id = lightathon_daily_progress.enrollment_id
  AND lightathon_enrollments.user_id = auth.uid()
));

CREATE POLICY "Users can update their own daily progress"
ON public.lightathon_daily_progress
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.lightathon_enrollments
  WHERE lightathon_enrollments.id = lightathon_daily_progress.enrollment_id
  AND lightathon_enrollments.user_id = auth.uid()
));

-- Trigger to update updated_at on daily progress
CREATE TRIGGER update_lightathon_daily_progress_updated_at
BEFORE UPDATE ON public.lightathon_daily_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();