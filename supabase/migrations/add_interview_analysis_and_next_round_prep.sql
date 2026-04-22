-- Structured conversation analysis: summary, key themes, areas to explore next round, flags.
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interview_analysis JSONB;

-- Generated prep for the NEXT stage, attached to this interview record.
-- Shape: { briefing: string, focus_areas: [{topic, text}], conversation_starters: [{topic, starter}] }
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS next_round_prep JSONB;
