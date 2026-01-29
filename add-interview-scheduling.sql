-- Interview Scheduling and Feedback System
-- Run this in your Supabase SQL Editor

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  interviewer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  interviewer_name TEXT NOT NULL,
  interviewer_email TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'video', 'in_person')),
  prep_notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'feedback_received', 'cancelled')),
  feedback_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interview_feedback table
CREATE TABLE IF NOT EXISTS interview_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  interview_notes TEXT,
  strengths TEXT,
  concerns TEXT,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('advance', 'hold', 'decline')),
  video_debrief_link TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_search_id ON interviews(search_id);
CREATE INDEX IF NOT EXISTS idx_interviews_feedback_token ON interviews(feedback_token);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_interviews_updated_at
BEFORE UPDATE ON interviews
FOR EACH ROW
EXECUTE FUNCTION update_interviews_updated_at();

-- Row Level Security
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for interviews
DROP POLICY IF EXISTS "Allow all operations on interviews" ON interviews;
CREATE POLICY "Allow all operations on interviews"
ON interviews
FOR ALL
USING (true)
WITH CHECK (true);

-- Policies for interview_feedback
DROP POLICY IF EXISTS "Allow all operations on interview_feedback" ON interview_feedback;
CREATE POLICY "Allow all operations on interview_feedback"
ON interview_feedback
FOR ALL
USING (true)
WITH CHECK (true);
