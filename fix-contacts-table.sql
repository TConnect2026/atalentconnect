-- Fix contacts table to ensure all required columns exist
-- Run this in your Supabase SQL Editor

-- 1. Add access_level column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE contacts ADD COLUMN access_level TEXT DEFAULT 'full_access';
  END IF;
END $$;

-- 2. Drop existing constraint if it exists and recreate it
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_access_level_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_access_level_check
  CHECK (access_level IN ('full_access', 'limited_access'));

-- 3. Add portal invite tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'portal_invite_sent_at'
  ) THEN
    ALTER TABLE contacts ADD COLUMN portal_invite_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'portal_last_accessed_at'
  ) THEN
    ALTER TABLE contacts ADD COLUMN portal_last_accessed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 4. Update any NULL access_level values to 'full_access'
UPDATE contacts
SET access_level = 'full_access'
WHERE access_level IS NULL;

-- 5. Create index for faster access level lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_contacts_access_level ON contacts(access_level);

-- 6. Verify the table structure
-- Run this to see the current structure:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'contacts'
-- ORDER BY ordinal_position;

-- 7. Check for any foreign key issues with interview_interviewers
-- Make sure the interview_interviewers table can reference contacts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_interviewers') THEN
    -- Table exists, check if foreign key constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'interview_interviewers_contact_id_fkey'
    ) THEN
      ALTER TABLE interview_interviewers
      ADD CONSTRAINT interview_interviewers_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 8. Ensure RLS is properly configured
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Allow all for contacts" ON contacts;

-- Create new comprehensive policy
CREATE POLICY "Allow all operations on contacts"
ON contacts
FOR ALL
USING (true)
WITH CHECK (true);

-- Success message (comment)
-- If this script runs successfully, your contacts table should be properly configured!
