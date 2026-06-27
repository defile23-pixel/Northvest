
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS asset text,
  ADD COLUMN IF NOT EXISTS network text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_plan text NOT NULL DEFAULT 'balanced';
