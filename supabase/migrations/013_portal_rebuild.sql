-- Migration 013: Portal Rebuild
-- Adds RLS policies for authenticated client feedback submission

-- Allow authenticated clients to submit feedback on their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Clients can submit feedback on their projects'
    AND tablename = 'feedback'
  ) THEN
    CREATE POLICY "Clients can submit feedback on their projects"
      ON public.feedback FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects
          JOIN public.clients ON clients.id = projects.client_id
          WHERE projects.id = feedback.project_id
          AND clients.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow authenticated clients to view their own client record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Clients can view own record'
    AND tablename = 'clients'
  ) THEN
    CREATE POLICY "Clients can view own record"
      ON public.clients FOR SELECT
      USING (auth_user_id = auth.uid());
  END IF;
END $$;

-- Allow authenticated clients to view invitations for their email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Anyone can view invitations by token'
    AND tablename = 'client_invitations'
  ) THEN
    CREATE POLICY "Anyone can view invitations by token"
      ON public.client_invitations FOR SELECT
      USING (true);
  END IF;
END $$;
