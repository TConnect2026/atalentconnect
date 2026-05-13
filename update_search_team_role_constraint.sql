-- Add 'Other' as a valid role on search_team_members.role.
-- Non-destructive: drops and recreates only the CHECK constraint, leaves
-- existing rows intact.

ALTER TABLE search_team_members
  DROP CONSTRAINT IF EXISTS search_team_members_role_check;

ALTER TABLE search_team_members
  ADD CONSTRAINT search_team_members_role_check
  CHECK (role IN ('Lead', 'Associate', 'Researcher', 'Partner', 'Other'));
