
-- Datasets uploaded by users
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  product_count INTEGER NOT NULL DEFAULT 0,
  date_min TEXT,
  date_max TEXT,
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trained models (one per dataset, points to Python service model_id)
CREATE TABLE public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  remote_model_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trained_at TIMESTAMPTZ
);

-- Forecast outputs per product
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  product TEXT NOT NULL,
  horizon_days INTEGER NOT NULL DEFAULT 30,
  series JSONB NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_datasets_client ON public.datasets(client_id, created_at DESC);
CREATE INDEX idx_models_dataset ON public.ml_models(dataset_id);
CREATE INDEX idx_forecasts_model ON public.forecasts(model_id);

-- RLS: open demo mode (no auth)
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_datasets" ON public.datasets FOR SELECT USING (true);
CREATE POLICY "anyone_can_write_datasets" ON public.datasets FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_read_models" ON public.ml_models FOR SELECT USING (true);
CREATE POLICY "anyone_can_write_models" ON public.ml_models FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_update_models" ON public.ml_models FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anyone_can_read_forecasts" ON public.forecasts FOR SELECT USING (true);
CREATE POLICY "anyone_can_write_forecasts" ON public.forecasts FOR INSERT WITH CHECK (true);
