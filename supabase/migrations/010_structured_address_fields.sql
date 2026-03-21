-- Add structured address fields to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS zip text;

-- Add structured address fields to company_profile
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS zip text;
-- Note: company_profile already has a 'state' column
