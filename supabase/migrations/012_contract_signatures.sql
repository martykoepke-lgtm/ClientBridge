-- Contract e-signature fields
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sent_for_signature_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_name text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_date timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_ip text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contractor_signature_name text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contractor_signature_date timestamptz;

-- Expand contract status to include signature flow
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'client_signed', 'active', 'superseded', 'cancelled'));

-- Allow clients to update contracts (for signing)
CREATE POLICY "Clients can sign contracts on their projects"
  ON public.contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = contracts.project_id
      AND clients.auth_user_id = auth.uid()
    )
  );
