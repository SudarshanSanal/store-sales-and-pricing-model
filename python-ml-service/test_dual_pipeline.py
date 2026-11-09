"""
Test script to verify Dual-Target Hybrid XGBoost + Multi-Output LSTM Forecaster pipeline.
"""
import numpy as np
import pandas as pd
from app.model import HybridForecaster
from app.main import app
from fastapi.testclient import TestClient

def test_pipeline():
    print("Generating synthetic dataset with quantity and price...")
    dates = pd.date_range("2026-01-01", periods=60, freq="D")
    data = []
    for d in dates:
        # Product A
        q_a = 50 + 10 * np.sin(d.dayofweek) + np.random.normal(0, 2)
        p_a = 199 + 5 * np.cos(d.dayofweek) + np.random.normal(0, 1)
        data.append({"date": d.strftime("%Y-%m-%d"), "product": "Product A", "sales": q_a, "quantity": q_a, "price": p_a})

        # Product B
        q_b = 100 + 15 * np.cos(d.dayofweek) + np.random.normal(0, 3)
        p_b = 99 + 2 * np.sin(d.dayofweek) + np.random.normal(0, 0.5)
        data.append({"date": d.strftime("%Y-%m-%d"), "product": "Product B", "sales": q_b, "quantity": q_b, "price": p_b})

    df = pd.DataFrame(data)

    print("Fitting Dual-Target Hybrid Forecaster...")
    forecaster = HybridForecaster(model_id="test_model_001")
    metrics = forecaster.fit(df)
    forecaster.save()

    print("Fitting successful! Metrics returned:")
    print(metrics)

    print("Testing predictions for 14 days horizon...")
    predictions = forecaster.predict(products=["Product A", "Product B"], horizon_days=14)
    print(f"Products predicted: {len(predictions)}")
    for p in predictions:
        print(f"Product: {p['product']}")
        print(f"  Predicted Item Quantity: {p['predicted_quantity']}")
        print(f"  Predicted Sales Price: {p['predicted_price']}")
        print(f"  Series points count: {len(p['series'])}")
        last_pt = p['series'][-1]
        print(f"  Last series point: date={last_pt['date']}, pred_q={last_pt['predicted_quantity']}, pred_p={last_pt['predicted_price']}")

    # Test FastAPI endpoints via TestClient
    client = TestClient(app)
    resp = client.get("/")
    print("GET / ->", resp.json())
    assert resp.status_code == 200

    train_payload = {
        "rows": data,
        "horizon_days": 14
    }
    train_resp = client.post("/train", json=train_payload)
    print("POST /train ->", train_resp.json()["model_id"])
    assert train_resp.status_code == 200
    model_id = train_resp.json()["model_id"]

    pred_resp = client.post(f"/predict/{model_id}", json={"horizon_days": 14})
    print("POST /predict/{model_id} ->")
    res_json = pred_resp.json()
    print("  predicted_quantity:", res_json["predicted_quantity"])
    print("  predicted_price:", res_json["predicted_price"])
    assert "predicted_quantity" in res_json
    assert "predicted_price" in res_json
    print("ALL TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    test_pipeline()
