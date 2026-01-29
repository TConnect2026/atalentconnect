-- ============================================================================
-- Seed Test Data for @talentconnect
-- Creates a sample firm, users, search, and candidates for testing
-- ============================================================================

-- WARNING: This is for development/testing only
-- DO NOT run this in production

-- ============================================================================
-- 1. CREATE TEST FIRM
-- ============================================================================

INSERT INTO firms (id, name, logo_url)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Executive Search Partners',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE TEST USERS
-- ============================================================================

-- Note: These need to be created through Supabase Auth first
-- Then update the profiles table with firm_id and role

-- Administrator
-- Email: admin@example.com
-- Password: password123

-- Recruiter
-- Email: recruiter@example.com
-- Password: password123

-- After creating through auth, run:
/*
UPDATE profiles
SET firm_id = '00000000-0000-0000-0000-000000000001'::UUID,
    role = 'administrator'
WHERE email = 'admin@example.com';

UPDATE profiles
SET firm_id = '00000000-0000-0000-0000-000000000001'::UUID,
    role = 'recruiter'
WHERE email = 'recruiter@example.com';
*/

-- ============================================================================
-- 3. CREATE TEST SEARCH
-- ============================================================================

INSERT INTO searches (
  id,
  firm_id,
  owner_id,
  company_name,
  company_logo_url,
  position_title,
  location_city,
  location_state,
  open_to_relocation,
  compensation_range,
  status,
  launch_date,
  target_date,
  talent_insights,
  secure_link
)
VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  (SELECT id FROM profiles WHERE email = 'admin@example.com' LIMIT 1),
  'Tech Innovators Inc',
  NULL,
  'Chief Executive Officer',
  'San Francisco',
  'CA',
  true,
  '$250-350K base + equity',
  'active',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '60 days',
  'Competitive market with high demand for experienced tech executives. Many candidates seeking equity participation.',
  'tech-innovators-ceo-2026'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. CREATE PIPELINE STAGES
-- ============================================================================

