import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useForecast, deriveSeasonal } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';
import { Tag, TrendingDown, TrendingUp } from 'lucide-react';

export function SeasonalTrends() {
  const forecast = useForecast();
  const data = deriveSeasonal(forecast);

  if (data.length === 0) {
    return <EmptyForecastState title="No seasonal decomposition yet" />;
  }

  // Find the lowest and highest seasonal points for discount recommendations
  const lowestSeasonality = data.reduce((min, p) => p.seasonal < min.seasonal ? p : min, data[0]);
  const highestSeasonality = data.reduce((max, p) => p.seasonal > max.seasonal ? p : max, data[0]);

  // Format dates for display
  const formatMonth = (d: string) => {
    return new Date(d).toLocaleString('en-US', { month: 'long' });
  };
  
  const discountMonth = formatMonth(lowestSeasonality.date);
  const peakMonth = formatMonth(highestSeasonality.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-4"
    >
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Seasonal Decomposition</h3>
        <p className="text-sm text-muted-foreground font-mono mb-4">Trend · Seasonal · Residual (your data)</p>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(v) => v.slice(5)} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
            <Line type="monotone" dataKey="observed" stroke="hsl(210 20% 70%)" strokeWidth={2} dot={false} name="Observed" />
            <Line type="monotone" dataKey="trend" stroke="hsl(168 80% 50%)" strokeWidth={2} dot={false} name="Trend" />
            <Line type="monotone" dataKey="seasonal" stroke="hsl(260 60% 60%)" strokeWidth={1.5} dot={false} name="Seasonal" />
            <Line type="monotone" dataKey="residual" stroke="hsl(38 92% 55%)" strokeWidth={1} dot={false} name="Residual" opacity={0.6} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 border border-primary/20 bg-primary/5">
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Discount Strategy Insight
          </h4>
          <p className="text-xs font-mono text-muted-foreground mb-3">
            Based on historical seasonality, the optimal time to run major discounts and promotional campaigns is during your lowest demand periods to stimulate sales velocity.
          </p>
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-foreground">Recommend Discounts In: {discountMonth}</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              Demand drops by ~{Math.abs(lowestSeasonality.seasonal)} units compared to your baseline trend. Run clearance or promotional pricing.
            </p>
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5">
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Peak Season Insight
          </h4>
          <p className="text-xs font-mono text-muted-foreground mb-3">
            During peak seasons, natural demand is high. Avoid deep discounting to maximize your profit margins and focus heavily on ensuring adequate stock levels.
          </p>
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-foreground">Hold Premium Pricing In: {peakMonth}</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              Demand spikes by ~{highestSeasonality.seasonal} units above your baseline. Maximize margins and prioritize inventory fulfillment.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
