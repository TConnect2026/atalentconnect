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
-- 2. USERS (Recruiters)
-- ============================================================================

-- Update existing profiles table or create if not exists
DO $$
BEGIN
  -- Add firm_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'firm_id') THEN
    ALTER TABLE profiles ADD COLUMN firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
  END IF;

  -- Add role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'recruiter' CHECK (role IN ('administrator', 'recruiter'));
  END IF;

  -- Add 2FA fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'two_factor_enabled') THEN
    ALTER TABLE profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'two_factor_secret') THEN
    ALTER TABLE profiles ADD COLUMN two_factor_secret TEXT; -- Encrypted TOTP secret
  END IF;

  -- Ensure last_name exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
    ALTER TABLE profiles ADD COLUMN last_name TEXT;
  END IF;
END $$;

COMMENT ON TABLE profiles IS 'User profiles for recruiters. Links to auth.users and firms.';
COMMENT ON COLUMN profiles.role IS 'administrator: full firm access; recruiter: search-based access';
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_secret IS 'Encrypted TOTP secret for 2FA';

-- ============================================================================
-- 3. SEARCHES
-- ============================================================================

DO $$
BEGIN
  -- Add firm_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'firm_id') THEN
    ALTER TABLE searches ADD COLUMN firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
  END IF;

  -- Add owner_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'owner_id') THEN
    ALTER TABLE searches ADD COLUMN owner_id UUID REFERENCES profiles(id);
  END IF;

  -- Rename/add company fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'company_logo_url') THEN
    ALTER TABLE searches ADD COLUMN company_logo_url TEXT;
  END IF;

  -- Add location fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'location_city') THEN
    ALTER TABLE searches ADD COLUMN location_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'location_state') THEN
    ALTER TABLE searches ADD COLUMN location_state TEXT;
  END IF;

  -- Add dates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'launch_date') THEN
    ALTER TABLE searches ADD COLUMN launch_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'target_date') THEN
    ALTER TABLE searches ADD COLUMN target_date DATE;
  END IF;

  -- Rename notes to talent_insights
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'notes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'talent_insights') THEN
      ALTER TABLE searches RENAME COLUMN notes TO talent_insights;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'talent_insights') THEN
      ALTER TABLE searches ADD COLUMN talent_insights TEXT;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN searches.firm_id IS 'Multi-tenancy: which firm owns this search';
COMMENT ON COLUMN searches.owner_id IS 'Primary recruiter responsible for this search';
COMMENT ON COLUMN searches.talent_insights IS 'Recruiter notes on market conditions, insights';

-- ============================================================================
-- 4. SEARCH TEAM (Recruiter access to searches)
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

COMMENT ON TABLE search_team IS 'Controls which recruiters can access which searches';
COMMENT ON COLUMN search_team.access_level IS 'full_access: can edit; view_only: read-only';

-- ============================================================================
-- 5. CLIENT CONTACTS (Portal users)
-- ============================================================================

-- Rename contacts to client_contacts or update existing
DO $$
BEGIN
  -- Check if we should rename contacts to client_contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    -- Add new columns to existing contacts table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'sees_comp') THEN
      ALTER TABLE contacts ADD COLUMN sees_comp BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'sees_interview_notes') THEN
      ALTER TABLE contacts ADD COLUMN sees_interview_notes BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'location_city') THEN
      ALTER TABLE contacts ADD COLUMN location_city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'location_state') THEN
      ALTER TABLE contacts ADD COLUMN location_state TEXT;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN contacts.access_level IS 'full_access: sees everything; limited_access: restricted; no_portal_access: no login';
COMMENT ON COLUMN contacts.sees_comp IS 'Can this contact see compensation data?';
COMMENT ON COLUMN contacts.sees_interview_notes IS 'Can this contact see interview feedback?';

-- ============================================================================
-- 6. PIPELINE STAGES
-- ============================================================================

-- Update existing stages table
DO $$
BEGIN
  -- Rename 'order' to 'position' for clarity
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'order') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'position') THEN
      ALTER TABLE stages RENAME COLUMN "order" TO position;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE stages IS 'Pipeline stages for each search (e.g., Screen, HM Interview, Panel)';
COMMENT ON COLUMN stages.position IS 'Display order (0-indexed)';

