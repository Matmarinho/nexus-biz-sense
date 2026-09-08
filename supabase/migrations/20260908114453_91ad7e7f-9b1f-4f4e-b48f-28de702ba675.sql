CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ============ API KEYS ============
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read','write'],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_tenant_idx ON public.api_keys(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select" ON public.api_keys FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "api_keys_insert" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "api_keys_update" ON public.api_keys FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "api_keys_delete" ON public.api_keys FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id));
CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ WEBHOOKS ============
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhooks_tenant_idx ON public.webhooks(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_select" ON public.webhooks FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "webhooks_insert" ON public.webhooks FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "webhooks_update" ON public.webhooks FOR UPDATE TO authenticated USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "webhooks_delete" ON public.webhooks FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id));
CREATE TRIGGER trg_webhooks_updated BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EVENT OUTBOX ============
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event text NOT NULL,
  entity text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_events_pending_idx ON public.webhook_events(status, created_at);
CREATE INDEX webhook_events_tenant_idx ON public.webhook_events(tenant_id, created_at DESC);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_select" ON public.webhook_events FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- ============ DELIVERIES ============
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  event text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  response_status integer,
  response_body text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_deliveries_tenant_idx ON public.webhook_deliveries(tenant_id, created_at DESC);
CREATE INDEX webhook_deliveries_retry_idx ON public.webhook_deliveries(status, next_retry_at);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_deliveries_select" ON public.webhook_deliveries FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE TRIGGER trg_webhook_deliveries_updated BEFORE UPDATE ON public.webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CDI HISTORY ============
CREATE TABLE public.cdi_rates (
  rate_date date PRIMARY KEY,
  annual_rate numeric NOT NULL,
  source text NOT NULL DEFAULT 'bcb-sgs-4389',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cdi_rates TO authenticated;
GRANT ALL ON public.cdi_rates TO service_role;
ALTER TABLE public.cdi_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cdi_rates_select" ON public.cdi_rates FOR SELECT TO authenticated USING (true);
INSERT INTO public.cdi_rates (rate_date, annual_rate, source) VALUES (CURRENT_DATE, 14.90, 'seed') ON CONFLICT DO NOTHING;

-- ============ EVENT EMISSION ============
CREATE OR REPLACE FUNCTION public.emit_webhook_event(_tenant uuid, _event text, _entity text, _entity_id uuid, _payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.webhooks w WHERE w.tenant_id = _tenant AND w.is_active AND _event = ANY(w.events)) THEN
    RETURN;
  END IF;
  INSERT INTO public.webhook_events (tenant_id, event, entity, entity_id, payload)
  VALUES (_tenant, _event, _entity, _entity_id, _payload);
  BEGIN
    PERFORM net.http_post(
      url := 'https://project--dfba1024-f218-4f26-913f-ea4fb43a351a.lovable.app/api/public/v1/webhooks/dispatch',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('tenant_id', _tenant)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_transaction_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_webhook_event(NEW.tenant_id, 'transaction.created', 'financial_transactions', NEW.id, to_jsonb(NEW));
    IF NEW.status = 'paid' THEN
      PERFORM public.emit_webhook_event(NEW.tenant_id, 'transaction.paid', 'financial_transactions', NEW.id, to_jsonb(NEW));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
      PERFORM public.emit_webhook_event(NEW.tenant_id, 'transaction.paid', 'financial_transactions', NEW.id, to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER financial_transactions_events AFTER INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_transaction_events();

CREATE OR REPLACE FUNCTION public.trg_deal_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'won' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'won') THEN
    PERFORM public.emit_webhook_event(NEW.tenant_id, 'deal.won', 'crm_deals', NEW.id, to_jsonb(NEW));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER crm_deals_events AFTER INSERT OR UPDATE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.trg_deal_events();

CREATE OR REPLACE FUNCTION public.trg_product_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.min_stock > 0 AND NEW.stock_qty < NEW.min_stock AND (TG_OP = 'INSERT' OR OLD.stock_qty >= OLD.min_stock OR OLD.min_stock <= 0) THEN
    PERFORM public.emit_webhook_event(NEW.tenant_id, 'stock.low', 'products', NEW.id,
      jsonb_build_object('id', NEW.id, 'sku', NEW.sku, 'name', NEW.name, 'stock_qty', NEW.stock_qty, 'min_stock', NEW.min_stock));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER products_events AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_product_events();

CREATE OR REPLACE FUNCTION public.trg_order_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'invoiced' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'invoiced') THEN
    PERFORM public.emit_webhook_event(NEW.tenant_id, 'order.invoiced', 'orders', NEW.id, to_jsonb(NEW));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_events AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_order_events();

-- Overdue sweep: emits transaction.overdue once per transaction
CREATE OR REPLACE FUNCTION public.emit_overdue_transactions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; c integer := 0;
BEGIN
  FOR r IN
    SELECT t.* FROM public.financial_transactions t
    WHERE t.status = 'pending' AND t.due_date < CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.webhook_events e WHERE e.entity_id = t.id AND e.event = 'transaction.overdue')
      AND EXISTS (SELECT 1 FROM public.webhooks w WHERE w.tenant_id = t.tenant_id AND w.is_active AND 'transaction.overdue' = ANY(w.events))
    LIMIT 500
  LOOP
    PERFORM public.emit_webhook_event(r.tenant_id, 'transaction.overdue', 'financial_transactions', r.id, to_jsonb(r));
    c := c + 1;
  END LOOP;
  RETURN c;
END; $$;

-- ============ SCHEDULES ============
SELECT cron.schedule('nexus-webhook-retry-backstop', '17 * * * *', $$
  SELECT net.http_post(
    url := 'https://project--dfba1024-f218-4f26-913f-ea4fb43a351a.lovable.app/api/public/v1/webhooks/dispatch',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ) WHERE EXISTS (SELECT 1 FROM public.webhook_events WHERE status = 'pending')
     OR EXISTS (SELECT 1 FROM public.webhook_deliveries WHERE status = 'retry' AND next_retry_at <= now());
$$);
SELECT cron.schedule('nexus-overdue-sweep', '5 3 * * *', $$ SELECT public.emit_overdue_transactions(); $$);
SELECT cron.schedule('nexus-cdi-sync', '30 9 * * *', $$
  SELECT net.http_get(url := 'https://project--dfba1024-f218-4f26-913f-ea4fb43a351a.lovable.app/api/public/v1/cdi/sync');
$$);