-- ============================================
-- Dashboard Widget System Migration v3
-- 004_dashboard_widgets.sql
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 0. EXTENSION
-- ============================================
create extension if not exists "pgcrypto";

-- ============================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
end;
$$;

create or replace function public.has_workspace_role(
  p_workspace_id uuid,
  p_roles text[]
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
end;
$$;

create or replace function public.is_workspace_owner_or_admin(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return has_workspace_role(p_workspace_id, array['owner', 'admin']);
end;
$$;

-- ============================================
-- 2. FUNCTION handle_updated_at
-- ============================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- 3. workspaces
-- ============================================
create table if not exists public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  owner_id uuid references public.profiles(id) on delete set null,
  industry text,
  plan text default 'free' check (plan in ('free', 'starter', 'professional', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 4. workspace_members
-- ============================================
create table if not exists public.workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ============================================
-- 5. dashboard_widgets (catálogo - solo lectura)
-- ============================================
create table if not exists public.dashboard_widgets (
  id uuid default gen_random_uuid() primary key,
  type text not null unique,
  title text not null,
  description text,
  icon text,
  allowed_data_sources text[],
  allowed_metrics text[],
  config_schema jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- 6. dashboard_templates
-- ============================================
create table if not exists public.dashboard_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  schema_version integer not null default 1,
  description text,
  industry text,
  is_system boolean default false,
  is_public boolean default true,
  config_json jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 7. dashboard_layouts
-- ============================================
create table if not exists public.dashboard_layouts (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instance_key text not null,
  widget_id uuid not null references public.dashboard_widgets(id) on delete cascade,
  title_override text,
  data_source text check (data_source in (
    'leads', 'companies', 'opportunities', 'tasks', 'projects', 'proposals', 'activities'
  )),
  metric text check (metric in (
    'count', 'sum', 'average',
    'grouped_by_source', 'grouped_by_status', 'grouped_by_month',
    'pipeline_value', 'conversion_funnel'
  )),
  size text default 'medium' check (size in ('small', 'medium', 'large')),
  position integer not null default 0,
  is_active boolean default true,
  config_json jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, instance_key)
);

-- ============================================
-- 8. dashboard_settings
-- ============================================
create table if not exists public.dashboard_settings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  active_template_id uuid references public.dashboard_templates(id) on delete set null,
  config_json jsonb default '{}',
  updated_at timestamptz default now()
);

-- ============================================
-- 9. TRIGGERS updated_at (re-run safe)
-- ============================================
drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.handle_updated_at();

drop trigger if exists dashboard_layouts_updated_at on public.dashboard_layouts;
create trigger dashboard_layouts_updated_at
  before update on public.dashboard_layouts
  for each row execute function public.handle_updated_at();

drop trigger if exists dashboard_templates_updated_at on public.dashboard_templates;
create trigger dashboard_templates_updated_at
  before update on public.dashboard_templates
  for each row execute function public.handle_updated_at();

drop trigger if exists dashboard_settings_updated_at on public.dashboard_settings;
create trigger dashboard_settings_updated_at
  before update on public.dashboard_settings
  for each row execute function public.handle_updated_at();

-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.dashboard_layouts enable row level security;
alter table public.dashboard_templates enable row level security;
alter table public.dashboard_settings enable row level security;

-- workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
  for select using (is_workspace_member(id));

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces
  for update using (is_workspace_owner_or_admin(id));

-- workspace_members
drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
  for select using (is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members
  for insert with check (is_workspace_owner_or_admin(workspace_id));

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members
  for delete using (is_workspace_owner_or_admin(workspace_id));

-- dashboard_widgets: catálogo público (solo lectura)
drop policy if exists dashboard_widgets_select on public.dashboard_widgets;
create policy dashboard_widgets_select on public.dashboard_widgets
  for select using (auth.role() = 'authenticated');
-- Sin insert/update/delete policy pública - catálogo controlado por seed/service role

-- dashboard_layouts
drop policy if exists dashboard_layouts_select on public.dashboard_layouts;
create policy dashboard_layouts_select on public.dashboard_layouts
  for select using (is_workspace_member(workspace_id));

drop policy if exists dashboard_layouts_insert on public.dashboard_layouts;
create policy dashboard_layouts_insert on public.dashboard_layouts
  for insert with check (is_workspace_owner_or_admin(workspace_id));

drop policy if exists dashboard_layouts_update on public.dashboard_layouts;
create policy dashboard_layouts_update on public.dashboard_layouts
  for update using (is_workspace_owner_or_admin(workspace_id));

drop policy if exists dashboard_layouts_delete on public.dashboard_layouts;
create policy dashboard_layouts_delete on public.dashboard_layouts
  for delete using (is_workspace_owner_or_admin(workspace_id));

-- dashboard_templates
drop policy if exists dashboard_templates_select on public.dashboard_templates;
create policy dashboard_templates_select on public.dashboard_templates
  for select using (auth.role() = 'authenticated' and (is_public = true or created_by = auth.uid()));

drop policy if exists dashboard_templates_insert on public.dashboard_templates;
create policy dashboard_templates_insert on public.dashboard_templates
  for insert with check (
    auth.role() = 'authenticated'
    and is_system = false
    and created_by = auth.uid()
  );

drop policy if exists dashboard_templates_update on public.dashboard_templates;
create policy dashboard_templates_update on public.dashboard_templates
  for update using (created_by = auth.uid() and is_system = false);

drop policy if exists dashboard_templates_delete on public.dashboard_templates;
create policy dashboard_templates_delete on public.dashboard_templates
  for delete using (created_by = auth.uid() and is_system = false);

-- dashboard_settings
drop policy if exists dashboard_settings_select on public.dashboard_settings;
create policy dashboard_settings_select on public.dashboard_settings
  for select using (is_workspace_member(workspace_id));

drop policy if exists dashboard_settings_insert on public.dashboard_settings;
create policy dashboard_settings_insert on public.dashboard_settings
  for insert with check (is_workspace_owner_or_admin(workspace_id));

drop policy if exists dashboard_settings_update on public.dashboard_settings;
create policy dashboard_settings_update on public.dashboard_settings
  for update using (is_workspace_owner_or_admin(workspace_id));

-- ============================================
-- 11. INDEXES (re-run safe)
-- ============================================
create index if not exists dashboard_layouts_workspace_id_idx
  on public.dashboard_layouts(workspace_id);
create index if not exists dashboard_layouts_position_idx
  on public.dashboard_layouts(position);
create index if not exists dashboard_templates_slug_idx
  on public.dashboard_templates(slug);
create index if not exists dashboard_settings_workspace_id_idx
  on public.dashboard_settings(workspace_id);
create index if not exists workspace_members_user_idx
  on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_idx
  on public.workspace_members(workspace_id);

-- ============================================
-- 12. SEED DATA (re-run safe con upsert)
-- ============================================

-- Widgets catalog (5 tipos)
insert into public.dashboard_widgets (type, title, description, icon, allowed_data_sources, allowed_metrics, config_schema)
values ('KPI_CARD', 'KPI Card', 'Métrica simple con título y valor', 'trending-up',
  array['leads', 'companies', 'opportunities', 'tasks', 'projects', 'proposals'],
  array['count', 'sum', 'average', 'pipeline_value'],
  '{"dateRange": {"type": "string"}, "format": {"type": "string", "enum": ["number", "currency", "percentage"]}}'::jsonb)
on conflict (type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  allowed_data_sources = excluded.allowed_data_sources, allowed_metrics = excluded.allowed_metrics,
  config_schema = excluded.config_schema, is_active = true;

insert into public.dashboard_widgets (type, title, description, icon, allowed_data_sources, allowed_metrics, config_schema)
values ('BAR_CHART', 'Bar Chart', 'Gráfico de barras para comparar valores', 'bar-chart-2',
  array['leads', 'companies', 'opportunities', 'tasks', 'projects', 'proposals'],
  array['count', 'sum', 'average', 'grouped_by_source', 'grouped_by_status', 'grouped_by_month'],
  '{"color": {"type": "string"}, "showLegend": {"type": "boolean"}}'::jsonb)
on conflict (type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  allowed_data_sources = excluded.allowed_data_sources, allowed_metrics = excluded.allowed_metrics,
  config_schema = excluded.config_schema, is_active = true;

insert into public.dashboard_widgets (type, title, description, icon, allowed_data_sources, allowed_metrics, config_schema)
values ('DONUT_CHART', 'Donut Chart', 'Gráfico de dona para proporciones', 'pie-chart',
  array['leads', 'companies', 'opportunities', 'tasks', 'projects', 'proposals'],
  array['count', 'sum', 'grouped_by_source', 'grouped_by_status'],
  '{"innerRadius": {"type": "number"}, "showLegend": {"type": "boolean"}}'::jsonb)
on conflict (type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  allowed_data_sources = excluded.allowed_data_sources, allowed_metrics = excluded.allowed_metrics,
  config_schema = excluded.config_schema, is_active = true;

insert into public.dashboard_widgets (type, title, description, icon, allowed_data_sources, allowed_metrics, config_schema)
values ('FUNNEL_CHART', 'Funnel Chart', 'Embudo de conversión de pipeline', 'filter',
  array['leads', 'opportunities'],
  array['count', 'pipeline_value', 'conversion_funnel'],
  '{"showLabels": {"type": "boolean"}, "showConversion": {"type": "boolean"}}'::jsonb)
on conflict (type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  allowed_data_sources = excluded.allowed_data_sources, allowed_metrics = excluded.allowed_metrics,
  config_schema = excluded.config_schema, is_active = true;

insert into public.dashboard_widgets (type, title, description, icon, allowed_data_sources, allowed_metrics, config_schema)
values ('LIST_WIDGET', 'List Widget', 'Lista de tareas o actividades recientes', 'list',
  array['tasks', 'activities'],
  array['count'],
  '{"itemType": {"type": "string", "enum": ["tasks", "activities"]}, "limit": {"type": "number", "default": 8}}'::jsonb)
on conflict (type) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  allowed_data_sources = excluded.allowed_data_sources, allowed_metrics = excluded.allowed_metrics,
  config_schema = excluded.config_schema, is_active = true;

-- System template: maite-media-agency (replica dashboard actual 1:1)
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_system, is_public, config_json, created_by)
values (
  'Maite Media Agency Dashboard',
  'maite-media-agency',
  1,
  'Dashboard predefinido para agencia de medios digitales - replica dashboard actual',
  'digital_marketing',
  true,
  true,
  '{
    "widgets": [
      {"instance_key": "leads_new_7d",     "widget_type": "KPI_CARD",    "title_override": "Leads nuevos",         "data_source": "leads",         "metric": "count",            "size": "small",  "position": 0, "config_json": {"dateRange": "7d"}},
      {"instance_key": "active_opps",       "widget_type": "KPI_CARD",    "title_override": "Oportunidades activas", "data_source": "opportunities",  "metric": "count",            "size": "small",  "position": 1, "config_json": {}},
      {"instance_key": "pending_tasks",    "widget_type": "KPI_CARD",    "title_override": "Tareas pendientes",   "data_source": "tasks",         "metric": "count",            "size": "small",  "position": 2, "config_json": {}},
      {"instance_key": "pipeline_value",    "widget_type": "KPI_CARD",    "title_override": "Valor pipeline",      "data_source": "opportunities",  "metric": "pipeline_value",   "size": "small",  "position": 3, "config_json": {"format": "currency"}},
      {"instance_key": "revenue_evolution", "widget_type": "BAR_CHART",   "title_override": "Evolución de ingresos", "data_source": "opportunities",  "metric": "grouped_by_month", "size": "large",  "position": 4, "config_json": {"color": "#E31E24"}},
      {"instance_key": "leads_by_source",   "widget_type": "DONUT_CHART", "title_override": "Leads por fuente",    "data_source": "leads",         "metric": "grouped_by_source","size": "medium", "position": 5, "config_json": {}},
      {"instance_key": "conversion_funnel", "widget_type": "FUNNEL_CHART","title_override": "Funnel de conversión","data_source": "opportunities",  "metric": "conversion_funnel","size": "large",  "position": 6, "config_json": {}},
      {"instance_key": "recent_tasks",      "widget_type": "LIST_WIDGET", "title_override": "Tareas recientes",    "data_source": "tasks",         "metric": "count",            "size": "medium", "position": 7, "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "recent_activities", "widget_type": "LIST_WIDGET", "title_override": "Actividades recientes","data_source": "activities",    "metric": "count",            "size": "medium", "position": 8, "config_json": {"itemType": "activities", "limit": 10}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_system = excluded.is_system,
  is_public = excluded.is_public,
  config_json = excluded.config_json;