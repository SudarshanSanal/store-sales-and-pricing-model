import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingDown, TrendingUp, AlertTriangle, Play, RefreshCw, Zap } from 'lucide-react';
import { useForecast } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ScenarioPlanning() {
  const forecast = useForecast();
  
  const [inflation, setInflation] = useState(0);
  const [competitorPriceDrop, setCompetitorPriceDrop] = useState(0);
  const [marketingBoost, setMarketingBoost] = useState(0);
  const [supplyChainDelay, setSupplyChainDelay] = useState(0);

  const [activeScenario, setActiveScenario] = useState<{name: string, description: string} | null>(null);

  if (!forecast || forecast.products.length === 0) {
    return <EmptyForecastState title="No baseline forecast available" hint="Upload data to generate a baseline forecast before running macro-economic simulations." />;
  }

  const activeProduct = forecast.products[0];

  const reset = () => {
    setInflation(0);
    setCompetitorPriceDrop(0);
    setMarketingBoost(0);
    setSupplyChainDelay(0);
    setActiveScenario(null);
  };

  const applyScenario = (name: string, desc: string, i: number, c: number, m: number, s: number) => {
    setInflation(i);
    setCompetitorPriceDrop(c);
    setMarketingBoost(m);
    setSupplyChainDelay(s);
    setActiveScenario({name, description: desc});
  };

  // Calculate simulated data
  const chartData = activeProduct.series.map(pt => {
    const isForecast = pt.actual_quantity === null || pt.actual_quantity === undefined;
    
    const baseQty = pt.hybrid_quantity ?? pt.predicted_quantity ?? pt.actual_quantity ?? 0;
    const basePrice = pt.hybrid_price ?? pt.predicted_price ?? pt.actual_price ?? 150;
    
    let simQty = baseQty;
    let simPrice = basePrice;

    if (isForecast) {
      // Apply shocks
      simPrice = basePrice * (1 + (inflation / 100)); // Inflation raises our prices
      
      let demandMultiplier = 1.0;
      demandMultiplier -= (competitorPriceDrop / 100) * 1.5; // Competitor drop steals demand
      demandMultiplier += (marketingBoost / 100) * 0.8; // Marketing increases demand
      demandMultiplier -= (supplyChainDelay > 0 ? 0.15 : 0); // Supply chain delay lowers demand due to stockouts

      simQty = Math.max(0, Math.round(baseQty * demandMultiplier));
    }

    return {
      date: pt.date.slice(5),
      baselineQty: baseQty,
      baselinePrice: basePrice,
      simulatedQty: simQty,
      simulatedPrice: simPrice,
      isForecast
    };
  });

  const forecastedPts = chartData.filter(d => d.isForecast);
  const totalBaseQty = forecastedPts.reduce((acc, d) => acc + d.baselineQty, 0);
  const totalSimQty = forecastedPts.reduce((acc, d) => acc + d.simulatedQty, 0);
  const totalBaseRev = forecastedPts.reduce((acc, d) => acc + (d.baselineQty * d.baselinePrice), 0);
  const totalSimRev = forecastedPts.reduce((acc, d) => acc + (d.simulatedQty * d.simulatedPrice), 0);

  const revDiff = totalSimRev - totalBaseRev;
  const qtyDiff = totalSimQty - totalBaseQty;

  const formatInr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="glass-card p-6 border border-indigo-500/20">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" /> Macro-Economic Scenario Planning
            </h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">Stress-test your Hybrid ML forecast against market shocks.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => applyScenario('Recession Shock', 'High inflation and aggressive competitor discounting.', 8, 15, 0, 0)} className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-secondary/50 hover:bg-secondary hover:text-indigo-400 transition-colors">
              📉 Recession Shock
            </button>
            <button onClick={() => applyScenario('Aggressive Growth', 'High marketing spend in a stable market.', 2, 0, 25, 0)} className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-secondary/50 hover:bg-secondary hover:text-emerald-400 transition-colors">
              🚀 Growth Campaign
            </button>
            <button onClick={() => applyScenario('Supply Chain Crisis', 'Major logistical delays causing stockouts.', 5, 0, 0, 14)} className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-secondary/50 hover:bg-secondary hover:text-amber-400 transition-colors">
              ⚠️ Supply Chain Crisis
            </button>
            <button onClick={reset} className="px-3 py-1.5 text-xs font-mono rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Inflation Rate (%)</span>
              <span className="text-foreground">+{inflation}%</span>
            </div>
            <input type="range" min="0" max="20" value={inflation} onChange={e => setInflation(Number(e.target.value))} className="w-full h-2 bg-secondary rounded-full appearance-none accent-indigo-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Competitor Price Drop (%)</span>
              <span className="text-destructive">-{competitorPriceDrop}%</span>
            </div>
            <input type="range" min="0" max="30" value={competitorPriceDrop} onChange={e => setCompetitorPriceDrop(Number(e.target.value))} className="w-full h-2 bg-secondary rounded-full appearance-none accent-destructive" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Marketing Boost (%)</span>
              <span className="text-emerald-400">+{marketingBoost}%</span>
            </div>
            <input type="range" min="0" max="50" value={marketingBoost} onChange={e => setMarketingBoost(Number(e.target.value))} className="w-full h-2 bg-secondary rounded-full appearance-none accent-emerald-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Supply Chain Delay (Days)</span>
              <span className="text-amber-400">+{supplyChainDelay}d</span>
            </div>
            <input type="range" min="0" max="30" value={supplyChainDelay} onChange={e => setSupplyChainDelay(Number(e.target.value))} className="w-full h-2 bg-secondary rounded-full appearance-none accent-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <p className="text-xs font-mono text-muted-foreground mb-1">Simulated Revenue Impact (Over Forecast Horizon)</p>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold font-mono text-foreground">{formatInr(totalSimRev)}</span>
              <span className={`text-sm font-mono font-bold mb-1 ${revDiff >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                {revDiff >= 0 ? '+' : ''}{formatInr(revDiff)} vs baseline
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <p className="text-xs font-mono text-muted-foreground mb-1">Simulated Demand Impact (Over Forecast Horizon)</p>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold font-mono text-foreground">{totalSimQty.toLocaleString()} units</span>
              <span className={`text-sm font-mono font-bold mb-1 ${qtyDiff >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                {qtyDiff >= 0 ? '+' : ''}{qtyDiff.toLocaleString()} units vs baseline
              </span>
            </div>
          </div>
        </div>

        {activeScenario && (
          <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-indigo-400">Active Scenario: {activeScenario.name}</h4>
              <p className="text-xs font-mono text-indigo-400/80 mt-1">{activeScenario.description}</p>
            </div>
          </div>
        )}

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(240 80% 65%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(240 80% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
              
              <Line type="monotone" dataKey="baselineQty" stroke="hsl(215 15% 55%)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Baseline Demand" />
              <Area type="monotone" dataKey="simulatedQty" stroke="hsl(240 80% 65%)" strokeWidth={2} fill="url(#simGrad)" dot={false} name="Simulated Demand" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
