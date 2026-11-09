import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useForecast, deriveModelComparison } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';
import { Package, DollarSign } from 'lucide-react';

const barColors = ['hsl(260 60% 60%)', 'hsl(30 90% 60%)', 'hsl(168 80% 50%)'];

export function ModelComparison() {
  const forecast = useForecast();
  const [targetView, setTargetView] = useState<'quantity' | 'price'>('quantity');
  const rows = deriveModelComparison(forecast, targetView);

  if (rows.length === 0) {
    return <EmptyForecastState title="No model metrics yet" />;
  }

  const r2Data = rows.map((m, i) => ({ name: m.model.split(' ')[0], r2: m.r2, idx: i }));
  const bestIdx = rows.reduce((best, m, i) => (m.r2 > rows[best].r2 ? i : best), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 md:p-6 space-y-5 glow-subtle"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3.5 border-b border-border/60">
        <div>
          <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">Model Performance Analytics</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">XGBoost vs Multi-Output LSTM vs Hybrid Stacked Ensemble</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border">
          <button
            onClick={() => setTargetView('quantity')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              targetView === 'quantity' ? 'bg-primary text-primary-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Quantity
          </button>
          <button
            onClick={() => setTargetView('price')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              targetView === 'price' ? 'bg-emerald-500 text-white shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Price
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30">
              <th className="text-left py-3 px-4 metric-label text-[10px]">Model Architecture</th>
              <th className="text-right py-3 px-4 metric-label text-[10px]">MAE</th>
              <th className="text-right py-3 px-4 metric-label text-[10px]">RMSE</th>
              <th className="text-right py-3 px-4 metric-label text-[10px]">MAPE %</th>
              <th className="text-right py-3 px-4 metric-label text-[10px]">R² Score</th>
              <th className="text-right py-3 px-4 metric-label text-[10px]">Training Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((m, i) => (
              <tr
                key={m.model}
                className={`transition-colors hover:bg-muted/40 ${
                  i === bestIdx ? 'bg-primary/5' : ''
                }`}
              >
                <td className="py-3 px-4 text-foreground font-semibold text-xs flex items-center gap-2">
                  {i === bestIdx ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 shrink-0">
                      Best
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                  )}
                  <span>{m.model}</span>
                </td>
                <td className="text-right py-3 px-4 text-muted-foreground font-mono">{m.mae}</td>
                <td className="text-right py-3 px-4 text-muted-foreground font-mono">{m.rmse}</td>
                <td className="text-right py-3 px-4 text-muted-foreground font-mono">{m.mape}%</td>
                <td className={`text-right py-3 px-4 font-bold font-mono ${m.r2 >= 0.85 ? 'text-emerald-500' : 'text-foreground'}`}>
                  {m.r2.toFixed(3)}
                </td>
                <td className="text-right py-3 px-4 text-muted-foreground font-mono">{m.trainTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-2">
        <p className="text-xs font-mono text-muted-foreground mb-2 flex items-center justify-between">
          <span>R² Score Comparison</span>
          <span className="text-[10px] text-primary font-semibold">Higher is better (Max 1.00)</span>
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={r2Data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} fontFamily="JetBrains Mono" />
            <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} fontFamily="JetBrains Mono" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                color: 'hsl(var(--popover-foreground))',
                boxShadow: '0 8px 20px -4px rgba(0,0,0,0.2)',
              }}
            />
            <Bar dataKey="r2" radius={[6, 6, 0, 0]}>
              {r2Data.map((_, i) => (
                <Cell key={i} fill={barColors[i % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
