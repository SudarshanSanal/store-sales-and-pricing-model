"""
Dual-Target Hybrid XGBoost + Multi-Output LSTM forecasting service.

Endpoints:
  GET  /                       health
  POST /train                  trains hybrid dual-target model on uploaded rows, returns model_id + metrics
  POST /predict/{model_id}     forecasts next N days returning predicted_quantity & predicted_price
  GET  /models/{model_id}      model metadata

Models are persisted to MODEL_DIR (default /data/models).
"""
from __future__ import annotations

import os
import uuid
import json
import time
from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .model import HybridForecaster, MODEL_DIR
except ImportError:
    from model import HybridForecaster, MODEL_DIR

app = FastAPI(title="Hybrid XGBoost-LSTM Forecasting Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------

class Row(BaseModel):
    date: str
    product: str
    category: Optional[str] = None
    sub_product: Optional[str] = None
    sub_category: Optional[str] = None
    variant: Optional[str] = None
    sales: Optional[float] = None
    quantity: Optional[float] = None
    item_quantity: Optional[float] = None
    item_count: Optional[float] = None
    price: Optional[float] = None
    sales_price: Optional[float] = None
    unit_price: Optional[float] = None
    promo: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    ad_spend: Optional[float] = 0.0
    stockout: Optional[float] = 0.0
    weather_temp: Optional[float] = 20.0
    weather_rain: Optional[float] = 0.0
    search_trend: Optional[float] = 50.0


class TrainRequest(BaseModel):
    rows: List[Row] = Field(..., min_length=10)
    horizon_days: int = 30


class PredictRequest(BaseModel):
    horizon_days: int = 30
    products: Optional[List[str]] = None  # subset; None = all


# ---------- Routes ----------

@app.get("/")
def root():
    return {
        "service": "hybrid-xgb-lstm-dual-target",
        "status": "ok",
        "model_dir": MODEL_DIR,
        "models_on_disk": len(os.listdir(MODEL_DIR)) if os.path.isdir(MODEL_DIR) else 0,
    }


@app.post("/train")
def train(req: TrainRequest):
    rows_data = []
    for r in req.rows:
        d = r.model_dump()
        # Consolidate quantity
        qty = d.get("quantity") or d.get("item_quantity") or d.get("sales") or d.get("item_count")
        # Consolidate price
        prc = d.get("price") or d.get("sales_price") or d.get("unit_price") or 100.0

        sub_prod = d.get("sub_product") or d.get("sub_category") or d.get("variant")
        prod_name = d.get("product") or ""
        if sub_prod and sub_prod.strip():
            prod_name = f"{prod_name.strip()} › {sub_prod.strip()}"

        if d.get("date") and prod_name and qty is not None:
            rows_data.append({
                "date": d["date"],
                "product": prod_name,
                "category": d.get("category") or "",
                "sub_product": sub_prod or "",
                "quantity": float(qty),
                "sales": float(qty),
                "price": float(prc),
                "promo": float(d.get("promo") if d.get("promo") is not None else 0.0),
                "discount": float(d.get("discount") if d.get("discount") is not None else 0.0),
                "ad_spend": float(d.get("ad_spend") if d.get("ad_spend") is not None else 0.0),
                "stockout": float(d.get("stockout") if d.get("stockout") is not None else 0.0),
                "weather_temp": float(d.get("weather_temp") if d.get("weather_temp") is not None else 20.0),
                "weather_rain": float(d.get("weather_rain") if d.get("weather_rain") is not None else 0.0),
                "search_trend": float(d.get("search_trend") if d.get("search_trend") is not None else 50.0),
            })

    if not rows_data:
        raise HTTPException(400, "No valid rows provided")

    df = pd.DataFrame(rows_data)
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["date", "product", "quantity"])

    if df.empty:
        raise HTTPException(400, "All rows invalid after cleaning")

    model_id = uuid.uuid4().hex
    started = time.time()
    forecaster = HybridForecaster(model_id=model_id)
    metrics = forecaster.fit(df)
    forecaster.save()

    return {
        "model_id": model_id,
        "trained_seconds": round(time.time() - started, 2),
        "products": forecaster.products,
        "metrics": metrics,
        "rows_used": int(len(df)),
    }


@app.post("/predict/{model_id}")
def predict(model_id: str, req: PredictRequest):
    try:
        forecaster = HybridForecaster.load(model_id)
    except FileNotFoundError:
        raise HTTPException(404, f"Model {model_id} not found")

    products = req.products or forecaster.products
    out = forecaster.predict(products=products, horizon_days=req.horizon_days)

    avg_qty = float(np.mean([p.get("predicted_quantity", 0) for p in out])) if out else 0.0
    avg_price = float(np.mean([p.get("predicted_price", 0) for p in out])) if out else 0.0

    return {
        "model_id": model_id,
        "horizon_days": req.horizon_days,
        "predicted_quantity": int(round(avg_qty)),
        "predicted_price": round(avg_price, 2),
        "products": out,
    }


@app.get("/models/{model_id}")
def get_model(model_id: str):
    try:
        forecaster = HybridForecaster.load(model_id)
    except FileNotFoundError:
        raise HTTPException(404, "not found")
    return {
        "model_id": model_id,
        "products": forecaster.products,
        "metrics": forecaster.metrics,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)