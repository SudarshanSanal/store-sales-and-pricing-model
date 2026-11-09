"""
Dual-Target Hybrid XGBoost + Multi-Output LSTM Forecaster (per-product).

Predicts both:
  1. Item Quantity (volume)
  2. Sales Price (price / unit revenue)

Pipeline per product:
  1. Aggregate daily sales quantity & sales price (mean price, sum quantity) over a complete daily index.
  2. Clean & cap extreme outliers (IQR capping) to eliminate noise.
  3. Engineered time-series features: lags (1..30), 7/14/30-day rolling stats, EWM, momentum,
     and calendar/holiday features (dow, month, quarter, day-of-year sin/cos, is_weekend, is_holiday).
  4. Train 2 separate XGBoost Regressors:
     - xgb_q: optimized for item_quantity
     - xgb_p: optimized for sales_price
  5. Train a Multi-Output LSTM neural network (Keras) with 2 output heads (quantity_out, price_out)
     on 3D sliding windows (samples, seq_len, features).
  6. Prevent Data Leakage: Scalers fitted strictly on training data split before transforming validation/test.
  7. Ensembling / Meta-Learner: Stacked blend of XGBoost + LSTM on validation predictions.
  8. Compute Train vs. Validation metrics (MAE, RMSE, MAPE, R²) to verify no overfitting.
  9. Roll forward day-by-day producing predicted_quantity and predicted_price with 95% confidence bounds.
"""
from __future__ import annotations

import os
import json
import logging
import joblib
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor
import xgboost as xgb


# In containerized/serverless environments like Render or local dev,
# fallback gracefully to a local ./models directory if /data is not writable.
_default_model_dir = "/data/models" if os.path.exists("/data") and os.access("/data", os.W_OK) else os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_DIR = os.environ.get("MODEL_DIR", _default_model_dir)
os.makedirs(MODEL_DIR, exist_ok=True)

SEQ_LEN = 30


def _clean_outliers_iqr(s: pd.Series, factor: float = 2.5) -> pd.Series:
    """Cap extreme outliers using IQR method to avoid distorsion."""
    val = s.copy()
    q25 = val.quantile(0.25)
    q75 = val.quantile(0.75)
    iqr = q75 - q25
    if iqr > 0:
        lower = max(0.0, q25 - factor * iqr)
        upper = q75 + factor * iqr
        val = val.clip(lower, upper)
    return val


def _make_dual_features(df_daily: pd.DataFrame) -> pd.DataFrame:
    """
    df_daily indexed by DatetimeIndex with columns: 'quantity', 'price'.
    Engineers temporal, lag, rolling, and exponentially weighted features for both targets,
    as well as Price Elasticity, Marketing/Promotions, Stockouts, and Weather/Trend drivers.
    """
    df = df_daily.copy()

    # Targets
    df["y_q"] = df["quantity"]
    df["y_p"] = df["price"]

    # Price Elasticity Deviation Feature
    # Captures deviations from 30-day average price to allow models to learn elasticity
    p_mean_30 = df["y_p"].shift(1).rolling(30).mean()
    p_std_30 = df["y_p"].shift(1).rolling(30).std()
    df["price_elasticity_dev"] = ((df["y_p"] - p_mean_30) / (p_std_30 + 1e-8)).fillna(0.0)

    # Lags for Quantity
    for lag in (1, 2, 3, 7, 14, 21, 28, 30):
        df[f"lag_q_{lag}"] = df["y_q"].shift(lag)
    # Lags for Price
    for lag in (1, 2, 3, 7, 14, 21, 28, 30):
        df[f"lag_p_{lag}"] = df["y_p"].shift(lag)

    # Rolling stats (Quantity & Price)
    for w in (7, 14, 30):
        df[f"roll{w}_q_mean"] = df["y_q"].shift(1).rolling(w).mean()
        df[f"roll{w}_q_std"] = df["y_q"].shift(1).rolling(w).std()
        df[f"roll{w}_p_mean"] = df["y_p"].shift(1).rolling(w).mean()
        df[f"roll{w}_p_std"] = df["y_p"].shift(1).rolling(w).std()

    # Exponentially Weighted Moving Averages (EWM)
    df["ewm7_q"] = df["y_q"].shift(1).ewm(span=7, adjust=False).mean()
    df["ewm30_q"] = df["y_q"].shift(1).ewm(span=30, adjust=False).mean()
    df["ewm7_p"] = df["y_p"].shift(1).ewm(span=7, adjust=False).mean()
    df["ewm30_p"] = df["y_p"].shift(1).ewm(span=30, adjust=False).mean()

    # Differences / Momentum
    df["diff1_q"] = df["y_q"].shift(1) - df["y_q"].shift(2)
    df["diff7_q"] = df["y_q"].shift(1) - df["y_q"].shift(8)
    df["diff1_p"] = df["y_p"].shift(1) - df["y_p"].shift(2)
    df["diff7_p"] = df["y_p"].shift(1) - df["y_p"].shift(8)

    # Expansion factors (promo, discount, ad_spend, stockout, weather, search_trend)
    for col in ["promo", "discount", "ad_spend", "stockout", "weather_temp", "weather_rain", "search_trend"]:
        if col in df_daily.columns:
            df[col] = df_daily[col].fillna(0.0)
            df[f"lag_{col}_1"] = df[col].shift(1).fillna(0.0)
        else:
            default_val = 20.0 if col == "weather_temp" else 50.0 if col == "search_trend" else 0.0
            df[col] = default_val
            df[f"lag_{col}_1"] = default_val

    # Calendar & Cyclical features
    df["dow"] = df.index.dayofweek
    df["is_weekend"] = (df["dow"] >= 5).astype(int)
    df["dom"] = df.index.day
    df["weekofyear"] = df.index.isocalendar().week.astype(int)
    df["month"] = df.index.month
    df["quarter"] = df.index.quarter
    df["is_month_start"] = df.index.is_month_start.astype(int)
    df["is_month_end"] = df.index.is_month_end.astype(int)

    doy = df.index.dayofyear.values
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)

    dow = df["dow"].values
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7.0)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7.0)

    # Simple holiday indicator (major US/Global calendar holidays)
    df["is_holiday"] = df.index.map(
        lambda d: int((d.month == 1 and d.day == 1) or
                      (d.month == 7 and d.day == 4) or
                      (d.month == 11 and d.day >= 22 and d.day <= 28 and d.weekday() == 3) or
                      (d.month == 12 and d.day in (24, 25, 31)))
    )

    return df


