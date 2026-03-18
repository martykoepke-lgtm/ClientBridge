-- Client Bridge — Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  company text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  developer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  vercel_url text,
  review_token text unique not null default gen_random_uuid()::text,
  review_pin text,
  review_link_active boolean default true,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  client_id uuid references public.clients(id),
  screen_url text,
  screen_title text,
  screenshot_url text,
  feedback_type text not null check (feedback_type in ('bug', 'content', 'ux', 'feature_request', 'general')),
  title text not null,
  description text not null,
  severity text default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  status text default 'submitted' check (status in ('submitted', 'reviewed', 'in_progress', 'change_made', 'approved', 'needs_revision', 'resolved', 'deferred', 'dismissed')),
  developer_notes text,
  generated_prompt text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Review Sessions (tracks client browsing sessions)
create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  client_id uuid references public.clients(id),
  client_name text,
  session_start timestamptz default now(),
  session_end timestamptz,
  pages_visited text[],
  feedback_count integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_clients_developer on public.clients(developer_id);
create index idx_projects_client on public.projects(client_id);
create index idx_projects_developer on public.projects(developer_id);
create index idx_projects_review_token on public.projects(review_token);
create index idx_feedback_project on public.feedback(project_id);
create index idx_feedback_status on public.feedback(status);
create index idx_review_sessions_project on public.review_sessions(project_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.feedback enable row level security;
alter table public.review_sessions enable row level security;

-- Clients: developers can only see/manage their own clients
create policy "Developers can view their own clients"
  on public.clients for select
  using (auth.uid() = developer_id);

create policy "Developers can create clients"
  on public.clients for insert
  with check (auth.uid() = developer_id);

create policy "Developers can update their own clients"
  on public.clients for update
  using (auth.uid() = developer_id);

create policy "Developers can delete their own clients"
  on public.clients for delete
  using (auth.uid() = developer_id);

-- Projects: developers can manage their own projects
create policy "Developers can view their own projects"
  on public.projects for select
  using (auth.uid() = developer_id);

create policy "Developers can create projects"
  on public.projects for insert
  with check (auth.uid() = developer_id);

create policy "Developers can update their own projects"
  on public.projects for update
  using (auth.uid() = developer_id);

create policy "Developers can delete their own projects"
  on public.projects for delete
  using (auth.uid() = developer_id);

-- Projects: allow anonymous access via review token (for client review pages)
create policy "Anyone can view a project by review token"
  on public.projects for select
  using (review_link_active = true);
  -- Note: the app filters by token; this policy allows SELECT when link is active.
  -- In practice the app only exposes projects via their token, not listing all.

-- Feedback: developers can view feedback on their projects
create policy "Developers can view feedback on their projects"
  on public.feedback for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = feedback.project_id
      and projects.developer_id = auth.uid()
    )
  );

-- Feedback: anyone can submit feedback (clients via review link, no auth)
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = feedback.project_id
      and projects.review_link_active = true
    )
  );

-- Feedback: developers can update feedback status/notes
create policy "Developers can update feedback on their projects"
  on public.feedback for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = feedback.project_id
      and projects.developer_id = auth.uid()
    )
  );

-- Review Sessions: anyone can create (client sessions)
create policy "Anyone can create review sessions"
  on public.review_sessions for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = review_sessions.project_id
      and projects.review_link_active = true
    )
  );

-- Review Sessions: developers can view sessions on their projects
create policy "Developers can view review sessions"
  on public.review_sessions for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = review_sessions.project_id
      and projects.developer_id = auth.uid()
    )
  );

-- Review Sessions: anyone can update their session (to add pages visited)
create policy "Anyone can update review sessions"
  on public.review_sessions for update
  with check (
    exists (
      select 1 from public.projects
      where projects.id = review_sessions.project_id
      and projects.review_link_active = true
    )
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

create trigger feedback_updated_at
  before update on public.feedback
  for each row execute function public.update_updated_at();
