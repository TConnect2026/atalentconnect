-- Add support for panel interviews (multiple interviewers per interview)
-- Run this in your Supabase SQL Editor

-- Create junction table for interview interviewers
CREATE TABLE IF NOT EXISTS interview_interviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(interview_id, contact_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interview_interviewers_interview_id ON interview_interviewers(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_interviewers_contact_id ON interview_interviewers(contact_id);

-- Row Level Security
ALTER TABLE interview_interviewers ENABLE ROW LEVEL SECURITY;

-- Policy for interview_interviewers
DROP POLICY IF EXISTS "Allow all operations on interview_interviewers" ON interview_interviewers;
CREATE POLICY "Allow all operations on interview_interviewers"
ON interview_interviewers
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for clarity
COMMENT ON TABLE interview_interviewers IS 'Junction table for panel interviews - stores all interviewers for each interview';
