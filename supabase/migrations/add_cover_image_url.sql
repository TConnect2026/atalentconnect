-- Cover image for the client portal hero section
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Storage bucket for portal cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-covers', 'portal-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Allow public access to portal-covers" ON storage.objects;
CREATE POLICY "Allow public access to portal-covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'portal-covers');

-- Upload
DROP POLICY IF EXISTS "Allow uploads to portal-covers" ON storage.objects;
CREATE POLICY "Allow uploads to portal-covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portal-covers');

-- Update
DROP POLICY IF EXISTS "Allow updates to portal-covers" ON storage.objects;
CREATE POLICY "Allow updates to portal-covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'portal-covers');

-- Delete
DROP POLICY IF EXISTS "Allow deletes of portal-covers" ON storage.objects;
CREATE POLICY "Allow deletes of portal-covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'portal-covers');
