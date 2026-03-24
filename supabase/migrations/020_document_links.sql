-- Document Links: external URLs saved per project (Google Docs, Figma, specs, etc.)
CREATE TABLE project_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_by_role TEXT NOT NULL DEFAULT 'developer' CHECK (created_by_role IN ('developer', 'client')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('design', 'spec', 'spreadsheet', 'document', 'presentation', 'video', 'other')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE project_document_links ENABLE ROW LEVEL SECURITY;

-- Developers: full CRUD on their own projects
CREATE POLICY "Developers can view links on their projects"
  ON project_document_links FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.developer_id = auth.uid()));

CREATE POLICY "Developers can insert links on their projects"
  ON project_document_links FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.developer_id = auth.uid()));

CREATE POLICY "Developers can update links on their projects"
  ON project_document_links FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.developer_id = auth.uid()));

CREATE POLICY "Developers can delete links on their projects"
  ON project_document_links FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.developer_id = auth.uid()));

-- Clients: read-only on their own projects
CREATE POLICY "Clients can view links on their projects"
  ON project_document_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects JOIN clients ON clients.id = projects.client_id
    WHERE projects.id = project_id AND clients.auth_user_id = auth.uid()
  ));
