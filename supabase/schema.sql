-- ============================================================
-- Hybrid XGBoost-LSTM Forecaster — Supabase Schema
-- Run this in your Supabase SQL editor (Project > SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES  (one row per auth user, auto-created on signup)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name     text,
  company_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 2. PRODUCTS  (user-owned product catalogue)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name            text        NOT NULL,
  sku             text,
  category        text,
  lead_time_days  int         NOT NULL DEFAULT 7,
  holding_cost    numeric(12,4),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 3. HISTORICAL_SALES  (bulk-inserted from CSV upload)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.historical_sales (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id    uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text        NOT NULL,  -- denormalised for quick display
  sale_date     date        NOT NULL,
  sales_volume  numeric(14,4) NOT NULL DEFAULT 0,
  unit_price    numeric(14,4),
  promo_active  boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historical_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own sales"
  ON public.historical_sales FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS historical_sales_user_date
  ON public.historical_sales(user_id, sale_date DESC);


-- ────────────────────────────────────────────────────────────
-- 4. FORECAST_RESULTS  (saved forecast series per product)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forecast_results (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_name    text        NOT NULL,
  session_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
  horizon_days    int         NOT NULL DEFAULT 90,
  series          jsonb       NOT NULL DEFAULT '[]',   -- SeriesPoint[]
  history         jsonb       NOT NULL DEFAULT '[]',   -- history rows
  metrics         jsonb       NOT NULL DEFAULT '{}',   -- TargetMetrics
  metrics_quantity jsonb,
  metrics_price    jsonb,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  source          text        CHECK (source IN ('local','remote'))
);

ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own forecasts"
  ON public.forecast_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS forecast_results_user_session
  ON public.forecast_results(user_id, session_id, generated_at DESC);


-- ────────────────────────────────────────────────────────────
-- 5. INVENTORY_OVERRIDES  (per-user safety stock / price edits)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_overrides (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_name   text        NOT NULL,
  current_stock  int,
  unit_price     numeric(14,4),
  lead_time_days int,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_name)
);

ALTER TABLE public.inventory_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own overrides"
  ON public.inventory_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
