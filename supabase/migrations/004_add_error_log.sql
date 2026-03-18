-- Error logging for ClientBridge proxy and client-facing errors
-- Stores Tier 1 (client-facing) and Tier 2 (developer-only) errors
-- Tier 3 (noise) is discarded before reaching the database

CREATE TABLE error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name text,
  error_type text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  message text NOT NULL,
  url text,
  raw_error text,
  user_agent text,
  source text DEFAULT 'proxy',
  status text DEFAULT 'new',
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Fast lookups for dashboard: recent errors per project
CREATE INDEX idx_error_log_project ON error_log(project_id, created_at DESC);

-- Fast count of unresolved errors
CREATE INDEX idx_error_log_new ON error_log(status) WHERE status = 'new';

-- RLS: developers see errors for their own projects
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can view errors for their projects"
  ON error_log FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers can update errors for their projects"
  ON error_log FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE developer_id = auth.uid()
    )
  );

-- Allow inserts from service role (proxy uses service role key)
-- No insert policy needed for authenticated users since errors come from the proxy
CREATE POLICY "Service role can insert errors"
  ON error_log FOR INSERT
  WITH CHECK (true);