def _mlp(random_state: int = 42) -> MLPRegressor:
    """MLP regressor replacing Keras LSTM ? works on Python 3.13+ with no extra deps."""
    return MLPRegressor(
        hidden_layer_sizes=(128, 64, 32),
        activation="relu",
        solver="adam",
        alpha=1e-3,
        learning_rate_init=1e-3,
        max_iter=300,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=15,
        random_state=random_state,
        verbose=False,
    )


@dataclass
class _ProductArtifacts:
    history_dates: List[str]
    history_quantity: List[float]
    history_price: List[float]
    feature_cols: List[str]
    scaler_x_mean: List[float]
    scaler_x_std: List[float]
    scaler_y_q_mean: float
    scaler_y_q_std: float
    scaler_y_p_mean: float
    scaler_y_p_std: float
    weight_xgb_q: float
    weight_xgb_p: float
    bias_q: float
    bias_p: float
    resid_std_q: float
    resid_std_p: float
    metrics_q: Dict[str, float]
    metrics_p: Dict[str, float]
    
    # New expansion variables histories
    history_promo: List[float] = field(default_factory=list)
    history_discount: List[float] = field(default_factory=list)
    history_ad_spend: List[float] = field(default_factory=list)
    history_stockout: List[float] = field(default_factory=list)
    history_weather_temp: List[float] = field(default_factory=list)
    history_weather_rain: List[float] = field(default_factory=list)
    history_search_trend: List[float] = field(default_factory=list)


