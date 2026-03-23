-- ============================================
-- MIGRATION 018: Scope Document Content Tables
-- Stores ALL content from interactive scoping documents
-- so it can be viewed, edited, and versioned by both parties
-- ============================================

-- ============================================
-- SCOPE SECTIONS: The document structure itself
-- ============================================
create table public.scope_sections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  section_id text not null,                      -- "s1", "s2", etc.
  section_number integer not null,               -- display order
  eyebrow text,                                  -- "Section 01 · 10 minutes"
  title text not null,                           -- "Product Overview"
  subtitle text,
  time_allocation_minutes integer,               -- 10, 20, 30, etc.
  display_order integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, section_id)
);

-- ============================================
-- USER ROLES: Platform role definitions
-- ============================================
create table public.scope_user_roles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  role_key text not null,                        -- "admin", "institutional", "student", "sme", "developer"
  role_label text not null,                      -- "Admin", "Institutional", etc.
  who text,                                      -- "DIS LLC", "Medical students", etc.
  access_scope text,                             -- what they can see/do
  notes text,
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- COMPLIANCE REQUIREMENTS
-- ============================================
create table public.scope_compliance_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  regulation text not null,                      -- "FERPA", "HIPAA-adjacent", "Data Residency"
  applies_when text,
  what_it_means text,
  architecture_notes text,                       -- how we address it technically
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- FERPA AUDIT EVENTS
-- ============================================
create table public.scope_audit_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  event_number integer not null,
  event_name text not null,                      -- "Session opened", "API call made", etc.
  what_we_log text,
  what_we_dont_log text,
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- COMPETITIVE LANDSCAPE
-- ============================================
create table public.scope_competitors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  competitor_name text not null,                 -- "Anki", "AMBOSS", etc.
  what_they_do text,
  our_advantage text,
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- TECH STACK
-- ============================================
create table public.scope_tech_stack (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  layer text not null,                           -- "Frontend + Backend", "Database + Auth", etc.
  tool_name text not null,                       -- "Next.js", "Supabase", etc.
  role_description text,                         -- "Full-stack React framework"
  rationale text,                                -- why this choice
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- INFRASTRUCTURE COSTS
-- ============================================
create table public.scope_infrastructure_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  service_name text not null,                    -- "Supabase", "Vercel", etc.
  service_url text,                              -- "supabase.com/pricing"
  plan_name text not null,                       -- "Pro", "Team + HIPAA", etc.
  monthly_cost text not null,                    -- "$25/mo", "$20/user/mo", "2.9% + $0.30"
  cost_numeric decimal(10,2),                    -- for math: 25.00, 20.00, etc.
  what_you_get text,                             -- features included
  compliance_level text,                         -- "FERPA-ready", "BAA eligible", etc.
  notes text,
  is_required boolean default true,              -- vs optional upgrade
  is_usage_based boolean default false,          -- Stripe, Anthropic
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- BUILD PHASES
-- ============================================
create table public.scope_build_phases (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  phase_number integer not null,                 -- 1, 2, 3
  phase_name text not null,                      -- "Content Factory"
  tagline text,                                  -- "Nothing works without content..."
  estimated_hours_min integer,                   -- 100
  estimated_hours_max integer,                   -- 120
  estimated_months text,                         -- "Months 1-2"
  gate_criteria text,                            -- "20 published lessons exist. Pipeline proven."
  payment_trigger text,                          -- "$4,000" or null if no payment at this gate
  display_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SPRINTS (within phases)
-- ============================================
create table public.scope_sprints (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid references public.scope_build_phases(id) on delete cascade not null,
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  sprint_number integer not null,                -- 1, 2, 3...
  sprint_title text not null,                    -- "Infrastructure"
  sprint_description text,                       -- what gets built
  weeks text,                                    -- "Wk 1-2"
  is_milestone boolean default false,
  milestone_label text,                          -- "Milestone 1 — payment"
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- AI AGENTS
-- ============================================
create table public.scope_ai_agents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  agent_number integer not null,                 -- 1-5
  agent_name text not null,                      -- "Content Generator"
  agent_location text not null,                  -- "Backstage", "Student-facing", "Background"
  phase text,                                    -- "Phase 1", "Phase 2"
  role_description text not null,
  scope_description text not null,
  boundaries text not null,
  input_format text,                             -- what it receives
  output_format text,                            -- what it produces
  ferpa_notes text,                              -- FERPA-specific boundaries if applicable
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- CURRICULUM DOMAINS (Dimension 1 + 2)
-- ============================================
create table public.scope_curriculum_domains (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  dimension integer not null,                    -- 1 (Competency) or 2 (Clinical Presentation)
  domain_code text not null,                     -- "D3", "CP5", etc.
  domain_name text not null,                     -- "Biomedical & Clinical Knowledge"
  board_weight_percent decimal(5,2),             -- 60.00, 13.00, etc.
  module_count integer not null,                 -- 680, 70, etc.
  subdomains text,                               -- comma-separated or description
  study_priority integer,                        -- 1 = first, 2 = second, etc.
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- PAYMENT MILESTONES
-- ============================================
create table public.scope_payment_milestones (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  installment_number integer not null,           -- 1, 2, 3
  amount decimal(10,2) not null,                 -- 4000.00, 7000.00
  trigger_description text not null,             -- "Upon execution of this Agreement"
  technical_meaning text,                        -- "Contract signed → work begins"
  status text default 'pending' check (status in ('pending', 'triggered', 'paid')),
  triggered_at timestamptz,
  paid_at timestamptz,
  display_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ACCEPTANCE CRITERIA (per milestone)
-- ============================================
create table public.scope_acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references public.scope_payment_milestones(id) on delete cascade not null,
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  criterion_number integer not null,
  description text not null,                     -- "Student can register, pay, access platform — without help"
  passed boolean default false,
  passed_at timestamptz,
  tested_by text,                                -- "Third party", "Dr. Scariati", etc.
  display_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MVP FEATURE LIST (In vs Deferred)
-- ============================================
create table public.scope_features (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  feature_name text not null,                    -- "AI content generation pipeline"
  phase text not null,                           -- "mvp_option_a", "mvp_option_b", "phase_2", "full_product"
  included boolean not null,                     -- true = in this phase, false = deferred
  description text,
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- INTERACTIVE EXERCISE FORMATS
-- ============================================
create table public.scope_exercise_formats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  format_name text not null,                     -- "Matching", "Diagram labeling", etc.
  description text,                              -- "Connect terms to definitions"
  phase text not null,                           -- "MVP" or "Full product"
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- QA CHECKS (automated quality validation rules)
-- ============================================
create table public.scope_qa_checks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  check_number integer not null,
  check_name text not null,                      -- "Single learning goal"
  rule_description text not null,                -- "Exactly one core concept per lesson"
  on_failure text not null,                      -- "Reject — retry once"
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- SME CHECKLIST ITEMS
-- ============================================
create table public.scope_sme_checklist (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  item_number integer not null,
  criterion text not null,                       -- "Clear, singular learning goal"
  enforced_in_ui boolean default false,          -- whether the UI forces checking this
  display_order integer,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_scope_sections_session on public.scope_sections(session_id);
create index idx_scope_user_roles_session on public.scope_user_roles(session_id);
create index idx_scope_compliance_session on public.scope_compliance_items(session_id);
create index idx_scope_audit_events_session on public.scope_audit_events(session_id);
create index idx_scope_competitors_session on public.scope_competitors(session_id);
create index idx_scope_tech_stack_session on public.scope_tech_stack(session_id);
create index idx_scope_costs_session on public.scope_infrastructure_costs(session_id);
create index idx_scope_phases_session on public.scope_build_phases(session_id);
create index idx_scope_sprints_session on public.scope_sprints(session_id);
create index idx_scope_sprints_phase on public.scope_sprints(phase_id);
create index idx_scope_agents_session on public.scope_ai_agents(session_id);
create index idx_scope_curriculum_session on public.scope_curriculum_domains(session_id);
create index idx_scope_milestones_session on public.scope_payment_milestones(session_id);
create index idx_scope_criteria_milestone on public.scope_acceptance_criteria(milestone_id);
create index idx_scope_criteria_session on public.scope_acceptance_criteria(session_id);
create index idx_scope_features_session on public.scope_features(session_id);
create index idx_scope_exercises_session on public.scope_exercise_formats(session_id);
create index idx_scope_qa_session on public.scope_qa_checks(session_id);
create index idx_scope_sme_checklist_session on public.scope_sme_checklist(session_id);

-- ============================================
-- ROW LEVEL SECURITY
-- All content tables follow the same pattern:
-- Developer sees via auth.uid(), client sees via active review link
-- ============================================

alter table public.scope_sections enable row level security;
alter table public.scope_user_roles enable row level security;
alter table public.scope_compliance_items enable row level security;
alter table public.scope_audit_events enable row level security;
alter table public.scope_competitors enable row level security;
alter table public.scope_tech_stack enable row level security;
alter table public.scope_infrastructure_costs enable row level security;
alter table public.scope_build_phases enable row level security;
alter table public.scope_sprints enable row level security;
alter table public.scope_ai_agents enable row level security;
alter table public.scope_curriculum_domains enable row level security;
alter table public.scope_payment_milestones enable row level security;
alter table public.scope_acceptance_criteria enable row level security;
alter table public.scope_features enable row level security;
alter table public.scope_exercise_formats enable row level security;
alter table public.scope_qa_checks enable row level security;
alter table public.scope_sme_checklist enable row level security;

-- Helper function to check scope session access (reduces policy repetition)
-- Developer access: authenticated user owns the project
-- Client access: project review link is active

-- DEVELOPER POLICIES (one per table)
do $$
declare
  tbl text;
  tables text[] := array[
    'scope_sections', 'scope_user_roles', 'scope_compliance_items',
    'scope_audit_events', 'scope_competitors', 'scope_tech_stack',
    'scope_infrastructure_costs', 'scope_build_phases', 'scope_sprints',
    'scope_ai_agents', 'scope_curriculum_domains', 'scope_payment_milestones',
    'scope_acceptance_criteria', 'scope_features', 'scope_exercise_formats',
    'scope_qa_checks', 'scope_sme_checklist'
  ];
begin
  foreach tbl in array tables loop
    -- Developer can do everything on their projects
    execute format(
      'create policy "Dev full access on %1$s" on public.%1$s for all
       using (exists (
         select 1 from public.scope_sessions ss
         join public.projects p on p.id = ss.project_id
         where ss.id = %1$s.session_id
         and p.developer_id = auth.uid()
       ))', tbl
    );

    -- Client can view via active review link
    execute format(
      'create policy "Client view on %1$s" on public.%1$s for select
       using (exists (
         select 1 from public.scope_sessions ss
         join public.projects p on p.id = ss.project_id
         where ss.id = %1$s.session_id
         and p.review_link_active = true
       ))', tbl
    );
  end loop;
end $$;

-- TRIGGERS (updated_at on tables that have the column)
create trigger scope_sections_updated_at
  before update on public.scope_sections
  for each row execute function public.update_updated_at();

create trigger scope_phases_updated_at
  before update on public.scope_build_phases
  for each row execute function public.update_updated_at();

create trigger scope_milestones_updated_at
  before update on public.scope_payment_milestones
  for each row execute function public.update_updated_at();

create trigger scope_criteria_updated_at
  before update on public.scope_acceptance_criteria
  for each row execute function public.update_updated_at();
