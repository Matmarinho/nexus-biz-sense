REVOKE ALL ON FUNCTION public.emit_webhook_event(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_overdue_transactions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_transaction_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_deal_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_product_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_order_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emit_webhook_event(uuid, text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.emit_overdue_transactions() TO service_role;