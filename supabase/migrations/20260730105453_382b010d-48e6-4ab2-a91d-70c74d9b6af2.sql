
alter table public.financial_transactions
  add column if not exists series_id uuid,
  add column if not exists installment_no integer,
  add column if not exists installment_total integer;

create index if not exists financial_transactions_series_idx
  on public.financial_transactions (tenant_id, series_id);