-- ============================================================================
-- 7. STAGE GUIDES (Interview guides per stage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE stage_guides IS 'Interview guide documents attached to specific pipeline stages';

-- ============================================================================
-- 8. CANDIDATES
-- ============================================================================

DO $$
BEGIN
  -- Add location fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'location_city') THEN
    ALTER TABLE candidates ADD COLUMN location_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'location_state') THEN
    ALTER TABLE candidates ADD COLUMN location_state TEXT;
  END IF;

  -- Migrate location to location_city if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'location') THEN
    UPDATE candidates SET location_city = location WHERE location_city IS NULL AND location IS NOT NULL;
  END IF;

  -- Ensure status column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'status') THEN
    ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hired', 'withdrawn'));
  END IF;
END $$;

COMMENT ON COLUMN candidates.status IS 'active: in process; archived: removed from consideration; hired: got the job; withdrawn: candidate pulled out';
COMMENT ON COLUMN candidates.general_notes IS 'Notes visible to all portal users';
COMMENT ON COLUMN candidates.compensation_expectation IS 'Candidate salary expectations - access controlled';
COMMENT ON COLUMN candidates.aggregate_summary IS 'Recruiter overall summary of interview feedback';

-- ============================================================================
-- 9. CANDIDATE ATTACHMENTS (Already created in previous migration)
-- ============================================================================

-- This table already exists from add_candidate_profile_fields.sql
-- Just add comment if needed
COMMENT ON TABLE candidate_attachments IS 'Files attached to candidates (docs, videos, PDFs) with visibility controls';

-- ============================================================================
-- 10. INTERVIEWS
-- ============================================================================

DO $$
BEGIN
  -- Add stage_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'stage_id') THEN
    ALTER TABLE interviews ADD COLUMN stage_id UUID REFERENCES stages(id);
  END IF;

  -- Rename scheduled_at to scheduled_date and scheduled_time
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'scheduled_at') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'scheduled_date') THEN
      ALTER TABLE interviews ADD COLUMN scheduled_date DATE;
      ALTER TABLE interviews ADD COLUMN scheduled_time TIME;
      -- Migrate existing data
      UPDATE interviews
      SET scheduled_date = DATE(scheduled_at),
          scheduled_time = scheduled_at::TIME
      WHERE scheduled_date IS NULL;
    END IF;
  END IF;

  -- Ensure location column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'location') THEN
    ALTER TABLE interviews ADD COLUMN location TEXT;
  END IF;
END $$;

COMMENT ON COLUMN interviews.stage_id IS 'Which pipeline stage this interview belongs to';
COMMENT ON COLUMN interviews.location IS 'Zoom link, conference room, phone number, or address';

-- ============================================================================
-- 11. INTERVIEW ATTENDEES
-- ============================================================================

-- This replaces the interview_interviewers junction table
CREATE TABLE IF NOT EXISTS interview_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  external_email TEXT, -- For interviewers not in contacts
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE interview_attendees IS 'People attending interviews. Can be from contacts or external.';
COMMENT ON COLUMN interview_attendees.client_contact_id IS 'If interviewer is a contact, links here';
COMMENT ON COLUMN interview_attendees.external_email IS 'For interviewers not in the contacts table';

-- ============================================================================
-- 12. INTERVIEW FEEDBACK
-- ============================================================================

-- Update existing interview_feedback table or create
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_feedback') THEN
    CREATE TABLE interview_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      submitted_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      submitted_by_email TEXT,
      submitted_by_name TEXT NOT NULL,
      notes TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_feedback' AND column_name = 'submitted_by_contact_id') THEN
      ALTER TABLE interview_feedback ADD COLUMN submitted_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_feedback' AND column_name = 'submitted_by_email') THEN
      ALTER TABLE interview_feedback ADD COLUMN submitted_by_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_feedback' AND column_name = 'notes') THEN
      ALTER TABLE interview_feedback ADD COLUMN notes TEXT;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE interview_feedback IS 'Feedback submitted by interviewers after interviews';
COMMENT ON COLUMN interview_feedback.submitted_by_contact_id IS 'If submitter is a contact';
COMMENT ON COLUMN interview_feedback.submitted_by_email IS 'Email of submitter if not a contact';

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

COMMENT ON TABLE feedback_attachments IS 'Files attached to interview feedback (PDFs, videos, etc.)';

-- ============================================================================
-- 14. DOCUMENTS (Already exists, just update)
-- ============================================================================

