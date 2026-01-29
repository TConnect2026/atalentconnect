# @talentconnect Database Structure

Complete documentation for the multi-tenant executive search management platform database.

## Overview

- **Multi-tenant architecture**: All data isolated by `firm_id`
- **Row Level Security (RLS)**: Enforces data access at database level
- **Search-based access control**: Users access searches via owner or team membership
- **Client portal**: Magic link authentication with granular permissions
- **Audit logging**: Tracks all important actions

---

## Table Structure

### 1. Firms (Multi-tenancy Root)

```sql
firms
├── id (UUID, PK)
├── name (TEXT)
├── logo_url (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Purpose**: Root table for multi-tenancy. Each firm has completely isolated data.

**Access**: Users can only see/edit their own firm.

---

### 2. Profiles (Users/Recruiters)

```sql
profiles
├── id (UUID, PK) -- Links to auth.users
├── firm_id (UUID, FK → firms)
├── role (TEXT) -- 'administrator' | 'recruiter'
├── first_name (TEXT)
├── last_name (TEXT)
├── email (TEXT, unique)
├── two_factor_enabled (BOOLEAN)
├── two_factor_secret (TEXT, encrypted)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Roles**:
- **Administrator**: Full access to all searches in firm
- **Recruiter**: Access only to searches they own or are assigned to

**Access**: Users see all profiles in their firm. Can only edit their own.

---

### 3. Searches

```sql
searches
├── id (UUID, PK)
├── firm_id (UUID, FK → firms)
├── owner_id (UUID, FK → profiles)
├── company_name (TEXT)
├── company_logo_url (TEXT, nullable)
├── position_title (TEXT)
├── location_city (TEXT)
├── location_state (TEXT)
├── open_to_relocation (BOOLEAN)
├── compensation_range (TEXT)
├── status (TEXT) -- 'active' | 'pending' | 'filled'
├── launch_date (DATE)
├── target_date (DATE)
├── talent_insights (TEXT) -- Market notes
├── secure_link (TEXT, unique) -- For client portal
├── share_interview_notes (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Access**:
- Administrators: All searches in firm
- Recruiters: Only searches where they are owner OR in search_team

---

### 4. Search Team

```sql
search_team
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── user_id (UUID, FK → profiles)
├── access_level (TEXT) -- 'full_access' | 'view_only'
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

UNIQUE(search_id, user_id)
```

**Purpose**: Collaborative access to searches. Multiple recruiters can work on one search.

**Access Levels**:
- **full_access**: Can edit everything
- **view_only**: Read-only access

---

### 5. Client Contacts (Portal Users)

```sql
contacts
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── name (TEXT)
├── title (TEXT)
├── email (TEXT)
├── phone (TEXT, nullable)
├── linkedin_url (TEXT, nullable)
├── is_primary (BOOLEAN)
├── access_level (TEXT) -- 'full_access' | 'limited_access' | 'no_portal_access'
├── sees_comp (BOOLEAN)
├── sees_interview_notes (BOOLEAN)
├── portal_last_accessed_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Access Levels**:
- **full_access**: See everything (default sees_comp=true, sees_interview_notes=true)
- **limited_access**: Restricted view (granular control via toggles)
- **no_portal_access**: No client portal login

**Authentication**: Magic link (no password)

---

### 6. Pipeline Stages

