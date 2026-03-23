-- Add view_token to scope_sessions for public URL access
-- Pattern: /scope/[token] — mirrors /review/[token] pattern

alter table public.scope_sessions
  add column if not exists view_token text unique not null default gen_random_uuid()::text;

create index if not exists idx_scope_sessions_view_token
  on public.scope_sessions(view_token);

-- Allow public SELECT on scope_sessions via view_token (no auth needed)
create policy "Anyone can view scope session via token"
  on public.scope_sessions for select
  using (true);

-- Allow public SELECT on section reviews via valid scope session
create policy "Anyone can view section reviews via scope token"
  on public.scope_section_reviews for select
  using (true);

-- Allow public INSERT/UPDATE on section reviews (feedback submission)
create policy "Anyone can submit section reviews via scope token"
  on public.scope_section_reviews for insert
  with check (true);

create policy "Anyone can update section reviews via scope token"
  on public.scope_section_reviews for update
  using (true);

-- Allow public access to decisions
create policy "Anyone can view decisions via scope token"
  on public.scope_decisions for select
  using (true);

create policy "Anyone can submit decisions via scope token"
  on public.scope_decisions for insert
  with check (true);

create policy "Anyone can update decisions via scope token"
  on public.scope_decisions for update
  using (true);

-- Allow public access to decision comments
create policy "Anyone can view decision comments via scope token"
  on public.scope_decision_comments for select
  using (true);

create policy "Anyone can add decision comments via scope token"
  on public.scope_decision_comments for insert
  with check (true);

-- Allow public SELECT on all scope content tables (read-only for viewers)
-- These contain the actual document content (sections, costs, phases, etc.)
do $$
declare
  tbl text;
  tables text[] := array[
    'scope_sections', 'scope_user_roles', 'scope_compliance_items',
    'scope_audit_events', 'scope_competitors', 'scope_tech_stack',
    'scope_infrastructure_costs', 'scope_build_phases', 'scope_sprints',
    'scope_ai_agents', 'scope_curriculum_domains', 'scope_payment_milestones',
    'scope_acceptance_criteria', 'scope_features', 'scope_exercise_formats',
    'scope_qa_checks', 'scope_sme_checklist'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'create policy "Public read via scope token on %1$s" on public.%1$s for select using (true)', tbl
    );
  end loop;
end $$;
