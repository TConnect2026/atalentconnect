-- Add time zone, duration, and interview guide to interviews table
-- Run this in your Supabase SQL Editor

-- Add new columns to interviews table
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles',
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS interview_guide_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN interviews.timezone IS 'Time zone for the interview (e.g., America/New_York)';
COMMENT ON COLUMN interviews.duration_minutes IS 'Interview duration in minutes';
COMMENT ON COLUMN interviews.interview_guide_url IS 'Optional interview guide document for this specific interview';
