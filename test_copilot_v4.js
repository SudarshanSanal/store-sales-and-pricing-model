import {
  processAIChat,
  buildQueryPlan,
  getOrBuildProductIndex,
  resolveProductEntity,
  validateAnswer,
  invalidateCopilotCache
} from './aiCopilotService.js';

// Mock DB for offline unit test verification
class MockCollection {
  constructor(data) {
    this.data = data;
  }
  async findOne(query) {
    if (query && query._id) {
      return this.data.find(d => String(d._id) === String(query._id)) || null;
    }
    return this.data[0] || null;
  }
  find() {
    const data = this.data;
    return {
      project: () => ({ toArray: async () => data }),
      sort: () => ({
        limit: () => ({ toArray: async () => data }),
        toArray: async () => data
      }),
      toArray: async () => data
    };
  }
  async insertOne(doc) {
    this.data.push(doc);
    return { acknowledged: true, insertedId: doc._id || 'mock-id' };
  }
}

class MockDB {
  constructor(forecasts, datasets) {
    this.forecasts = new MockCollection(forecasts);
    this.datasets = new MockCollection(datasets);
    this.analytics = new MockCollection([]);
  }
  collection(name) {
    if (name === 'forecasts') return this.forecasts;
    if (name === 'datasets') return this.datasets;
    return this.analytics;
  }
}

// ── Sample Dynamic Dataset 1 (Classic Electronics) ──────────────────────────
const mockForecast1 = {
  _id: 'fc-111',
  datasetId: 'ds-111',
  createdAt: new Date(),
  horizonDays: 30,
  products: [
    {
      product: 'Apple Gaming Controller - 43-inch',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 5,
        predicted_price: 25525
      }))
    },
    {
      product: 'Lenovo Fast Charger - 64GB',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 8,
        predicted_price: 38000
      }))
    },
    {
      product: 'boAt Gaming Controller - 64GB',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 6,
        predicted_price: 32800
      }))
    }
  ]
};

// ── Sample Dynamic Dataset 2 (New CSV Uploaded - Shoes, Monitors, Appliances) ─
const mockForecast2 = {
  _id: 'fc-222',
  datasetId: 'ds-222',
  createdAt: new Date(),
  horizonDays: 30,
  products: [
    {
      product: 'Running Shoes',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 12,
        predicted_price: 2499 + (i % 5) * 50
      }))
    },
    {
      product: '4K Monitor',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 3,
        predicted_price: 28999 + (i % 3) * 200
      }))
    },
    {
      product: 'Solar Water Heater',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 2,
        predicted_price: 18500
      }))
    },
    {
      product: 'Organic Peanut Butter',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 25,
        predicted_price: 450
      }))
    }
  ]
};

const mockDb1 = new MockDB([mockForecast1], [{ name: 'Dataset 1', _id: 'ds-111' }]);
const mockDb2 = new MockDB([mockForecast2], [{ name: 'Dataset 2', _id: 'ds-222' }]);

