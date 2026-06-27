-- ============ LOCK DOWN WALLET BALANCE WRITES ============
-- Previously any authenticated user could UPDATE their own wallets row directly
-- (including cash_balance / invested_balance) from the client. Balances must only
-- ever change via the SECURITY DEFINER functions below, run by the server with
-- the service role. Users keep read-only access to their own wallet.
DROP POLICY IF EXISTS "Own wallet update" ON public.wallets;
DROP POLICY IF EXISTS "Own wallet insert" ON public.wallets;
REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM authenticated;

-- ============ NOTIFICATIONS (user-facing inbox) ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'transaction' | 'kyc' | 'security'
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Users can read and mark their own notifications as read, but never create them directly.
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own notifications mark read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============ ATOMIC TRANSACTION STATUS TRANSITIONS ============
-- Encapsulates "approve a deposit credits cash_balance", "approve a withdrawal
-- debits cash_balance (re-checked at approval time)", and "rejecting either one
-- never touches the balance because it was never moved on submission".
-- Runs as a single statement-level transaction so a crash can't leave the
-- transaction row and wallet row out of sync.
CREATE OR REPLACE FUNCTION public.set_transaction_status(_tx_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx RECORD;
BEGIN
  IF _status NOT IN ('pending', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  SELECT * INTO _tx FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF _tx IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF _tx.status = _status THEN
    RETURN; -- already in this state, no-op (prevents double-crediting on repeat clicks)
  END IF;

  IF _status = 'completed' AND _tx.type = 'deposit' THEN
    UPDATE public.wallets SET cash_balance = cash_balance + _tx.amount, updated_at = now()
    WHERE user_id = _tx.user_id;
  ELSIF _status = 'completed' AND _tx.type = 'withdrawal' THEN
    IF (SELECT cash_balance FROM public.wallets WHERE user_id = _tx.user_id) < abs(_tx.amount) THEN
      RAISE EXCEPTION 'Insufficient cash balance to complete this withdrawal';
    END IF;
    UPDATE public.wallets SET cash_balance = cash_balance - abs(_tx.amount), updated_at = now()
    WHERE user_id = _tx.user_id;
  END IF;
  -- 'failed' and 'pending' transitions never move money, since deposits/withdrawals
  -- are only ever credited/debited at the moment they become 'completed'.

  UPDATE public.transactions SET status = _status WHERE id = _tx_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    _tx.user_id,
    'transaction',
    initcap(_tx.type) || ' ' || CASE WHEN _status = 'completed' THEN 'completed' WHEN _status = 'failed' THEN 'failed' ELSE 'updated' END,
    CASE
      WHEN _status = 'completed' AND _tx.type = 'deposit' THEN
        'Your deposit of $' || to_char(abs(_tx.amount), 'FM999,999,990.00') || ' has been credited to your cash balance.'
      WHEN _status = 'completed' AND _tx.type = 'withdrawal' THEN
        'Your withdrawal of $' || to_char(abs(_tx.amount), 'FM999,999,990.00') || ' has been completed.'
      WHEN _status = 'failed' THEN
        'Your ' || _tx.type || ' request of $' || to_char(abs(_tx.amount), 'FM999,999,990.00') || ' could not be completed. Contact support if you need help.'
      ELSE NULL
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_transaction_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_transaction_status(uuid, text) TO service_role;

-- ============ KYC STATUS TRANSITIONS (with notification) ============
CREATE OR REPLACE FUNCTION public.set_kyc_status(_user_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('not_started', 'in_review', 'pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  UPDATE public.kyc_verifications SET status = _status, updated_at = now() WHERE user_id = _user_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    _user_id,
    'kyc',
    CASE _status WHEN 'approved' THEN 'Identity verified' WHEN 'rejected' THEN 'Identity verification rejected' ELSE 'Identity verification updated' END,
    CASE _status
      WHEN 'approved' THEN 'Your identity verification was approved. Withdrawals are now unlocked.'
      WHEN 'rejected' THEN 'Your identity verification was rejected. Please review and resubmit your documents.'
      ELSE NULL
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_kyc_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_kyc_status(uuid, text) TO service_role;
