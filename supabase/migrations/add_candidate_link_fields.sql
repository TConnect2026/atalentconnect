-- Additional URL / link fields on candidates, surfaced as buttons on the candidate card.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Freeform text — recruiter can paste multiple URLs (newline-separated).
-- The client parses URLs out of it and renders each as a small link button.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS additional_links TEXT;
