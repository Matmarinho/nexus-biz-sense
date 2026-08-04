-- ============ CRM ============
CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#8B5CF6',
  probability int NOT NULL DEFAULT 50,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_stages_select" ON public.crm_stages FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "crm_stages_insert" ON public.crm_stages FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id,'crm','create'));
CREATE POLICY "crm_stages_update" ON public.crm_stages FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','edit')) WITH CHECK (public.has_tenant_permission(tenant_id,'crm','edit'));
CREATE POLICY "crm_stages_delete" ON public.crm_stages FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','delete'));
CREATE TRIGGER trg_crm_stages_updated BEFORE UPDATE ON public.crm_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_crm_stages_tenant ON public.crm_stages(tenant_id, position);

CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.customers_vendors(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'open',
  source text,
  probability int,
  expected_close_date date,
  closed_at timestamptz,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_deals_select" ON public.crm_deals FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id,'crm','create'));
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','edit')) WITH CHECK (public.has_tenant_permission(tenant_id,'crm','edit'));
CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','delete'));
CREATE TRIGGER trg_crm_deals_updated BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_crm_deals_tenant ON public.crm_deals(tenant_id, stage_id);

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'task',
  title text NOT NULL,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  notes text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id,'crm','create'));
CREATE POLICY "crm_activities_update" ON public.crm_activities FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','edit')) WITH CHECK (public.has_tenant_permission(tenant_id,'crm','edit'));
CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id,'crm','delete'));
CREATE TRIGGER trg_crm_activities_updated BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_crm_activities_tenant ON public.crm_activities(tenant_id, deal_id);

-- ============ PROJETOS ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.customers_vendors(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  description text,
  status text NOT NULL DEFAULT 'planning',
  priority text NOT NULL DEFAULT 'medium',
  start_date date,
  end_date date,
  budget numeric(14,2) NOT NULL DEFAULT 0,
  actual_cost numeric(14,2) NOT NULL DEFAULT 0,
  progress int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id,'projects','create'));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id,'projects','edit')) WITH CHECK (public.has_tenant_permission(tenant_id,'projects','edit'));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id,'projects','delete'));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id, status);

CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  estimated_hours numeric(8,2),
  actual_hours numeric(8,2),
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_tasks_select" ON public.project_tasks FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "project_tasks_insert" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id,'projects','create'));
CREATE POLICY "project_tasks_update" ON public.project_tasks FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id,'projects','edit')) WITH CHECK (public.has_tenant_permission(tenant_id,'projects','edit'));
CREATE POLICY "project_tasks_delete" ON public.project_tasks FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id,'projects','delete'));
CREATE TRIGGER trg_project_tasks_updated BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_project_tasks_tenant ON public.project_tasks(tenant_id, project_id, status);

-- Etapas padrão do funil para empresas existentes
INSERT INTO public.crm_stages (tenant_id, name, position, color, probability, is_won, is_lost)
SELECT t.id, s.name, s.position, s.color, s.probability, s.is_won, s.is_lost
FROM public.tenants t
CROSS JOIN (VALUES
  ('Prospecção', 0, '#64748B', 10, false, false),
  ('Qualificação', 1, '#0EA5E9', 30, false, false),
  ('Proposta', 2, '#8B5CF6', 55, false, false),
  ('Negociação', 3, '#F59E0B', 75, false, false),
  ('Ganho', 4, '#22C55E', 100, true, false),
  ('Perdido', 5, '#EF4444', 0, false, true)
) AS s(name, position, color, probability, is_won, is_lost);