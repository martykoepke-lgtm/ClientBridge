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
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 26214400)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can read files
create policy "Authenticated users can read project documents"
  on storage.objects for select
  using (bucket_id = 'project-documents' and auth.role() = 'authenticated');

-- Storage RLS: authenticated users can upload files
create policy "Authenticated users can upload project documents"
  on storage.objects for insert
  with check (bucket_id = 'project-documents' and auth.role() = 'authenticated');

-- Storage RLS: authenticated users can delete files they have access to
create policy "Authenticated users can delete project documents"
  on storage.objects for delete
  using (bucket_id = 'project-documents' and auth.role() = 'authenticated');
