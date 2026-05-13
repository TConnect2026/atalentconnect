-- search_team_members: per-search team roster with role.
-- Roles: Lead, Associate, Researcher, Partner, Other. Application enforces one Lead per search.
--
-- FK target is `profiles(id)` to match the established pattern in this project
-- (see add_intake_briefs_table.sql, create_complete_schema.sql). profiles.id is
-- equal to auth.users.id, so existing user UUIDs work unchanged.
--
-- The DROPs at the top make this safe to re-run if a previous attempt left a
-- partial table behind (the original failure was 42703 from an index referencing
-- a column that wasn't created because CREATE TABLE IF NOT EXISTS was skipped).

DROP POLICY IF EXISTS "Users can view search team members for their firm" ON search_team_members;
DROP POLICY IF EXISTS "Users can insert search team members for their firm" ON search_team_members;
DROP POLICY IF EXISTS "Users can update search team members for their firm" ON search_team_members;
DROP POLICY IF EXISTS "Users can delete search team members for their firm" ON search_team_members;
DROP TABLE IF EXISTS search_team_members;

CREATE TABLE search_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Lead', 'Associate', 'Researcher', 'Partner', 'Other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (search_id, user_id)
);

CREATE INDEX idx_search_team_members_search_id ON search_team_members(search_id);
CREATE INDEX idx_search_team_members_user_id ON search_team_members(user_id);

ALTER TABLE search_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view search team members for their firm"
  ON search_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_team_members.search_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert search team members for their firm"
  ON search_team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_team_members.search_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update search team members for their firm"
  ON search_team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_team_members.search_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete search team members for their firm"
  ON search_team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches s
      JOIN profiles p ON p.firm_id = s.firm_id
      WHERE s.id = search_team_members.search_id
      AND p.id = auth.uid()
    )
  );
