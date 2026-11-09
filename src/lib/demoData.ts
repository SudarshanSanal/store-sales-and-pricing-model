/**
 * Helper to generate synthetic demo CSV data for 1-click loading.
 */
export function getDemoCsvString(): string {
  const products = [
    { name: 'Wireless Headphones', basePrice: 2499, baseSales: 45, priceVar: 150, salesVar: 12 },
    { name: 'Smart Watch Pro', basePrice: 4999, baseSales: 28, priceVar: 300, salesVar: 8 },
    { name: 'Mechanical Keyboard', basePrice: 3299, baseSales: 35, priceVar: 200, salesVar: 10 },
  ];

  const headers = [
    'date', 'product', 'sales', 'price', 'stock', 
    'promo', 'discount', 'ad_spend', 'stockout', 
    'weather_temp', 'weather_rain', 'search_trend'
  ];
  const rows: string[] = [headers.join(',')];

  // 60 days ending today
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 60);

  for (let d = 0; d < 60; d++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + d);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayOfWeek = curDate.getDay();

    // Weekend boost multiplier
    const dayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;

    products.forEach((p, idx) => {
      // Periodic promotional discount every 14 days
      const isPromo = (d + idx * 3) % 14 === 0;
      const discountMult = isPromo ? 0.88 : 1.0;

      const currentPrice = Math.round((p.basePrice + Math.sin(d / 5) * p.priceVar) * discountMult);
      // Lower price increases sales quantity (price elasticity effect)
      const elasticityBoost = isPromo ? 1.25 : 1.0;
      
      let salesQty = Math.max(
        5,
        Math.round((p.baseSales + Math.cos(d / 3) * p.salesVar + (d * 0.15)) * dayMultiplier * elasticityBoost)
      );

      const stockLevel = Math.max(10, 200 - ((d * 15 + idx * 40) % 180));

      // Simulate a stockout day (zero sales, zero stock, stockout flag = 1)
      const isStockout = d === 15 && idx === 0 ? 1 : 0;
      let finalStock = stockLevel;
      if (isStockout) {
        salesQty = 0;
        finalStock = 0;
      }

      const promoVal = isPromo ? 1 : 0;
      const discountVal = isPromo ? 0.12 : 0.0;
      const adSpendVal = isPromo ? 1500 : 0;

      // Weather and Trend simulation
      const weatherTemp = Math.round(24 + Math.sin(d / 8) * 6);
      const weatherRain = (d + idx) % 9 === 0 ? Math.round(5 + Math.random() * 15) : 0;
      const searchTrend = Math.round(50 + Math.cos(d / 6) * 25);

      rows.push(
        `${dateStr},${p.name},${salesQty},${currentPrice},${finalStock},` +
        `${promoVal},${discountVal},${adSpendVal},${isStockout},` +
        `${weatherTemp},${weatherRain},${searchTrend}`
      );
    });
  }

  return rows.join('\n');
}
