-- ============================================
-- Dashboard Template Migration v5
-- 006_industry_dashboard_templates.sql
-- 5 Industry-Specific Dashboard Templates
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. REAL ESTATE CRM
-- Industry: real_estate
-- 10 widgets validados contra WidgetRegistry
-- ============================================
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Real Estate CRM',
  'real-estate-crm',
  1,
  'Dashboard para inmobiliarias, corredores y agencias de propiedades. Enfocado en interesados, visitas, oportunidades, reservas y valor comercial del pipeline.',
  'real_estate',
  true,
  '{
    "widgets": [
      {"instance_key": "real_estate_new_leads",        "widget_type": "KPI_CARD",     "title_override": "Nuevos Interesados",          "data_source": "leads",         "metric": "count",             "size": "small",  "position": 0,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "real_estate_property_clients",  "widget_type": "KPI_CARD",     "title_override": "Propiedades / Clientes Activos", "data_source": "companies",     "metric": "count",             "size": "small",  "position": 1,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "real_estate_pending_visits",    "widget_type": "KPI_CARD",     "title_override": "Visitas Pendientes",            "data_source": "tasks",         "metric": "count",             "size": "small",  "position": 2,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "real_estate_pipeline_value",     "widget_type": "KPI_CARD",     "title_override": "Valor en Negociación",          "data_source": "opportunities", "metric": "pipeline_value",    "size": "small",  "position": 3,  "config_json": {"dateRange": "7d", "format": "currency"}},
      {"instance_key": "real_estate_opps_by_month",     "widget_type": "BAR_CHART",    "title_override": "Oportunidades por Mes",         "data_source": "opportunities", "metric": "grouped_by_month",  "size": "large",  "position": 4,  "config_json": {"color": "#E31E24"}},
      {"instance_key": "real_estate_leads_by_source",   "widget_type": "DONUT_CHART",  "title_override": "Interesados por Origen",        "data_source": "leads",         "metric": "grouped_by_source", "size": "medium", "position": 5,  "config_json": {"innerRadius": 44}},
      {"instance_key": "real_estate_opps_by_status",    "widget_type": "DONUT_CHART",  "title_override": "Estado de Oportunidades",       "data_source": "opportunities", "metric": "grouped_by_status", "size": "medium", "position": 6,  "config_json": {"innerRadius": 44}},
      {"instance_key": "real_estate_conversion_funnel", "widget_type": "FUNNEL_CHART", "title_override": "Embudo Inmobiliario",          "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7,  "config_json": {}},
      {"instance_key": "real_estate_followup_tasks",    "widget_type": "LIST_WIDGET",  "title_override": "Seguimientos Pendientes",       "data_source": "tasks",         "metric": "count",             "size": "medium", "position": 8,  "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "real_estate_recent_activity",   "widget_type": "LIST_WIDGET",  "title_override": "Actividad Comercial Reciente", "data_source": "activities",    "metric": "count",             "size": "medium", "position": 9,  "config_json": {"itemType": "activities", "limit": 8}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_public = excluded.is_public,
  config_json = excluded.config_json;

-- ============================================
-- 2. CLINIC CRM
-- Industry: healthcare
-- 10 widgets validados contra WidgetRegistry
-- ============================================
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Clinic CRM',
  'clinic-crm',
  1,
  'Dashboard para clínicas, consultorios y centros médicos. Enfocado en pacientes, consultas, seguimientos, tareas administrativas y oportunidades de atención.',
  'healthcare',
  true,
  '{
    "widgets": [
      {"instance_key": "clinic_new_patients",        "widget_type": "KPI_CARD",     "title_override": "Nuevos Pacientes / Interesados", "data_source": "leads",         "metric": "count",             "size": "small",  "position": 0,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "clinic_active_patients",      "widget_type": "KPI_CARD",     "title_override": "Pacientes / Fichas Activas",   "data_source": "companies",     "metric": "count",             "size": "small",  "position": 1,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "clinic_pending_followups",    "widget_type": "KPI_CARD",     "title_override": "Seguimientos Pendientes",       "data_source": "tasks",         "metric": "count",             "size": "small",  "position": 2,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "clinic_active_proposals",     "widget_type": "KPI_CARD",     "title_override": "Servicios / Propuestas Activas", "data_source": "proposals",    "metric": "count",             "size": "small",  "position": 3,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "clinic_revenue_by_month",     "widget_type": "BAR_CHART",    "title_override": "Consultas o Ingresos por Mes",  "data_source": "opportunities", "metric": "grouped_by_month",  "size": "large",  "position": 4,  "config_json": {"color": "#E31E24"}},
      {"instance_key": "clinic_leads_by_source",      "widget_type": "DONUT_CHART",  "title_override": "Pacientes por Origen",          "data_source": "leads",         "metric": "grouped_by_source", "size": "medium", "position": 5,  "config_json": {"innerRadius": 44}},
      {"instance_key": "clinic_treatment_status",      "widget_type": "DONUT_CHART",  "title_override": "Estado de Atención",            "data_source": "opportunities", "metric": "grouped_by_status", "size": "medium", "position": 6,  "config_json": {"innerRadius": 44}},
      {"instance_key": "clinic_conversion_funnel",    "widget_type": "FUNNEL_CHART", "title_override": "Embudo de Atención",            "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7,  "config_json": {}},
      {"instance_key": "clinic_pending_tasks",        "widget_type": "LIST_WIDGET",  "title_override": "Tareas Clínicas Pendientes",   "data_source": "tasks",         "metric": "count",             "size": "medium", "position": 8,  "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "clinic_recent_activity",      "widget_type": "LIST_WIDGET",  "title_override": "Actividad Reciente del Consultorio", "data_source": "activities", "metric": "count", "size": "medium", "position": 9, "config_json": {"itemType": "activities", "limit": 8}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_public = excluded.is_public,
  config_json = excluded.config_json;

-- ============================================
-- 3. ACADEMY / COURSE CRM
-- Industry: education
-- 10 widgets validados contra WidgetRegistry
-- ============================================
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Academy / Course CRM',
  'academy-crm',
  1,
  'Dashboard para academias, cursos, institutos y formación online. Enfocado en alumnos interesados, inscripciones, seguimiento comercial y evolución de oportunidades.',
  'education',
  true,
  '{
    "widgets": [
      {"instance_key": "academy_new_leads",            "widget_type": "KPI_CARD",     "title_override": "Nuevos Interesados",        "data_source": "leads",         "metric": "count",             "size": "small",  "position": 0,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "academy_active_students",       "widget_type": "KPI_CARD",     "title_override": "Alumnos / Clientes Activos", "data_source": "companies",     "metric": "count",             "size": "small",  "position": 1,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "academy_enrollment_pipeline",  "widget_type": "KPI_CARD",     "title_override": "Inscripciones en Proceso",   "data_source": "opportunities", "metric": "count",             "size": "small",  "position": 2,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "academy_pipeline_value",       "widget_type": "KPI_CARD",     "title_override": "Valor Potencial de Matrículas", "data_source": "opportunities", "metric": "pipeline_value", "size": "small",  "position": 3,  "config_json": {"dateRange": "7d", "format": "currency"}},
      {"instance_key": "academy_enrollments_by_month", "widget_type": "BAR_CHART",    "title_override": "Inscripciones por Mes",       "data_source": "opportunities", "metric": "grouped_by_month",  "size": "large",  "position": 4,  "config_json": {"color": "#E31E24"}},
      {"instance_key": "academy_leads_by_channel",     "widget_type": "DONUT_CHART",  "title_override": "Interesados por Canal",       "data_source": "leads",         "metric": "grouped_by_source", "size": "medium", "position": 5,  "config_json": {"innerRadius": 44}},
      {"instance_key": "academy_enrollment_status",   "widget_type": "DONUT_CHART",  "title_override": "Estado de Inscripción",      "data_source": "opportunities", "metric": "grouped_by_status", "size": "medium", "position": 6,  "config_json": {"innerRadius": 44}},
      {"instance_key": "academy_conversion_funnel",    "widget_type": "FUNNEL_CHART", "title_override": "Embudo de Admisiones",        "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7,  "config_json": {}},
      {"instance_key": "academy_pending_followups",    "widget_type": "LIST_WIDGET",  "title_override": "Seguimientos Pendientes",     "data_source": "tasks",         "metric": "count",             "size": "medium", "position": 8,  "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "academy_recent_activity",      "widget_type": "LIST_WIDGET",  "title_override": "Actividad Reciente",         "data_source": "activities",    "metric": "count",             "size": "medium", "position": 9,  "config_json": {"itemType": "activities", "limit": 8}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_public = excluded.is_public,
  config_json = excluded.config_json;

-- ============================================
-- 4. TECHNICAL SERVICE CRM
-- Industry: technical_service
-- 10 widgets validados contra WidgetRegistry
-- ============================================
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Technical Service CRM',
  'technical-service-crm',
  1,
  'Dashboard para talleres, servicios técnicos, reparación de equipos, mantenimiento y soporte. Enfocado en solicitudes, trabajos activos, tareas y seguimiento de clientes.',
  'technical_service',
  true,
  '{
    "widgets": [
      {"instance_key": "technical_new_requests",       "widget_type": "KPI_CARD",     "title_override": "Nuevas Solicitudes",          "data_source": "leads",         "metric": "count",             "size": "small",  "position": 0,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "technical_active_clients",     "widget_type": "KPI_CARD",     "title_override": "Clientes Activos",             "data_source": "companies",     "metric": "count",             "size": "small",  "position": 1,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "technical_active_jobs",        "widget_type": "KPI_CARD",     "title_override": "Trabajos / Proyectos Activos", "data_source": "projects",      "metric": "count",             "size": "small",  "position": 2,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "technical_pending_proposals",  "widget_type": "KPI_CARD",     "title_override": "Presupuestos en Negociación",  "data_source": "proposals",    "metric": "count",             "size": "small",  "position": 3,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "technical_jobs_by_month",       "widget_type": "BAR_CHART",    "title_override": "Trabajos por Mes",              "data_source": "projects",      "metric": "grouped_by_month",  "size": "large",  "position": 4,  "config_json": {"color": "#E31E24"}},
      {"instance_key": "technical_leads_by_source",     "widget_type": "DONUT_CHART",  "title_override": "Solicitudes por Origen",       "data_source": "leads",         "metric": "grouped_by_source", "size": "medium", "position": 5,  "config_json": {"innerRadius": 44}},
      {"instance_key": "technical_jobs_by_status",      "widget_type": "DONUT_CHART",  "title_override": "Estado de Trabajos",          "data_source": "projects",      "metric": "grouped_by_status", "size": "medium", "position": 6,  "config_json": {"innerRadius": 44}},
      {"instance_key": "technical_service_funnel",      "widget_type": "FUNNEL_CHART", "title_override": "Embudo de Servicio",          "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7,  "config_json": {}},
      {"instance_key": "technical_pending_tasks",      "widget_type": "LIST_WIDGET",  "title_override": "Tareas Técnicas Pendientes",  "data_source": "tasks",         "metric": "count",             "size": "medium", "position": 8,  "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "technical_recent_activity",    "widget_type": "LIST_WIDGET",  "title_override": "Actividad Reciente",          "data_source": "activities",    "metric": "count",             "size": "medium", "position": 9,  "config_json": {"itemType": "activities", "limit": 8}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_public = excluded.is_public,
  config_json = excluded.config_json;

-- ============================================
-- 5. RETAIL / COMMERCE CRM
-- Industry: retail
-- 10 widgets validados contra WidgetRegistry
-- ============================================
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Retail / Commerce CRM',
  'retail-commerce-crm',
  1,
  'Dashboard para comercios, tiendas y negocios de venta. Enfocado en clientes, oportunidades, pedidos, propuestas, tareas y comportamiento comercial.',
  'retail',
  true,
  '{
    "widgets": [
      {"instance_key": "retail_new_prospects",          "widget_type": "KPI_CARD",     "title_override": "Nuevos Prospectos",        "data_source": "leads",         "metric": "count",             "size": "small",  "position": 0,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "retail_registered_clients",     "widget_type": "KPI_CARD",     "title_override": "Clientes Registrados",      "data_source": "companies",     "metric": "count",             "size": "small",  "position": 1,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "retail_open_opportunities",     "widget_type": "KPI_CARD",     "title_override": "Oportunidades Abiertas",      "data_source": "opportunities", "metric": "count",             "size": "small",  "position": 2,  "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "retail_pipeline_value",          "widget_type": "KPI_CARD",     "title_override": "Valor Comercial Estimado",   "data_source": "opportunities", "metric": "pipeline_value",    "size": "small",  "position": 3,  "config_json": {"dateRange": "7d", "format": "currency"}},
      {"instance_key": "retail_sales_by_month",         "widget_type": "BAR_CHART",    "title_override": "Ventas / Oportunidades por Mes", "data_source": "opportunities", "metric": "grouped_by_month", "size": "large", "position": 4, "config_json": {"color": "#E31E24"}},
      {"instance_key": "retail_leads_by_source",         "widget_type": "DONUT_CHART",  "title_override": "Clientes por Origen",        "data_source": "leads",         "metric": "grouped_by_source", "size": "medium", "position": 5,  "config_json": {"innerRadius": 44}},
      {"instance_key": "retail_commercial_status",      "widget_type": "DONUT_CHART",  "title_override": "Estado Comercial",           "data_source": "opportunities", "metric": "grouped_by_status", "size": "medium", "position": 6,  "config_json": {"innerRadius": 44}},
      {"instance_key": "retail_sales_funnel",            "widget_type": "FUNNEL_CHART", "title_override": "Embudo de Ventas",            "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7,  "config_json": {}},
      {"instance_key": "retail_pending_tasks",           "widget_type": "LIST_WIDGET",  "title_override": "Tareas Pendientes",          "data_source": "tasks",         "metric": "count",             "size": "medium", "position": 8,  "config_json": {"itemType": "tasks", "limit": 8}},
      {"instance_key": "retail_recent_activity",         "widget_type": "LIST_WIDGET",  "title_override": "Actividad Reciente",         "data_source": "activities",    "metric": "count",             "size": "medium", "position": 9,  "config_json": {"itemType": "activities", "limit": 8}}
    ]
  }'::jsonb,
  null
)
on conflict (slug) do update set
  name = excluded.name,
  schema_version = excluded.schema_version,
  description = excluded.description,
  industry = excluded.industry,
  is_public = excluded.is_public,
  config_json = excluded.config_json;