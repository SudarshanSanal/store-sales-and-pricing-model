import { processAIChat, detectLanguage, findBestProductMatch, classifyIntent, extractEntities, normalizeInputText } from './aiCopilotService.js';

// Mock DB for offline unit test verification
class MockCollection {
  constructor(data) {
    this.data = data;
  }
  async findOne() {
    return this.data[0] || null;
  }
  find() {
    const data = this.data;
    return {
      project: () => ({
        toArray: async () => data
      }),
      sort: () => ({
        limit: () => ({
          toArray: async () => data
        }),
        toArray: async () => data
      }),
      toArray: async () => data
    };
  }
  async insertOne() {
    return { acknowledged: true };
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

// Sample dataset with Apple Gaming Controller - 43-inch and other products
const mockForecast = {
  createdAt: new Date(),
  horizonDays: 30,
  products: [
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
    },
    {
      product: 'Apple Gaming Controller - 43-inch',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 5,
        predicted_price: 25525
      }))
    },
    {
      product: 'Mechanical Keyboard - RGB',
      series: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        predicted_quantity: 10,
        predicted_price: 4500
      }))
    }
  ]
};

const mockDb = new MockDB([mockForecast], [{ name: 'Test Dataset', rowCount: 120, productCount: 4 }]);

async function runTests() {
  console.log('====================================================');
  console.log('TEST 1: EXACT SCREENSHOT KANNADA FAILURE QUERY');
  console.log('====================================================');
  const screenshotQuery = 'ಮುಂದಿನ ತಿಂಗಳಿನ ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲ್ ಆದಾಯ ಎಷ್ಟು';
  console.log('Query:', screenshotQuery);

  const res1 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: screenshotQuery }],
    conversationContext: {},
    language: 'auto'
  });

  console.log('Detected Language:', res1.language);
  console.log('Intent:', res1.intent);
  console.log('Entities:', res1.entities);
  console.log('Response Markdown:\n', res1.text);

  console.log('\n--- VERIFICATION CHECKS FOR TEST 1 ---');
  if (res1.language !== 'kn') throw new Error(`FAILED: Language should be kn (got ${res1.language})`);
  if (res1.intent !== 'revenue_query') throw new Error(`FAILED: Intent should be revenue_query (got ${res1.intent})`);
  if (res1.entities.product !== 'Apple Gaming Controller - 43-inch') throw new Error(`FAILED: Product should match Apple Gaming Controller - 43-inch (got ${res1.entities.product})`);
  if (res1.text.includes('overview of your forecast data')) throw new Error('FAILED: Must NOT contain generic overview fallback text!');
  if (!res1.text.includes('ಆದಾಯ ಮುನ್ಸೂಚನೆ')) throw new Error('FAILED: Response must be in Kannada script');

  console.log('✓ TEST 1 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 2: UNKNOWN / LOW CONFIDENCE QUERY');
  console.log('====================================================');
  const unknownQuery = 'random unstructured string xyz123';
  const res2 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: unknownQuery }],
    conversationContext: {},
    language: 'kn'
  });

  console.log('Detected Language:', res2.language);
  console.log('Response Markdown:\n', res2.text);
  if (res2.text.includes('overview of your forecast data')) throw new Error('FAILED: Unknown query MUST NOT return generic overview forecast table!');
  if (res2.text.includes('| Lenovo Fast Charger')) throw new Error('FAILED: Unknown query MUST NOT return top 5 table!');
  if (!res2.text.includes('ನಿಮಗೆ ನಿಖರವಾದ ಉತ್ತರ ನೀಡಲು ನಾನು ಬಯಸುತ್ತೇನೆ')) throw new Error('FAILED: Must return clarification prompt in Kannada');

  console.log('✓ TEST 2 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 3: HINDI REVENUE QUERY');
  console.log('====================================================');
  const hindiQuery = 'ऐप्पल गेमिंग कंट्रोलर का अगले महीने का राजस्व कितना है?';
  const res3 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: hindiQuery }],
    conversationContext: {},
    language: 'auto'
  });
  console.log('Detected Language:', res3.language);
  console.log('Intent:', res3.intent);
  console.log('Product:', res3.entities.product);
  console.log('Response:\n', res3.text);
  if (res3.language !== 'hi') throw new Error(`FAILED: Language should be hi (got ${res3.language})`);
  if (res3.entities.product !== 'Apple Gaming Controller - 43-inch') throw new Error(`FAILED: Product should match Apple Gaming Controller (got ${res3.entities.product})`);

  console.log('✓ TEST 3 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 4: PRICE EXTREME DATE QUERY');
  console.log('====================================================');
  const dateQuery = 'when was the highest price date for Mechanical Keyboard?';
  const res4 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: dateQuery }],
    conversationContext: {},
    language: 'en'
  });
  console.log('Detected Language:', res4.language);
  console.log('Intent:', res4.intent);
  console.log('Response:\n', res4.text);
  if (res4.intent !== 'price_extreme_date') throw new Error(`FAILED: Intent should be price_extreme_date (got ${res4.intent})`);
  if (!res4.text.includes('Price Extremes & Dates')) throw new Error('FAILED: Should contain price dates table');

  console.log('✓ TEST 4 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 5: KANNADA PRICE EXTREME DATE QUERY');
  console.log('====================================================');
  const knDateQuery = 'ಗರಿಷ್ಠ ಬೆಲೆ ಯಾವಾಗ ಇರುತ್ತದೆ';
  const res5 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: knDateQuery }],
    conversationContext: {},
    language: 'kn'
  });
  console.log('Detected Language:', res5.language);
  console.log('Intent:', res5.intent);
  console.log('Response:\n', res5.text);
  if (res5.language !== 'kn') throw new Error(`FAILED: Language should be kn (got ${res5.language})`);
  if (!['price_extreme_date', 'pricing_query'].includes(res5.intent)) throw new Error(`FAILED: Intent should be price_extreme_date or pricing_query (got ${res5.intent})`);
  if (res5.text.includes('overview of your forecast data')) throw new Error('FAILED: Must NOT contain generic overview table');

  console.log('✓ TEST 5 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 6: KANNADA STANDALONE PRODUCT QUERY');
  console.log('====================================================');
  const knProdQuery = 'ಆಪಲ್ ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲರ್';
  const res6 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: knProdQuery }],
    conversationContext: {},
    language: 'kn'
  });
  console.log('Detected Language:', res6.language);
  console.log('Intent:', res6.intent);
  console.log('Product:', res6.entities.product);
  console.log('Response:\n', res6.text);
  if (res6.language !== 'kn') throw new Error(`FAILED: Language should be kn (got ${res6.language})`);
  if (res6.entities.product !== 'Apple Gaming Controller - 43-inch') throw new Error(`FAILED: Product should match Apple Gaming Controller (got ${res6.entities.product})`);
  if (res6.text.includes('overview of your forecast data')) throw new Error('FAILED: Must NOT contain generic overview table');

  console.log('✓ TEST 6 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 7: KANNADA INVENTORY / STOCK QUERY');
  console.log('====================================================');
  const knStockQuery = 'ಗೇಮಿಂಗ್ ಕಂಟ್ರೋಲರ್ ನ ದಾಸ್ತಾನು ಸ್ಥಿತಿ ಸ್ಟಾಕ್ ವಿವರವನ್ನು ವಿವರಿಸಿ';
  const res7 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: knStockQuery }],
    conversationContext: {},
    language: 'kn'
  });
  console.log('Detected Language:', res7.language);
  console.log('Intent:', res7.intent);
  console.log('Product:', res7.entities.product);
  console.log('Response:\n', res7.text);
  if (res7.language !== 'kn') throw new Error(`FAILED: Language should be kn (got ${res7.language})`);
  if (res7.entities.product && res7.entities.product !== 'Apple Gaming Controller - 43-inch' && res7.entities.product !== 'boAt Gaming Controller - 64GB') throw new Error(`FAILED: Product should match gaming controller (got ${res7.entities.product})`);

  console.log('✓ TEST 7 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 8: TELUGU STANDALONE CHARGER QUERY');
  console.log('====================================================');
  const teChargerQuery = 'చార్జర్';
  const res8 = await processAIChat({
    db: mockDb,
    userId: 'user-123',
    messages: [{ role: 'user', content: teChargerQuery }],
    conversationContext: {},
    language: 'te'
  });
  console.log('Detected Language:', res8.language);
  console.log('Intent:', res8.intent);
  console.log('Product:', res8.entities.product);
  console.log('Response:\n', res8.text);
  if (res8.language !== 'te') throw new Error(`FAILED: Language should be te (got ${res8.language})`);
  if (res8.entities.product !== 'Lenovo Fast Charger - 64GB') throw new Error(`FAILED: Product should match Lenovo Fast Charger (got ${res8.entities.product})`);


  console.log('✓ TEST 8 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('TEST 9: TOP 5 REVENUE RANKING IN MULTIPLE LANGUAGES');
  console.log('====================================================');
  for (const lang of ['te', 'kn', 'hi']) {
    const topNQuery = 'Top 5 products by projected revenue';
    const res9 = await processAIChat({
      db: mockDb,
      userId: 'user-123',
      messages: [{ role: 'user', content: topNQuery }],
      conversationContext: {},
      language: lang
    });
    console.log(`[${lang}] Detected Language:`, res9.language, '| Intent:', res9.intent);
    if (res9.language !== lang) throw new Error(`FAILED: Language should be ${lang} (got ${res9.language})`);
    if (res9.intent !== 'top_n_ranking') throw new Error(`FAILED: Intent should be top_n_ranking (got ${res9.intent})`);
  }
  console.log('✓ TEST 9 PASSED PERFECTLY!');

  console.log('\n====================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});

