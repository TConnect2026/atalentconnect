-- Add user authentication schema

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id column to searches table
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update RLS policies for searches table
-- Drop existing open policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON searches;
DROP POLICY IF EXISTS "Enable insert for all users" ON searches;
DROP POLICY IF EXISTS "Enable update for all users" ON searches;
DROP POLICY IF EXISTS "Enable delete for all users" ON searches;

-- New RLS policies for searches: Users can only access their own searches
CREATE POLICY "Users can view own searches" ON searches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches" ON searches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own searches" ON searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for candidates table
-- Drop existing open policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON candidates;
DROP POLICY IF EXISTS "Enable insert for all users" ON candidates;
DROP POLICY IF EXISTS "Enable update for all users" ON candidates;
DROP POLICY IF EXISTS "Enable delete for all users" ON candidates;

-- Candidates are accessible through searches, so check search ownership
CREATE POLICY "Users can view candidates for their searches" ON candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert candidates for their searches" ON candidates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update candidates for their searches" ON candidates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete candidates for their searches" ON candidates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = candidates.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Update RLS policies for stages table
DROP POLICY IF EXISTS "Enable read access for all users" ON stages;
DROP POLICY IF EXISTS "Enable insert for all users" ON stages;
DROP POLICY IF EXISTS "Enable update for all users" ON stages;
DROP POLICY IF EXISTS "Enable delete for all users" ON stages;

CREATE POLICY "Users can view stages for their searches" ON stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stages for their searches" ON stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stages for their searches" ON stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stages for their searches" ON stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = stages.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Update RLS policies for documents table
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable insert for all users" ON documents;
DROP POLICY IF EXISTS "Enable update for all users" ON documents;
DROP POLICY IF EXISTS "Enable delete for all users" ON documents;

CREATE POLICY "Users can view documents for their searches" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their searches" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents for their searches" ON documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents for their searches" ON documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = documents.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Existing searches will have NULL user_id
-- After this migration, Anne should sign up, and we'll assign her user_id to all existing searches
-- This can be done with a simple UPDATE once we know her user ID:
-- UPDATE searches SET user_id = '<anne-user-id>' WHERE user_id IS NULL;
