-- Client Portal: auth linking + invitations

-- Link clients to Supabase auth users
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_auth_user ON public.clients(auth_user_id);

-- Client invitations
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_client ON public.client_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.client_invitations(email);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Developers can manage invitations they created
CREATE POLICY "Developers can view their invitations"
  ON public.client_invitations FOR SELECT
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers can create invitations"
  ON public.client_invitations FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers can update their invitations"
  ON public.client_invitations FOR UPDATE
  USING (auth.uid() = developer_id);

-- Anyone can read an invitation by token (for the accept flow)
CREATE POLICY "Anyone can view invitation by token"
  ON public.client_invitations FOR SELECT
  USING (true);

-- Allow clients to view projects they're linked to
CREATE POLICY "Clients can view projects they belong to"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Allow clients to view their own client record
CREATE POLICY "Clients can view their own record"
  ON public.clients FOR SELECT
  USING (auth_user_id = auth.uid());

-- Allow clients to view feedback on their projects
CREATE POLICY "Clients can view feedback on their projects"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = feedback.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Allow clients to view contracts on their projects
CREATE POLICY "Clients can view contracts on their projects"
  ON public.contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = contracts.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Allow clients to view milestones on their contracts
CREATE POLICY "Clients can view milestones on their contracts"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts
      JOIN public.projects ON projects.id = contracts.project_id
      JOIN public.clients ON clients.id = projects.client_id
      WHERE contracts.id = milestones.contract_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Allow clients to view scope items on their projects
CREATE POLICY "Clients can view scope on their projects"
  ON public.scope_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = scope_items.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Allow clients to view time sessions on their projects
CREATE POLICY "Clients can view time sessions on their projects"
  ON public.time_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = time_sessions.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );
