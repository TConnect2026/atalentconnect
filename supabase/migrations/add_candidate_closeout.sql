-- Two-step candidate close-out (Decline / Withdraw).
--
-- STEP 1 — recruiter picks Decline or Withdraw from the card kebab:
--   sets candidate_status = 'declined' or 'withdrawn'. The candidate STAYS on the
--   board with NO closed_at yet; the card face shows an amber "To Decline" /
--   "To Withdraw" owed-action nag (same treatment as Pending Schedule / Feedback).
--
-- STEP 2 — recruiter logs the close-out (date + "candidate notified"):
--   sets closed_at (+ candidate_notified), and the app stamps archived_at at the
--   same time, which removes them from the board and clears the amber nag.
--
-- Clearing a close-out (undo) resets candidate_status, closed_at, candidate_notified,
-- and archived_at back to null/false, returning the candidate to the board.

-- ── 'withdrawn' status value: NO DDL NEEDED ─────────────────────────────────────
-- candidate_status is a plain TEXT column with NO CHECK constraint and NO Postgres
-- enum type (see add_candidate_pipeline_status.sql — left unconstrained on purpose
-- to avoid the CHECK that restricts `status`). So 'withdrawn' is a new APP-LEVEL
-- value the column already accepts. Reporting distinguishes declined vs withdrawn
-- purely by this value ("40 declined, 2 withdrew"). Documented here for the record.

-- ── Reason / note: REUSE existing columns ───────────────────────────────────────
-- decline_reason / decline_note (added in add_candidate_pipeline_status.sql) are
-- REUSED as the shared close-out reason/note for BOTH declined and withdrawn — no
-- rename, to avoid churn. They stay nullable; the reason is OPTIONAL at the app
-- layer (no NOT NULL / CHECK added). No DDL needed for them either.

-- ── New columns ─────────────────────────────────────────────────────────────────

-- Close-out date, set in STEP 2 when the recruiter logs the Decline/Withdraw.
-- Distinct from archived_at (archived_at is stamped alongside it, but is its own
-- field/lifecycle). Nullable: null = close-out picked but not yet completed.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- "Candidate notified" checkbox captured when the close-out is logged (STEP 2).
-- Defaults false; only meaningful once closed_at is set.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS candidate_notified BOOLEAN NOT NULL DEFAULT false;
