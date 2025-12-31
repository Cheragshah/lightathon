-- Add TagMango ID columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagmango_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagmango_host TEXT;