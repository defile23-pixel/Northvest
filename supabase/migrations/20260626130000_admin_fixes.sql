-- ============ FIX: KYC STATUS VALUE MISMATCH ============
-- kyc_verifications.status only ever allows ('not_started','in_review','approved','rejected').
-- 'pending' was used by the admin overview count and the admin "Reset" action, which
-- either always returned zero or hit the CHECK constraint outright. No data exists with
-- status = 'pending' (impossible under the constraint), so this is a pure no-op for
-- existing rows, but documents the constraint explicitly for clarity.
ALTER TABLE public.kyc_verifications DROP CONSTRAINT IF EXISTS kyc_verifications_status_check;
ALTER TABLE public.kyc_verifications ADD CONSTRAINT kyc_verifications_status_check
  CHECK (status IN ('not_started','in_review','approved','rejected'));

-- Re-create set_kyc_status with the correct allowed-value list (drop the bogus 'pending')
-- and an admin_id parameter so KYC decisions are recorded in the audit log too.
DROP FUNCTION IF EXISTS public.set_kyc_status(uuid, text);

CREATE OR REPLACE FUNCTION public.set_kyc_status(_admin_id uuid, _user_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _before text;
BEGIN
  IF _status NOT IN ('not_started', 'in_review', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  SELECT status INTO _before FROM public.kyc_verifications WHERE user_id = _user_id FOR UPDATE;

  UPDATE public.kyc_verifications SET status = _status, updated_at = now() WHERE user_id = _user_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, target_id, before, after)
  VALUES (_admin_id, 'kyc_status', _user_id, _user_id::text, jsonb_build_object('status', _before), jsonb_build_object('status', _status));

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    _user_id,
    'kyc',
    CASE _status WHEN 'approved' THEN 'Identity verified' WHEN 'rejected' THEN 'Identity verification rejected' ELSE 'Identity verification updated' END,
    CASE _status
      WHEN 'approved' THEN 'Your identity verification was approved. Withdrawals are now unlocked.'
      WHEN 'rejected' THEN 'Your identity verification was rejected. Please review and resubmit your documents.'
      WHEN 'not_started' THEN 'Your identity verification was reset. Please resubmit when ready.'
      ELSE NULL
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_kyc_status(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_kyc_status(uuid, uuid, text) TO service_role;

-- ============ ADMIN AUDIT LOG ============
-- Every admin write (balance adjustment, transaction approval, KYC decision, role
-- change, review moderation) now records who did it, on whom, what changed, and why.
-- Not exposed to regular users at all; read only through the admin server functions
-- (service role), so no RLS policy is needed for `authenticated` — default deny applies.
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_actions_created_idx ON public.admin_actions(created_at DESC);
CREATE INDEX admin_actions_target_user_idx ON public.admin_actions(target_user_id);

-- ============ ATOMIC WALLET ADJUSTMENT (with audit log + user notification) ============
-- Replaces a bare UPDATE on wallets with one that records a before/after audit entry
-- and tells the affected user their balance was changed and why.
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_admin_id uuid, _user_id uuid, _cash numeric, _invested numeric, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _before RECORD;
BEGIN
  SELECT cash_balance, invested_balance INTO _before FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _before IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  UPDATE public.wallets SET
    cash_balance = COALESCE(_cash, cash_balance),
    invested_balance = COALESCE(_invested, invested_balance),
    updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, target_id, before, after, reason)
  VALUES (
    _admin_id, 'wallet_adjust', _user_id, _user_id::text,
    jsonb_build_object('cash_balance', _before.cash_balance, 'invested_balance', _before.invested_balance),
    jsonb_build_object('cash_balance', COALESCE(_cash, _before.cash_balance), 'invested_balance', COALESCE(_invested, _before.invested_balance)),
    _reason
  );

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    _user_id,
    'account',
    'Your balance was adjusted',
    'An administrator adjusted your wallet balance.' || (CASE WHEN _reason IS NOT NULL AND length(trim(_reason)) > 0 THEN ' Reason: ' || _reason ELSE '' END)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, uuid, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, uuid, numeric, numeric, text) TO service_role;

-- ============ LAST-ADMIN GUARD ============
-- Prevents revoking the only remaining admin and locking everyone out of /admin.
CREATE OR REPLACE FUNCTION public.revoke_admin_role(_admin_id uuid, _target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  SELECT count(*) INTO _count FROM public.user_roles WHERE role = 'admin';
  IF _count <= 1 THEN
    RAISE EXCEPTION 'Cannot revoke the only remaining administrator';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'admin';

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, target_id, reason)
  VALUES (_admin_id, 'admin_revoked', _target_user_id, _target_user_id::text, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_admin_role(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(uuid, uuid) TO service_role;

-- ============ KYC DOCUMENT STORAGE ============
ALTER TABLE public.kyc_verifications ADD COLUMN IF NOT EXISTS document_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users may upload/read/replace only files under a folder named after their own user id.
-- Admin access happens server-side via the service role (createSignedUrl), which bypasses
-- these policies entirely, so no separate admin policy is needed here.
CREATE POLICY "Users upload own kyc documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own kyc documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users replace own kyc documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ ADD ADMIN-ID + AUDIT LOGGING TO set_transaction_status ============
-- Same balance-crediting/debiting behaviour as before, now also recording who approved
-- or rejected the transaction.
DROP FUNCTION IF EXISTS public.set_transaction_status(uuid, text);

CREATE OR REPLACE FUNCTION public.set_transaction_status(_admin_id uuid, _tx_id uuid, _status text)
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

  UPDATE public.transactions SET status = _status WHERE id = _tx_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, target_id, before, after)
  VALUES (_admin_id, 'transaction_status', _tx.user_id, _tx_id::text, jsonb_build_object('status', _tx.status), jsonb_build_object('status', _status));

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

REVOKE EXECUTE ON FUNCTION public.set_transaction_status(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_transaction_status(uuid, uuid, text) TO service_role;

-- ============ REVIEW MODERATION (with audit log) ============
CREATE OR REPLACE FUNCTION public.set_review_status(_admin_id uuid, _review_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rv RECORD;
BEGIN
  IF _status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  SELECT * INTO _rv FROM public.reviews WHERE id = _review_id FOR UPDATE;
  IF _rv IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  UPDATE public.reviews SET status = _status WHERE id = _review_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, target_id, before, after)
  VALUES (_admin_id, 'review_status', _rv.user_id, _review_id::text, jsonb_build_object('status', _rv.status), jsonb_build_object('status', _status));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_review_status(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_review_status(uuid, uuid, text) TO service_role;
