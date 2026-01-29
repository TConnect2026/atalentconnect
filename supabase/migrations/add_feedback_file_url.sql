-- Add feedback_file_url column to interview_feedback table
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS feedback_file_url TEXT;
