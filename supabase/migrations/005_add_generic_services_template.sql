-- ============================================
-- Dashboard Template Migration v4
-- 005_add_generic_services_template.sql
-- Template: Generic Services CRM
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Template: generic-services-crm
insert into public.dashboard_templates (name, slug, schema_version, description, industry, is_public, config_json, created_by)
values (
  'Generic Services CRM',
  'generic-services-crm',
  1,
  'Dashboard genérico para negocios de servicios - agencias, consultoras, profesionales',
  'services',
  true,
  '{
    "widgets": [
      {"instance_key": "leads_new_7d",    "widget_type": "KPI_CARD",     "title_override": "Leads Nuevos",          "data_source": "leads",         "metric": "count",            "size": "small",  "position": 0, "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "active_clients",   "widget_type": "KPI_CARD",     "title_override": "Clientes Activos",       "data_source": "companies",     "metric": "count",            "size": "small",  "position": 1, "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "pending_tasks",    "widget_type": "KPI_CARD",     "title_override": "Tareas Pendientes",      "data_source": "tasks",         "metric": "count",            "size": "small",  "position": 2, "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "active_opps",      "widget_type": "KPI_CARD",     "title_override": "Oportunidades Activas",   "data_source": "opportunities", "metric": "count",            "size": "small",  "position": 3, "config_json": {"dateRange": "7d", "format": "number"}},
      {"instance_key": "pipeline_value",   "widget_type": "KPI_CARD",     "title_override": "Valor Pipeline",         "data_source": "opportunities", "metric": "pipeline_value",   "size": "small",  "position": 4, "config_json": {"dateRange": "7d", "format": "currency"}},
      {"instance_key": "leads_by_status",  "widget_type": "DONUT_CHART",  "title_override": "Leads por Estado",       "data_source": "leads",         "metric": "grouped_by_status", "size": "medium", "position": 5, "config_json": {"innerRadius": 44}},
      {"instance_key": "projects_active",  "widget_type": "BAR_CHART",    "title_override": "Proyectos Activos",      "data_source": "projects",      "metric": "count",            "size": "medium", "position": 6, "config_json": {"color": "#E31E24"}},
      {"instance_key": "conversion_funnel","widget_type": "FUNNEL_CHART", "title_override": "Embudo Comercial",       "data_source": "opportunities", "metric": "conversion_funnel", "size": "large",  "position": 7, "config_json": {}},
      {"instance_key": "recent_activities","widget_type": "LIST_WIDGET",  "title_override": "Actividades Recientes",   "data_source": "activities",    "metric": "count",            "size": "medium", "position": 8, "config_json": {"itemType": "activities", "limit": 8}},
      {"instance_key": "tasks_list",       "widget_type": "LIST_WIDGET",  "title_override": "Tareas Recientes",       "data_source": "tasks",         "metric": "count",            "size": "medium", "position": 9, "config_json": {"itemType": "tasks", "limit": 8}}
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