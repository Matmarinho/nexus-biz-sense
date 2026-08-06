ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS card_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invested_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yield_cdi_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_score integer,
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;