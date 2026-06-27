
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  risk_profile TEXT NOT NULL DEFAULT 'balanced' CHECK (risk_profile IN ('starter','balanced','growth')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- WALLETS (one per user)
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  invested_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wallet select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own wallet insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own wallet update" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdraw','invest','dividend','fee')),
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own tx select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own tx insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX transactions_user_created_idx ON public.transactions(user_id, created_at DESC);

-- KYC
CREATE TABLE public.kyc_verifications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_review','approved','rejected')),
  legal_name TEXT,
  date_of_birth DATE,
  country TEXT,
  address TEXT,
  document_type TEXT,
  document_submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own kyc select" ON public.kyc_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own kyc insert" ON public.kyc_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own kyc update" ON public.kyc_verifications FOR UPDATE USING (auth.uid() = user_id);

-- NOTIFICATION PREFERENCES
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account BOOLEAN NOT NULL DEFAULT true,
  email_marketing BOOLEAN NOT NULL DEFAULT false,
  email_performance BOOLEAN NOT NULL DEFAULT true,
  push_security BOOLEAN NOT NULL DEFAULT true,
  push_transactions BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own prefs select" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own prefs insert" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own prefs update" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- SECURITY EVENTS (login history etc.)
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own events select" ON public.security_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own events insert" ON public.security_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX security_events_user_created_idx ON public.security_events(user_id, created_at DESC);

-- AUTO-CREATE profile, wallet, kyc, prefs on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.kyc_verifications (user_id) VALUES (NEW.id);
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
