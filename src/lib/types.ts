export interface Client {
  id: string
  developer_id: string
  name: string
  email: string | null
  company: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ComplexityProfile {
  app_type?: 'marketing_site' | 'web_app' | 'dashboard' | 'api_backend' | 'mobile_app' | 'chrome_extension' | 'e_commerce' | 'learning_management' | 'booking_platform' | 'social_platform'
  audience?: 'b2b' | 'b2c' | 'internal'
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
  billing_type: 'hourly' | 'flat_rate' | 'retainer'
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