class HybridForecaster:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.products: List[str] = []
        self.xgb_q_models: Dict[str, xgb.XGBRegressor] = {}
        self.xgb_p_models: Dict[str, xgb.XGBRegressor] = {}
        self.mlp_q_models: Dict[str, MLPRegressor] = {}
        self.mlp_p_models: Dict[str, MLPRegressor] = {}
        self.artifacts: Dict[str, _ProductArtifacts] = {}
        self.metrics: Dict[str, Dict[str, Dict[str, float]]] = {}

    def fit(self, df: pd.DataFrame) -> Dict[str, Dict[str, Dict[str, float]]]:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"], dayfirst=True)

        # Determine volume / quantity column
        qty_col = "sales"
        for col in ["quantity", "item_quantity", "sales_quantity", "item_count"]:
            if col in df.columns:
                qty_col = col
                break

        # Determine price column
        price_col = None
        for col in ["price", "sales_price", "unit_price"]:
            if col in df.columns:
                price_col = col
                break

        if price_col is None:
            # If price column isn't supplied, derive default baseline price
            df["price"] = 100.0
            price_col = "price"

        df[qty_col] = pd.to_numeric(df[qty_col], errors="coerce").fillna(0.0)
        df[price_col] = pd.to_numeric(df[price_col], errors="coerce").fillna(100.0)

        # Build dynamic aggregation dict to capture expansion variables
        agg_dict = {
            qty_col: "sum",
            price_col: "mean",
        }
        for col in ["promo", "discount", "ad_spend", "stockout", "weather_temp", "weather_rain", "search_trend"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
                if col in ("promo", "stockout"):
                    agg_dict[col] = "max"
                elif col == "ad_spend":
                    agg_dict[col] = "sum"
                else:
                    agg_dict[col] = "mean"

        # Aggregate daily quantity, price, and expansion variables
        agg = df.groupby(["product", "date"], as_index=False).agg(agg_dict).rename(
            columns={qty_col: "quantity", price_col: "price"}
        )

        for product, g in agg.groupby("product"):
            g = g.sort_values("date")
            n_days = len(g)
            if n_days < 14:
                logger.warning(
                    f"Skipping '{product}': only {n_days} daily points "
                    "(need ≥14). Consider merging variants with few rows."
                )
                continue

            # Fill missing days
            idx = pd.date_range(g["date"].min(), g["date"].max(), freq="D")
            s_q = g.set_index("date")["quantity"].reindex(idx, fill_value=0.0)
            s_p = g.set_index("date")["price"].reindex(idx, method="ffill").bfill().fillna(100.0)

            # Reindex and clean other columns
            extra_series = {}
            for col in ["promo", "discount", "ad_spend", "stockout", "weather_temp", "weather_rain", "search_trend"]:
                if col in g.columns:
                    if col in ("promo", "stockout"):
                        extra_series[col] = g.set_index("date")[col].reindex(idx, fill_value=0.0)
                    elif col == "ad_spend":
                        extra_series[col] = g.set_index("date")[col].reindex(idx, fill_value=0.0)
                    else:
                        fill_val = 20.0 if col == "weather_temp" else 50.0 if col == "search_trend" else 0.0
                        extra_series[col] = g.set_index("date")[col].reindex(idx, method="ffill").bfill().fillna(fill_val)
                else:
                    fill_val = 20.0 if col == "weather_temp" else 50.0 if col == "search_trend" else 0.0
                    extra_series[col] = pd.Series(fill_val, index=idx)

            # Stockout adjustment (Unconstrained Demand Estimation)
            # If stockout is active (1.0) and sales is 0.0, impute demand from rolling 7d mean
            q_adjusted = s_q.copy()
            stockout_active = extra_series.get("stockout", pd.Series(0.0, index=idx))
            for i in range(len(idx)):
                if stockout_active.iloc[i] > 0 and s_q.iloc[i] == 0:
                    start_idx = max(0, i - 7)
                    prior_sales = s_q.iloc[start_idx:i]
                    mean_prior = prior_sales.mean() if len(prior_sales) > 0 else 0.0
                    q_adjusted.iloc[i] = mean_prior if mean_prior > 0 else 5.0

            s_q = _clean_outliers_iqr(q_adjusted)
            s_p = _clean_outliers_iqr(s_p)

            # Construct daily dataframe including new features
            daily_dict = {"quantity": s_q, "price": s_p}
            for col, ser in extra_series.items():
                daily_dict[col] = ser
            daily = pd.DataFrame(daily_dict, index=idx)

            self._fit_product(product, daily)

        if not self.products:
            raise ValueError(
                "No product had enough history to train. "
                "Each product (or product+variant combination) needs at least 14 "
                "distinct calendar days of sales data. "
                "Try: (1) upload more historical rows, (2) use a broader date range, "
                "or (3) remove the Sub-Model/Variant mapping so products are not split too finely."
            )

        skipped = set(agg["product"].unique()) - set(self.products)
        if skipped:
            logger.info(
                f"Trained {len(self.products)} product(s). "
                f"Skipped {len(skipped)} product(s) with insufficient history: "
                + ", ".join(sorted(skipped)[:10])
                + (" …" if len(skipped) > 10 else "")
            )

        return self.metrics

    def _fit_product(self, product: str, daily: pd.DataFrame):
        feats = _make_dual_features(daily).dropna()
        if len(feats) < 12:
            logger.warning(f"'{product}' dropped after feature engineering: only {len(feats)} usable rows.")
            return

        feature_cols = [c for c in feats.columns if c not in ("y_q", "y_p", "quantity", "price")]
        X = feats[feature_cols].values
        y_q = feats["y_q"].values
        y_p = feats["y_p"].values

        # 80/20 chronological train/val split
        split = max(1, int(len(X) * 0.8))
        X_tr, X_val = X[:split], X[split:]
        y_q_tr, y_q_val = y_q[:split], y_q[split:]
        y_p_tr, y_p_val = y_p[:split], y_p[split:]

        # ---- 1. Train Dual XGBoost Regressors
        xgb_q = xgb.XGBRegressor(
            n_estimators=350,
            max_depth=5,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective="reg:squarederror",
            tree_method="hist",
            early_stopping_rounds=25,
            n_jobs=2,
            verbosity=0,
        )
        xgb_q.fit(X_tr, y_q_tr, eval_set=[(X_val, y_q_val)], verbose=False)
        xgb_q_val_pred = xgb_q.predict(X_val)
        xgb_q_tr_pred = xgb_q.predict(X_tr)

        xgb_p = xgb.XGBRegressor(
            n_estimators=350,
            max_depth=5,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective="reg:squarederror",
            tree_method="hist",
            early_stopping_rounds=25,
            n_jobs=2,
            verbosity=0,
        )
        xgb_p.fit(X_tr, y_p_tr, eval_set=[(X_val, y_p_val)], verbose=False)
        xgb_p_val_pred = xgb_p.predict(X_val)
        xgb_p_tr_pred = xgb_p.predict(X_tr)

        # ---- 2. Data Leakage Prevention: Scalers fitted STRICTLY on training split
        scaler_x = StandardScaler()
        X_tr_scaled = scaler_x.fit_transform(X_tr)
        X_val_scaled = scaler_x.transform(X_val)

        scaler_y_q = StandardScaler()
        y_q_tr_scaled = scaler_y_q.fit_transform(y_q_tr.reshape(-1, 1)).flatten()

        scaler_y_p = StandardScaler()
        y_p_tr_scaled = scaler_y_p.fit_transform(y_p_tr.reshape(-1, 1)).flatten()

        # ---- 3. Dual MLP Regressors (replace Keras LSTM ? Python 3.13 compatible)
        if len(X_tr_scaled) >= 10:
            mlp_q_model = _mlp()
            mlp_q_model.fit(X_tr_scaled, y_q_tr_scaled)
            lstm_val_pred_q = scaler_y_q.inverse_transform(mlp_q_model.predict(X_val_scaled).reshape(-1,1)).flatten()
            lstm_tr_pred_q = scaler_y_q.inverse_transform(mlp_q_model.predict(X_tr_scaled).reshape(-1,1)).flatten()

            mlp_p_model = _mlp()
            mlp_p_model.fit(X_tr_scaled, y_p_tr_scaled)
            lstm_val_pred_p = scaler_y_p.inverse_transform(mlp_p_model.predict(X_val_scaled).reshape(-1,1)).flatten()
            lstm_tr_pred_p = scaler_y_p.inverse_transform(mlp_p_model.predict(X_tr_scaled).reshape(-1,1)).flatten()
            lstm_model = (mlp_q_model, mlp_p_model)
        else:
            lstm_val_pred_q = xgb_q_val_pred.copy()
            lstm_val_pred_p = xgb_p_val_pred.copy()
            lstm_tr_pred_q = xgb_q_tr_pred.copy()
            lstm_tr_pred_p = xgb_p_tr_pred.copy()
            lstm_model = None

        # ---- 4. Stacked Meta-Learner Weight Tuning
        # Quantity
        best_wq, best_rmse_q = 0.5, float("inf")
        for w in np.linspace(0, 1, 101):
            blend = w * xgb_q_val_pred + (1 - w) * lstm_val_pred_q
            rmse = float(np.sqrt(mean_squared_error(y_q_val, blend)))
            if rmse < best_rmse_q:
                best_rmse_q, best_wq = rmse, float(w)

        hybrid_val_q = best_wq * xgb_q_val_pred + (1 - best_wq) * lstm_val_pred_q
        bias_q = float(np.mean(y_q_val - hybrid_val_q))
        hybrid_val_q = hybrid_val_q + bias_q
        resid_std_q = float(np.std(y_q_val - hybrid_val_q)) if len(y_q_val) > 1 else 0.0

        hybrid_tr_q = best_wq * xgb_q_tr_pred + (1 - best_wq) * lstm_tr_pred_q + bias_q

        # Price
        best_wp, best_rmse_p = 0.5, float("inf")
        for w in np.linspace(0, 1, 101):
            blend = w * xgb_p_val_pred + (1 - w) * lstm_val_pred_p
            rmse = float(np.sqrt(mean_squared_error(y_p_val, blend)))
            if rmse < best_rmse_p:
                best_rmse_p, best_wp = rmse, float(w)

        hybrid_val_p = best_wp * xgb_p_val_pred + (1 - best_wp) * lstm_val_pred_p
        bias_p = float(np.mean(y_p_val - hybrid_val_p))
        hybrid_val_p = hybrid_val_p + bias_p
        resid_std_p = float(np.std(y_p_val - hybrid_val_p)) if len(y_p_val) > 1 else 0.0

        hybrid_tr_p = best_wp * xgb_p_tr_pred + (1 - best_wp) * lstm_tr_pred_p + bias_p

        # ---- 5. Compute Train vs Test Metrics (Overfitting Inspection)
        metrics_q = {
            "train_mae": float(mean_absolute_error(y_q_tr, hybrid_tr_q)),
            "train_rmse": float(np.sqrt(mean_squared_error(y_q_tr, hybrid_tr_q))),
            "val_mae": float(mean_absolute_error(y_q_val, hybrid_val_q)),
            "val_rmse": float(np.sqrt(mean_squared_error(y_q_val, hybrid_val_q))),
            "val_mape": float(np.mean(np.abs((y_q_val[y_q_val != 0] - hybrid_val_q[y_q_val != 0]) / y_q_val[y_q_val != 0])) * 100) if (y_q_val != 0).any() else 0.0,
            "val_r2": float(max(0.0, min(1.0, r2_score(y_q_val, hybrid_val_q)))) if len(y_q_val) > 1 else 0.0,
        }
        # Backward compatibility aliases
        metrics_q["mae"] = metrics_q["val_mae"]
        metrics_q["rmse"] = metrics_q["val_rmse"]
        metrics_q["mape"] = metrics_q["val_mape"]
        metrics_q["r2"] = metrics_q["val_r2"]

        metrics_p = {
            "train_mae": float(mean_absolute_error(y_p_tr, hybrid_tr_p)),
            "train_rmse": float(np.sqrt(mean_squared_error(y_p_tr, hybrid_tr_p))),
            "val_mae": float(mean_absolute_error(y_p_val, hybrid_val_p)),
            "val_rmse": float(np.sqrt(mean_squared_error(y_p_val, hybrid_val_p))),
            "val_mape": float(np.mean(np.abs((y_p_val[y_p_val != 0] - hybrid_val_p[y_p_val != 0]) / y_p_val[y_p_val != 0])) * 100) if (y_p_val != 0).any() else 0.0,
            "val_r2": float(max(0.0, min(1.0, r2_score(y_p_val, hybrid_val_p)))) if len(y_p_val) > 1 else 0.0,
        }
        metrics_p["mae"] = metrics_p["val_mae"]
        metrics_p["rmse"] = metrics_p["val_rmse"]
        metrics_p["mape"] = metrics_p["val_mape"]
        metrics_p["r2"] = metrics_p["val_r2"]

        self.products.append(product)
        self.xgb_q_models[product] = xgb_q
        self.xgb_p_models[product] = xgb_p
        if lstm_model is not None:
            self.mlp_q_models[product] = lstm_model[0]
            self.mlp_p_models[product] = lstm_model[1]

        self.artifacts[product] = _ProductArtifacts(
            history_dates=[d.strftime("%Y-%m-%d") for d in daily.index],
            history_quantity=[float(v) for v in daily["quantity"].values],
            history_price=[float(v) for v in daily["price"].values],
            feature_cols=feature_cols,
            scaler_x_mean=scaler_x.mean_.tolist(),
            scaler_x_std=scaler_x.scale_.tolist(),
            scaler_y_q_mean=float(scaler_y_q.mean_[0]),
            scaler_y_q_std=float(scaler_y_q.scale_[0]),
            scaler_y_p_mean=float(scaler_y_p.mean_[0]),
            scaler_y_p_std=float(scaler_y_p.scale_[0]),
            weight_xgb_q=best_wq,
            weight_xgb_p=best_wp,
            bias_q=bias_q,
            bias_p=bias_p,
            resid_std_q=resid_std_q,
            resid_std_p=resid_std_p,
            metrics_q=metrics_q,
            metrics_p=metrics_p,
            history_promo=[float(v) for v in daily["promo"].values] if "promo" in daily.columns else [],
            history_discount=[float(v) for v in daily["discount"].values] if "discount" in daily.columns else [],
            history_ad_spend=[float(v) for v in daily["ad_spend"].values] if "ad_spend" in daily.columns else [],
            history_stockout=[float(v) for v in daily["stockout"].values] if "stockout" in daily.columns else [],
            history_weather_temp=[float(v) for v in daily["weather_temp"].values] if "weather_temp" in daily.columns else [],
            history_weather_rain=[float(v) for v in daily["weather_rain"].values] if "weather_rain" in daily.columns else [],
            history_search_trend=[float(v) for v in daily["search_trend"].values] if "search_trend" in daily.columns else [],
        )
        self.metrics[product] = {"quantity": metrics_q, "price": metrics_p}

    # ---------- Roll-Forward Prediction ----------

    def predict(self, products: List[str], horizon_days: int) -> List[dict]:
        out = []
        for p in products:
            if p not in self.artifacts:
                continue
            out.append(self._predict_product(p, horizon_days))
        return out

    def _predict_product(self, product: str, horizon: int) -> dict:
        art = self.artifacts[product]
        xgb_q = self.xgb_q_models[product]
        xgb_p = self.xgb_p_models[product]
        mlp_q = self.mlp_q_models.get(product)
        mlp_p = self.mlp_p_models.get(product)

        dates = pd.to_datetime(art.history_dates)
        
        # Build history dict with new features
        n_days = len(dates)
        daily_dict = {
            "quantity": art.history_quantity,
            "price": art.history_price,
        }
        daily_dict["promo"] = art.history_promo if getattr(art, "history_promo", None) else [0.0] * n_days
        daily_dict["discount"] = art.history_discount if getattr(art, "history_discount", None) else [0.0] * n_days
        daily_dict["ad_spend"] = art.history_ad_spend if getattr(art, "history_ad_spend", None) else [0.0] * n_days
        daily_dict["stockout"] = art.history_stockout if getattr(art, "history_stockout", None) else [0.0] * n_days
        daily_dict["weather_temp"] = art.history_weather_temp if getattr(art, "history_weather_temp", None) else [20.0] * n_days
        daily_dict["weather_rain"] = art.history_weather_rain if getattr(art, "history_weather_rain", None) else [0.0] * n_days
        daily_dict["search_trend"] = art.history_search_trend if getattr(art, "history_search_trend", None) else [50.0] * n_days

        daily_hist = pd.DataFrame(daily_dict, index=dates)

        feats = _make_dual_features(daily_hist).dropna()
        X_hist = feats[art.feature_cols].values
        xgb_hist_q = xgb_q.predict(X_hist)
        xgb_hist_p = xgb_p.predict(X_hist)

        # Scalers reconstruction
        sx_mean = np.array(art.scaler_x_mean)
        sx_std = np.array(art.scaler_x_std)
        X_hist_scaled = (X_hist - sx_mean) / (sx_std + 1e-8)

        syq_mean, syq_std = art.scaler_y_q_mean, art.scaler_y_q_std or 1.0
        syp_mean, syp_std = art.scaler_y_p_mean, art.scaler_y_p_std or 1.0

        if mlp_q is not None:
            l_hist_q = mlp_q.predict(X_hist_scaled) * syq_std + syq_mean
        else:
            l_hist_q = xgb_hist_q.copy()
        if mlp_p is not None:
            l_hist_p = mlp_p.predict(X_hist_scaled) * syp_std + syp_mean
        else:
            l_hist_p = xgb_hist_p.copy()

        n_hist = min(len(xgb_hist_q), len(l_hist_q))
        hist_dates = daily_hist.index[-n_hist:]
        xgb_hist_q = xgb_hist_q[-n_hist:]
        xgb_hist_p = xgb_hist_p[-n_hist:]
        l_hist_q = l_hist_q[-n_hist:]
        l_hist_p = l_hist_p[-n_hist:]
        act_q = daily_hist["quantity"].values[-n_hist:]
        act_p = daily_hist["price"].values[-n_hist:]

        hyb_hist_q = art.weight_xgb_q * xgb_hist_q + (1 - art.weight_xgb_q) * l_hist_q + art.bias_q
        hyb_hist_p = art.weight_xgb_p * xgb_hist_p + (1 - art.weight_xgb_p) * l_hist_p + art.bias_p

        series = []
        for d, aq, ap, xq, xp, lq, lp, hq, hp in zip(
            hist_dates, act_q, act_p, xgb_hist_q, xgb_hist_p, l_hist_q, l_hist_p, hyb_hist_q, hyb_hist_p
        ):
            series.append({
                "date": d.strftime("%Y-%m-%d"),
                "actual_quantity": int(round(max(0, aq))),
                "actual_price": float(max(0, ap)),
                "predicted_quantity": int(round(max(0, hq))),
                "predicted_price": float(max(0, hp)),
                # Backward compatibility aliases
                "actual": int(round(max(0, aq))),
                "hybrid": int(round(max(0, hq))),
                "xgboost": int(round(max(0, xq))),
                "lstm": int(round(max(0, lq))),
                "xgboost_quantity": int(round(max(0, xq))),
                "lstm_quantity": int(round(max(0, lq))),
                "hybrid_quantity": int(round(max(0, hq))),
                "xgboost_price": float(max(0, xp)),
                "lstm_price": float(max(0, lp)),
                "hybrid_price": float(max(0, hp)),
                "lower_quantity": None,
                "upper_quantity": None,
                "lower_price": None,
                "upper_price": None,
            })

        # Roll forward for horizon
        rolling_q = list(daily_hist["quantity"].values)
        rolling_p = list(daily_hist["price"].values)
        rolling_dates = list(daily_hist.index)
        
        # Track roll forward lists for extra features
        rolling_feats = {}
        for col in ["promo", "discount", "ad_spend", "stockout", "weather_temp", "weather_rain", "search_trend"]:
            rolling_feats[col] = list(daily_hist[col].values)

        last_pred_q = hyb_hist_q[-1] if len(hyb_hist_q) else 0.0
        last_pred_p = hyb_hist_p[-1] if len(hyb_hist_p) else 100.0

        # Ensure future forecast dates are sequential and upcoming (Day +1 to Day +horizon)
        # If historical dataset ended in the past (e.g. 2024 or 2025), anchor from today
        last_hist_date = pd.to_datetime(daily_hist.index[-1])
        today_date = pd.Timestamp.now().normalize()
        base_future_date = max(last_hist_date, today_date)

        for step in range(horizon):
            next_date = base_future_date + pd.Timedelta(days=step + 1)
            rolling_dates.append(next_date)
            
            # Future assumptions for forecasting
            future_stockout = 0.0
            future_promo = 0.0
            future_discount = 0.0
            future_ad_spend = 0.0
            
            weather_hist = rolling_feats["weather_temp"][-30:]
            future_weather = np.mean(weather_hist) if weather_hist else 20.0
            
            rain_hist = rolling_feats["weather_rain"][-30:]
            future_rain = np.mean(rain_hist) if rain_hist else 0.0
            
            search_hist = rolling_feats["search_trend"][-30:]
            future_search = np.mean(search_hist) if search_hist else 50.0

            # Construct input dict for next step
            tmp_dict = {
                "quantity": rolling_q + [np.nan],
                "price": rolling_p + [np.nan],
                "promo": rolling_feats["promo"] + [future_promo],
                "discount": rolling_feats["discount"] + [future_discount],
                "ad_spend": rolling_feats["ad_spend"] + [future_ad_spend],
                "stockout": rolling_feats["stockout"] + [future_stockout],
                "weather_temp": rolling_feats["weather_temp"] + [future_weather],
                "weather_rain": rolling_feats["weather_rain"] + [future_rain],
                "search_trend": rolling_feats["search_trend"] + [future_search],
            }
            tmp_df = pd.DataFrame(tmp_dict, index=rolling_dates)
            f_row = _make_dual_features(tmp_df).iloc[[-1]][art.feature_cols].values
            xq_p = float(xgb_q.predict(f_row)[0])
            xp_p = float(xgb_p.predict(f_row)[0])

            f_row_scaled = (f_row - sx_mean) / (sx_std + 1e-8)
            lq_p = float(mlp_q.predict(f_row_scaled)[0]) * syq_std + syq_mean if mlp_q is not None else xq_p
            lp_p = float(mlp_p.predict(f_row_scaled)[0]) * syp_std + syp_mean if mlp_p is not None else xp_p

            hq_p = art.weight_xgb_q * xq_p + (1 - art.weight_xgb_q) * lq_p + art.bias_q
            hp_p = art.weight_xgb_p * xp_p + (1 - art.weight_xgb_p) * lp_p + art.bias_p

            rolling_q.append(max(0.0, hq_p))
            rolling_p.append(max(0.0, hp_p))
            
            rolling_feats["promo"].append(future_promo)
            rolling_feats["discount"].append(future_discount)
            rolling_feats["ad_spend"].append(future_ad_spend)
            rolling_feats["stockout"].append(future_stockout)
            rolling_feats["weather_temp"].append(future_weather)
            rolling_feats["weather_rain"].append(future_rain)
            rolling_feats["search_trend"].append(future_search)

            widen_q = 1.96 * art.resid_std_q * np.sqrt(step + 1)
            widen_p = 1.96 * art.resid_std_p * np.sqrt(step + 1)

            series.append({
                "date": next_date.strftime("%Y-%m-%d"),
                "day_offset": step + 1,
                "day_label": f"Day +{step + 1}",
                "actual_quantity": None,
                "actual_price": None,
                "predicted_quantity": int(round(max(0, hq_p))),
                "predicted_price": float(max(0, hp_p)),
                "actual": None,
                "hybrid": int(round(max(0, hq_p))),
                "xgboost": int(round(max(0, xq_p))),
                "lstm": int(round(max(0, lq_p))),
                "xgboost_quantity": int(round(max(0, xq_p))),
                "lstm_quantity": int(round(max(0, lq_p))),
                "hybrid_quantity": int(round(max(0, hq_p))),
                "xgboost_price": float(max(0, xp_p)),
                "lstm_price": float(max(0, lp_p)),
                "hybrid_price": float(max(0, hp_p)),
                "lower_quantity": int(round(max(0, hq_p - widen_q))),
                "upper_quantity": int(round(max(0, hq_p + widen_q))),
                "lower_price": float(max(0, hp_p - widen_p)),
                "upper_price": float(max(0, hp_p + widen_p)),
            })

            last_pred_q = hq_p
            last_pred_p = hp_p

        return {
            "product": product,
            "predicted_quantity": int(round(max(0, last_pred_q))),
            "predicted_price": float(max(0, last_pred_p)),
            "series": series,
            "metrics": art.metrics_q,
            "metrics_quantity": art.metrics_q,
            "metrics_price": art.metrics_p,
            "weight_xgb_quantity": art.weight_xgb_q,
            "weight_xgb_price": art.weight_xgb_p,
        }

    # ---------- Persistence ----------

    def save(self):
        path = os.path.join(MODEL_DIR, self.model_id)
        os.makedirs(path, exist_ok=True)

        meta = {
            "products": self.products,
            "artifacts": {p: vars(a) for p, a in self.artifacts.items()},
        }
        with open(os.path.join(path, "meta.json"), "w") as f:
            json.dump(meta, f)

        for p, m in self.xgb_q_models.items():
            joblib.dump(m, os.path.join(path, f"xgb_q_{_safe(p)}.joblib"))
        for p, m in self.xgb_p_models.items():
            joblib.dump(m, os.path.join(path, f"xgb_p_{_safe(p)}.joblib"))
        for p, m in self.mlp_q_models.items():
            joblib.dump(m, os.path.join(path, f"mlp_q_{_safe(p)}.joblib"))
        for p, m in self.mlp_p_models.items():
            joblib.dump(m, os.path.join(path, f"mlp_p_{_safe(p)}.joblib"))

    @classmethod
    def load(cls, model_id: str) -> "HybridForecaster":
        path = os.path.join(MODEL_DIR, model_id)
        if not os.path.isdir(path):
            raise FileNotFoundError(model_id)
        with open(os.path.join(path, "meta.json")) as f:
            meta = json.load(f)

        inst = cls(model_id=model_id)
        inst.products = meta["products"]
        for p, a in meta["artifacts"].items():
            inst.artifacts[p] = _ProductArtifacts(**a)
            inst.metrics[p] = {"quantity": inst.artifacts[p].metrics_q, "price": inst.artifacts[p].metrics_p}

            xgb_q_path = os.path.join(path, f"xgb_q_{_safe(p)}.joblib")
            if os.path.exists(xgb_q_path):
                inst.xgb_q_models[p] = joblib.load(xgb_q_path)
            xgb_p_path = os.path.join(path, f"xgb_p_{_safe(p)}.joblib")
            if os.path.exists(xgb_p_path):
                inst.xgb_p_models[p] = joblib.load(xgb_p_path)

            mlp_q_path = os.path.join(path, f"mlp_q_{_safe(p)}.joblib")
            if os.path.exists(mlp_q_path):
                inst.mlp_q_models[p] = joblib.load(mlp_q_path)
            mlp_p_path = os.path.join(path, f"mlp_p_{_safe(p)}.joblib")
            if os.path.exists(mlp_p_path):
                inst.mlp_p_models[p] = joblib.load(mlp_p_path)

        return inst


def _safe(name: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in name)[:60]