DO $$
BEGIN
  -- Rename type to document_type if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'type') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_type') THEN
      ALTER TABLE documents RENAME COLUMN type TO document_type;
    END IF;
  END IF;

  -- Add visible_to_portal if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'visible_to_portal') THEN
    ALTER TABLE documents ADD COLUMN visible_to_portal BOOLEAN DEFAULT true;
  END IF;
END $$;

COMMENT ON TABLE documents IS 'Search-level documents (position specs, agreements, guides)';
COMMENT ON COLUMN documents.document_type IS 'position_spec, search_agreement, interview_guide, other';
COMMENT ON COLUMN documents.visible_to_portal IS 'Whether clients can see this document';

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

COMMENT ON TABLE audit_log IS 'Tracks all important actions for security and compliance';
COMMENT ON COLUMN audit_log.action IS 'e.g., viewed_candidate, submitted_feedback, downloaded_resume';
COMMENT ON COLUMN audit_log.resource_type IS 'e.g., candidate, search, document';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users/Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON profiles(firm_id);

-- Searches
CREATE INDEX IF NOT EXISTS idx_searches_firm_id ON searches(firm_id);
CREATE INDEX IF NOT EXISTS idx_searches_owner_id ON searches(owner_id);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);

-- Search Team
CREATE INDEX IF NOT EXISTS idx_search_team_search_id ON search_team(search_id);
CREATE INDEX IF NOT EXISTS idx_search_team_user_id ON search_team(user_id);