INSERT INTO stages (id, search_id, name, position, visible_in_client_portal)
VALUES
  ('20000000-0000-0000-0000-000000000001'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Sourcing', 0, false),
  ('20000000-0000-0000-0000-000000000002'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Phone Screen', 1, true),
  ('20000000-0000-0000-0000-000000000003'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Hiring Manager', 2, true),
  ('20000000-0000-0000-0000-000000000004'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Panel Interview', 3, true),
  ('20000000-0000-0000-0000-000000000005'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Final Round', 4, true),
  ('20000000-0000-0000-0000-000000000006'::UUID, '10000000-0000-0000-0000-000000000001'::UUID, 'Offer', 5, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CREATE CLIENT CONTACTS
-- ============================================================================

INSERT INTO contacts (
  id,
  search_id,
  name,
  title,
  email,
  phone,
  is_primary,
  access_level,
  sees_comp,
  sees_interview_notes
)
VALUES
  (
    '30000000-0000-0000-0000-000000000001'::UUID,
    '10000000-0000-0000-0000-000000000001'::UUID,
    'Sarah Johnson',
    'VP of People',
    'sarah@techinnovators.com',
    '(555) 123-4567',
    true,
    'full_access',
    true,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002'::UUID,
    '10000000-0000-0000-0000-000000000001'::UUID,
    'Michael Chen',
    'Board Member',
    'michael@techinnovators.com',
    '(555) 234-5678',
    false,
    'limited_access',
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CREATE SAMPLE CANDIDATES
-- ============================================================================

INSERT INTO candidates (
  id,
  search_id,
  stage_id,
  first_name,
  last_name,
  email,
  phone,
  location_city,
  location_state,
  open_to_relocation,
  linkedin_url,
  general_notes,
  compensation_expectation,
  status
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001'::UUID,
    '10000000-0000-0000-0000-000000000001'::UUID,
    '20000000-0000-0000-0000-000000000003'::UUID, -- Hiring Manager stage
    'Jane',
    'Smith',
    'jane.smith@email.com',
    '(555) 111-2222',
    'Palo Alto',
    'CA',
    true,
    'https://linkedin.com/in/janesmith',
    'Extensive experience scaling SaaS companies. Strong product background.',
    '$300K base + equity',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000002'::UUID,
    '10000000-0000-0000-0000-000000000001'::UUID,
    '20000000-0000-0000-0000-000000000004'::UUID, -- Panel stage
    'Robert',
    'Taylor',
    'robert.taylor@email.com',
    '(555) 333-4444',
    'Austin',
    'TX',
    true,
    'https://linkedin.com/in/roberttaylor',
    'Former CTO turned CEO. Deep technical expertise with business acumen.',
    '$275K base + significant equity',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000003'::UUID,
    '10000000-0000-0000-0000-000000000001'::UUID,
    '20000000-0000-0000-0000-000000000002'::UUID, -- Phone Screen stage
    'Emily',
    'Davis',
    'emily.davis@email.com',
    '(555) 555-6666',
    'Seattle',
    'WA',
    false,
    'https://linkedin.com/in/emilydavis',
    'Strong operations background. Successfully led company through IPO.',
    '$325K base + equity',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. CREATE SAMPLE INTERVIEWS
-- ============================================================================

INSERT INTO interviews (
  id,
  candidate_id,
  stage_id,
  scheduled_date,
  scheduled_time,
  duration_minutes,
  location,
  status,
  search_id
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001'::UUID,
    '40000000-0000-0000-0000-000000000001'::UUID,
    '20000000-0000-0000-0000-000000000003'::UUID,
    CURRENT_DATE + INTERVAL '3 days',
    '14:00:00',
    60,
    'https://zoom.us/j/123456789',
    'scheduled',
    '10000000-0000-0000-0000-000000000001'::UUID
  ),
  (
    '50000000-0000-0000-0000-000000000002'::UUID,
    '40000000-0000-0000-0000-000000000002'::UUID,
    '20000000-0000-0000-0000-000000000004'::UUID,
    CURRENT_DATE - INTERVAL '2 days',
    '10:00:00',
    90,
    'Conference Room A, 123 Main St',
    'completed',
    '10000000-0000-0000-0000-000000000001'::UUID
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. CREATE INTERVIEW ATTENDEES
-- ============================================================================

INSERT INTO interview_attendees (
  interview_id,
  client_contact_id,
  name
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001'::UUID,
    '30000000-0000-0000-0000-000000000001'::UUID,
    'Sarah Johnson'
  ),
  (
    '50000000-0000-0000-0000-000000000002'::UUID,
    '30000000-0000-0000-0000-000000000001'::UUID,
    'Sarah Johnson'
  ),
  (
    '50000000-0000-0000-0000-000000000002'::UUID,
    '30000000-0000-0000-0000-000000000002'::UUID,
    'Michael Chen'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. CREATE SAMPLE INTERVIEW FEEDBACK
-- ============================================================================

INSERT INTO interview_feedback (
  interview_id,
  submitted_by_contact_id,
  submitted_by_name,
  submitted_by_email,
  notes,
  submitted_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000002'::UUID,
    '30000000-0000-0000-0000-000000000001'::UUID,
    'Sarah Johnson',
    'sarah@techinnovators.com',
    'Strong strategic thinking and excellent communication skills. Demonstrated clear understanding of our market challenges. Very impressed with operational experience.',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. CREATE SAMPLE DOCUMENTS
-- ============================================================================

INSERT INTO documents (
  search_id,
  name,
  file_url,
  document_type,
  visible_to_portal
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001'::UUID,
    'CEO Position Specification',
    'https://example.com/docs/ceo-spec.pdf',
    'position_spec',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000001'::UUID,
    'Panel Interview Guide',
    'https://example.com/docs/panel-guide.pdf',
    'interview_guide',
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View test data
SELECT 'Firm:' as type, name FROM firms WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
UNION ALL
SELECT 'Search:' as type, position_title FROM searches WHERE id = '10000000-0000-0000-0000-000000000001'::UUID
UNION ALL
SELECT 'Stages:' as type, COUNT(*)::TEXT FROM stages WHERE search_id = '10000000-0000-0000-0000-000000000001'::UUID
UNION ALL
SELECT 'Candidates:' as type, COUNT(*)::TEXT FROM candidates WHERE search_id = '10000000-0000-0000-0000-000000000001'::UUID
UNION ALL
SELECT 'Contacts:' as type, COUNT(*)::TEXT FROM contacts WHERE search_id = '10000000-0000-0000-0000-000000000001'::UUID;
