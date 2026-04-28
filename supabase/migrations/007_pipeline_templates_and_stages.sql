-- ============================================
-- Pipeline Templates and Workspace-Scoped Stages
-- Migration v7 (CORREGIDA)
-- 007_pipeline_templates_and_stages.sql
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 0. PRE-MIGRATION CHECK
-- ============================================

do $$
declare
  workspace_count integer;
begin
  select count(*) into workspace_count from public.workspaces;
  raise notice 'Workspaces encontrados: %', workspace_count;
end $$;

-- ============================================
-- 1. ALTER pipeline_stages - AGREGAR COLUMNAS
-- ============================================

alter table public.pipeline_stages
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.pipeline_stages
  add column if not exists stage_key text;

alter table public.pipeline_stages
  add column if not exists description text;

alter table public.pipeline_stages
  add column if not exists probability integer default 0;

alter table public.pipeline_stages
  add column if not exists is_active boolean default true;

alter table public.pipeline_stages
  add column if not exists is_default boolean default false;

alter table public.pipeline_stages
  add column if not exists config_json jsonb default '{}'::jsonb;

alter table public.pipeline_stages
  add column if not exists updated_at timestamptz default now();

-- Constraint check para probability (re-run safe)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'pipeline_stages_probability_check'
  ) then
    alter table public.pipeline_stages
      add constraint pipeline_stages_probability_check
      check (probability >= 0 and probability <= 100);
  end if;
end $$;

-- ============================================
-- 2. CREAR tabla pipeline_templates
-- ============================================

create table if not exists public.pipeline_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  industry text,
  description text,
  schema_version integer default 1,
  is_system boolean default false,
  is_public boolean default true,
  config_json jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 3. CREAR tabla pipeline_settings
-- ============================================

create table if not exists public.pipeline_settings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  active_template_id uuid references public.pipeline_templates(id) on delete set null,
  config_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 4. ÍNDICES
-- ============================================

-- Índices para pipeline_stages
create index if not exists pipeline_stages_workspace_idx
  on public.pipeline_stages(workspace_id);

create index if not exists pipeline_stages_workspace_position_idx
  on public.pipeline_stages(workspace_id, position);

-- Unique parcial para stage_key (solo donde workspace_id no es null)
create unique index if not exists pipeline_stages_workspace_stage_key_unique
  on public.pipeline_stages(workspace_id, stage_key)
  where workspace_id is not null and stage_key is not null;

-- Índices para pipeline_templates
create index if not exists pipeline_templates_slug_idx
  on public.pipeline_templates(slug);

create index if not exists pipeline_templates_industry_idx
  on public.pipeline_templates(industry);

-- Índices para pipeline_settings
create index if not exists pipeline_settings_workspace_idx
  on public.pipeline_settings(workspace_id);

-- ============================================
-- 5. ENABLE RLS (explícito)
-- ============================================

alter table public.pipeline_stages enable row level security;
alter table public.pipeline_templates enable row level security;
alter table public.pipeline_settings enable row level security;

-- ============================================
-- 6. TRIGGERS updated_at
-- ============================================

-- pipeline_stages (CORREGIDO: faltaba este trigger)
drop trigger if exists pipeline_stages_updated_at on public.pipeline_stages;
create trigger pipeline_stages_updated_at
  before update on public.pipeline_stages
  for each row execute function public.handle_updated_at();

-- pipeline_templates
drop trigger if exists pipeline_templates_updated_at on public.pipeline_templates;
create trigger pipeline_templates_updated_at
  before update on public.pipeline_templates
  for each row execute function public.handle_updated_at();

-- pipeline_settings
drop trigger if exists pipeline_settings_updated_at on public.pipeline_settings;
create trigger pipeline_settings_updated_at
  before update on public.pipeline_settings
  for each row execute function public.handle_updated_at();

-- Actualizar updated_at en rows que no lo tengan
update public.pipeline_stages set updated_at = now() where updated_at is null;

-- ============================================
-- 7. ACTUALIZAR stage_key EN stages EXISTENTES
-- CORREGIDO: stage_key legacy único para evitar colisiones
-- ============================================

-- Para stages existentes (legacy), generar stage_key único con prefijo 'legacy_'
update public.pipeline_stages
set stage_key = 'legacy_'
  || lower(
      regexp_replace(
        regexp_replace(name, '[^a-zA-Z0-9_]', '_', 'g'),
        '_+', '_', 'g'
      )
    )
  || '_'
  || substring(id::text, 1, 8)
