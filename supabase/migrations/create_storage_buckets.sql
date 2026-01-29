-- Create storage buckets for file uploads
-- This migration sets up the necessary storage buckets for the application

-- 1. Create 'documents' bucket for project documents (job descriptions, interview guides, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'client-logos' bucket for client company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create 'recruiter-files' bucket for private recruiter files
INSERT INTO storage.buckets (id, name, public)
VALUES ('recruiter-files', 'recruiter-files', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for 'documents' bucket
-- Allow anyone to read documents (public bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to delete their uploaded documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Set up storage policies for 'client-logos' bucket
-- Allow anyone to read logos (public bucket)
CREATE POLICY "Public Access to Logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos');

-- Set up storage policies for 'recruiter-files' bucket (private)
-- Only authenticated users can read their own files
CREATE POLICY "Authenticated users can read recruiter files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recruiter-files');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload recruiter files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recruiter-files');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete recruiter files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recruiter-files');
