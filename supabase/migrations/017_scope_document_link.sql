-- Add document_type to project_documents so scope sessions appear in the Documents tab
-- A "scope" document type renders as a live interactive link, not a file download

-- Add document_type column (default 'file' preserves existing behavior)
alter table public.project_documents
  add column if not exists document_type text not null default 'file'
  check (document_type in ('file', 'scope', 'link'));

-- Add optional scope_session_id for scope-type documents
alter table public.project_documents
  add column if not exists scope_session_id uuid references public.scope_sessions(id) on delete set null;

-- Make file_url optional for scope docs (the URL is generated from the scope session)
-- file_url already exists and is not null, so for scope types we'll store the generated URL there

-- Make file_size optional (scope docs don't have a file size)
alter table public.project_documents
  alter column file_size drop not null,
  alter column file_size set default 0;

-- Index for scope session lookup
create index if not exists idx_project_documents_scope_session
  on public.project_documents(scope_session_id) where scope_session_id is not null;

-- Index for document type filtering
create index if not exists idx_project_documents_type
  on public.project_documents(document_type);
