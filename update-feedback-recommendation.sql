-- Update interview_feedback table to support "concern" recommendation
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE interview_feedback DROP CONSTRAINT IF EXISTS interview_feedback_recommendation_check;

-- Add new constraint that allows: advance, hold, decline, concern
ALTER TABLE interview_feedback ADD CONSTRAINT interview_feedback_recommendation_check
  CHECK (recommendation IN ('advance', 'hold', 'decline', 'concern'));

-- Note: We keep 'decline' for backward compatibility with existing data
-- The UI will display both 'decline' and 'concern' as "Concern" with orange badge
