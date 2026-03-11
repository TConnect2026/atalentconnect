ALTER TABLE searches ADD COLUMN IF NOT EXISTS portal_show_position_details BOOLEAN DEFAULT true;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS portal_show_contacts BOOLEAN DEFAULT false;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS portal_show_interview_plan BOOLEAN DEFAULT true;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS portal_show_notes BOOLEAN DEFAULT false;
