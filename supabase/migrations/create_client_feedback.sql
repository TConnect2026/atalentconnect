-- Create client_feedback table
CREATE TABLE IF NOT EXISTS client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('advance', 'hold', 'concern')),
  notes TEXT,
  feedback_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_client_feedback_candidate ON client_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_search ON client_feedback(search_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_reviewer ON client_feedback(reviewer_email);

-- Add RLS policies
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback
CREATE POLICY "Anyone can insert client feedback"
  ON client_feedback FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read feedback
CREATE POLICY "Anyone can read client feedback"
  ON client_feedback FOR SELECT
  USING (true);

-- Add comment
COMMENT ON TABLE client_feedback IS 'Feedback from Search Team members on candidates in client portal';
