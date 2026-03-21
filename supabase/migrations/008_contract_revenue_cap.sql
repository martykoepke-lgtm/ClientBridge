-- Add global revenue share cap and start date to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS revenue_share_cap numeric;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS revenue_share_start date;
