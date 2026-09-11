-- Add suspended field to profiles for user suspension feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;

-- Add suspended_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add suspended_reason for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT NULL;