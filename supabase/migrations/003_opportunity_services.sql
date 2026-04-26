-- Opportunity_services junction table for many-to-many opportunity-service relationship
create table public.opportunity_services (
  id uuid default uuid_generate_v4() primary key,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  created_at timestamptz default now(),
  unique(opportunity_id, service_id)
);

-- RLS for opportunity_services
alter table public.opportunity_services enable row level security;

create policy "opportunity_services_select" on public.opportunity_services for select using (auth.role() = 'authenticated');
create policy "opportunity_services_insert" on public.opportunity_services for insert with check (auth.role() = 'authenticated');
create policy "opportunity_services_delete" on public.opportunity_services for delete using (auth.role() = 'authenticated');