-- ============================================
-- Soft Delete Support for Core CRM Entities
-- Migration v8
-- 008_soft_delete_core_entities.sql
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- CONTACTS (Leads)
-- ============================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contacts_deleted_at_idx
  ON public.contacts(deleted_at);

CREATE INDEX IF NOT EXISTS contacts_deleted_at_company_idx
  ON public.contacts(deleted_at, company_id)
  WHERE company_id IS NOT NULL;

-- ============================================
-- COMPANIES
-- ============================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS companies_deleted_at_idx
  ON public.companies(deleted_at);

-- ============================================
-- OPPORTUNITIES
-- ============================================

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_deleted_at_idx
  ON public.opportunities(deleted_at);

CREATE INDEX IF NOT EXISTS opportunities_stage_deleted_idx
  ON public.opportunities(stage_id, deleted_at)
  WHERE stage_id IS NOT NULL;

-- ============================================
-- TASKS
-- ============================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_deleted_at_idx
  ON public.tasks(deleted_at);

CREATE INDEX IF NOT EXISTS tasks_status_deleted_idx
  ON public.tasks(status, deleted_at);

CREATE INDEX IF NOT EXISTS tasks_assigned_deleted_idx
  ON public.tasks(assigned_to, deleted_at)
  WHERE assigned_to IS NOT NULL;

-- ============================================
-- PROJECTS
-- ============================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON public.projects(deleted_at);

CREATE INDEX IF NOT EXISTS projects_status_deleted_idx
  ON public.projects(status, deleted_at);

CREATE INDEX IF NOT EXISTS projects_company_deleted_idx
  ON public.projects(company_id, deleted_at)
  WHERE company_id IS NOT NULL;

-- ============================================
-- SERVICES
-- ============================================

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS services_deleted_at_idx
  ON public.services(deleted_at);

CREATE INDEX IF NOT EXISTS services_active_idx
  ON public.services(is_active, deleted_at);
