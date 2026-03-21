-- Company profile for contractor branding on invoices and contracts
CREATE TABLE IF NOT EXISTS public.company_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT 'Practical Informatics LLC',
  contact_name text DEFAULT 'Marty Koepke',
  email text DEFAULT 'marty.koepke@practicalinformatics.com',
  phone text,
  address text,
  state text DEFAULT 'Commonwealth of Virginia',
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can view their own profile"
  ON public.company_profile FOR SELECT
  USING (auth.uid() = developer_id);

CREATE POLICY "Developers can create their profile"
  ON public.company_profile FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers can update their own profile"
  ON public.company_profile FOR UPDATE
  USING (auth.uid() = developer_id);

CREATE TRIGGER company_profile_updated_at
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
