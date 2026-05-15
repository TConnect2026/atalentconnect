-- Track whether the recruiter has opened the Company Intel slide-over
-- for a given search. Drives the small dot indicator on the header
-- "Company Intel" button. Defaults to false; set to true when the
-- slide-over opens.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS company_intel_viewed BOOLEAN NOT NULL DEFAULT FALSE;
