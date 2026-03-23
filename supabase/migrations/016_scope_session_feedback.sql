-- ClientBridge — Scope Session Feedback
-- Captures structured feedback from interactive scoping documents (like AESCULA SOW Working Session)
-- Tied to a specific client + project via project_id

-- ============================================
-- SCOPE SESSION: One per scoping document
-- ============================================
create table public.scope_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,                          -- e.g., "AESCULA SOW Working Session"
  document_version text default 'v1',           -- tracks which version of the doc
  reviewer_name text,                           -- e.g., "Dr. Scariati"
  reviewer_email text,
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'archived')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SECTION REVIEWS: One per section per session
-- ============================================
create table public.scope_section_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  section_id text not null,                     -- e.g., "s1", "s2", "s3"
  section_title text,                           -- e.g., "Product Overview"
  status text check (status in ('approve', 'flag', 'discuss')),
  notes text,                                   -- free-text section-level notes
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, section_id)
);

-- ============================================
-- DECISION QUESTIONS: Each yes/no/discuss question
-- ============================================
create table public.scope_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  section_id text not null,                     -- which section this question belongs to
  question_id text not null,                    -- e.g., "s1-q1", "s3-q2"
  question_text text,                           -- the actual question
  answer text,                                  -- "yes", "no", "discuss", etc.
  finalized boolean default false,
  finalized_at timestamptz,
  finalized_decision text,                      -- the final answer after discussion
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, question_id)
);

-- ============================================
-- DECISION COMMENTS: Threaded comments on decisions
-- ============================================
create table public.scope_decision_comments (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references public.scope_decisions(id) on delete cascade not null,
  session_id uuid references public.scope_sessions(id) on delete cascade not null,
  question_id text not null,                    -- denormalized for easy lookup
  author_role text not null check (author_role in ('client', 'developer')),
  author_name text,                             -- e.g., "Dr. Scariati" or "Marty"
  content text not null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_scope_sessions_project on public.scope_sessions(project_id);
create index idx_scope_section_reviews_session on public.scope_section_reviews(session_id);
create index idx_scope_decisions_session on public.scope_decisions(session_id);
create index idx_scope_decisions_question on public.scope_decisions(question_id);
create index idx_scope_decision_comments_decision on public.scope_decision_comments(decision_id);
create index idx_scope_decision_comments_session on public.scope_decision_comments(session_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.scope_sessions enable row level security;
alter table public.scope_section_reviews enable row level security;
alter table public.scope_decisions enable row level security;
alter table public.scope_decision_comments enable row level security;

-- Developer (authenticated) can see/manage scope sessions on their projects
create policy "Developers can view scope sessions on their projects"
  on public.scope_sessions for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_sessions.project_id
      and projects.developer_id = auth.uid()
    )
  );

create policy "Developers can create scope sessions"
  on public.scope_sessions for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = scope_sessions.project_id
      and projects.developer_id = auth.uid()
    )
  );

create policy "Developers can update scope sessions"
  on public.scope_sessions for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_sessions.project_id
      and projects.developer_id = auth.uid()
    )
  );

-- Client (anonymous via review link) can view and submit feedback
-- Uses the same review_link_active pattern as existing feedback table
create policy "Anyone can view scope sessions via active review link"
  on public.scope_sessions for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_sessions.project_id
      and projects.review_link_active = true
    )
  );

-- Section reviews: developer + client (via review link) can read/write
create policy "Developers can manage section reviews"
  on public.scope_section_reviews for all
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_section_reviews.session_id
      and p.developer_id = auth.uid()
    )
  );

create policy "Anyone can submit section reviews via active link"
  on public.scope_section_reviews for insert
  with check (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_section_reviews.session_id
      and p.review_link_active = true
    )
  );

create policy "Anyone can update section reviews via active link"
  on public.scope_section_reviews for update
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_section_reviews.session_id
      and p.review_link_active = true
    )
  );

create policy "Anyone can view section reviews via active link"
  on public.scope_section_reviews for select
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_section_reviews.session_id
      and p.review_link_active = true
    )
  );

-- Decisions: same pattern
create policy "Developers can manage decisions"
  on public.scope_decisions for all
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decisions.session_id
      and p.developer_id = auth.uid()
    )
  );

create policy "Anyone can submit decisions via active link"
  on public.scope_decisions for insert
  with check (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decisions.session_id
      and p.review_link_active = true
    )
  );

create policy "Anyone can update decisions via active link"
  on public.scope_decisions for update
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decisions.session_id
      and p.review_link_active = true
    )
  );

create policy "Anyone can view decisions via active link"
  on public.scope_decisions for select
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decisions.session_id
      and p.review_link_active = true
    )
  );

-- Comments: same pattern
create policy "Developers can manage comments"
  on public.scope_decision_comments for all
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decision_comments.session_id
      and p.developer_id = auth.uid()
    )
  );

create policy "Anyone can submit comments via active link"
  on public.scope_decision_comments for insert
  with check (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decision_comments.session_id
      and p.review_link_active = true
    )
  );

create policy "Anyone can view comments via active link"
  on public.scope_decision_comments for select
  using (
    exists (
      select 1 from public.scope_sessions ss
      join public.projects p on p.id = ss.project_id
      where ss.id = scope_decision_comments.session_id
      and p.review_link_active = true
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
create trigger scope_sessions_updated_at
  before update on public.scope_sessions
  for each row execute function public.update_updated_at();

create trigger scope_section_reviews_updated_at
  before update on public.scope_section_reviews
  for each row execute function public.update_updated_at();

create trigger scope_decisions_updated_at
  before update on public.scope_decisions
  for each row execute function public.update_updated_at();
