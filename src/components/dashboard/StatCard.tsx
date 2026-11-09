import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="glass-card-hover p-4 md:p-5 flex flex-col justify-between group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-primary/10 transition-all duration-300" />
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="min-w-0">
          <p className="metric-label font-mono tracking-wider text-[11px] font-semibold">{label}</p>
          <p className="stat-value mt-1.5 text-foreground font-bold tracking-tight text-xl md:text-2xl truncate">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 group-hover:scale-105 transition-transform duration-200">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-mono relative z-10">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
            trendUp ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
          }`}>
            <span>{trendUp ? '▲' : '▼'}</span>
            <span>{trend}</span>
          </span>
          <span className="text-[10px] text-muted-foreground">vs prev period</span>
        </div>
      )}
    </motion.div>
  );
}
