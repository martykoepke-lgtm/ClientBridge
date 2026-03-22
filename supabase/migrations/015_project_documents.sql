-- Project Documents table
-- Both agency (developer) and client users can upload documents per project

create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id),
  uploaded_by_role text not null check (uploaded_by_role in ('developer', 'client')),
  file_name text not null,
  file_url text not null,
  file_size bigint not null default 0,
  file_type text not null default 'application/octet-stream',
  description text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_project_documents_project_id on project_documents(project_id);
create index idx_project_documents_uploaded_by on project_documents(uploaded_by_user_id);

-- RLS
alter table project_documents enable row level security;

-- Developers can see documents on their own projects
create policy "Developers can view project documents"
  on project_documents for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_documents.project_id
        and p.developer_id = auth.uid()
    )
  );

-- Developers can insert documents on their own projects
create policy "Developers can upload project documents"
  on project_documents for insert
  with check (
    uploaded_by_user_id = auth.uid()
    and uploaded_by_role = 'developer'
    and exists (
      select 1 from projects p
      where p.id = project_documents.project_id
        and p.developer_id = auth.uid()
    )
  );

-- Developers can delete any document on their own projects
create policy "Developers can delete project documents"
  on project_documents for delete
  using (
    exists (
      select 1 from projects p
      where p.id = project_documents.project_id
        and p.developer_id = auth.uid()
    )
  );

-- Clients can see documents on projects they belong to
create policy "Clients can view project documents"
  on project_documents for select
  using (
    exists (
      select 1 from projects p
      join clients c on c.id = p.client_id
      where p.id = project_documents.project_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Clients can upload documents on projects they belong to
create policy "Clients can upload project documents"
  on project_documents for insert
  with check (
    uploaded_by_user_id = auth.uid()
    and uploaded_by_role = 'client'
    and exists (
      select 1 from projects p
      join clients c on c.id = p.client_id
      where p.id = project_documents.project_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Clients can delete only their own uploads
create policy "Clients can delete own documents"
  on project_documents for delete
  using (
    uploaded_by_user_id = auth.uid()
    and uploaded_by_role = 'client'
  );

-- Storage bucket for project documents
-- Note: Run this via Supabase dashboard or CLI:
-- insert into storage.buckets (id, name, public) values ('project-documents', 'project-documents', false);
--
-- Storage RLS policies (apply via dashboard):
-- SELECT: authenticated users can read files in their project folders
-- INSERT: authenticated users can upload to their project folders (max 25MB)
-- DELETE: developers can delete any file in their projects; clients can delete their own
