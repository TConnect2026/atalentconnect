// Database Types

export interface Search {
  id: string
  company_name: string
  position_title: string
  client_name: string
  client_email: string
  status: 'active' | 'filled' | 'paused' | 'pending'
  position_location?: string
  open_to_relocation: boolean
  compensation_range?: string
  compensation_notes?: string
  notes?: string
  reports_to?: string
  relocation_package_available: boolean
  client_logo_url?: string
  created_at: string
  updated_at: string
  stages: Stage[]
  secure_link?: string
  start_date?: string
  target_fill_date?: string
  filled_date?: string
  share_interview_notes?: boolean
}

export interface Stage {
  id: string
  search_id: string
  name: string
  order: number
  interview_guide_url?: string
  visible_in_client_portal: boolean
  created_at: string
}

export interface CandidateLink {
  id: string
  label: string
  url: string
  type: 'github' | 'portfolio' | 'work_sample' | 'video' | 'other'
}

export interface RecruiterFile {
  id: string
  name: string
  url: string
  type: 'document' | 'video' | 'audio' | 'link' | 'other'
  size?: number
  uploaded_at: string
}

export interface CandidateAttachment {
  id: string
  candidate_id: string
  file_name: string
  file_url: string
  label: string
  visibility: 'full_access' | 'all_portal_users'
  uploaded_at: string
}

export interface Candidate {
  id: string
  search_id: string
  stage_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  linkedin_url?: string
  current_company?: string
  current_title?: string
  resume_url?: string
  summary?: string
  recruiter_notes?: string
  share_recruiter_notes?: boolean
  recruiter_files?: RecruiterFile[]
  links?: CandidateLink[]
  order: number
  status?: 'active' | 'declined' | 'withdrew'
  decline_reason?: string
  last_active_stage?: string
  created_at: string
  updated_at: string
  photo_url?: string
  location?: string
  open_to_relocation?: boolean
  general_notes?: string
  compensation_expectation?: string
  aggregate_summary?: string
  attachments?: CandidateAttachment[]
}

export interface InterviewNote {
  id: string
  candidate_id: string
  author_name: string
  content: string
  created_at: string
}

export interface Scorecard {
  id: string
  candidate_id: string
  interviewer_name: string
  rating: number
  strengths?: string
  concerns?: string
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'
  created_at: string
}

export interface Document {
  id: string
  search_id: string
  name: string
  type: 'job_description' | 'interview_guide' | 'finalist_playbook' | 'intake_form' | 'other'
  file_url: string
  uploaded_by: string
  created_at: string
}

export interface Contact {
  id: string
  search_id: string
  name: string
  email: string
  phone?: string
  title?: string
  linkedin_url?: string
  role?: 'hiring_manager' | 'recruiter' | 'interview_panel' | 'board_member' | 'other'
  is_primary: boolean
  access_level: 'full_access' | 'limited_access' | 'no_portal_access'
  portal_invite_sent_at?: string
  portal_last_accessed_at?: string
  created_at: string
  updated_at: string
}

// Form Types
export interface CreateSearchFormData {
  company_name: string
  position_title: string
  client_name: string
  client_email: string
  position_location?: string
  open_to_relocation: boolean
  compensation_range?: string
  relocation_package_available: boolean
  custom_stages?: string[]
}

export interface DocumentUpload {
  file: File
  name: string
  type: 'job_description' | 'interview_guide' | 'finalist_playbook' | 'intake_form' | 'other'
}

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  title?: string
  linkedin_url?: string
  role?: 'hiring_manager' | 'recruiter' | 'interview_panel' | 'board_member' | 'other'
  is_primary: boolean
  access_level: 'full_access' | 'limited_access' | 'no_portal_access'
}

export interface CreateCandidateFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  linkedin_url?: string
  current_company?: string
  current_title?: string
  stage_id: string
}

export interface MagicLink {
  id: string
  search_id: string
  email: string
  token: string
  expires_at: string
  used: boolean
  created_at: string
}

export interface ClientSession {
  id: string
  search_id: string
  email: string
  session_token: string
  expires_at: string
  created_at: string
  last_accessed_at: string
}

export interface InterviewInterviewer {
  id: string
  interview_id: string
  contact_id: string
  contact_name: string
  contact_email: string
  created_at: string
}

export interface Interview {
  id: string
  candidate_id: string
  search_id: string
  interviewer_contact_id?: string
  interviewer_name: string
  interviewer_email: string
  scheduled_at: string
  interview_type: 'phone' | 'video' | 'in_person'
  timezone: string
  duration_minutes: number
  prep_notes?: string
  interview_guide_url?: string
  status: 'scheduled' | 'completed' | 'feedback_received' | 'cancelled'
  feedback_token: string
  created_at: string
  updated_at: string
  interviewers?: InterviewInterviewer[]
}

export interface InterviewFeedback {
  id: string
  interview_id: string
  interviewer_name: string
  interview_notes?: string
  strengths?: string
  concerns?: string
  recommendation: 'advance' | 'hold' | 'decline'
  video_debrief_link?: string
  feedback_file_url?: string
  submitted_at: string
}
