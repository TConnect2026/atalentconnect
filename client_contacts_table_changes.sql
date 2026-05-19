-- Client Contacts now live in the `contacts` table (instead of inside
-- intake_briefs.snapshot_extras.pipeline_form.client_contacts) and have
-- a new role-on-search field. Access level is no longer managed here.

-- 1. Add the role-on-search column.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Drop the access_level column. Portal access will be modelled on a
--    different table when participant management is built.
ALTER TABLE contacts DROP COLUMN IF EXISTS access_level;

-- 3. Allow partial rows. With inline-blur autosave, a row may have just
--    an email or phone while the recruiter is still filling it in.
ALTER TABLE contacts ALTER COLUMN name DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;
