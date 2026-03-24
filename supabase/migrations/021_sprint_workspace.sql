-- ============================================
-- Migration: Sprint Workspace
-- Adds project phases, sprints, deliverables, and blockers
-- ============================================

-- 1. Project Phases
CREATE TABLE IF NOT EXISTS public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  phase_number integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON public.project_phases(project_id);

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own project phases"
  ON public.project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers create project phases"
  ON public.project_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers update own project phases"
  ON public.project_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers delete own project phases"
  ON public.project_phases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_phases.project_id
      AND projects.developer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view phases for their projects"
  ON public.project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = project_phases.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- 2. Sprints
CREATE TABLE IF NOT EXISTS public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  sprint_number integer NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  sprint_plan text,
  sprint_summary text,
  demo_date timestamptz,
  demo_status text DEFAULT 'not_scheduled' CHECK (demo_status IN ('not_scheduled', 'scheduled', 'completed')),
  demo_notes text,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_developer ON public.sprints(developer_id);
CREATE INDEX IF NOT EXISTS idx_sprints_phase ON public.sprints(phase_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON public.sprints(project_id, start_date, end_date);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own sprints"
  ON public.sprints FOR SELECT
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers create own sprints"
  ON public.sprints FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers update own sprints"
  ON public.sprints FOR UPDATE
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers delete own sprints"
  ON public.sprints FOR DELETE
  USING (auth.uid() = developer_id);

CREATE POLICY "Clients can view sprints for their projects"
  ON public.sprints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = sprints.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Sprint Deliverables
CREATE TABLE IF NOT EXISTS public.sprint_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_deliverables_sprint ON public.sprint_deliverables(sprint_id);

ALTER TABLE public.sprint_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own sprint deliverables"
  ON public.sprint_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_deliverables.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers create sprint deliverables"
  ON public.sprint_deliverables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_deliverables.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers update sprint deliverables"
  ON public.sprint_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_deliverables.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers delete sprint deliverables"
  ON public.sprint_deliverables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_deliverables.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view sprint deliverables"
  ON public.sprint_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      JOIN public.projects ON projects.id = sprints.project_id
      JOIN public.clients ON clients.id = projects.client_id
      WHERE sprints.id = sprint_deliverables.sprint_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- 4. Sprint Blockers
CREATE TABLE IF NOT EXISTS public.sprint_blockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  owner text DEFAULT 'developer' CHECK (owner IN ('developer', 'client')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  raised_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sprint_blockers_sprint ON public.sprint_blockers(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_blockers_status ON public.sprint_blockers(status);

ALTER TABLE public.sprint_blockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own sprint blockers"
  ON public.sprint_blockers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_blockers.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers create sprint blockers"
  ON public.sprint_blockers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_blockers.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers update sprint blockers"
  ON public.sprint_blockers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_blockers.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Developers delete sprint blockers"
  ON public.sprint_blockers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      WHERE sprints.id = sprint_blockers.sprint_id
      AND sprints.developer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view sprint blockers"
  ON public.sprint_blockers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      JOIN public.projects ON projects.id = sprints.project_id
      JOIN public.clients ON clients.id = projects.client_id
      WHERE sprints.id = sprint_blockers.sprint_id
      AND clients.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update sprint blockers"
  ON public.sprint_blockers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints
      JOIN public.projects ON projects.id = sprints.project_id
      JOIN public.clients ON clients.id = projects.client_id
      WHERE sprints.id = sprint_blockers.sprint_id
      AND clients.auth_user_id = auth.uid()
    )
  );
