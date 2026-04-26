-- ============================================
-- MAITE CRM Core - Migración inicial
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. EXTENSIÓN Y TABLAS BASE (Section 4.1)
-- ============================================

-- Extensión para UUID
create extension if not exists "uuid-ossp";

-- Tabla de perfiles de usuario (extiende auth.users de Supabase)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  role text default 'viewer' check (role in ('admin', 'commercial', 'production', 'viewer')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Empresas / clientes
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  industry text,
  website text,
  instagram text,
  facebook text,
  phone text,
  email text,
  address text,
  size text check (size in ('1-5', '6-20', '21-100', '100+')),
  status text default 'prospect' check (status in ('prospect', 'active', 'paused', 'lost')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contactos / leads individuales
create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  whatsapp text,
  company_id uuid references public.companies(id) on delete set null,
  position text,
  source text check (source in ('web', 'whatsapp', 'linkedin', 'referral', 'ad', 'call', 'other')),
  interest_level text default 'cold' check (interest_level in ('cold', 'warm', 'hot')),
  estimated_budget numeric,
  notes text,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Etapas del pipeline (configurables)
create table public.pipeline_stages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  position integer not null,
  color text default '#6366f1',
  is_won boolean default false,
  is_lost boolean default false,
  created_at timestamptz default now()
);

-- Servicios / productos
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  base_price numeric,
  type text check (type in ('one_time', 'monthly', 'recurring')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Oportunidades comerciales (corazón del pipeline)
create table public.opportunities (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  stage_id uuid references public.pipeline_stages(id),
  estimated_value numeric,
  close_probability integer check (close_probability between 0 and 100),
  expected_close_date date,
  assigned_to uuid references public.profiles(id),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tareas
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  due_date timestamptz,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'done', 'overdue')),
  assigned_to uuid references public.profiles(id),
  contact_id uuid references public.contacts(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Actividades / historial (línea de tiempo)
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('note', 'call', 'email', 'whatsapp', 'meeting', 'stage_change', 'task_created', 'proposal_sent', 'system')),
  description text not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Proyectos (cuando una oportunidad se marca como ganada)
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  company_id uuid references public.companies(id),
  contact_id uuid references public.contacts(id),
  service_id uuid references public.services(id),
  status text default 'pending_onboarding' check (status in (
    'pending_onboarding', 'waiting_materials', 'in_production',
    'in_review', 'delivered', 'completed', 'in_maintenance'
  )),
  start_date date,
  estimated_end_date date,
  assigned_to uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ============================================
-- 2. DATOS INICIALES / SEED (Section 4.2)
-- ============================================

-- Etapas del pipeline por defecto
insert into public.pipeline_stages (name, position, color) values
  ('Lead nuevo', 1, '#94a3b8'),
  ('Contactado', 2, '#60a5fa'),
  ('Diagnóstico pendiente', 3, '#a78bfa'),
  ('Propuesta enviada', 4, '#f59e0b'),
  ('Negociación', 5, '#f97316'),
  ('Ganado', 6, '#22c55e'),
  ('Perdido', 7, '#ef4444');

update public.pipeline_stages set is_won = true where name = 'Ganado';
update public.pipeline_stages set is_lost = true where name = 'Perdido';

-- Servicios por defecto para Maite Media
insert into public.services (name, type, base_price) values
  ('Auditoría digital', 'one_time', 150000),
  ('Diseño de landing page', 'one_time', 500000),
  ('Diseño de sitio web', 'one_time', 1200000),
  ('Gestión de anuncios Meta Ads', 'monthly', 350000),
  ('Bot de WhatsApp', 'one_time', 800000),
  ('CRM personalizado', 'one_time', 2000000),
  ('Consultoría digital', 'one_time', 200000);


-- ============================================
-- 3. ROW LEVEL SECURITY (Section 4.3)
-- ============================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunities enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.services enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.projects enable row level security;

-- ---------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------
create policy "companies_select" on public.companies for select using (auth.role() = 'authenticated');
create policy "companies_insert" on public.companies for insert with check (auth.role() = 'authenticated');
create policy "companies_update" on public.companies for update using (auth.role() = 'authenticated');
create policy "companies_delete" on public.companies for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- CONTACTS
-- ---------------------------------------------------------
create policy "contacts_select" on public.contacts for select using (auth.role() = 'authenticated');
create policy "contacts_insert" on public.contacts for insert with check (auth.role() = 'authenticated');
create policy "contacts_update" on public.contacts for update using (auth.role() = 'authenticated');
create policy "contacts_delete" on public.contacts for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- OPPORTUNITIES
-- ---------------------------------------------------------
create policy "opportunities_select" on public.opportunities for select using (auth.role() = 'authenticated');
create policy "opportunities_insert" on public.opportunities for insert with check (auth.role() = 'authenticated');
create policy "opportunities_update" on public.opportunities for update using (auth.role() = 'authenticated');
create policy "opportunities_delete" on public.opportunities for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- PIPELINE_STAGES
-- ---------------------------------------------------------
create policy "pipeline_stages_select" on public.pipeline_stages for select using (auth.role() = 'authenticated');
create policy "pipeline_stages_insert" on public.pipeline_stages for insert with check (auth.role() = 'authenticated');
create policy "pipeline_stages_update" on public.pipeline_stages for update using (auth.role() = 'authenticated');
create policy "pipeline_stages_delete" on public.pipeline_stages for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------
create policy "services_select" on public.services for select using (auth.role() = 'authenticated');
create policy "services_insert" on public.services for insert with check (auth.role() = 'authenticated');
create policy "services_update" on public.services for update using (auth.role() = 'authenticated');
create policy "services_delete" on public.services for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------
create policy "tasks_select" on public.tasks for select using (auth.role() = 'authenticated');
create policy "tasks_insert" on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "tasks_update" on public.tasks for update using (auth.role() = 'authenticated');
create policy "tasks_delete" on public.tasks for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- ACTIVITIES
-- ---------------------------------------------------------
create policy "activities_select" on public.activities for select using (auth.role() = 'authenticated');
create policy "activities_insert" on public.activities for insert with check (auth.role() = 'authenticated');
create policy "activities_update" on public.activities for update using (auth.role() = 'authenticated');
create policy "activities_delete" on public.activities for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------
create policy "projects_select" on public.projects for select using (auth.role() = 'authenticated');
create policy "projects_insert" on public.projects for insert with check (auth.role() = 'authenticated');
create policy "projects_update" on public.projects for update using (auth.role() = 'authenticated');
create policy "projects_delete" on public.projects for delete using (auth.role() = 'authenticated');