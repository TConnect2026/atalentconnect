-- Diagnostic queries to check contacts table structure
-- Run these one at a time in your Supabase SQL Editor

-- 1. Check all columns in contacts table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- 2. Check constraints on contacts table
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'contacts';

-- 3. Check if access_level column exists and its constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'contacts'
  AND conname LIKE '%access_level%';

-- 4. Check RLS policies on contacts
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'contacts';

-- 5. Sample the actual data to see what's in access_level column
SELECT
  id,
  name,
  email,
  is_primary,
  access_level,
  created_at
FROM contacts
LIMIT 5;
