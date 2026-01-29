-- Add client logo support to searches table
-- Run this in your Supabase SQL Editor

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- Create storage bucket for client logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for client logos - allow uploads
CREATE POLICY IF NOT EXISTS "Allow public uploads to client-logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-logos');

-- Storage policy - allow public access to client logos
CREATE POLICY IF NOT EXISTS "Allow public access to client-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-logos');

-- Storage policy - allow updates to client logos
CREATE POLICY IF NOT EXISTS "Allow updates to client-logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-logos');

-- Storage policy - allow deletes of client logos
CREATE POLICY IF NOT EXISTS "Allow deletes of client-logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-logos');
