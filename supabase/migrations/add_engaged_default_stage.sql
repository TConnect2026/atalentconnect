-- Establish "Engaged" as the default entry stage on every search.
--
-- Two steps, both idempotent:
--
-- 1) Rename the *single* oldest legacy "Prospect / -1" stage per search to
--    "Engaged / 0" — but only for searches that don't already have any
--    stage at order 0. We never produce duplicate Engaged@0 rows, even
--    when a search somehow ended up with multiple Prospect@-1 rows.
--
-- 2) Insert a fresh Engaged@0 stage for any search that still has no
--    entry stage (i.e. nothing at stage_order = 0).
--
-- The UNIQUE(search_id, stage_order) constraint was dropped in
-- fix_stages_constraint.sql, so reassigning stage_order is safe.

WITH oldest_prospect AS (
  SELECT DISTINCT ON (search_id) id
    FROM stages
   WHERE name = 'Prospect'
     AND stage_order = -1
     AND search_id NOT IN (
       SELECT search_id FROM stages WHERE stage_order = 0
     )
   ORDER BY search_id, created_at NULLS LAST, id
)
UPDATE stages
   SET name = 'Engaged', stage_order = 0
 WHERE id IN (SELECT id FROM oldest_prospect);

INSERT INTO stages (
  search_id,
  name,
  stage_order,
  visible_to_recruiter,
  visible_to_client,
  visible_in_portal,
  visible_in_client_portal
)
SELECT s.id, 'Engaged', 0, true, false, false, false
  FROM searches s
 WHERE NOT EXISTS (
   SELECT 1
     FROM stages st
    WHERE st.search_id = s.id
      AND st.stage_order = 0
 );
