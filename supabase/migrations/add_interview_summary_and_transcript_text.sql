-- AI-generated 3-4 sentence summary of the conversation, produced from notes + transcript.
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interview_summary TEXT;

-- Parsed text content from a VTT / SRT / TXT transcript upload.
-- Avoids re-parsing on every AI summary generation. Null when no text-based transcript exists
-- (e.g. video-only uploads or PDF transcripts).
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS transcript_text TEXT;
