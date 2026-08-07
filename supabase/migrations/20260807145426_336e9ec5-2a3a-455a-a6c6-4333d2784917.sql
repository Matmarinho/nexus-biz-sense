
-- CATEGORIAS
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY pc_select ON public.product_categories FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY pc_insert ON public.product_categories FOR INSERT TO authenticated WITH CHECK (has_tenant_permission(tenant_id,'parties','create'));
CREATE POLICY pc_update ON public.product_categories FOR UPDATE TO authenticated USING (has_tenant_permission(tenant_id,'parties','edit'));
CREATE POLICY pc_delete ON public.product_categories FOR DELETE TO authenticated USING (has_tenant_permission(tenant_id,'parties','delete'));

-- PRODUTOS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'un',
  cost_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  stock_qty numeric(14,3) NOT NULL DEFAULT 0,
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.customers_vendors(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE INDEX products_tenant_idx ON public.products(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_select ON public.products FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY pr_insert ON public.products FOR INSERT TO authenticated WITH CHECK (has_tenant_permission(tenant_id,'parties','create'));
CREATE POLICY pr_update ON public.products FOR UPDATE TO authenticated USING (has_tenant_permission(tenant_id,'parties','edit'));
CREATE POLICY pr_delete ON public.products FOR DELETE TO authenticated USING (has_tenant_permission(tenant_id,'parties','delete'));

-- MOVIMENTACOES DE ESTOQUE
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'in',
  quantity numeric(14,3) NOT NULL,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  reason text,
  reference text,
  moved_at date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_tenant_idx ON public.stock_movements(tenant_id, product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_select ON public.stock_movements FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY sm_insert ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (has_tenant_permission(tenant_id,'parties','create'));
CREATE POLICY sm_update ON public.stock_movements FOR UPDATE TO authenticated USING (has_tenant_permission(tenant_id,'parties','edit'));
CREATE POLICY sm_delete ON public.stock_movements FOR DELETE TO authenticated USING (has_tenant_permission(tenant_id,'parties','delete'));

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE delta numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.kind = 'out' THEN -NEW.quantity ELSE NEW.quantity END;
    UPDATE public.products SET stock_qty = stock_qty + delta, updated_at = now() WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.kind = 'out' THEN OLD.quantity ELSE -OLD.quantity END;
    UPDATE public.products SET stock_qty = stock_qty + delta, updated_at = now() WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER stock_movements_apply
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- COMPRAS E VENDAS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'sale',
  number text,
  party_id uuid REFERENCES public.customers_vendors(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  delivery_date date,
  status text NOT NULL DEFAULT 'draft',
  discount numeric(14,2) NOT NULL DEFAULT 0,
  shipping numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_tenant_idx ON public.orders(tenant_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY or_select ON public.orders FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY or_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (has_tenant_permission(tenant_id,'crm','create'));
CREATE POLICY or_update ON public.orders FOR UPDATE TO authenticated USING (has_tenant_permission(tenant_id,'crm','edit'));
CREATE POLICY or_delete ON public.orders FOR DELETE TO authenticated USING (has_tenant_permission(tenant_id,'crm','delete'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY oi_select ON public.order_items FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY oi_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK (has_tenant_permission(tenant_id,'crm','create'));
CREATE POLICY oi_update ON public.order_items FOR UPDATE TO authenticated USING (has_tenant_permission(tenant_id,'crm','edit'));
CREATE POLICY oi_delete ON public.order_items FOR DELETE TO authenticated USING (has_tenant_permission(tenant_id,'crm','delete'));

-- AGENDA
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  kind text NOT NULL DEFAULT 'meeting',
  status text NOT NULL DEFAULT 'scheduled',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_events_tenant_idx ON public.calendar_events(tenant_id, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ce_select ON public.calendar_events FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY ce_insert ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY ce_update ON public.calendar_events FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY ce_delete ON public.calendar_events FOR DELETE TO authenticated USING (is_tenant_member(tenant_id));

-- ARQUIVOS
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  entity text,
  entity_id uuid,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX files_tenant_idx ON public.files(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY fl_select ON public.files FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY fl_insert ON public.files FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY fl_update ON public.files FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY fl_delete ON public.files FOR DELETE TO authenticated USING (is_tenant_member(tenant_id));

-- updated_at triggers
CREATE TRIGGER pc_upd BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pr_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sm_upd BEFORE UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER or_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER oi_upd BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ce_upd BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fl_upd BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
