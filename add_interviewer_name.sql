-- Add interviewer_name to stages table
ALTER TABLE stages
ADD COLUMN IF NOT EXISTS interviewer_name TEXT;
