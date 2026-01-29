-- ============================================================================
-- Missing Tables Migration
-- Creates the 8 missing tables in correct dependency order
-- ============================================================================

-- ============================================================================
-- 1. FIRMS (Root table - no dependencies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE firms IS 'Multi-tenant root: each firm has isolated data';

-- ============================================================================
-- 2. PROFILES (Depends on firms and auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'recruiter' CHECK (role IN ('administrator', 'recruiter')),
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles for recruiters. Links to auth.users and firms.';

-- ============================================================================
-- 3. SEARCH_TEAM (Depends on searches and profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'full_access' CHECK (access_level IN ('full_access', 'view_only')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(search_id, user_id)
);

COMMENT ON TABLE search_team IS 'Multiple recruiters can collaborate on a search';

-- ============================================================================
-- 4. STAGE_GUIDES (Depends on stages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE stage_guides IS 'Multiple interview guides per stage';

-- ============================================================================
-- 5. CANDIDATE_ATTACHMENTS (Depends on candidates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  label TEXT,
  visibility TEXT DEFAULT 'all_portal_users' CHECK (visibility IN ('full_access', 'all_portal_users')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE candidate_attachments IS 'Documents attached to candidates with visibility control';

-- ============================================================================
-- 6. INTERVIEW_ATTENDEES (Depends on interviews and contacts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS interview_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  external_email TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE interview_attendees IS 'Multiple interviewers per interview (from contacts or external)';

-- ============================================================================
-- 7. FEEDBACK_ATTACHMENTS (Depends on interview_feedback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES interview_feedback(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE feedback_attachments IS 'Files attached to interview feedback';

-- ============================================================================
-- 8. AUDIT_LOG (Depends on firms, profiles, contacts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Security and compliance tracking';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON profiles(firm_id);

-- Search Team
CREATE INDEX IF NOT EXISTS idx_search_team_search_id ON search_team(search_id);
CREATE INDEX IF NOT EXISTS idx_search_team_user_id ON search_team(user_id);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_firm_id ON audit_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_team_updated_at BEFORE UPDATE ON search_team FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stage_guides_updated_at BEFORE UPDATE ON stage_guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidate_attachments_updated_at BEFORE UPDATE ON candidate_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interview_attendees_updated_at BEFORE UPDATE ON interview_attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_attachments_updated_at BEFORE UPDATE ON feedback_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper functions (if not already created)
CREATE OR REPLACE FUNCTION auth.current_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_administrator()
RETURNS BOOLEAN AS $$
  SELECT role = 'administrator' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.has_search_access(search_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM searches
    WHERE id = search_id_param
    AND (owner_id = auth.uid() OR id IN (
      SELECT search_id FROM search_team WHERE user_id = auth.uid()
    ))
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.can_edit_search(search_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM searches
    WHERE id = search_id_param
    AND (
      owner_id = auth.uid()
      OR id IN (
        SELECT search_id FROM search_team
        WHERE user_id = auth.uid() AND access_level = 'full_access'
      )
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES - FIRMS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own firm" ON firms;
CREATE POLICY "Users can view their own firm"
  ON firms FOR SELECT
  TO authenticated
  USING (id = auth.current_user_firm_id());

DROP POLICY IF EXISTS "Administrators can update their own firm" ON firms;
CREATE POLICY "Administrators can update their own firm"
  ON firms FOR UPDATE
  TO authenticated
  USING (id = auth.current_user_firm_id() AND auth.is_administrator())
  WITH CHECK (id = auth.current_user_firm_id() AND auth.is_administrator());

DROP POLICY IF EXISTS "Authenticated users can create a firm" ON firms;
CREATE POLICY "Authenticated users can create a firm"
  ON firms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES - PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles in their firm" ON profiles;
CREATE POLICY "Users can view profiles in their firm"
  ON profiles FOR SELECT
  TO authenticated
  USING (firm_id = auth.current_user_firm_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Administrators can insert profiles in their firm" ON profiles;
CREATE POLICY "Administrators can insert profiles in their firm"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

DROP POLICY IF EXISTS "Administrators can update profiles in their firm" ON profiles;
CREATE POLICY "Administrators can update profiles in their firm"
  ON profiles FOR UPDATE
  TO authenticated
  USING (firm_id = auth.current_user_firm_id() AND auth.is_administrator())
  WITH CHECK (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

DROP POLICY IF EXISTS "Administrators can delete profiles in their firm" ON profiles;
CREATE POLICY "Administrators can delete profiles in their firm"
  ON profiles FOR DELETE
  TO authenticated
  USING (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

-- ============================================================================
-- RLS POLICIES - SEARCH TEAM
-- ============================================================================

DROP POLICY IF EXISTS "Users can view search team for accessible searches" ON search_team;
CREATE POLICY "Users can view search team for accessible searches"
  ON search_team FOR SELECT
  TO authenticated
  USING (auth.has_search_access(search_id));

DROP POLICY IF EXISTS "Owners can manage search team" ON search_team;
CREATE POLICY "Owners can manage search team"
  ON search_team FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE id = search_team.search_id
      AND (owner_id = auth.uid() OR auth.is_administrator())
      AND firm_id = auth.current_user_firm_id()
    )
  );

-- ============================================================================
-- RLS POLICIES - STAGE GUIDES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stage guides for accessible searches" ON stage_guides;
CREATE POLICY "Users can view stage guides for accessible searches"
  ON stage_guides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stages
      WHERE stages.id = stage_guides.stage_id
      AND auth.has_search_access(stages.search_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage stage guides for editable searches" ON stage_guides;
CREATE POLICY "Users can manage stage guides for editable searches"
  ON stage_guides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stages
      WHERE stages.id = stage_guides.stage_id
      AND auth.can_edit_search(stages.search_id)
    )
  );

-- ============================================================================
-- RLS POLICIES - CANDIDATE ATTACHMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view attachments for accessible candidates" ON candidate_attachments;
CREATE POLICY "Users can view attachments for accessible candidates"
  ON candidate_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND auth.has_search_access(candidates.search_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage attachments for editable searches" ON candidate_attachments;
CREATE POLICY "Users can manage attachments for editable searches"
  ON candidate_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = candidate_attachments.candidate_id
      AND auth.can_edit_search(candidates.search_id)
    )
  );

DROP POLICY IF EXISTS "Anon users can view visible attachments" ON candidate_attachments;
CREATE POLICY "Anon users can view visible attachments"
  ON candidate_attachments FOR SELECT
  TO anon
  USING (visibility = 'all_portal_users');

-- ============================================================================
-- RLS POLICIES - INTERVIEW ATTENDEES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view attendees for accessible interviews" ON interview_attendees;
CREATE POLICY "Users can view attendees for accessible interviews"
  ON interview_attendees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interviews.id = interview_attendees.interview_id
      AND auth.has_search_access(candidates.search_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage attendees for editable searches" ON interview_attendees;
CREATE POLICY "Users can manage attendees for editable searches"
  ON interview_attendees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interviews.id = interview_attendees.interview_id
      AND auth.can_edit_search(candidates.search_id)
    )
  );

-- ============================================================================
-- RLS POLICIES - FEEDBACK ATTACHMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view feedback attachments for accessible searches" ON feedback_attachments;
CREATE POLICY "Users can view feedback attachments for accessible searches"
  ON feedback_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_feedback
      JOIN interviews ON interviews.id = interview_feedback.interview_id
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interview_feedback.id = feedback_attachments.feedback_id
      AND auth.has_search_access(candidates.search_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage feedback attachments" ON feedback_attachments;
CREATE POLICY "Users can manage feedback attachments"
  ON feedback_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interview_feedback
      JOIN interviews ON interviews.id = interview_feedback.interview_id
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interview_feedback.id = feedback_attachments.feedback_id
      AND auth.can_edit_search(candidates.search_id)
    )
  );

-- ============================================================================
-- RLS POLICIES - AUDIT LOG
-- ============================================================================

DROP POLICY IF EXISTS "Users can view audit logs for their firm" ON audit_log;
CREATE POLICY "Users can view audit logs for their firm"
  ON audit_log FOR SELECT
  TO authenticated
  USING (firm_id = auth.current_user_firm_id());

DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Missing tables created successfully!';
  RAISE NOTICE '✓ firms';
  RAISE NOTICE '✓ profiles';
  RAISE NOTICE '✓ search_team';
  RAISE NOTICE '✓ stage_guides';
  RAISE NOTICE '✓ candidate_attachments';
  RAISE NOTICE '✓ interview_attendees';
  RAISE NOTICE '✓ feedback_attachments';
  RAISE NOTICE '✓ audit_log';
  RAISE NOTICE '✓ All RLS policies enabled';
END $$;
