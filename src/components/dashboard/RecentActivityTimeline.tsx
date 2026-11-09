import { motion } from 'framer-motion';
import { Activity, Database, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';

const activities = [
  { id: 1, type: 'success', icon: CheckCircle2, title: 'Model trained successfully', desc: 'Hybrid XGBoost–LSTM model achieved 95% validation accuracy.', time: 'Just now' },
  { id: 2, type: 'info', icon: Database, title: 'Data pipeline complete', desc: 'Processed 3,450 rows across 5 products. Imputed 12 missing values.', time: '2 mins ago' },
  { id: 3, type: 'warning', icon: AlertTriangle, title: 'Inventory alert generated', desc: '2 products identified at high risk of stockout within 7 days.', time: '5 mins ago' },
  { id: 4, type: 'upload', icon: Upload, title: 'CSV dataset uploaded', desc: 'User uploaded "ecommerce_sales_historical.csv".', time: '10 mins ago' },
];

export function RecentActivityTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, ease: 'easeOut' }}
      className="glass-card p-5 md:p-6 glow-subtle"
    >
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">Recent Pipeline Activity</h3>
            <p className="text-xs text-muted-foreground font-mono">Automated training & execution logs</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Live Sync</span>
      </div>
      
      <div className="space-y-4 pt-1">
        {activities.map((act, index) => {
          const Icon = act.icon;
          const colorClass = 
            act.type === 'success' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
            act.type === 'warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
            act.type === 'info' ? 'text-sky-500 bg-sky-500/10 border-sky-500/20' :
            'text-slate-400 bg-secondary border-border';

          return (
            <div key={act.id} className="flex gap-3.5 relative group">
              {index !== activities.length - 1 && (
                <div className="absolute left-[17px] top-9 bottom-[-16px] w-[2px] bg-border/60 group-hover:bg-primary/30 transition-colors" />
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 border shadow-xs transition-transform duration-200 group-hover:scale-105 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{act.title}</p>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full shrink-0">{act.time}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1 leading-relaxed">{act.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
