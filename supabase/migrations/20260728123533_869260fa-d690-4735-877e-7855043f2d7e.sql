-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM (
  'superadmin','admin','manager','finance','employee','accountant','client','viewer'
);

-- ============ SHARED TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bootstrap_superadmins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bootstrap_superadmins TO service_role;
ALTER TABLE public.bootstrap_superadmins ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bootstrap_superadmins (email) VALUES ('biritoques@gmail.com');

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.bootstrap_superadmins b ON lower(u.email) = lower(b.email)
      WHERE u.id = _user_id AND u.email_confirmed_at IS NOT NULL
    )
  );
$$;

-- ============ PLANS ============
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  audience TEXT,
  price_monthly NUMERIC(12,2),
  price_yearly NUMERIC(12,2),
  badge TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  tax_id_kind TEXT NOT NULL DEFAULT 'cnpj' CHECK (tax_id_kind IN ('cnpj','cpf','other')),
  country TEXT NOT NULL DEFAULT 'BR',
  currency TEXT NOT NULL DEFAULT 'BRL',
  segment TEXT,
  headcount TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','trialing','canceled')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  plan_code TEXT REFERENCES public.plans(code),
  logo_url TEXT,
  accent_color TEXT NOT NULL DEFAULT '#8B5CF6',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TENANT USERS ============
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'employee',
  custom_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_users TO authenticated;
GRANT ALL ON public.tenant_users TO service_role;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE TRIGGER trg_tenant_users_updated BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MEMBERSHIP / PERMISSION HELPERS ============
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_superadmin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = _tenant_id AND tu.user_id = auth.uid() AND tu.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_role(_tenant_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_superadmin(auth.uid()) THEN 'superadmin'::public.app_role
    ELSE (SELECT tu.role FROM public.tenant_users tu
          WHERE tu.tenant_id = _tenant_id AND tu.user_id = auth.uid() AND tu.status = 'active' LIMIT 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_role(_tenant_id) IN ('superadmin','admin');
$$;

-- module x action permission matrix, with per-user JSONB overrides
CREATE OR REPLACE FUNCTION public.has_tenant_permission(_tenant_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.app_role;
  overrides JSONB;
  ov JSONB;
BEGIN
  r := public.tenant_role(_tenant_id);
  IF r IS NULL THEN RETURN false; END IF;
  IF r IN ('superadmin','admin') THEN RETURN true; END IF;

  SELECT tu.custom_permissions INTO overrides FROM public.tenant_users tu
   WHERE tu.tenant_id = _tenant_id AND tu.user_id = auth.uid() AND tu.status = 'active' LIMIT 1;

  IF overrides IS NOT NULL AND overrides ? _module THEN
    ov := overrides -> _module;
    IF ov ? _action THEN RETURN (ov ->> _action)::boolean; END IF;
  END IF;

  RETURN CASE r
    WHEN 'manager' THEN _action <> 'manage_users'
    WHEN 'finance' THEN _module IN ('finance','reports','parties','dashboard')
    WHEN 'accountant' THEN _action IN ('view','export')
    WHEN 'employee' THEN _action = 'view' AND _module IN ('dashboard','projects','parties')
    WHEN 'client' THEN _action = 'view' AND _module IN ('dashboard')
    WHEN 'viewer' THEN _action = 'view'
    ELSE false
  END;
END; $$;

-- ============ CORE POLICIES ============
CREATE POLICY "profiles_select_self_or_shared" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_superadmin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tenant_users a JOIN public.tenant_users b ON a.tenant_id = b.tenant_id
    WHERE a.user_id = auth.uid() AND b.user_id = profiles.id));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_superadmin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE POLICY "plans_select_all" ON public.plans FOR SELECT TO authenticated, anon USING (is_active OR public.is_superadmin(auth.uid()));

CREATE POLICY "tenants_select_member" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(id));
CREATE POLICY "tenants_insert_self" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "tenants_update_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(id)) WITH CHECK (public.is_tenant_admin(id));
CREATE POLICY "tenants_delete_super" ON public.tenants FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "tenant_users_select" ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_member(tenant_id));
CREATE POLICY "tenant_users_insert" ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) OR (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.created_by = auth.uid())));
CREATE POLICY "tenant_users_update" ON public.tenant_users FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "tenant_users_delete" ON public.tenant_users FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- ============ INVITES ============
CREATE TABLE public.tenant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  custom_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invites TO authenticated;
GRANT ALL ON public.tenant_invites TO service_role;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_invites_updated BEFORE UPDATE ON public.tenant_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "invites_admin_all" ON public.tenant_invites FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- ============ SUBSCRIPTIONS / USAGE ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.plans(code),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly','custom')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','pending_payment')),
  current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "subs_select_member" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "subs_write_admin" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "subs_update_admin" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE TABLE public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  metric TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period, metric)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_select_member" ON public.usage_counters FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- ============ SEED PLANS ============
INSERT INTO public.plans (code,name,tagline,audience,price_monthly,price_yearly,badge,is_custom,limits,features,sort_order) VALUES
('startup','Startup / PJ','O essencial para começar com controle total','Autônomos, freelancers, consultores e pequenas PJ',91.23,871.25,NULL,false,
 '{"workspaces":1,"users":10,"fiscal_docs":90,"ai_reads":20,"leads":50,"funnels":1}',
 '["Dashboard financeiro","Fluxo de caixa de 30 dias","Contas a pagar","Contas a receber","Documentos fiscais compatíveis","Boletos e Pix","Cobranças recorrentes","Gestão básica de contratos","Assinatura digital","CRM simples","Command Bar básica","Suporte por tickets"]',1),
('pro','Pro Scale','Para empresas em expansão que precisam de previsibilidade','Pequenas e médias empresas',255.23,2449.75,'Mais Popular',false,
 '{"workspaces":3,"users":18,"fiscal_docs":210,"ai_reads":150}',
 '["Tudo do Startup","Open Finance","Conciliação bancária","Múltiplos bancos","Gestão de projetos","Kanban e Timesheet","Horas faturáveis","Previsão de 60 e 90 dias","Dashboard arrastável","Insights por IA","Multi-moedas","Permissões avançadas"]',2),
('enterprise','Enterprise','Governança, consolidação e suporte prioritário','Empresas consolidadas e grupos empresariais',613.98,5893.75,NULL,false,
 '{"workspaces":10,"users":45,"fiscal_docs":null,"ai_reads":1000,"accountants":null}',
 '["Tudo do Pro Scale","Visão consolidada de holdings","CRM ilimitado","Automação de propostas","Tradução por IA","Temas por workspace","Auditoria fiscal avançada","Alertas tributários","Suporte prioritário","Atendimento humano"]',3),
('holding','Holding & Global','Infraestrutura dedicada e integração corporativa','Holdings, grupos e operações globais',NULL,NULL,'Sob consulta',true,
 '{"workspaces":null,"users":null,"fiscal_docs":null,"ai_reads":null}',
 '["Workspaces ilimitados","Usuários ilimitados","Infraestrutura dedicada","Isolamento avançado","APIs sem limite contratual","Integração com ERPs, SAP e TOTVS","IA especializada","Treinamento corporativo","Onboarding dedicado","SLA personalizado"]',4);