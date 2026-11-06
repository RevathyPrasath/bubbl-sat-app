-- Add diagram_url to questions table
-- Run this in Supabase SQL Editor

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS diagram_url text;
