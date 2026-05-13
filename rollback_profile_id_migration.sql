-- Rollback the profile.id migration: move references from the newer
-- auth user (aebt24@gmail.com, id 06ff3be4-...) back to the original
-- auth user (anne@atalentconnect.com, id b8a6a379-...).
--
-- Previous attempt failed with searches_lead_recruiter_id_fkey violation
-- because searches.lead_recruiter_id references profiles(id) (not
-- auth.users(id), which is what I'd assumed from older migration files).
-- That FK is checked when the parent row's id changes, so we must drop
-- it up front along with the team-members FK.
--
-- Live state going in:
--   profiles:                    1 row,  id=06ff3be4
--   searches.lead_recruiter_id:  4 rows, value=06ff3be4
--   search_team_members.user_id: 1 row,  value=06ff3be4

BEGIN;

-- 1. Drop both FKs that would block the profile.id UPDATE
ALTER TABLE searches
  DROP CONSTRAINT IF EXISTS searches_lead_recruiter_id_fkey;

ALTER TABLE search_team_members
  DROP CONSTRAINT IF EXISTS search_team_members_user_id_fkey;

-- 2. Roll back the parent id first, then children
UPDATE profiles
  SET id = 'b8a6a379-6692-4ae5-8358-d0046adec54b'
  WHERE id = '06ff3be4-307d-4007-8a18-cfcc926bd910';

UPDATE searches
  SET lead_recruiter_id = 'b8a6a379-6692-4ae5-8358-d0046adec54b'
  WHERE lead_recruiter_id = '06ff3be4-307d-4007-8a18-cfcc926bd910';

UPDATE search_team_members
  SET user_id = 'b8a6a379-6692-4ae5-8358-d0046adec54b'
  WHERE user_id = '06ff3be4-307d-4007-8a18-cfcc926bd910';

-- 3. Re-add the FKs
ALTER TABLE searches
  ADD CONSTRAINT searches_lead_recruiter_id_fkey
  FOREIGN KEY (lead_recruiter_id) REFERENCES profiles(id);

ALTER TABLE search_team_members
  ADD CONSTRAINT search_team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Delete the orphan auth user (aebt24@gmail.com)
DELETE FROM auth.users
  WHERE id = '06ff3be4-307d-4007-8a18-cfcc926bd910';

COMMIT;