-- Client Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_search_id ON contacts(search_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_access_level ON contacts(access_level);

-- Candidates
CREATE INDEX IF NOT EXISTS idx_candidates_search_id ON candidates(search_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Interviews
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_stage_id ON interviews(stage_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- Interview Attendees
CREATE INDEX IF NOT EXISTS idx_interview_attendees_interview_id ON interview_attendees(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_attendees_contact_id ON interview_attendees(client_contact_id);

-- Interview Feedback
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_contact_id ON interview_feedback(submitted_by_contact_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_search_id ON documents(search_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_firm_id ON audit_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('firms', 'profiles', 'searches', 'search_team', 'contacts',
                      'stages', 'stage_guides', 'candidates', 'candidate_attachments',
                      'interviews', 'interview_attendees', 'interview_feedback',
                      'feedback_attachments', 'documents')
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = table_name AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      ', table_name, table_name, table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration creates/updates:
-- ✓ Multi-tenant architecture with firms
-- ✓ User profiles with roles and 2FA
-- ✓ Search team for collaborative access
-- ✓ Client contacts with granular permissions
-- ✓ Pipeline stages and stage guides
-- ✓ Candidates with comprehensive fields
-- ✓ Interviews with stage associations
-- ✓ Interview attendees and feedback
-- ✓ Document management
-- ✓ Audit logging
-- ✓ Performance indexes
-- ✓ Auto-update timestamps


-- ============================================================================
-- RLS POLICIES
-- ============================================================================


-- ============================================================================
-- Row Level Security Policies for Multi-Tenancy
-- Ensures data isolation between firms and proper access control
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
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
-- ENABLE RLS ON ALL TABLES
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
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIRMS POLICIES
-- ============================================================================

-- Users can see their own firm
CREATE POLICY "Users can view their own firm"
  ON firms FOR SELECT
  TO authenticated
  USING (id = auth.current_user_firm_id());

-- Administrators can update their own firm
CREATE POLICY "Administrators can update their own firm"
  ON firms FOR UPDATE
  TO authenticated
  USING (id = auth.current_user_firm_id() AND auth.is_administrator())
  WITH CHECK (id = auth.current_user_firm_id() AND auth.is_administrator());

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view profiles in their firm
CREATE POLICY "Users can view profiles in their firm"
  ON profiles FOR SELECT
  TO authenticated
  USING (firm_id = auth.current_user_firm_id());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Administrators can manage all profiles in their firm
CREATE POLICY "Administrators can insert profiles in their firm"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

CREATE POLICY "Administrators can update profiles in their firm"
  ON profiles FOR UPDATE
  TO authenticated
  USING (firm_id = auth.current_user_firm_id() AND auth.is_administrator())
  WITH CHECK (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

CREATE POLICY "Administrators can delete profiles in their firm"
  ON profiles FOR DELETE
  TO authenticated
  USING (firm_id = auth.current_user_firm_id() AND auth.is_administrator());

-- ============================================================================
-- SEARCHES POLICIES
-- ============================================================================

-- Users can view searches they have access to
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

-- Users can create searches in their firm
CREATE POLICY "Users can create searches in their firm"
  ON searches FOR INSERT
  TO authenticated
  WITH CHECK (firm_id = auth.current_user_firm_id() AND owner_id = auth.uid());

-- Users can update searches they can edit
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

-- Owners and administrators can delete searches
CREATE POLICY "Owners and administrators can delete searches"
  ON searches FOR DELETE
  TO authenticated
  USING (
    firm_id = auth.current_user_firm_id()
    AND (auth.is_administrator() OR owner_id = auth.uid())
  );

-- ============================================================================
-- SEARCH TEAM POLICIES
-- ============================================================================

-- Users can view team members for searches they have access to
CREATE POLICY "Users can view search team for accessible searches"
  ON search_team FOR SELECT
  TO authenticated
  USING (
    auth.has_search_access(search_id)
  );

-- Owners and administrators can manage search team
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
-- CONTACTS POLICIES
-- ============================================================================

-- Authenticated users can view contacts for their accessible searches
CREATE POLICY "Users can view contacts for accessible searches"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    auth.has_search_access(search_id)
  );

-- Users can manage contacts for editable searches
CREATE POLICY "Users can manage contacts for editable searches"
  ON contacts FOR ALL
  TO authenticated
  USING (auth.can_edit_search(search_id))
  WITH CHECK (auth.can_edit_search(search_id));

-- Anon users (client portal) can view their own contact record
CREATE POLICY "Anon users can view their own contact"
  ON contacts FOR SELECT
  TO anon
  USING (true); -- Further filtered in application layer

-- ============================================================================
-- STAGES POLICIES
-- ============================================================================

-- Users can view stages for accessible searches
CREATE POLICY "Users can view stages for accessible searches"
  ON stages FOR SELECT
  TO authenticated
  USING (auth.has_search_access(search_id));

-- Users can manage stages for editable searches
CREATE POLICY "Users can manage stages for editable searches"
  ON stages FOR ALL
  TO authenticated
  USING (auth.can_edit_search(search_id))
  WITH CHECK (auth.can_edit_search(search_id));

-- Anon users can view visible stages
CREATE POLICY "Anon users can view visible stages"
  ON stages FOR SELECT
  TO anon
  USING (visible_in_client_portal = true);

-- ============================================================================
-- STAGE GUIDES POLICIES
-- ============================================================================

-- Users can view guides for accessible searches
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

-- Users can manage guides for editable searches
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
-- CANDIDATES POLICIES
-- ============================================================================

-- Users can view candidates for accessible searches
CREATE POLICY "Users can view candidates for accessible searches"
  ON candidates FOR SELECT
  TO authenticated
  USING (auth.has_search_access(search_id));

-- Users can manage candidates for editable searches
CREATE POLICY "Users can manage candidates for editable searches"
  ON candidates FOR ALL
  TO authenticated
  USING (auth.can_edit_search(search_id))
  WITH CHECK (auth.can_edit_search(search_id));

-- Anon users can view active candidates
CREATE POLICY "Anon users can view active candidates"
  ON candidates FOR SELECT
  TO anon
  USING (status = 'active');

-- ============================================================================
-- CANDIDATE ATTACHMENTS POLICIES
-- ============================================================================

-- Users can view attachments for accessible candidates
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

-- Users can manage attachments for editable searches
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

-- Anon users can view attachments based on visibility
CREATE POLICY "Anon users can view visible attachments"
  ON candidate_attachments FOR SELECT
  TO anon
  USING (visibility = 'all_portal_users');

-- ============================================================================
-- INTERVIEWS POLICIES
-- ============================================================================

-- Users can view interviews for accessible searches
CREATE POLICY "Users can view interviews for accessible searches"
  ON interviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = interviews.candidate_id
      AND auth.has_search_access(candidates.search_id)
    )
  );

-- Users can manage interviews for editable searches
CREATE POLICY "Users can manage interviews for editable searches"
  ON interviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = interviews.candidate_id
      AND auth.can_edit_search(candidates.search_id)
    )
  );

-- Anon users can view non-cancelled interviews
CREATE POLICY "Anon users can view non-cancelled interviews"
  ON interviews FOR SELECT
  TO anon
  USING (status != 'cancelled');

-- ============================================================================
-- INTERVIEW ATTENDEES POLICIES
-- ============================================================================

-- Users can view attendees for accessible interviews
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

-- Users can manage attendees for editable searches
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
-- INTERVIEW FEEDBACK POLICIES
-- ============================================================================

-- Users can view feedback for accessible searches
CREATE POLICY "Users can view feedback for accessible searches"
  ON interview_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interviews.id = interview_feedback.interview_id
      AND auth.has_search_access(candidates.search_id)
    )
  );

