import requests
from datetime import date, timedelta

rows = []
for i in range(60):
    d = (date(2023, 1, 1) + timedelta(days=i)).isoformat()
    rows.append({'date': d, 'product': 'TestProd', 'sales': 10 + i, 'price': 100.0 + i * 0.5})

data = {'rows': rows, 'horizon_days': 5}
print(f"Sending {len(rows)} rows...")
r = requests.post('http://localhost:7860/train', json=data)
print('Status:', r.status_code)

if r.ok:
    m = r.json()
    mid = m['model_id']
    print('Model:', mid)
    print('Products:', m['products'])
    r2 = requests.post(f'http://localhost:7860/predict/{mid}', json={'horizon_days': 5})
    p = r2.json()
    print('Predicted qty:', p['predicted_quantity'])
    print('Predicted price:', p['predicted_price'])
    print('Products in response:', [x['product'] for x in p['products']])
else:
    print('Error:', r.text[:500])
