-- Migration: Add new survey fields
-- Run this SQL in your Supabase SQL editor

-- Add columns one by one (IF NOT EXISTS may not be supported in all PostgreSQL versions)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='full_name') THEN
        ALTER TABLE public.surveys ADD COLUMN full_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='email') THEN
        ALTER TABLE public.surveys ADD COLUMN email text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='age_range') THEN
        ALTER TABLE public.surveys ADD COLUMN age_range text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='country') THEN
        ALTER TABLE public.surveys ADD COLUMN country text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='linkedin_profile') THEN
        ALTER TABLE public.surveys ADD COLUMN linkedin_profile text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='best_describes_you') THEN
        ALTER TABLE public.surveys ADD COLUMN best_describes_you text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='industry') THEN
        ALTER TABLE public.surveys ADD COLUMN industry text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='job_role') THEN
        ALTER TABLE public.surveys ADD COLUMN job_role text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='years_experience') THEN
        ALTER TABLE public.surveys ADD COLUMN years_experience text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='how_did_you_hear') THEN
        ALTER TABLE public.surveys ADD COLUMN how_did_you_hear text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='referral_name') THEN
        ALTER TABLE public.surveys ADD COLUMN referral_name text;
    END IF;
END $$;

-- Optional: Add comments to document the fields
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

