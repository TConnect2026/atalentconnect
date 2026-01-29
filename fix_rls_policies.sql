-- ============================================================================
-- Fix RLS Policies for Signup
-- Make firms and profiles tables accessible during signup
-- ============================================================================

-- Drop all existing policies on firms
DROP POLICY IF EXISTS "Anyone authenticated can create firms" ON firms;
DROP POLICY IF EXISTS "Anyone authenticated can view firms" ON firms;
DROP POLICY IF EXISTS "Anyone authenticated can update firms" ON firms;
DROP POLICY IF EXISTS "Users can view their own firm" ON firms;
DROP POLICY IF EXISTS "Administrators can update their own firm" ON firms;
DROP POLICY IF EXISTS "Authenticated users can create a firm" ON firms;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Anyone authenticated can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone authenticated can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their firm" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Administrators can insert profiles in their firm" ON profiles;
DROP POLICY IF EXISTS "Administrators can update profiles in their firm" ON profiles;
DROP POLICY IF EXISTS "Administrators can delete profiles in their firm" ON profiles;

-- ============================================================================
-- Create simple permissive policies
-- ============================================================================

-- FIRMS: Allow all authenticated users to do everything
CREATE POLICY "authenticated_all_firms"
  ON firms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PROFILES: Allow all authenticated users to do everything
CREATE POLICY "authenticated_all_profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Verify policies
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('firms', 'profiles')
ORDER BY tablename, policyname;
