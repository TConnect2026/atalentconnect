-- Fix RLS policies to allow operations on searches with NULL user_id
-- This is needed for development/testing when auth is disabled

-- Update searches table policies
DROP POLICY IF EXISTS "Users can view own searches" ON searches;
DROP POLICY IF EXISTS "Users can update own searches" ON searches;
DROP POLICY IF EXISTS "Users can delete own searches" ON searches;

CREATE POLICY "Users can view own searches" ON searches
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update own searches" ON searches
  FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own searches" ON searches
  FOR DELETE
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Update stages table policies to handle NULL user_id in searches
DROP POLICY IF EXISTS "Users can view stages for their searches" ON stages;
DROP POLICY IF EXISTS "Users can insert stages for their searches" ON stages;
DROP POLICY IF EXISTS "Users can update stages for their searches" ON stages;
DROP POLICY IF EXISTS "Users can delete stages for their searches" ON stages;

CREATE POLICY "Users can view stages for their searches" ON stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert stages for their searches" ON stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update stages for their searches" ON stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete stages for their searches" ON stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

-- Update candidates table policies
DROP POLICY IF EXISTS "Users can view candidates for their searches" ON candidates;
DROP POLICY IF EXISTS "Users can insert candidates for their searches" ON candidates;
DROP POLICY IF EXISTS "Users can update candidates for their searches" ON candidates;
DROP POLICY IF EXISTS "Users can delete candidates for their searches" ON candidates;

CREATE POLICY "Users can view candidates for their searches" ON candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert candidates for their searches" ON candidates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update candidates for their searches" ON candidates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete candidates for their searches" ON candidates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

-- Update documents table policies
DROP POLICY IF EXISTS "Users can view documents for their searches" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their searches" ON documents;
DROP POLICY IF EXISTS "Users can update documents for their searches" ON documents;
DROP POLICY IF EXISTS "Users can delete documents for their searches" ON documents;

CREATE POLICY "Users can view documents for their searches" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert documents for their searches" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents for their searches" ON documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete documents for their searches" ON documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
    )
  );

-- Check if contacts table has RLS enabled and update policies if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'contacts'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view contacts for their searches" ON contacts;
    DROP POLICY IF EXISTS "Users can insert contacts for their searches" ON contacts;
    DROP POLICY IF EXISTS "Users can update contacts for their searches" ON contacts;
    DROP POLICY IF EXISTS "Users can delete contacts for their searches" ON contacts;

    -- Create new policies
    CREATE POLICY "Users can view contacts for their searches" ON contacts
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM searches
          WHERE searches.id = contacts.search_id
          AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
        )
      );

    CREATE POLICY "Users can insert contacts for their searches" ON contacts
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM searches
          WHERE searches.id = contacts.search_id
          AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
        )
      );

    CREATE POLICY "Users can update contacts for their searches" ON contacts
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM searches
          WHERE searches.id = contacts.search_id
          AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
        )
      );

    CREATE POLICY "Users can delete contacts for their searches" ON contacts
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM searches
          WHERE searches.id = contacts.search_id
          AND (searches.user_id IS NULL OR searches.user_id = auth.uid())
        )
      );
  END IF;
END $$;