async function runMasterVerificationTests() {
  console.log('====================================================');
  console.log('MASTER VERIFICATION TEST SUITE — SV FORECAST AI v4.0');
  console.log('====================================================\n');

  // ── TEST 1: EXACT UI BUG 1 — "running shoes lowest price next month" ─────
  console.log('--- TEST 1: running shoes lowest price next month ---');
  const res1 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'running shoes lowest price next month' }]
  });
  console.log('QueryPlan Intent:', res1.queryPlan.intent, '| Scope:', res1.queryPlan.scope, '| Operation:', res1.queryPlan.operation);
  console.log('Product:', res1.entities.product);
  console.log('Response Markdown:\n', res1.text);
  if (res1.queryPlan.scope !== 'single_product') throw new Error('FAILED TEST 1: Must be single_product scope');
  if (res1.entities.product !== 'Running Shoes') throw new Error('FAILED TEST 1: Must resolve Running Shoes');
  if (res1.text.includes('Top 5') || res1.text.includes('Bottom 5')) throw new Error('FAILED TEST 1: Must NOT return ranking table!');
  console.log('✓ TEST 1 PASSED PERFECTLY!\n');

  // ── TEST 2: EXACT UI BUG 2 — "running shoes total revenue next month" ─────
  console.log('--- TEST 2: running shoes total revenue next month ---');
  const res2 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'running shoes total revenue next month' }]
  });
  console.log('QueryPlan Intent:', res2.queryPlan.intent, '| Scope:', res2.queryPlan.scope);
  console.log('Product:', res2.entities.product);
  if (res2.queryPlan.scope !== 'single_product') throw new Error('FAILED TEST 2: Must be single_product scope');
  if (res2.entities.product !== 'Running Shoes') throw new Error('FAILED TEST 2: Must resolve Running Shoes');
  if (res2.text.includes('Total Catalog Revenue')) throw new Error('FAILED TEST 2: Must NOT return global catalog revenue!');
  console.log('✓ TEST 2 PASSED PERFECTLY!\n');

  // ── TEST 3: EXACT UI BUG 3 — "highest price of 4k monitor next month" ─────
  console.log('--- TEST 3: highest price of 4k monitor next month ---');
  const res3 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'highest price of 4k monitor next month' }]
  });
  console.log('QueryPlan Intent:', res3.queryPlan.intent, '| Scope:', res3.queryPlan.scope, '| Operation:', res3.queryPlan.operation);
  console.log('Product:', res3.entities.product);
  if (res3.queryPlan.scope !== 'single_product') throw new Error('FAILED TEST 3: Must be single_product scope');
  if (res3.entities.product !== '4K Monitor') throw new Error('FAILED TEST 3: Must resolve 4K Monitor');
  if (res3.text.includes('Top 5 Products')) throw new Error('FAILED TEST 3: Must NOT return Top 5 ranking table!');
  console.log('✓ TEST 3 PASSED PERFECTLY!\n');

  // ── TEST 4: DYNAMIC DATASET ADAPTATION — Unseen products dynamically resolved ──
  console.log('--- TEST 4: Dynamic Dataset Adaptation (Solar Water Heater) ---');
  const res4 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'Solar Water Heater demand next month' }]
  });
  console.log('Product:', res4.entities.product);
  if (res4.entities.product !== 'Solar Water Heater') throw new Error('FAILED TEST 4: Must resolve Solar Water Heater dynamically without code changes');
  console.log('✓ TEST 4 PASSED PERFECTLY!\n');

  // ── TEST 5: SAFETY — Unknown products NEVER silently mapped ───────────────
  console.log('--- TEST 5: Unknown Product Safety Guard ---');
  const res5 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'price of Quantum Computer 9000' }]
  });
  console.log('Product Found:', res5.entities.product);
  console.log('Response:\n', res5.text);
  if (res5.entities.product !== null) throw new Error('FAILED TEST 5: Unknown product MUST NOT resolve to an unrelated product!');
  if (!res5.text.includes('Product Not Found')) throw new Error('FAILED TEST 5: Must return Product Not Found response');
  console.log('✓ TEST 5 PASSED PERFECTLY!\n');

  // ── TEST 6: MULTILINGUAL KANNADA QUERY INTEGRITY ──────────────────────────
  console.log('--- TEST 6: Multilingual Kannada Revenue Query ---');
  const res6 = await processAIChat({
    db: mockDb1,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'ಮುಂದಿನ ತಿಂಗಳಿನ ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲ್ ಆದಾಯ ಎಷ್ಟು' }]
  });
  console.log('Language:', res6.language, '| Product:', res6.entities.product);
  if (res6.language !== 'kn') throw new Error('FAILED TEST 6: Language should be kn');
  if (res6.entities.product !== 'Apple Gaming Controller - 43-inch') throw new Error('FAILED TEST 6: Must resolve Apple Gaming Controller');
  console.log('✓ TEST 6 PASSED PERFECTLY!\n');

  // ── TEST 7: CACHE INVALIDATION & DATASET SWITCHING ────────────────────────
  console.log('--- TEST 7: Dataset Switching & Invalidation ---');
  invalidateCopilotCache('ds-222', 'fc-222');
  const res7 = await processAIChat({
    db: mockDb2,
    userId: 'user-1',
    messages: [{ role: 'user', content: 'organic peanut butter forecast' }],
    forecastId: 'fc-222'
  });
  if (res7.entities.product !== 'Organic Peanut Butter') throw new Error('FAILED TEST 7: Must resolve Organic Peanut Butter after cache reset');
  console.log('✓ TEST 7 PASSED PERFECTLY!\n');

  console.log('====================================================');
  console.log('ALL 7 MASTER VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('====================================================');
}

runMasterVerificationTests().catch(err => {
  console.error('Master Test Suite Error:', err);
  process.exit(1);
});
