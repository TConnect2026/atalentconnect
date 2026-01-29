-- Add recruiter_files field to candidates table for private file attachments

-- Add recruiter_files field as JSONB array
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS recruiter_files JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN candidates.recruiter_files IS 'Private recruiter file attachments (videos, documents, voice memos, links). NOT visible to clients. Stored as JSON: [{"id": "uuid", "name": "debrief.mp4", "url": "https://...", "type": "video", "size": 12345, "uploaded_at": "2024-01-01T00:00:00Z"}]';

-- Create storage bucket for recruiter files (if not exists)
-- Note: This needs to be run manually in Supabase dashboard or via SQL if you have permissions
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('recruiter-files', 'recruiter-files', false)
-- ON CONFLICT (id) DO NOTHING;
