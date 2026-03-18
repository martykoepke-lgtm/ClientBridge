-- ============================================
-- Migration: Add Time Tracking to Client Bridge
-- ============================================

-- 1. Add billing/display columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hourly_rate numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color text DEFAULT '#4a9eff';

-- 2. Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#4a9eff',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(developer_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers create own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = developer_id);

-- 3. Time sessions table
CREATE TABLE IF NOT EXISTS public.time_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id),
  category_name text NOT NULL,
  description text,
  ai_summary text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes numeric,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'context', 'watcher', 'recovered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_sessions_project ON public.time_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_developer ON public.time_sessions(developer_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_start ON public.time_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_time_sessions_active ON public.time_sessions(developer_id) WHERE end_time IS NULL;

ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers see own time sessions"
  ON public.time_sessions FOR SELECT
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers create own time sessions"
  ON public.time_sessions FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers update own time sessions"
  ON public.time_sessions FOR UPDATE
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers delete own time sessions"
  ON public.time_sessions FOR DELETE
  USING (auth.uid() = developer_id);

-- Updated_at trigger
CREATE TRIGGER time_sessions_updated_at
  BEFORE UPDATE ON public.time_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