where stage_key is null;

-- Actualizar probability según nombre de etapa (heurística)
update public.pipeline_stages
set probability = case
  when name ilike '%nuevo%lead%interesad%prospect%' then 10
  when name ilike '%contactad%calificado%' then 25
  when name ilike '%diagnostico%requerimiento%entendido%visita%' then 40
  when name ilike '%propuesta%presupuesto%cotizacion%' then 55
  when name ilike '%negociacion%aprobado%reserva%' then 75
  when name ilike '%ganado%cerrado%inscripto%entregado%activo%' then 100
  when name ilike '%perdido%cancelado%no asist%' then 0
  else 50
end
where probability = 0;

-- ============================================
-- 8. MIGRACIÓN SEGUURA DE stages EXISTENTES
-- ============================================

do $$
declare
  workspace_count integer;
  first_workspace_id uuid;
  stage_count integer;
begin
  select count(*), (select id from public.workspaces limit 1)
  into workspace_count, first_workspace_id
  from public.workspaces;

  if workspace_count = 1 and first_workspace_id is not null then
    -- UN solo workspace: asignar todos los stages existentes a ese workspace
    update public.pipeline_stages
    set workspace_id = first_workspace_id,
        is_active = true,
        is_default = true
    where workspace_id is null;

    raise notice 'Migración automática: 1 workspace detectado. Stages asignados a workspace %', first_workspace_id;

    select count(*) into stage_count from public.pipeline_stages where workspace_id = first_workspace_id;
    raise notice 'Stages migrados: %', stage_count;

  elsif workspace_count > 1 then
    raise notice 'MIGRACIÓN MANUAL REQUERIDA: % workspaces detectados. No se asignaron stages automáticamente.', workspace_count;
    raise notice 'Los stages existentes mantienen workspace_id = null (no visibles para usuarios normales).';
    raise notice 'Se recomienda aplicar templates por workspace desde la UI.';

  else
    raise notice 'No se detectaron workspaces. Stages permanecerán sin workspace_id temporalmente.';
  end if;
end $$;

-- ============================================
-- 9. CREAR pipeline_settings INICIAL PARA WORKSPACES EXISTENTES
-- ============================================

insert into public.pipeline_settings (workspace_id, active_template_id, config_json)
select id, null, '{}'::jsonb
from public.workspaces
on conflict (workspace_id) do nothing;

-- ============================================
-- 10. SEED: TEMPLATES DE PIPELINE
-- Los templates system tienen created_by = null porque se插入 via SQL directo,
-- no a nombre de un usuario. Las policies de RLS no permiten insertar system templates.
-- ============================================

