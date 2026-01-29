-- ============================================================================
-- Add new fields to contacts and searches tables
-- ============================================================================

-- Add LinkedIn URL, role, and reports_to to contacts
DO $$
BEGIN
  -- Add linkedin_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'linkedin_url') THEN
    ALTER TABLE contacts ADD COLUMN linkedin_url TEXT;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'role') THEN
    ALTER TABLE contacts ADD COLUMN role TEXT;
  END IF;

  -- Add reports_to column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'reports_to') THEN
    ALTER TABLE contacts ADD COLUMN reports_to BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN contacts.linkedin_url IS 'LinkedIn profile URL for the contact';
COMMENT ON COLUMN contacts.role IS 'Contact role: Board Chair, Board Member, CHRO, Hiring Manager, Stakeholder';
COMMENT ON COLUMN contacts.reports_to IS 'True if the position reports to this person (hiring manager)';

-- Add company_website to searches
DO $$
BEGIN
  -- Add company_website column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'searches' AND column_name = 'company_website') THEN
    ALTER TABLE searches ADD COLUMN company_website TEXT;
  END IF;
END $$;

COMMENT ON COLUMN searches.company_website IS 'Company website URL';
