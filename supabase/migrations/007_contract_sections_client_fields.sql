-- Add structured sections to contracts + client phone/address

-- Contract sections (JSONB array of structured section content)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]';

-- Client contact fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text;
