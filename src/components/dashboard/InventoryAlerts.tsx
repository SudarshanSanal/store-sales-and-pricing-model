import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useForecast, deriveInventory } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';

const statusConfig = {
  critical: { icon: AlertCircle, colorClass: 'text-destructive', bgClass: 'bg-destructive/10', label: 'Critical' },
  warning: { icon: AlertTriangle, colorClass: 'text-warning', bgClass: 'bg-warning/10', label: 'Warning' },
  healthy: { icon: CheckCircle, colorClass: 'text-success', bgClass: 'bg-success/10', label: 'Healthy' },
};

export function InventoryAlerts() {
  const forecast = useForecast();
  const items = deriveInventory(forecast);

  if (items.length === 0) {
    return <EmptyForecastState title="No inventory recommendations yet" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-1">Inventory Optimization</h3>
      <p className="text-sm text-muted-foreground font-mono mb-4">ROP · EOQ · Safety Stock (from your demand)</p>

      <div className="space-y-3">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          const stockPct = Math.min(100, (item.currentStock / Math.max(1, item.rop)) * 100);

          return (
            <div key={item.product} className="p-4 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.colorClass}`} />
                  <span className="font-medium text-sm text-foreground">{item.product}</span>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${config.bgClass} ${config.colorClass}`}>
                  {config.label}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-secondary mb-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.status === 'critical' ? 'bg-destructive' : item.status === 'warning' ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${stockPct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
                <div>
                  <p className="text-muted-foreground">Stock</p>
                  <p className="text-foreground font-semibold">{item.currentStock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ROP</p>
                  <p className="text-foreground font-semibold">{item.rop}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">EOQ</p>
                  <p className="text-foreground font-semibold">{item.eoq}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Safety</p>
                  <p className="text-foreground font-semibold">{item.safetyStock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cover</p>
                  <p className="text-foreground font-semibold">{item.daysOfCover}d</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder</p>
                  <p className="text-foreground font-semibold">{item.reorderQty}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
