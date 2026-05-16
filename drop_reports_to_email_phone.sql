-- Reports To person's email/phone are no longer maintained on the search.
-- If they exist as columns on the searches table, drop them. The IntakePanel
-- mirror never wrote to these (they only ever lived in intake_briefs
-- snapshot_extras), so this SQL is most likely a no-op — included for
-- safety in case earlier migrations created them.

ALTER TABLE searches DROP COLUMN IF EXISTS reports_to_email;
ALTER TABLE searches DROP COLUMN IF EXISTS reports_to_phone;
