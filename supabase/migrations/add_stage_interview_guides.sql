-- Add interview_guide_url to stages table for stage-level interview guides

ALTER TABLE stages
ADD COLUMN IF NOT EXISTS interview_guide_url TEXT;

-- Add comment
COMMENT ON COLUMN stages.interview_guide_url IS 'Default interview guide URL for this stage. Used as fallback if interview does not have a specific guide attached. Supports different guides for different stages (e.g., culture fit vs technical).';
