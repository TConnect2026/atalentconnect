-- Fix Storage Policies for Document Uploads
-- Run this in Supabase SQL Editor to enable file uploads

-- First, drop any existing policies that might conflict
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read recruiter files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recruiter files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete recruiter files" ON storage.objects;

-- Allow public uploads (anyone can upload to any bucket)
-- This is the simplest policy for development
CREATE POLICY "Allow all uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (true);

-- Allow public reads for public buckets
CREATE POLICY "Allow all reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('documents', 'client-logos'));

-- Allow all deletes
CREATE POLICY "Allow all deletes"
ON storage.objects FOR DELETE
TO public
USING (true);

-- Allow all updates
CREATE POLICY "Allow all updates"
ON storage.objects FOR UPDATE
TO public
USING (true);

-- Note: For production, you should restrict these policies to authenticated users only
-- For now, this will unblock uploads
