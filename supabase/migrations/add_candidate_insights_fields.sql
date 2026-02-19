-- Migration: Add candidate insights fields with per-field visibility
-- These capture what recruiters learn through conversation beyond the resume

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS motivation TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notice_period TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS relocation_willingness TEXT DEFAULT 'open_to_discussion'
  CHECK (relocation_willingness IN ('yes', 'no', 'open_to_discussion'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recruiter_assessment TEXT;

-- Per-field visibility columns (default team_only)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS compensation_expectation_visibility TEXT DEFAULT 'team_only'
  CHECK (compensation_expectation_visibility IN ('team_only', 'limited_access', 'full_access'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS motivation_visibility TEXT DEFAULT 'team_only'
  CHECK (motivation_visibility IN ('team_only', 'limited_access', 'full_access'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notice_period_visibility TEXT DEFAULT 'team_only'
  CHECK (notice_period_visibility IN ('team_only', 'limited_access', 'full_access'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS relocation_willingness_visibility TEXT DEFAULT 'team_only'
  CHECK (relocation_willingness_visibility IN ('team_only', 'limited_access', 'full_access'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recruiter_assessment_visibility TEXT DEFAULT 'team_only'
  CHECK (recruiter_assessment_visibility IN ('team_only', 'limited_access', 'full_access'));