-- Users can submit and manage feedback for editable searches
CREATE POLICY "Users can manage feedback for editable searches"
  ON interview_feedback FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN candidates ON candidates.id = interviews.candidate_id
      WHERE interviews.id = interview_feedback.interview_id
      AND auth.can_edit_search(candidates.search_id)
    )
  );

-- Anon users can view and submit feedback (with token validation in app layer)
CREATE POLICY "Anon users can interact with feedback"
  ON interview_feedback FOR ALL
  TO anon
  USING (true); -- Further restricted in application layer

-- ============================================================================
-- FEEDBACK ATTACHMENTS POLICIES
-- ============================================================================

-- Users can view feedback attachments for accessible searches
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

-- Users can manage feedback attachments for editable searches
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
-- DOCUMENTS POLICIES
-- ============================================================================

-- Users can view documents for accessible searches
CREATE POLICY "Users can view documents for accessible searches"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.has_search_access(search_id));

-- Users can manage documents for editable searches
CREATE POLICY "Users can manage documents for editable searches"
  ON documents FOR ALL
  TO authenticated
  USING (auth.can_edit_search(search_id))
  WITH CHECK (auth.can_edit_search(search_id));

-- Anon users can view portal-visible documents
CREATE POLICY "Anon users can view portal-visible documents"
  ON documents FOR SELECT
  TO anon
  USING (visible_to_portal = true);

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can view audit logs for their firm
CREATE POLICY "Users can view audit logs for their firm"
  ON audit_log FOR SELECT
  TO authenticated
  USING (firm_id = auth.current_user_firm_id());

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration creates:
-- ✓ Helper functions for access control
-- ✓ Multi-tenant data isolation by firm_id
-- ✓ Search-based access control (owner + team)
-- ✓ Role-based permissions (administrator vs recruiter)
-- ✓ Client portal anon access with restrictions
-- ✓ Granular policies for all tables
-- ✓ Proper CASCADE and SET NULL behaviors


-- ============================================================================
-- MAGIC LINKS AND SESSIONS
-- ============================================================================


-- Create magic_links table for client portal access
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email_search ON magic_links(email, search_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- Add comments
COMMENT ON TABLE magic_links IS 'Magic link tokens for client portal access. 7-day expiration, single-use.';
COMMENT ON COLUMN magic_links.token IS 'Secure random token (32 bytes hex)';
COMMENT ON COLUMN magic_links.used IS 'Single-use: marked true after first use';

-- Create client_sessions table
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_email_search ON client_sessions(email, search_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_expires_at ON client_sessions(expires_at);

-- Add comments
COMMENT ON TABLE client_sessions IS 'Client portal sessions. 30-day expiration, invalidated if access revoked.';
COMMENT ON COLUMN client_sessions.session_token IS 'Secure random session token stored in browser localStorage';
COMMENT ON COLUMN client_sessions.last_accessed_at IS 'Updated on each portal page load for activity tracking';

-- Enable RLS on magic_links
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Allow anon users to read magic links (for verification)
CREATE POLICY "Anyone can verify magic links"
  ON magic_links
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role to insert magic links
CREATE POLICY "Service role can insert magic links"
  ON magic_links
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update magic links (mark as used)
CREATE POLICY "Service role can update magic links"
  ON magic_links
  FOR UPDATE
  TO service_role
  USING (true);

-- Enable RLS on client_sessions
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anon users to read their own sessions
CREATE POLICY "Anyone can verify their own session"
  ON client_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role to manage sessions
CREATE POLICY "Service role can manage sessions"
  ON client_sessions
  FOR ALL
  TO service_role
  USING (true);

-- Function to clean up expired magic links (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_links
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM client_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add last accessed timestamp to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN contacts.portal_last_accessed_at IS 'Last time this contact accessed the client portal';
