-- Create candidate_activity table for the recruiter assessment activity feed
CREATE TABLE IF NOT EXISTS candidate_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  search_id uuid REFERENCES searches(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('note', 'file')),
  content text,
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  visibility_level text DEFAULT 'team_only' CHECK (visibility_level IN ('team_only', 'limited_access', 'full_access')),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups by candidate
CREATE INDEX IF NOT EXISTS idx_candidate_activity_candidate_id ON candidate_activity(candidate_id);

-- Index for client view queries (visibility filtering)
CREATE INDEX IF NOT EXISTS idx_candidate_activity_visibility ON candidate_activity(candidate_id, visibility_level);

-- RLS policies
ALTER TABLE candidate_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to candidate_activity" ON candidate_activity
  FOR ALL USING (true) WITH CHECK (true);
