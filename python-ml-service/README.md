---
title: Hybrid XGBoost LSTM Forecaster
emoji: 📈
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Hybrid XGBoost + LSTM Forecasting Service

Real Python ML backend for the Lovable e-commerce forecasting dashboard.

## Stack
- **FastAPI** — HTTP API
- **XGBoost** — gradient-boosted tabular forecaster (lags + rolling means + day-of-week + seasonality)
- **TensorFlow / Keras LSTM** — sequence model on a 30-day window of standardised sales
- **Hybrid stacking** — meta weight per product, chosen by minimising validation RMSE
- **joblib + .keras** persistence at `/data/models/<model_id>/`

## Endpoints

| Method | Path | Body |
|--------|------|------|
| GET    | `/`  | health |
| POST   | `/train` | `{ rows: [{date, product, sales}], horizon_days }` → `{ model_id, metrics, products }` |
| POST   | `/predict/{model_id}` | `{ horizon_days, products? }` → forecast series per product |
| GET    | `/models/{model_id}` | metadata + per-product metrics |

## Deploy to Hugging Face Spaces (free)

1. Create a new Space at https://huggingface.co/new-space
   - **SDK**: Docker
   - **Hardware**: CPU basic (free)
2. Push these files to the Space repo:
   ```bash
   git clone https://huggingface.co/spaces/<your-username>/<space-name>
   cd <space-name>
   cp -r /path/to/python-ml-service/* .
   git add . && git commit -m "init" && git push
   ```
3. Wait ~5 min for the first build. The Space URL will be:
   `https://<your-username>-<space-name>.hf.space`
4. Test it: `curl https://<your-username>-<space-name>.hf.space/` → should return `{"service":"hybrid-xgb-lstm",...}`
5. Copy that URL — you'll paste it into Lovable as the `ML_SERVICE_URL` secret.

### Persistent storage
Models are saved to `/data/models/`. On HF Spaces free tier, `/data` is **not** persistent across rebuilds — models are lost when the Space restarts. For persistence, either:
- Upgrade the Space to add **persistent storage** (paid), or
- Use Render/Railway with a disk volume.

## Local development

```bash
cd python-ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 7860
```

## Architecture per product

```
raw rows (date, product, sales)
   └─► aggregate by day (sum) ──► daily series, fill gaps with 0
         ├─► tabular features (lags 1/7/14/30, roll7, roll30, dow, month, doy sin/cos)
         │      └─► XGBoost (n=400, depth=6, early stopping) ──► xgb_pred
         └─► standardised 30-day window
                └─► LSTM(64) → LSTM(32) → Dense(16) → Dense(1) ──► lstm_pred

Hybrid = w * xgb_pred + (1 - w) * lstm_pred
w chosen per-product by grid search on validation RMSE
```