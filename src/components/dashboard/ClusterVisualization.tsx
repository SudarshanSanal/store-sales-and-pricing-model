import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useForecast, deriveClusters } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';

const clusterColors = ['hsl(168 80% 50%)', 'hsl(260 60% 60%)', 'hsl(30 90% 60%)', 'hsl(340 70% 55%)'];

export function ClusterVisualization() {
  const forecast = useForecast();
  const { points, labels } = deriveClusters(forecast);

  if (points.length === 0) {
    return <EmptyForecastState title="No clusters yet" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-1">Demand Clustering</h3>
      <p className="text-sm text-muted-foreground font-mono mb-4">Avg demand vs volatility (your products)</p>

      <div className="flex flex-wrap gap-4 mb-4">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: clusterColors[i] }} />
            <span className="text-xs text-muted-foreground font-mono">{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="x" name="AvgDemand" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" label={{ value: 'Avg Daily Demand', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis dataKey="y" name="Volatility" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" label={{ value: 'Std Dev', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono',
              fontSize: '12px',
              color: 'hsl(var(--popover-foreground))',
            }}
            formatter={(value: number, name: string, p: any) => {
              if (name === 'x') return [value, 'Avg Demand'];
              if (name === 'y') return [value, 'Volatility'];
              return [value, name];
            }}
            labelFormatter={() => ''}
          />
          <Scatter data={points} fill="hsl(168 80% 50%)">
            {points.map((entry, i) => (
              <Cell key={i} fill={clusterColors[entry.cluster]} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
