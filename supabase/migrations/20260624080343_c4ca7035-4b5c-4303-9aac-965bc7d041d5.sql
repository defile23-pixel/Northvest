
-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Own reviews select"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Own reviews insert"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own reviews update"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER reviews_touch BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- When a user updates their review, reset to pending (unless admin set it via service role bypassing RLS)
CREATE OR REPLACE FUNCTION public.reset_review_status_on_user_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.user_id AND (OLD.body IS DISTINCT FROM NEW.body OR OLD.title IS DISTINCT FROM NEW.title OR OLD.rating IS DISTINCT FROM NEW.rating) THEN
    NEW.status = 'pending';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER reviews_reset_status BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reset_review_status_on_user_edit();

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own roles select"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PUBLIC WITHDRAWALS VIEW ============
CREATE OR REPLACE VIEW public.public_withdrawals
WITH (security_invoker = true)
AS
SELECT id, amount, asset, method, created_at
FROM public.transactions
WHERE type = 'withdrawal' AND status = 'completed';

GRANT SELECT ON public.public_withdrawals TO anon, authenticated;

-- Need an anon SELECT policy on transactions limited to completed withdrawals for the view
CREATE POLICY "Public can read completed withdrawals via view"
  ON public.transactions FOR SELECT
  TO anon
  USING (type = 'withdrawal' AND status = 'completed');

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
