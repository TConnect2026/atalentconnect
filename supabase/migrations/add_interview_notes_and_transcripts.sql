-- Interview capture fields — notes + transcript file reference
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interview_notes TEXT;

ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS transcript_url TEXT;

-- Storage bucket for interview transcripts
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-transcripts', 'interview-transcripts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public access to interview-transcripts" ON storage.objects;
CREATE POLICY "Allow public access to interview-transcripts"
ON storage.objects FOR SELECT
USING (bucket_id = 'interview-transcripts');

DROP POLICY IF EXISTS "Allow uploads to interview-transcripts" ON storage.objects;
CREATE POLICY "Allow uploads to interview-transcripts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'interview-transcripts');

DROP POLICY IF EXISTS "Allow updates to interview-transcripts" ON storage.objects;
CREATE POLICY "Allow updates to interview-transcripts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'interview-transcripts');

DROP POLICY IF EXISTS "Allow deletes of interview-transcripts" ON storage.objects;
CREATE POLICY "Allow deletes of interview-transcripts"
ON storage.objects FOR DELETE
USING (bucket_id = 'interview-transcripts');
