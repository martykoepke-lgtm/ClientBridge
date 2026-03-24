export interface Client {
  id: string
  developer_id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  address: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  avatar_url: string | null
  auth_user_id: string | null
  invited_at: string | null
  invite_accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientInvitation {
  id: string
  client_id: string
  project_id: string | null
  developer_id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

export interface CompanyProfile {
  id: string
  developer_id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface ContractSection {
  id: string
  number: number
  title: string
  content: string
  subsections: {
    id: string
    title: string
    content: string
  }[]
  collapsed: boolean
}

export interface ComplexityProfile {
  app_type?: 'marketing_site' | 'web_app' | 'dashboard' | 'api_backend' | 'mobile_app' | 'chrome_extension' | 'e_commerce' | 'learning_management' | 'booking_platform' | 'social_platform'
  audience?: string[] // multi-select: ['b2b', 'b2c', 'internal']
  access?: 'public' | 'org_whitelisted' | 'invite_only' | 'personal'
  multi_tenant?: boolean
  auth_level?: 'none' | 'basic' | 'oauth' | 'sso'
  database_complexity?: 'none' | 'simple' | 'complex'
  deployment?: 'simple' | 'complex'
  integrations?: string[]
  features?: string[]
}

export interface Project {
  id: string
  client_id: string
  developer_id: string
  name: string
  description: string | null
  vercel_url: string | null
  review_token: string
  review_pin: string | null
  review_link_active: boolean
  status: 'active' | 'paused' | 'completed' | 'archived'
  hourly_rate: number | null
  color: string | null
  billing_type: 'hourly' | 'flat_rate' | 'retainer' | 'milestone' | 'hybrid'
  quoted_amount: number | null
  estimated_hours: number | null
  complexity_profile: ComplexityProfile
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
}

export interface Feedback {
  id: string
  project_id: string
  client_id: string | null
  screen_url: string | null
  screen_title: string | null
  screenshot_url: string | null
  feedback_type: 'bug' | 'content' | 'ux' | 'feature_request' | 'general'
  title: string
  description: string
  severity: 'low' | 'normal' | 'high' | 'critical'
  status: 'submitted' | 'reviewed' | 'in_progress' | 'change_made' | 'approved' | 'needs_revision' | 'resolved' | 'deferred' | 'dismissed'
  developer_notes: string | null
  generated_prompt: string | null
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
}

export interface Category {
  id: string
  developer_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface TimeSession {
  id: string
  project_id: string
  developer_id: string
  category_id: string | null
  category_name: string
  description: string | null
  ai_summary: string | null
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  source: 'manual' | 'context' | 'watcher' | 'recovered'
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
}

export interface ReviewSession {
  id: string
  project_id: string
  client_id: string | null
  client_name: string | null
  session_start: string
  session_end: string | null
  pages_visited: string[]
  feedback_count: number
  created_at: string
}

export interface ScopeItem {
  id: string
  project_id: string
  milestone_id: string | null
  source: 'integration' | 'feature' | 'custom'
  source_id: string | null
  label: string
  in_scope: boolean
  is_complete: boolean
  sort_order: number
  phase: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  project_id: string
  developer_id: string
  status: 'draft' | 'sent' | 'client_signed' | 'active' | 'superseded' | 'cancelled'
  sent_for_signature_at: string | null
  client_signature_name: string | null
  client_signature_date: string | null
  client_signature_ip: string | null
  contractor_signature_name: string | null
  contractor_signature_date: string | null
  agreement_date: string | null
  payment_method: string | null
  net_terms: number | null
  late_fee_percent: number | null
  ip_ownership: string | null
  termination_clause: string | null
  change_order_policy: string | null
  additional_notes: string | null
  has_revenue_share: boolean
  revenue_share_cap: number | null
  revenue_share_start: string | null
  sections: ContractSection[]
  created_at: string
  updated_at: string
  // Joined fields
  milestones?: Milestone[]
  revenue_share_phases?: RevenueSharePhase[]
}

export interface Milestone {
  id: string
  contract_id: string
  title: string
  description: string | null
  amount: number
  due_date: string | null
  status: 'pending' | 'achieved' | 'invoiced' | 'paid'
  sort_order: number
  invoice_id: string | null
  achieved_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // Computed in UI
  scope_items?: ScopeItem[]
}

export interface RevenueSharePhase {
  id: string
  contract_id: string
  name: string
  percentage: number
  total_cap: number | null
  monthly_floor: number | null
  duration_months: number | null
  is_ongoing: boolean
  start_trigger: string | null
  reporting_method: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  entries?: RevenueEntry[]
}

export interface RevenueEntry {
  id: string
  phase_id: string
  month: string
  client_revenue: number
  developer_share: number
  notes: string | null
  created_at: string
}

export interface ProjectDocument {
  id: string
  project_id: string
  uploaded_by_user_id: string
  uploaded_by_role: 'developer' | 'client'
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  description: string | null
  document_type: 'file' | 'scope' | 'link'
  scope_session_id: string | null
  created_at: string
}

export interface ErrorLog {
  id: string
  project_id: string
  client_name: string | null
  error_type: string
  tier: 1 | 2 | 3
  message: string
  url: string | null
  raw_error: string | null
  user_agent: string | null
  source: string
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored'
  resolution_notes: string | null
  created_at: string
  // Joined fields
  project?: Project
}

export interface DocumentLink {
  id: string
  project_id: string
  created_by_user_id: string
  created_by_role: 'developer' | 'client'
  name: string
  url: string
  document_type: 'design' | 'spec' | 'spreadsheet' | 'document' | 'presentation' | 'video' | 'other'
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  color: string
  phase_number: number
  created_at: string
}

export interface Sprint {
  id: string
  project_id: string
  developer_id: string
  phase_id: string | null
  sprint_number: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: 'planned' | 'active' | 'completed'
  progress_percent: number
  sprint_plan: string | null
  sprint_summary: string | null
  demo_date: string | null
  demo_status: 'not_scheduled' | 'scheduled' | 'completed'
  demo_notes: string | null
  milestone_id: string | null
  created_at: string
  updated_at: string
  // Joined fields
  phase?: ProjectPhase
  deliverables?: SprintDeliverable[]
  blockers?: SprintBlocker[]
}

export interface SprintDeliverable {
  id: string
  sprint_id: string
  label: string
  status: 'todo' | 'in_progress' | 'done'
  sort_order: number
  created_at: string
}

export interface SprintBlocker {
  id: string
  sprint_id: string
  description: string
  owner: 'developer' | 'client'
  status: 'active' | 'resolved'
  raised_at: string
  resolved_at: string | null
}
