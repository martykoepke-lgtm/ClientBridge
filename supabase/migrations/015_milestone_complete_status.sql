-- Add 'achieved' status to milestones
-- Flow: pending → achieved → invoiced → paid
-- 'achieved' means deliverables are done but invoice hasn't been sent yet

-- Add achieved_at timestamp
alter table public.milestones add column if not exists achieved_at timestamptz;

-- Drop old constraint and add new one with 'achieved'
alter table public.milestones drop constraint if exists milestones_status_check;
alter table public.milestones add constraint milestones_status_check
  check (status in ('pending', 'achieved', 'invoiced', 'paid'));
