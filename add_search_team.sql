-- Add lead_recruiter_id to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS lead_recruiter_id UUID REFERENCES auth.users(id);

-- Create search_assignments join table
CREATE TABLE IF NOT EXISTS search_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(search_id, user_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_search_assignments_search_id ON search_assignments(search_id);
CREATE INDEX IF NOT EXISTS idx_search_assignments_user_id ON search_assignments(user_id);

-- Add RLS policies for search_assignments
ALTER TABLE search_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view search assignments for their firm"
  ON search_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_assignments.search_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create search assignments for their firm"
  ON search_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_assignments.search_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete search assignments for their firm"
  ON search_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_assignments.search_id
      AND p.id = auth.uid()
    )
  );
