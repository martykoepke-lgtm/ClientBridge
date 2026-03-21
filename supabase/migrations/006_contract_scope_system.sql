-- Contract & Scope System
-- Adds scope tracking, contracts, milestones, revenue share, and revenue entries

-- ============================================
-- TABLES
-- ============================================

-- Scope Items — individual deliverables/features tracked against a project
create table public.scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid, -- FK added after milestones table exists
  source text not null check (source in ('integration', 'feature', 'custom')),
  source_id text,    -- e.g. 'stripe', 'rbac' — null for custom items
  label text not null,
  in_scope boolean not null default true,
  is_complete boolean not null default false,
  sort_order integer default 0,
  phase text,        -- optional grouping: "MVP", "Phase 2", etc.
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contracts — agreement terms for a project
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  developer_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded', 'cancelled')),
  -- Agreement date
  agreement_date date,
  -- Payment terms
  payment_method text,
  net_terms integer,          -- days, e.g. 15, 30
  late_fee_percent numeric,   -- e.g. 1.5
  -- Additional terms
  ip_ownership text,
  termination_clause text,
  change_order_policy text,
  additional_notes text,
  -- Revenue share toggle
  has_revenue_share boolean not null default false,
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Milestones — payment milestones tied to a contract
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade not null,
  title text not null,
  description text,
  amount numeric not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid')),
  sort_order integer default 0,
  invoice_id text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Now add FK from scope_items to milestones
alter table public.scope_items
  add constraint scope_items_milestone_fk
  foreign key (milestone_id) references public.milestones(id) on delete set null;

-- Revenue Share Phases — phase definitions for revenue share agreements
create table public.revenue_share_phases (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade not null,
  name text not null,
  percentage numeric not null,
  total_cap numeric,          -- max payout, null = uncapped
  monthly_floor numeric,      -- minimum monthly, null = none
  duration_months integer,    -- null = ongoing
  is_ongoing boolean not null default false,
  start_trigger text,
  reporting_method text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Revenue Entries — monthly revenue tracking per phase
create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid references public.revenue_share_phases(id) on delete cascade not null,
  month date not null,            -- first of month, e.g. '2026-03-01'
  client_revenue numeric not null,
  developer_share numeric not null,
  notes text,
  created_at timestamptz default now(),
  unique(phase_id, month)
);

-- ============================================
-- PROJECT TABLE CHANGES
-- ============================================

-- Expand billing_type to include milestone and hybrid
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_billing_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_billing_type_check
  CHECK (billing_type IN ('hourly', 'flat_rate', 'retainer', 'milestone', 'hybrid'));

-- ============================================
-- INDEXES
-- ============================================

create index idx_scope_items_project on public.scope_items(project_id);
create index idx_scope_items_milestone on public.scope_items(milestone_id);
create index idx_contracts_project on public.contracts(project_id);
create index idx_contracts_status on public.contracts(status);
create index idx_milestones_contract on public.milestones(contract_id);
create index idx_milestones_status on public.milestones(status);
create index idx_revenue_phases_contract on public.revenue_share_phases(contract_id);
create index idx_revenue_entries_phase on public.revenue_entries(phase_id);
create index idx_revenue_entries_month on public.revenue_entries(month);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.scope_items enable row level security;
alter table public.contracts enable row level security;
alter table public.milestones enable row level security;
alter table public.revenue_share_phases enable row level security;
alter table public.revenue_entries enable row level security;

-- Scope items: developers can manage scope on their projects
create policy "Developers can view scope items on their projects"
  on public.scope_items for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_items.project_id
      and projects.developer_id = auth.uid()
    )
  );

create policy "Developers can create scope items on their projects"
  on public.scope_items for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = scope_items.project_id
      and projects.developer_id = auth.uid()
    )
  );

create policy "Developers can update scope items on their projects"
  on public.scope_items for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_items.project_id
      and projects.developer_id = auth.uid()
    )
  );

create policy "Developers can delete scope items on their projects"
  on public.scope_items for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = scope_items.project_id
      and projects.developer_id = auth.uid()
    )
  );

-- Contracts: developers manage their own contracts
create policy "Developers can view their own contracts"
  on public.contracts for select
  using (auth.uid() = developer_id);

create policy "Developers can create contracts"
  on public.contracts for insert
  with check (auth.uid() = developer_id);

create policy "Developers can update their own contracts"
  on public.contracts for update
  using (auth.uid() = developer_id);

create policy "Developers can delete their own contracts"
  on public.contracts for delete
  using (auth.uid() = developer_id);

-- Milestones: via contract ownership
create policy "Developers can view milestones on their contracts"
  on public.milestones for select
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = milestones.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can create milestones on their contracts"
  on public.milestones for insert
  with check (
    exists (
      select 1 from public.contracts
      where contracts.id = milestones.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can update milestones on their contracts"
  on public.milestones for update
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = milestones.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can delete milestones on their contracts"
  on public.milestones for delete
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = milestones.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

-- Revenue share phases: via contract ownership
create policy "Developers can view revenue phases on their contracts"
  on public.revenue_share_phases for select
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = revenue_share_phases.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can create revenue phases on their contracts"
  on public.revenue_share_phases for insert
  with check (
    exists (
      select 1 from public.contracts
      where contracts.id = revenue_share_phases.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can update revenue phases on their contracts"
  on public.revenue_share_phases for update
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = revenue_share_phases.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can delete revenue phases on their contracts"
  on public.revenue_share_phases for delete
  using (
    exists (
      select 1 from public.contracts
      where contracts.id = revenue_share_phases.contract_id
      and contracts.developer_id = auth.uid()
    )
  );

-- Revenue entries: via phase -> contract ownership
create policy "Developers can view revenue entries on their phases"
  on public.revenue_entries for select
  using (
    exists (
      select 1 from public.revenue_share_phases
      join public.contracts on contracts.id = revenue_share_phases.contract_id
      where revenue_share_phases.id = revenue_entries.phase_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can create revenue entries on their phases"
  on public.revenue_entries for insert
  with check (
    exists (
      select 1 from public.revenue_share_phases
      join public.contracts on contracts.id = revenue_share_phases.contract_id
      where revenue_share_phases.id = revenue_entries.phase_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can update revenue entries on their phases"
  on public.revenue_entries for update
  using (
    exists (
      select 1 from public.revenue_share_phases
      join public.contracts on contracts.id = revenue_share_phases.contract_id
      where revenue_share_phases.id = revenue_entries.phase_id
      and contracts.developer_id = auth.uid()
    )
  );

create policy "Developers can delete revenue entries on their phases"
  on public.revenue_entries for delete
  using (
    exists (
      select 1 from public.revenue_share_phases
      join public.contracts on contracts.id = revenue_share_phases.contract_id
      where revenue_share_phases.id = revenue_entries.phase_id
      and contracts.developer_id = auth.uid()
    )
  );

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

create trigger scope_items_updated_at
  before update on public.scope_items
  for each row execute function public.update_updated_at();

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.update_updated_at();

create trigger milestones_updated_at
  before update on public.milestones
  for each row execute function public.update_updated_at();

create trigger revenue_share_phases_updated_at
  before update on public.revenue_share_phases
  for each row execute function public.update_updated_at();
