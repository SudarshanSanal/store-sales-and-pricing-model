/**
 * train-forecast edge function
 *
 * Receives parsed CSV rows + column mapping from the dashboard, calls the
 * Python ML service (XGBoost + LSTM), persists dataset/model/forecast rows,
 * and returns the forecast series for charting.
 *
 * Env:
 *   ML_SERVICE_URL   — base URL of the Hugging Face Space (e.g. https://user-space.hf.space)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ML_TIMEOUT_MS = 115_000;

interface InputRow {
  date: string;
  product: string;
  sales?: number;
  quantity?: number;
  price?: number;
}

interface RequestBody {
  client_id: string;
  filename: string;
  horizon_days?: number;
  rows: InputRow[];
  column_mapping: { date: string; product: string; sales?: string; quantity?: string; price?: string };
  date_min?: string | null;
  date_max?: string | null;
  product_count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let savedModelId: string | null = null;
  let dbClient: ReturnType<typeof createClient> | null = null;

  try {
    const ML_SERVICE_URL = Deno.env.get("ML_SERVICE_URL");
    if (!ML_SERVICE_URL) {
      return json({ error: "ML_SERVICE_URL secret not configured" }, 500);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.rows?.length) {
      return json({ error: "rows required" }, 400);
    }
    if (!body.client_id) {
      return json({ error: "client_id required" }, 400);
    }

    const horizon = body.horizon_days ?? 30;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    dbClient = supabase;

    // 1) Save dataset
    const { data: dataset, error: dsErr } = await supabase
      .from("datasets")
      .insert({
        client_id: body.client_id,
        filename: body.filename,
        row_count: body.rows.length,
        product_count: body.product_count ?? 0,
        date_min: body.date_min ?? null,
        date_max: body.date_max ?? null,
        column_mapping: body.column_mapping,
      })
      .select()
      .single();
    if (dsErr) throw new Error(`dataset insert: ${dsErr.message}`);

    // 2) Create model row (pending)
    const { data: modelRow, error: mErr } = await supabase
      .from("ml_models")
      .insert({
        dataset_id: dataset.id,
        client_id: body.client_id,
        status: "training",
      })
      .select()
      .single();
    if (mErr) throw new Error(`model insert: ${mErr.message}`);
    savedModelId = modelRow.id;

    // 3) Call Python /train with a deadline below the platform idle timeout.
    const trainStart = Date.now();
    const trainRes = await fetchWithTimeout(
      `${ML_SERVICE_URL}/train`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: body.rows, horizon_days: horizon }),
      },
      ML_TIMEOUT_MS
    );
    if (!trainRes.ok) {
      const txt = await trainRes.text();
      await supabase
        .from("ml_models")
        .update({ status: "failed", error: txt.slice(0, 500) })
        .eq("id", modelRow.id);
      return json(
        { error: `train failed [${trainRes.status}]: ${txt.slice(0, 300)}` },
        502
      );
    }
    const trainData = await trainRes.json();

    // 4) Call Python /predict
    const remainingMs = Math.max(15_000, ML_TIMEOUT_MS - (Date.now() - trainStart));
    const predRes = await fetchWithTimeout(
      `${ML_SERVICE_URL}/predict/${trainData.model_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon_days: horizon }),
      },
      remainingMs
    );
    if (!predRes.ok) {
      const txt = await predRes.text();
      await supabase
        .from("ml_models")
        .update({ status: "failed", error: `predict: ${txt.slice(0, 400)}` })
        .eq("id", modelRow.id);
      return json({ error: `predict failed: ${txt.slice(0, 300)}` }, 502);
    }
    const predData = await predRes.json();

    // 5) Persist model + forecasts
    await supabase
      .from("ml_models")
      .update({
        status: "ready",
        remote_model_id: trainData.model_id,
        metrics: trainData.metrics,
        trained_at: new Date().toISOString(),
      })
      .eq("id", modelRow.id);

    const forecastRows = (predData.products as any[]).map((p) => ({
      model_id: modelRow.id,
      client_id: body.client_id,
      product: p.product,
      horizon_days: horizon,
      series: p.series,
      metrics: p.metrics,
    }));
    if (forecastRows.length) {
      const { error: fErr } = await supabase.from("forecasts").insert(forecastRows);
      if (fErr) console.error("forecast insert:", fErr);
    }

    return json({
      ok: true,
      dataset_id: dataset.id,
      model_id: modelRow.id,
      remote_model_id: trainData.model_id,
      train_seconds: (Date.now() - trainStart) / 1000,
      products: predData.products,
      metrics: trainData.metrics,
    });
  } catch (e) {
    console.error("train-forecast error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timed out")) {
      if (dbClient && savedModelId) {
        try {
          await dbClient
            .from("ml_models")
            .update({ status: "failed", error: msg.slice(0, 500) })
            .eq("id", savedModelId);
        } catch (updateError) {
          console.error("failed to mark timed-out model:", updateError);
        }
      }
      return json({ ok: false, fallback: true, error: msg });
    }
    return json({ error: msg }, 500);
  }
});

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(
        "ML service timed out before the forecast completed. The app can still generate a local forecast from the uploaded data."
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}