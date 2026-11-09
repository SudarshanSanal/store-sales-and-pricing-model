import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, AlertCircle, XCircle, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Bell, RefreshCw,
  Package, TrendingDown, Edit3, Check, X, ChevronDown, ChevronUp,
  Zap, ShoppingCart, Filter
} from 'lucide-react';
import { useForecast, deriveInventory, DerivedInventoryItem } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';
import { toast } from 'sonner';

type SortKey = 'product' | 'currentStock' | 'daysOfInventoryRemaining' | 'status' | 'avgDailyDemand';
type FilterStatus = 'all' | 'out_of_stock' | 'critical' | 'warning' | 'healthy';

const STATUS_CONFIG = {
  out_of_stock: { label: 'Out of Stock', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40', bar: 'bg-red-500' },
  critical:     { label: 'Critical',     icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/40', bar: 'bg-destructive' },
  warning:      { label: 'Low Stock',    icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', bar: 'bg-amber-400' },
  healthy:      { label: 'In Stock',     icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', bar: 'bg-emerald-400' },
};

function StatusBadge({ status }: { status: DerivedInventoryItem['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function InlineEdit({
  value, onSave, prefix = '', suffix = '', min = 0
}: { value: number; onSave: (v: number) => void; prefix?: string; suffix?: string; min?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = parseInt(draft);
    if (Number.isFinite(n) && n >= min) { onSave(n); }
    setEditing(false);
  };
  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          className="w-20 bg-secondary/60 border border-primary/50 rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        />
        <button onClick={commit} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
      </span>
    );
  }
  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="inline-flex items-center gap-1 font-mono font-semibold text-foreground hover:text-primary group"
    >
      {prefix}{value}{suffix}
      <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function InventoryManagement() {
  const forecast = useForecast();

  const [bufferMult, setBufferMult] = useState(1.0);
  const [overrides, setOverrides] = useState<Record<string, { currentStock?: number; price?: number }>>({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sentOrders, setSentOrders] = useState<Set<string>>(new Set());

  const items = useMemo(() =>
    deriveInventory(forecast, { bufferMultiplier: bufferMult, overrides }),
    [forecast, bufferMult, overrides]
  );

  const filtered = useMemo(() => {
    let out = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(i => i.product.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') out = out.filter(i => i.status === filterStatus);
    return [...out].sort((a, b) => {
      let va: number | string = a[sortKey] as number | string;
      let vb: number | string = b[sortKey] as number | string;
      if (sortKey === 'status') {
        const order = { out_of_stock: 0, critical: 1, warning: 2, healthy: 3 };
        va = order[a.status]; vb = order[b.status];
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, search, filterStatus, sortKey, sortDir]);

  const counts = useMemo(() => ({
    out_of_stock: items.filter(i => i.status === 'out_of_stock').length,
    critical: items.filter(i => i.status === 'critical').length,
    warning: items.filter(i => i.status === 'warning').length,
    healthy: items.filter(i => i.status === 'healthy').length,
  }), [items]);

  if (items.length === 0) return <EmptyForecastState title="No inventory data" hint="Upload data with a 'stock' column to enable inventory management." />;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
      : <ArrowUpDown className="w-3 h-3 opacity-40" />;

  const handleReorder = (item: DerivedInventoryItem) => {
    setSentOrders(s => new Set([...s, item.product]));
    toast.success(`🛒 Purchase order sent for ${item.reorderQty} units of ${item.product}`, { duration: 4000 });
  };

  const handleCollectiveReorder = () => {
    const itemsToOrder = items.filter(i => (i.status === 'out_of_stock' || i.status === 'critical' || i.status === 'warning') && !sentOrders.has(i.product));
    if (itemsToOrder.length === 0) {
      toast.info('All necessary stocks have already been ordered.');
      return;
    }

    const newOrders = new Set(sentOrders);
    const orderDetails: string[] = [];
    itemsToOrder.forEach(i => {
      newOrders.add(i.product);
      orderDetails.push(`${encodeURIComponent(i.product)}=${i.reorderQty}`);
    });

    setSentOrders(newOrders);
    
    // Simulated collective order without external browser redirect
    toast.success(`🛒 Collective purchase order sent for ${itemsToOrder.length} products to supplier.`, { duration: 5000 });
  };

  const filterPills: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: items.length },
    { key: 'out_of_stock', label: 'Out of Stock', count: counts.out_of_stock },
    { key: 'critical', label: 'Critical', count: counts.critical },
    { key: 'warning', label: 'Low Stock', count: counts.warning },
    { key: 'healthy', label: 'In Stock', count: counts.healthy },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5 md:p-6 space-y-5 glow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">Inventory Optimization & Reorder Intelligence</h3>
                <p className="text-xs text-muted-foreground font-mono">Automated ROP, EOQ, and Safety Stock calculations</p>
              </div>
            </div>
          </div>
          {/* Summary badges & Collective Order */}
          <div className="flex flex-col sm:items-end gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {counts.out_of_stock > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <XCircle className="w-3.5 h-3.5" /> {counts.out_of_stock} out
                </span>
              )}
              {counts.critical > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> {counts.critical} critical
                </span>
              )}
              {counts.warning > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> {counts.warning} low
                </span>
              )}
              {counts.healthy > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" /> {counts.healthy} in stock
                </span>
              )}
            </div>

            {counts.out_of_stock + counts.critical + counts.warning > 0 && (
              <button
                onClick={handleCollectiveReorder}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" /> Bulk Purchase Order ({counts.out_of_stock + counts.critical + counts.warning} Items)
              </button>
            )}
          </div>
        </div>

        {/* Safety Buffer Slider */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold text-foreground tracking-tight">ML Safety Buffer Multiplier</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">{bufferMult.toFixed(1)}×</span>
          </div>
          <input
            type="range" min="0.5" max="2.5" step="0.1"
            value={bufferMult}
            onChange={e => setBufferMult(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
            <span>0.5× (lean)</span><span>1.0× (default)</span><span>1.5× (moderate)</span><span>2.5× (conservative)</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by product name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-secondary/40 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {filterPills.map(pill => (
              <button
                key={pill.key}
                onClick={() => setFilterStatus(pill.key)}
                className={`px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                  filterStatus === pill.key
                    ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                    : 'bg-secondary/40 text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {pill.label} {pill.count > 0 && `(${pill.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Bar */}
      <div className="hidden md:flex items-center gap-2 px-2 text-[11px] font-mono text-muted-foreground">
        <span className="text-xs text-muted-foreground">Sort by:</span>
        {([['product','Product'],['status','Status'],['currentStock','Stock'],['daysOfInventoryRemaining','Days Left'],['avgDailyDemand','Daily Demand']] as [SortKey, string][]).map(([k, label]) => (
          <button key={k} onClick={() => handleSort(k)} className="flex items-center gap-1 hover:text-foreground transition-colors">
            {label} <SortIcon k={k} />
          </button>
        ))}
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-card p-8 text-center text-muted-foreground font-mono text-sm">
              No products match your filter.
            </motion.div>
          )}
          {filtered.map((item, idx) => {
            const cfg = STATUS_CONFIG[item.status];
            const maxDays = Math.max(30, item.daysOfInventoryRemaining * 1.5);
            const barPct = Math.min(100, (item.daysOfInventoryRemaining / maxDays) * 100);
            const stockPct = Math.min(100, (item.currentStock / Math.max(1, item.rop * 1.5)) * 100);
            const isExpanded = expandedProduct === item.product;
            const isOrdered = sentOrders.has(item.product);

            return (
              <motion.div
                key={item.product}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: idx * 0.04 }}
                className={`glass-card overflow-hidden border ${cfg.border} transition-all`}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Package className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{item.product}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {item.avgDailyDemand} units/day · Lead time {item.leadTime}d
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={item.status} />
                      <button
                        onClick={() => setExpandedProduct(isExpanded ? null : item.product)}
                        className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Days of Inventory Remaining Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Days of Inventory Remaining
                      </span>
                      <span className={`font-semibold ${item.daysOfInventoryRemaining <= item.leadTime ? cfg.color : 'text-foreground'}`}>
                        {item.daysOfInventoryRemaining.toFixed(1)} days
                        {item.daysOfInventoryRemaining <= item.leadTime && ' ⚠ Below Lead Time'}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${cfg.bar}`}
                      />
                    </div>
                  </div>

                  {/* Stock Level Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-muted-foreground">Stock vs ROP Target</span>
                      <span className="text-muted-foreground">
                        <InlineEdit
                          value={item.currentStock}
                          onSave={v => setOverrides(o => ({ ...o, [item.product]: { ...o[item.product], currentStock: v } }))}
                          suffix=" units"
                        />
                        {' / '}{item.rop} ROP
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stockPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                        className={`h-full rounded-full ${cfg.bar} opacity-70`}
                      />
                    </div>
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
                    {[
                      { label: 'Stock', value: item.currentStock },
                      { label: 'ROP', value: item.rop },
                      { label: 'EOQ', value: item.eoq },
                      { label: 'Safety Stk', value: item.safetyStock },
                      { label: 'Reorder Qty', value: item.reorderQty },
                      { label: 'Unit Price', value: `₹${item.unitPrice}` },
                    ].map(m => (
                      <div key={m.label} className="bg-secondary/30 rounded-md p-2">
                        <p className="text-muted-foreground text-[10px] mb-0.5">{m.label}</p>
                        <p className="font-semibold text-foreground">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reorder Button */}
                  {(item.status === 'critical' || item.status === 'warning' || item.status === 'out_of_stock') && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
                      <button
                        onClick={() => handleReorder(item)}
                        disabled={isOrdered}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                          isOrdered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                            : 'bg-primary text-primary-foreground hover:opacity-90'
                        }`}
                      >
                        {isOrdered ? <><Check className="w-3.5 h-3.5" /> Order Sent</> : <><ShoppingCart className="w-3.5 h-3.5" /> Reorder {item.reorderQty} units</>}
                      </button>
                      <span className={`text-[11px] font-mono flex items-center gap-1 ${
                        item.stockoutRisk === 'high' ? 'text-red-400' : item.stockoutRisk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        <Bell className="w-3 h-3" />
                        Stockout risk: {item.stockoutRisk.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/40 overflow-hidden"
                    >
                      <div className="p-4 bg-secondary/10">
                        <h4 className="text-xs font-mono font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                          Advanced Controls & ML Insights
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Inline Edit controls */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-muted-foreground">Override Current Stock</span>
                              <InlineEdit
                                value={item.currentStock}
                                onSave={v => setOverrides(o => ({ ...o, [item.product]: { ...o[item.product], currentStock: v } }))}
                                suffix=" units"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-muted-foreground">Override Unit Price</span>
                              <InlineEdit
                                value={item.unitPrice}
                                prefix="₹"
                                onSave={v => setOverrides(o => ({ ...o, [item.product]: { ...o[item.product], price: v } }))}
                              />
                            </div>
                            {overrides[item.product] && (
                              <button
                                onClick={() => setOverrides(o => { const n = { ...o }; delete n[item.product]; return n; })}
                                className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Reset to ML defaults
                              </button>
                            )}
                          </div>
                          {/* ML Stats */}
                          <div className="space-y-2 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Service Level Target</span>
                              <span className="text-foreground font-semibold">{(item.serviceLevel * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Daily Demand (ML)</span>
                              <span className="text-foreground font-semibold">{item.avgDailyDemand} units</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">EOQ (Economic Order Qty)</span>
                              <span className="text-foreground font-semibold">{item.eoq} units</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reorder Point (ROP)</span>
                              <span className="text-foreground font-semibold">{item.rop} units</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Safety Stock (×{bufferMult.toFixed(1)})</span>
                              <span className="text-primary font-semibold">{item.safetyStock} units</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="text-[11px] font-mono text-muted-foreground text-center pt-2">
        {filtered.length} of {items.length} products shown · Safety buffer: {bufferMult.toFixed(1)}× · Click any row to expand ML details
      </p>
    </motion.div>
  );
}
