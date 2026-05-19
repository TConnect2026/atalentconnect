-- Free-text notes per client contact (e.g. "CEO's EA, schedules everything").
-- Single-line input in the Essentials Client Contacts card; saves on blur.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
