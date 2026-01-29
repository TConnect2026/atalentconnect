-- ============================================================================
-- Complete Database Schema for @talentconnect
-- Multi-tenant search management platform
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. FIRMS (Multi-tenancy root)
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
-- 2. PROFILES (Users/Recruiters)
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
COMMENT ON COLUMN profiles.role IS 'administrator: full firm access; recruiter: search-based access';
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_secret IS 'Encrypted TOTP secret for 2FA';

-- ============================================================================
-- 3. SEARCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  position_title TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  open_to_relocation BOOLEAN DEFAULT false,
  compensation_range TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'filled')),
  launch_date DATE,
  target_date DATE,
  talent_insights TEXT,
  secure_link TEXT UNIQUE,
  share_interview_notes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE searches IS 'Executive searches with multi-tenant isolation';
COMMENT ON COLUMN searches.secure_link IS 'Unique URL slug for client portal access';
COMMENT ON COLUMN searches.share_interview_notes IS 'Whether to show interview feedback in client portal';

-- ============================================================================
-- 4. SEARCH TEAM (Collaborative Access)
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
COMMENT ON COLUMN search_team.access_level IS 'full_access: can edit; view_only: read-only';

-- ============================================================================
-- 5. CONTACTS (Client Portal Users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  access_level TEXT DEFAULT 'full_access' CHECK (access_level IN ('full_access', 'limited_access', 'no_portal_access')),
  sees_comp BOOLEAN DEFAULT true,
  sees_interview_notes BOOLEAN DEFAULT true,
  portal_last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE contacts IS 'Client contacts with granular portal permissions';
COMMENT ON COLUMN contacts.access_level IS 'full_access: see everything; limited_access: restricted; no_portal_access: no login';

-- ============================================================================
-- 6. STAGES (Pipeline Stages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  visible_in_client_portal BOOLEAN DEFAULT true,
  interview_guide_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE stages IS 'Pipeline stages for each search (e.g., Phone Screen, Panel Interview)';
COMMENT ON COLUMN stages.position IS 'Display order (0-indexed)';

-- ============================================================================
-- 7. STAGE GUIDES (Interview Guides)
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
-- 8. CANDIDATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location_city TEXT,
  location_state TEXT,
  open_to_relocation BOOLEAN DEFAULT false,
  photo_url TEXT,
  resume_url TEXT,
  linkedin_url TEXT,
  general_notes TEXT,
  compensation_expectation TEXT,
  aggregate_summary TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hired', 'withdrawn')),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE candidates IS 'Candidates in the pipeline';
COMMENT ON COLUMN candidates.general_notes IS 'Visible to all portal users';
COMMENT ON COLUMN candidates.compensation_expectation IS 'Access controlled by contact.sees_comp';
COMMENT ON COLUMN candidates.aggregate_summary IS 'Overall interview summary';

-- ============================================================================
-- 9. CANDIDATE ATTACHMENTS
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
-- 10. INTERVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  timezone TEXT,
  prep_notes TEXT,
  interview_guide_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  feedback_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE interviews IS 'Scheduled interviews for candidates';
COMMENT ON COLUMN interviews.location IS 'Zoom link, address, phone number, etc.';
COMMENT ON COLUMN interviews.feedback_token IS 'Token for submitting feedback via public link';

-- ============================================================================
-- 11. INTERVIEW ATTENDEES
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
-- 12. INTERVIEW FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  submitted_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  notes TEXT,
  strengths TEXT,
  concerns TEXT,
  recommendation TEXT CHECK (recommendation IN ('advance', 'hold', 'decline')),
  video_debrief_link TEXT,
  feedback_file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE interview_feedback IS 'Interview feedback from client contacts';
COMMENT ON COLUMN interview_feedback.recommendation IS 'advance: move forward; hold: maybe; decline: reject';

-- ============================================================================
-- 13. FEEDBACK ATTACHMENTS
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
-- 14. DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('position_spec', 'search_agreement', 'interview_guide', 'other')),
  visible_to_portal BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Documents attached to searches';

-- ============================================================================
-- 15. AUDIT LOG
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
-- 16. MAGIC LINKS (Client Portal Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE magic_links IS 'Magic link tokens for client portal access. 7-day expiration, single-use.';
COMMENT ON COLUMN magic_links.token IS 'Secure random token (32 bytes hex)';
COMMENT ON COLUMN magic_links.used IS 'Single-use: marked true after first use';

-- ============================================================================
-- 17. CLIENT SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE client_sessions IS 'Client portal sessions. 30-day expiration, invalidated if access revoked.';
COMMENT ON COLUMN client_sessions.session_token IS 'Secure random session token stored in browser localStorage';
COMMENT ON COLUMN client_sessions.last_accessed_at IS 'Updated on each portal page load for activity tracking';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON profiles(firm_id);

-- Searches
CREATE INDEX IF NOT EXISTS idx_searches_firm_id ON searches(firm_id);
CREATE INDEX IF NOT EXISTS idx_searches_owner_id ON searches(owner_id);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);

-- Search Team
CREATE INDEX IF NOT EXISTS idx_search_team_search_id ON search_team(search_id);
CREATE INDEX IF NOT EXISTS idx_search_team_user_id ON search_team(user_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_search_id ON contacts(search_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Stages
CREATE INDEX IF NOT EXISTS idx_stages_search_id ON stages(search_id);

-- Candidates
CREATE INDEX IF NOT EXISTS idx_candidates_search_id ON candidates(search_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage_id ON candidates(stage_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- Interviews
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_stage_id ON interviews(stage_id);
CREATE INDEX IF NOT EXISTS idx_interviews_search_id ON interviews(search_id);

-- Magic Links
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email_search ON magic_links(email, search_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- Client Sessions
CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_email_search ON client_sessions(email, search_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_expires_at ON client_sessions(expires_at);

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

-- Apply to all tables with updated_at
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_searches_updated_at BEFORE UPDATE ON searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_team_updated_at BEFORE UPDATE ON search_team FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stage_guides_updated_at BEFORE UPDATE ON stage_guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidate_attachments_updated_at BEFORE UPDATE ON candidate_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interview_attendees_updated_at BEFORE UPDATE ON interview_attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interview_feedback_updated_at BEFORE UPDATE ON interview_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_attachments_updated_at BEFORE UPDATE ON feedback_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_links WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM client_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - HELPER FUNCTIONS
-- ============================================================================

-- Get current user's firm_id
CREATE OR REPLACE FUNCTION auth.current_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is administrator
CREATE OR REPLACE FUNCTION auth.is_administrator()
RETURNS BOOLEAN AS $$
  SELECT role = 'administrator' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user has access to a search (owner or team member)
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

-- Check if current user can edit a search (not view_only)
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
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

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

-- Allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- RLS POLICIES - SEARCHES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view accessible searches" ON searches;
CREATE POLICY "Users can view accessible searches"
  ON searches FOR SELECT
  TO authenticated
  USING (
    firm_id = auth.current_user_firm_id()
    AND (
      auth.is_administrator()
      OR owner_id = auth.uid()
      OR id IN (SELECT search_id FROM search_team WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create searches in their firm" ON searches;
CREATE POLICY "Users can create searches in their firm"
  ON searches FOR INSERT
  TO authenticated
  WITH CHECK (firm_id = auth.current_user_firm_id() AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update editable searches" ON searches;
CREATE POLICY "Users can update editable searches"
  ON searches FOR UPDATE
  TO authenticated
  USING (
    firm_id = auth.current_user_firm_id()
    AND auth.can_edit_search(id)
  )
  WITH CHECK (
    firm_id = auth.current_user_firm_id()
    AND auth.can_edit_search(id)
  );

DROP POLICY IF EXISTS "Owners and administrators can delete searches" ON searches;
CREATE POLICY "Owners and administrators can delete searches"
  ON searches FOR DELETE
  TO authenticated
  USING (
    firm_id = auth.current_user_firm_id()
    AND (auth.is_administrator() OR owner_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES - MAGIC LINKS & CLIENT SESSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can verify magic links" ON magic_links;
CREATE POLICY "Anyone can verify magic links"
  ON magic_links FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Service role can insert magic links" ON magic_links;
CREATE POLICY "Service role can insert magic links"
  ON magic_links FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update magic links" ON magic_links;
CREATE POLICY "Service role can update magic links"
  ON magic_links FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Anyone can verify their own session" ON client_sessions;
CREATE POLICY "Anyone can verify their own session"
  ON client_sessions FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Service role can manage sessions" ON client_sessions;
CREATE POLICY "Service role can manage sessions"
  ON client_sessions FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables created: 17';
  RAISE NOTICE 'RLS policies enabled on all tables';
  RAISE NOTICE 'Helper functions created for access control';
END $$;
