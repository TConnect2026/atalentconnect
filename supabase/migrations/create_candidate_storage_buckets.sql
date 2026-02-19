-- Create missing storage buckets for candidate file uploads
-- Buckets: candidateresumes, candidate-photos, stagenotefiles

-- 1. Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidateresumes', 'candidateresumes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stagenotefiles', 'stagenotefiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Update the read policy to include new buckets
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
CREATE POLICY "Allow all reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('documents', 'client-logos', 'candidateresumes', 'candidate-photos', 'stagenotefiles'));