```sql
stages
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── name (TEXT)
├── position (INTEGER) -- Display order
├── visible_in_client_portal (BOOLEAN)
├── interview_guide_url (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Examples**: "Sourcing", "Phone Screen", "Hiring Manager", "Panel", "Final Round", "Offer"

**Client Portal**: Only stages with `visible_in_client_portal=true` are shown.

---

### 7. Stage Guides

```sql
stage_guides
├── id (UUID, PK)
├── stage_id (UUID, FK → stages)
├── name (TEXT)
├── file_url (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Purpose**: Multiple interview guides per stage. Shown in pipeline matrix with 📋 icon.

---

### 8. Candidates

```sql
candidates
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── stage_id (UUID, FK → stages)
├── first_name (TEXT)
├── last_name (TEXT)
├── email (TEXT)
├── phone (TEXT, nullable)
├── location_city (TEXT)
├── location_state (TEXT)
├── open_to_relocation (BOOLEAN)
├── photo_url (TEXT, nullable)
├── resume_url (TEXT, nullable)
├── linkedin_url (TEXT, nullable)
├── general_notes (TEXT) -- Visible to all portal users
├── compensation_expectation (TEXT) -- Access controlled
├── aggregate_summary (TEXT) -- Overall interview summary
├── status (TEXT) -- 'active' | 'archived' | 'hired' | 'withdrawn'
├── order (INTEGER) -- Display order within stage
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Status Values**:
- **active**: Currently in process
- **archived**: No longer being considered
- **hired**: Got the position
- **withdrawn**: Candidate pulled out

---

### 9. Candidate Attachments

```sql
candidate_attachments
├── id (UUID, PK)
├── candidate_id (UUID, FK → candidates)
├── file_name (TEXT)
├── file_url (TEXT)
├── label (TEXT) -- Description
├── visibility (TEXT) -- 'full_access' | 'all_portal_users'
├── uploaded_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Purpose**: Documents, videos, PDFs attached to candidates with granular visibility control.

---

### 10. Interviews

```sql
interviews
├── id (UUID, PK)
├── candidate_id (UUID, FK → candidates)
├── stage_id (UUID, FK → stages)
├── search_id (UUID, FK → searches)
├── scheduled_date (DATE)
├── scheduled_time (TIME)
├── duration_minutes (INTEGER)
├── location (TEXT) -- Zoom, address, phone
├── timezone (TEXT)
├── prep_notes (TEXT)
├── interview_guide_url (TEXT)
├── status (TEXT) -- 'scheduled' | 'completed' | 'cancelled'
├── feedback_token (TEXT) -- For feedback submission
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Location**: Can be Zoom link, conference room, phone number, or address.

---

### 11. Interview Attendees

```sql
interview_attendees
├── id (UUID, PK)
├── interview_id (UUID, FK → interviews)
├── client_contact_id (UUID, FK → contacts, nullable)
├── external_email (TEXT) -- For non-contacts
├── name (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Purpose**: Multiple interviewers per interview. Can be from contacts table or external.

---

### 12. Interview Feedback

```sql
interview_feedback
├── id (UUID, PK)
├── interview_id (UUID, FK → interviews)
├── submitted_by_contact_id (UUID, FK → contacts, nullable)
├── submitted_by_email (TEXT)
├── submitted_by_name (TEXT)
├── notes (TEXT)
├── strengths (TEXT)
├── concerns (TEXT)
├── recommendation (TEXT) -- 'advance' | 'hold' | 'decline'
├── video_debrief_link (TEXT, nullable)
├── feedback_file_url (TEXT, nullable)
├── submitted_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Access**: Controlled by `sees_interview_notes` toggle on contact.

---

### 13. Feedback Attachments

```sql
feedback_attachments
├── id (UUID, PK)
├── feedback_id (UUID, FK → interview_feedback)
├── file_name (TEXT)
├── file_url (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Purpose**: Files attached to interview feedback (PDFs, videos, recordings).

---

### 14. Documents

```sql
documents
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── name (TEXT)
├── file_url (TEXT)
├── document_type (TEXT) -- 'position_spec' | 'search_agreement' | 'interview_guide' | 'other'
├── visible_to_portal (BOOLEAN)
├── uploaded_by (UUID, FK → profiles)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Document Types**:
- **position_spec**: Job description
- **search_agreement**: Client contract
- **interview_guide**: Interview questions/rubrics
- **other**: Misc documents

---

### 15. Magic Links (Client Portal Auth)

```sql
magic_links
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── email (TEXT)
├── token (TEXT, unique) -- Secure random 32-byte hex
├── expires_at (TIMESTAMP) -- 7 days
├── used (BOOLEAN) -- Single-use
└── created_at (TIMESTAMP)
```

**Security**: Single-use, 7-day expiration, secure random token.

---

### 16. Client Sessions

```sql
client_sessions
├── id (UUID, PK)
├── search_id (UUID, FK → searches)
├── email (TEXT)
├── session_token (TEXT, unique)
├── expires_at (TIMESTAMP) -- 30 days
├── created_at (TIMESTAMP)
└── last_accessed_at (TIMESTAMP)
```

**Session Management**: 30-day sessions, tracked in localStorage.

---

### 17. Audit Log

```sql
audit_log
├── id (UUID, PK)
├── firm_id (UUID, FK → firms)
├── user_id (UUID, FK → profiles, nullable)
├── client_contact_id (UUID, FK → contacts, nullable)
├── action (TEXT) -- e.g., 'viewed_candidate', 'submitted_feedback'
├── resource_type (TEXT) -- e.g., 'candidate', 'search', 'document'
├── resource_id (UUID)
├── ip_address (INET)
├── user_agent (TEXT)
└── created_at (TIMESTAMP)
```

**Purpose**: Security and compliance tracking. Who accessed what, when.

---

## Security & Access Control

### Multi-Tenancy

**All queries automatically filtered by `firm_id`**:
```sql
-- Enforced at RLS level
WHERE firm_id = auth.current_user_firm_id()
```

### Role-Based Access

**Administrator**:
- Full access to all searches in firm
- Can manage all users in firm
- Can create/delete searches

**Recruiter**:
- Access only to searches they own OR are in `search_team`
- Cannot manage other users
- Can create searches (becomes owner)

### Search Access Functions

```sql
-- Check if user has any access
auth.has_search_access(search_id) → BOOLEAN

-- Check if user can edit
auth.can_edit_search(search_id) → BOOLEAN
```

### Client Portal Access

**Authentication**: Magic link (no password)

**Access Control**:
1. **access_level**: `full_access` | `limited_access` | `no_portal_access`
2. **sees_comp**: Can see compensation data
3. **sees_interview_notes**: Can see interview feedback

**Enforcement**: RLS policies + application layer checks

---

## Indexes

Performance-critical indexes:

```sql
-- Users
idx_profiles_email
idx_profiles_firm_id

-- Searches
idx_searches_firm_id
idx_searches_owner_id
idx_searches_status

-- Search Team
idx_search_team_search_id
idx_search_team_user_id

-- Contacts
idx_contacts_search_id
idx_contacts_email

-- Candidates
idx_candidates_search_id
idx_candidates_status

-- Interviews
idx_interviews_candidate_id
idx_interviews_stage_id

-- Audit Log
idx_audit_log_firm_id
idx_audit_log_created_at
```

---

## Migration Order

Apply migrations in this order:

1. `create_complete_schema.sql` - Creates all tables
2. `create_rls_policies.sql` - Enables security
3. `add_magic_links_and_sessions.sql` - Client portal auth
4. `add_candidate_profile_fields.sql` - Candidate features
5. `seed_test_data.sql` - (Optional) Test data

---

## Common Queries

### Get all searches for current user

```sql
SELECT *
FROM searches
WHERE firm_id = auth.current_user_firm_id()
  AND (
    auth.is_administrator()
    OR owner_id = auth.uid()
    OR id IN (SELECT search_id FROM search_team WHERE user_id = auth.uid())
  );
```

### Get candidates with interview counts

```sql
SELECT
  c.*,
  COUNT(i.id) as interview_count
FROM candidates c
LEFT JOIN interviews i ON i.candidate_id = c.id
WHERE c.search_id = $1
  AND c.status = 'active'
GROUP BY c.id
ORDER BY c.order;
```

### Get pipeline snapshot

```sql
SELECT
  s.name as stage_name,
  COUNT(c.id) as candidate_count
FROM stages s
LEFT JOIN candidates c ON c.stage_id = s.id AND c.status = 'active'
WHERE s.search_id = $1
GROUP BY s.id, s.name, s.position
ORDER BY s.position;
```

---

## Backup & Maintenance

### Cleanup expired magic links

```sql
SELECT cleanup_expired_magic_links();
```

### Cleanup expired sessions

```sql
SELECT cleanup_expired_sessions();
```

### Archive old searches

```sql
UPDATE searches
SET status = 'filled'
WHERE target_date < CURRENT_DATE - INTERVAL '90 days'
  AND status = 'active';
```

---

## Best Practices

1. **Always filter by firm_id** (RLS enforces this)
2. **Use transactions** for multi-table operations
3. **Check access** before mutations (`auth.can_edit_search()`)
4. **Log important actions** to audit_log
5. **Validate on both** client and server
6. **Encrypt sensitive** data (passwords, tokens, secrets)
7. **Regular backups** (automated via Supabase)
8. **Monitor indexes** - Add as needed for performance

---

## Support

For questions or issues with the database structure, refer to:
- Supabase docs: https://supabase.com/docs
- PostgreSQL docs: https://postgresql.org/docs
- RLS guide: https://supabase.com/docs/guides/auth/row-level-security
