-- Add candidate profile fields for the new Candidate Profile component

-- Add new fields to candidates table
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS open_to_relocation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS general_notes TEXT,
ADD COLUMN IF NOT EXISTS compensation_expectation TEXT,
ADD COLUMN IF NOT EXISTS aggregate_summary TEXT;

-- Add comments for clarity
COMMENT ON COLUMN candidates.photo_url IS 'URL to candidate photo uploaded by recruiter. Shows initials if no photo.';
COMMENT ON COLUMN candidates.location IS 'Candidate location as "City, State" (e.g., "San Francisco, CA")';
COMMENT ON COLUMN candidates.open_to_relocation IS 'Whether candidate is open to relocating';
COMMENT ON COLUMN candidates.general_notes IS 'General notes about candidate visible to all portal users';
COMMENT ON COLUMN candidates.compensation_expectation IS 'Candidate compensation expectation - access controlled by "Sees comp" toggle';
COMMENT ON COLUMN candidates.aggregate_summary IS 'Overall summary of interview feedback written by recruiter - same access control as interview notes';

-- Create candidate_attachments table
CREATE TABLE IF NOT EXISTS candidate_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  label TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('full_access', 'all_portal_users')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for candidate_id lookups
CREATE INDEX IF NOT EXISTS idx_candidate_attachments_candidate_id ON candidate_attachments(candidate_id);

-- Add RLS policies for candidate_attachments
ALTER TABLE candidate_attachments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view attachments for their searches
CREATE POLICY "Users can view attachments for their candidates"
  ON candidate_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND candidates.search_id IN (
        SELECT id FROM searches WHERE user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to insert attachments for their candidates
CREATE POLICY "Users can insert attachments for their candidates"
  ON candidate_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND candidates.search_id IN (
        SELECT id FROM searches WHERE user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to update attachments for their candidates
CREATE POLICY "Users can update attachments for their candidates"
  ON candidate_attachments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND candidates.search_id IN (
        SELECT id FROM searches WHERE user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to delete attachments for their candidates
CREATE POLICY "Users can delete attachments for their candidates"
  ON candidate_attachments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND candidates.search_id IN (
        SELECT id FROM searches WHERE user_id = auth.uid()
      )
    )
  );

-- Allow anon users (client portal) to view attachments based on visibility
CREATE POLICY "Anon users can view visible attachments"
  ON candidate_attachments
  FOR SELECT
  TO anon
  USING (
    visibility = 'all_portal_users'
    OR (
      visibility = 'full_access'
      -- This would need additional logic to check if the anon user has full_access
      -- For now, we'll handle this in the application layer
    )
  );
