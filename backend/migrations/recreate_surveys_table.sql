-- Recreate surveys table with all new fields
-- Run this SQL in your Supabase SQL editor

-- Drop the existing table (if it exists)
DROP TABLE IF EXISTS public.surveys CASCADE;

-- Create the new surveys table with all fields
CREATE TABLE public.surveys (
  id bigint generated always as identity not null,
  user_id uuid null,
  
  -- Legacy fields (kept for backward compatibility)
  goals text null,
  challenges text null,
  experience_level text null,
  additional_notes text null,
  
  -- New survey fields - Section 1: Personal Information
  full_name text null,
  email text null,
  age_range text null,
  country text null,
  linkedin_profile text null,
  
  -- New survey fields - Section 2: Background
  best_describes_you text null,
  industry text null,
  job_role text null,
  years_experience text null,
  how_did_you_hear text null,
  referral_name text null,
  
  created_at timestamp without time zone null default now(),
  
  constraint surveys_pkey primary key (id),
  constraint surveys_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

-- Add comments to document the fields
COMMENT ON COLUMN public.surveys.full_name IS 'User full name from survey';
COMMENT ON COLUMN public.surveys.email IS 'User email from survey';
COMMENT ON COLUMN public.surveys.age_range IS 'User age range selection';
COMMENT ON COLUMN public.surveys.country IS 'User country/location';
COMMENT ON COLUMN public.surveys.linkedin_profile IS 'User LinkedIn profile URL (optional)';
COMMENT ON COLUMN public.surveys.best_describes_you IS 'What best describes the user';
COMMENT ON COLUMN public.surveys.industry IS 'Industry the user works in';
COMMENT ON COLUMN public.surveys.job_role IS 'User current job role';
COMMENT ON COLUMN public.surveys.years_experience IS 'Years of professional experience';
COMMENT ON COLUMN public.surveys.how_did_you_hear IS 'How user heard about the service';
COMMENT ON COLUMN public.surveys.referral_name IS 'Name of person who referred (if applicable)';