-- ============================================
-- 10a. AGENCY PIPELINE (11 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Agency Pipeline',
  'agency-pipeline',
  'agency',
  'Pipeline comercial para agencias digitales, consultoras y profesionales. 11 etapas desde lead nuevo hasta cliente activo.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "agency_new_lead",          "name": "Lead nuevo",             "description": "Nuevo contacto recibido",                  "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "agency_contacted",           "name": "Contactado",              "description": "Primer contacto realizado",                "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_diagnosis_pending",  "name": "Diagnóstico pendiente",   "description": "Esperando completar diagnóstico",           "position": 3,  "probability": 30,  "color": "#a78bfa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_diagnosis_done",     "name": "Diagnóstico realizado",   "description": "Diagnóstico completado, esperando propuesta","position": 4, "probability": 50, "color": "#8b5cf6", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_proposal_pending",   "name": "Propuesta pendiente",    "description": "Preparando propuesta comercial",           "position": 5,  "probability": 55,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_proposal_sent",      "name": "Propuesta enviada",       "description": "Propuesta presentada al cliente",        "position": 6,  "probability": 60,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_negotiation",        "name": "Negociación",             "description": "En etapa de negociación y cierre",        "position": 7,  "probability": 80,  "color": "#fb923c", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_won",                "name": "Ganado",                   "description": "Oportunidad cerrada exitosamente",        "position": 8,  "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "agency_onboarding",         "name": "Onboarding",              "description": "Iniciando relación con el cliente",      "position": 9,  "probability": 100, "color": "#16a34a", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_client_active",      "name": "Cliente activo",         "description": "Cliente en producción/contrato activo",   "position": 10, "probability": 100, "color": "#15803d", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "agency_lost",               "name": "Perdido",                 "description": "Oportunidad perdida o descartada",        "position": 11, "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10b. GENERIC SERVICES PIPELINE (10 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Generic Services Pipeline',
  'generic-services-pipeline',
  'services',
  'Pipeline genérico para negocios de servicios. 10 etapas desde lead hasta finalización.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "generic_new_lead",          "name": "Nuevo lead",              "description": "Lead recién recibido",                    "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "generic_contacted",          "name": "Contactado",               "description": "Contacto inicial realizado",              "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_requirement_understood","name": "Requerimiento entendido","description": "Necesidad del cliente comprendida",        "position": 3,  "probability": 40,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_budget_pending",     "name": "Presupuesto pendiente",   "description": "Preparando presupuesto",                  "position": 4,  "probability": 50,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_budget_sent",        "name": "Presupuesto enviado",     "description": "Presupuesto presentado al cliente",       "position": 5,  "probability": 60,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_negotiation",       "name": "En negociación",          "description": "Negociando términos y condiciones",       "position": 6,  "probability": 75,  "color": "#fb923c", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_approved",           "name": "Aprobado",                "description": "Presupuesto aprobado, iniciando servicio", "position": 7, "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "generic_in_execution",       "name": "En ejecución",            "description": "Servicio en curso",                       "position": 8,  "probability": 100, "color": "#16a34a", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_finished",           "name": "Finalizado",              "description": "Servicio entregado y cerrado",           "position": 9,  "probability": 100, "color": "#15803d", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "generic_lost",               "name": "Perdido",                 "description": "Lead perdido o descartado",             "position": 10, "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10c. REAL ESTATE PIPELINE (9 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Real Estate Pipeline',
  'real-estate-pipeline',
  'real_estate',
  'Pipeline para inmobiliarias y corredores. 9 etapas desde interés inicial hasta cierre de operación.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "re_new_interest",        "name": "Nuevo interesado",         "description": "Contacto de interés en propiedad",        "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "re_qualified",            "name": "Calificado",               "description": "Interesado verificado y calificado",      "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_property_sent",       "name": "Propiedad enviada",        "description": "Opciones de propiedad enviadas",          "position": 3,  "probability": 35,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_visit_scheduled",      "name": "Visita agendada",          "description": "Visita a propiedad programada",          "position": 4,  "probability": 50,  "color": "#a78bfa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_visit_done",           "name": "Visita realizada",         "description": "Visita a propiedad completada",          "position": 5,  "probability": 60,  "color": "#8b5cf6", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_offer_reservation",   "name": "Oferta / Reserva",         "description": "Oferta o reserva de inmueble",            "position": 6,  "probability": 75,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_documentation",       "name": "Documentación",            "description": "Trámites y documentación legal",         "position": 7,  "probability": 85,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "re_won",                 "name": "Cierre ganado",            "description": "Operación cerrada exitosamente",         "position": 8,  "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "re_lost",                "name": "Perdido",                  "description": "Operación perdida o cliente perdido",    "position": 9,  "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10d. CLINIC PIPELINE (9 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Clinic Pipeline',
  'clinic-pipeline',
  'healthcare',
  'Pipeline para clínicas y consultorios médicos. 9 etapas desde paciente nuevo hasta seguimiento post-tratamiento.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "clinic_new_patient",      "name": "Nuevo paciente/interesado","description": "Nuevo contacto o paciente registrado",   "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "clinic_contacted",        "name": "Contactado",               "description": "Contacto inicial realizado",           "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_appointment_scheduled","name": "Turno agendado",        "description": "Turno o cita programada",              "position": 3,  "probability": 40,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_consultation_done", "name": "Consulta realizada",       "description": "Consulta o intervención completada",   "position": 4,  "probability": 55,  "color": "#a78bfa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_plan_indicated",    "name": "Plan indicado",           "description": "Plan de tratamiento definido",          "position": 5,  "probability": 65,  "color": "#8b5cf6", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_followup_pending",  "name": "Seguimiento pendiente",   "description": "Esperando respuesta o próximo paso",    "position": 6,  "probability": 50,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_patient_active",    "name": "Paciente activo",         "description": "Paciente en tratamiento activo",        "position": 7,  "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "clinic_finished",          "name": "Finalizado",              "description": "Tratamiento o proceso completado",      "position": 8,  "probability": 100, "color": "#15803d", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "clinic_lost",             "name": "No asistió / perdido",     "description": "Paciente inactivo o perdido",          "position": 9,  "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10e. ACADEMY PIPELINE (10 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Academy / Course Pipeline',
  'academy-pipeline',
  'education',
  'Pipeline para academias y cursos. 10 etapas desde interesado hasta alumno activo.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "ac_new_interest",         "name": "Nuevo interesado",        "description": "Contacto nuevo recibido",                "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "ac_contacted",            "name": "Contactado",               "description": "Contacto inicial realizado",           "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_info_sent",            "name": "Información enviada",      "description": "Material informativo enviado",         "position": 3,  "probability": 35,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_orientation_done",      "name": "Orientación realizada",   "description": "Orientación vocacional o de cursos",  "position": 4,  "probability": 50,  "color": "#a78bfa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_demo_class",           "name": "Clase demo / entrevista", "description": "Clase muestra o entrevista de admisión",  "position": 5,  "probability": 60,  "color": "#8b5cf6", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_enrollment_pending",   "name": "Inscripción pendiente",   "description": "Proceso de inscripción en curso",       "position": 6,  "probability": 70,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_payment_pending",      "name": "Pago pendiente",          "description": "Esperando confirmación de pago",       "position": 7,  "probability": 75,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_enrolled",             "name": "Inscripto",               "description": "Inscripción confirmada",                 "position": 8,  "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "ac_student_active",        "name": "Alumno activo",          "description": "Estudiante activo en curso",            "position": 9,  "probability": 100, "color": "#16a34a", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ac_lost",                 "name": "Perdido",                  "description": "Interesado perdido o descartado",      "position": 10, "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10f. TECHNICAL SERVICE PIPELINE (9 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Technical Service Pipeline',
  'technical-service-pipeline',
  'technical_service',
  'Pipeline para talleres y servicios técnicos. 9 etapas desde solicitud hasta entrega.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "tech_new_request",        "name": "Nueva solicitud",          "description": "Solicitud de servicio recibida",         "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "tech_diagnosis_pending",  "name": "Diagnóstico pendiente",    "description": "Equipo recibido, esperando diagnóstico","position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_diagnosis_done",     "name": "Diagnóstico realizado",   "description": "Diagnóstico completado",               "position": 3,  "probability": 45,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_quote_sent",          "name": "Presupuesto enviado",    "description": "Presupuesto enviado al cliente",       "position": 4,  "probability": 55,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_approved",            "name": "Aprobado",                "description": "Presupuesto aprobado por el cliente",  "position": 5,  "probability": 80,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_in_repair",           "name": "En reparación / ejecución","description": "Trabajo en curso",                      "position": 6,  "probability": 85,  "color": "#fb923c", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_ready_delivery",      "name": "Listo para entrega",      "description": "Reparación completada, listo para entregar","position": 7, "probability": 95, "color": "#22c55e", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "tech_delivered",           "name": "Entregado",               "description": "Equipo entregado al cliente",           "position": 8,  "probability": 100, "color": "#15803d", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "tech_cancelled",           "name": "Cancelado / perdido",    "description": "Servicio cancelado o perdido",         "position": 9,  "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 10g. RETAIL PIPELINE (9 stages)
-- ============================================
insert into public.pipeline_templates (name, slug, industry, description, is_system, is_public, config_json, created_by)
values (
  'Retail / Commerce Pipeline',
  'retail-pipeline',
  'retail',
  'Pipeline para comercios y tiendas. 9 etapas desde prospecto hasta postventa.',
  true,
  true,
  '{
    "stages": [
      {"stage_key": "ret_new_prospect",        "name": "Nuevo prospecto",         "description": "Prospecto nuevo identificado",          "position": 1,  "probability": 10,  "color": "#94a3b8", "is_won": false, "is_lost": false, "is_default": true},
      {"stage_key": "ret_contacted",           "name": "Contactado",               "description": "Contacto inicial realizado",             "position": 2,  "probability": 25,  "color": "#60a5fa", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_product_recommended", "name": "Producto recomendado",    "description": "Producto o servicio recomendado",       "position": 3,  "probability": 40,  "color": "#818cf8", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_quote_sent",          "name": "Cotización enviada",      "description": "Cotización o presupuesto enviado",       "position": 4,  "probability": 55,  "color": "#f59e0b", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_order_pending",       "name": "Pedido pendiente",        "description": "Pedido realizado, esperando confirmación","position": 5,  "probability": 65,  "color": "#f97316", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_payment_pending",     "name": "Pago pendiente",          "description": "Esperando confirmación de pago",        "position": 6,  "probability": 75,  "color": "#fb923c", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_sale_closed",         "name": "Venta cerrada",           "description": "Venta concretada exitosamente",         "position": 7,  "probability": 100, "color": "#22c55e", "is_won": true,  "is_lost": false, "is_default": false},
      {"stage_key": "ret_after_sale",          "name": "Postventa",              "description": "Seguimiento post-venta",                "position": 8,  "probability": 100, "color": "#16a34a", "is_won": false, "is_lost": false, "is_default": false},
      {"stage_key": "ret_lost",                "name": "Perdido",                  "description": "Prospecto perdido o descartado",       "position": 9,  "probability": 0,   "color": "#ef4444", "is_won": false, "is_lost": true,  "is_default": false}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description,
  is_system = excluded.is_system,
  config_json = excluded.config_json;

-- ============================================
-- 11. RLS — pipeline_stages (workspace-scoped)
-- CORREGIDO: sintaxis correcta DROP POLICY ... ON ...
-- ============================================

drop policy if exists pipeline_stages_select on public.pipeline_stages;
drop policy if exists pipeline_stages_insert on public.pipeline_stages;
drop policy if exists pipeline_stages_update on public.pipeline_stages;
drop policy if exists pipeline_stages_delete on public.pipeline_stages;

-- SELECT: miembros del workspace. Stages con workspace_id=null no visibles.
create policy pipeline_stages_select on public.pipeline_stages
  for select
  using (is_workspace_member(workspace_id));

-- INSERT: solo owner/admin del workspace (workspace_id obligatorio)
create policy pipeline_stages_insert on public.pipeline_stages
  for insert
  with check (is_workspace_owner_or_admin(workspace_id));

-- UPDATE: solo owner/admin del workspace
create policy pipeline_stages_update on public.pipeline_stages
  for update
  using (is_workspace_owner_or_admin(workspace_id));

-- DELETE: solo owner/admin del workspace Y sin oportunidades asociadas
-- CORREGIDO: DELETE usa USING, no WITH CHECK
create policy pipeline_stages_delete on public.pipeline_stages
  for delete
  using (
    is_workspace_owner_or_admin(workspace_id)
    and not exists (
      select 1 from public.opportunities
      where opportunities.stage_id = pipeline_stages.id
    )
  );

-- ============================================
-- 12. RLS — pipeline_templates
-- CORREGIDO: sintaxis DROP POLICY ... ON ...
-- ============================================

drop policy if exists pipeline_templates_select on public.pipeline_templates;
drop policy if exists pipeline_templates_insert on public.pipeline_templates;
drop policy if exists pipeline_templates_update on public.pipeline_templates;
drop policy if exists pipeline_templates_delete on public.pipeline_templates;

-- SELECT: templates públicos o creados por el usuario
create policy pipeline_templates_select on public.pipeline_templates
  for select
  using (
    is_public = true
    or created_by = auth.uid()
  );

-- INSERT: usuario authenticated puede crear sus propios templates (no system)
create policy pipeline_templates_insert on public.pipeline_templates
  for insert
  with check (
    auth.role() = 'authenticated'
    and is_system = false
    and created_by = auth.uid()
  );

-- UPDATE: solo el creador. No se puede cambiar is_system a true.
create policy pipeline_templates_update on public.pipeline_templates
  for update
  using (created_by = auth.uid())
  with check (is_system = false);

-- DELETE: solo el creador, y no system templates
create policy pipeline_templates_delete on public.pipeline_templates
  for delete
  using (
    created_by = auth.uid()
    and is_system = false
  );

-- ============================================
-- 13. RLS — pipeline_settings
-- CORREGIDO: sintaxis DROP POLICY ... ON ...
-- ============================================

drop policy if exists pipeline_settings_select on public.pipeline_settings;
drop policy if exists pipeline_settings_insert on public.pipeline_settings;
drop policy if exists pipeline_settings_update on public.pipeline_settings;
drop policy if exists pipeline_settings_delete on public.pipeline_settings;

-- SELECT: cualquier miembro del workspace
create policy pipeline_settings_select on public.pipeline_settings
  for select
  using (is_workspace_member(workspace_id));

-- INSERT: solo owner/admin del workspace
create policy pipeline_settings_insert on public.pipeline_settings
  for insert
  with check (is_workspace_owner_or_admin(workspace_id));

-- UPDATE: solo owner/admin del workspace
create policy pipeline_settings_update on public.pipeline_settings
  for update
  using (is_workspace_owner_or_admin(workspace_id));

-- DELETE: solo owner/admin del workspace
create policy pipeline_settings_delete on public.pipeline_settings
  for delete
  using (is_workspace_owner_or_admin(workspace_id));

-- ============================================
-- 14. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

do $$
declare
  ws_count integer;
  stage_count integer;
  template_count integer;
begin
  select count(*) into ws_count from public.workspaces;
  select count(*) into stage_count from public.pipeline_stages;
  select count(*) into template_count from public.pipeline_templates;

  raise notice '=== POST-MIGRATION REPORT ===';
  raise notice 'Workspaces: %', ws_count;
  raise notice 'Stages en pipeline_stages: %', stage_count;
  raise notice 'Stages con workspace_id: %', (select count(*) from public.pipeline_stages where workspace_id is not null);
  raise notice 'Stages sin workspace_id (legacy): %', (select count(*) from public.pipeline_stages where workspace_id is null);
  raise notice 'Templates en pipeline_templates: %', template_count;
  raise notice 'pipeline_settings creados: %', (select count(*) from public.pipeline_settings);

  -- Advertir si hay stages sin workspace_id (posible multi-workspace)
  if (select count(*) from public.pipeline_stages where workspace_id is null) > 0 then
    raise warning 'ATENCIÓN: Hay % stages sin workspace_id (legacy).', (select count(*) from public.pipeline_stages where workspace_id is null);
  end if;

  -- Advertir si hay oportunidades huérfanas
  if (select count(*) from public.opportunities o where not exists (select 1 from public.pipeline_stages ps where ps.id = o.stage_id)) > 0 then
    raise warning 'ATENCIÓN: Hay oportunidades con stage_id que no existe en pipeline_stages.';
  end if;
end $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
-- Correcciones aplicadas vs versión anterior:
-- 1. DROP POLICY: Sintaxis correcta "drop policy if exists X on table"
-- 2. ENABLE RLS: Explicitado en las 3 tablas
-- 3. TRIGGER pipeline_stages: Agregado trigger updated_at
-- 4. stage_key legacy: Prefijo 'legacy_' + substring(id,1,8) para unicidad
-- 5. pipeline_settings inicial: Insert para workspaces existentes
-- 6. created_by en templates: null para system templates (seed via SQL, no user)
--
-- Esta migración:
-- 1. Agrega columnas a pipeline_stages (workspace_id, stage_key, description, probability, is_active, is_default, config_json, updated_at)
-- 2. Crea tabla pipeline_templates (7 templates system)
-- 3. Crea tabla pipeline_settings (1 por workspace)
-- 4. Crea índices para búsqueda eficiente
-- 5. Habilita RLS explícitamente en las 3 tablas
-- 6. Agrega triggers updated_at en las 3 tablas
-- 7. Migra stages existentes (1 workspace = asignar, múltiples = no tocar)
-- 8. Inserta 7 templates de pipeline con stages validados
-- 9. Crea pipeline_settings inicial para workspaces existentes
-- 10. Establece RLS workspace-scoped para pipeline_stages (correcto con USING)
-- 11. Establece RLS para pipeline_templates
-- 12. Establece RLS para pipeline_settings
--
-- PROTECCIÓN DE OPORTUNIDADES:
-- - DELETE policy usa USING con exists check
-- - No se eliminan stages existentes
-- - opportunities.stage_id sigue referencing correctamente
--
-- PRÓXIMOS PASOS (FASE 2):
-- - Server actions workspace-scoped para CRUD de stages
-- - Pipeline Builder UI en Settings
-- - Integración con kanban-board