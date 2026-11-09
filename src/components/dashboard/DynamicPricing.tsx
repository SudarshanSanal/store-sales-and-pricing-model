import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, DollarSign, BarChart2, Activity, Sparkles,
  ChevronDown, LineChart as LineChartIcon, Download, Search,
  ChevronUp, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown,
  Cpu, Zap, Info
} from 'lucide-react';
import {
  useForecast,
  deriveFinancialOverview,
  type FinancialBreakdown,
  type FinancialDateRange,
  type FinancialTableRow,
} from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';

/* ─── Indian currency formatter ─── */
const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/* ─── Bar chart colour palette ─── */
const BAR_COLOURS = [
  'hsl(168 80% 50%)', 'hsl(240 80% 65%)', 'hsl(35 90% 65%)',
  'hsl(280 70% 70%)', 'hsl(10 80% 65%)', 'hsl(200 80% 60%)',
  'hsl(320 70% 65%)', 'hsl(55 85% 58%)', 'hsl(150 70% 55%)',
  'hsl(190 80% 58%)',
];

/* ─── Sort helpers ─── */
type SortKey = 'product' | 'period' | 'historicalRevenue' | 'forecastRevenue' | 'totalRevenue' | 'growthPct' | 'avgPrice' | 'unitsSold' | 'projectedUnits';
type SortDir = 'asc' | 'desc';

/* ─── Dropdown helper ─── */
function Select<T extends string>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value as T)}
          className="w-full appearance-none bg-secondary/50 border border-border rounded-lg px-3 py-2 pr-8 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── KPI Skeleton ─── */
function KpiSkeleton() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="h-3 w-20 bg-secondary rounded mb-3" />
      <div className="h-6 w-32 bg-secondary rounded" />
    </div>
  );
}

/* ─── Custom Tooltip for charts ─── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-border rounded-xl text-xs font-mono min-w-[160px]">
      <p className="text-muted-foreground mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-foreground font-bold">{inr(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Main DynamicPricing Component ─── */
export function DynamicPricing() {
  const forecast = useForecast();

  /* ── Filter state ── */
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<FinancialBreakdown>('monthly');
  const [dateRange, setDateRange] = useState<FinancialDateRange>('all');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [showInsights, setShowInsights] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [error, setError] = useState<string | null>(null);

  /* ── Dynamic product list ── */
  const productList = useMemo(() => {
    if (!forecast) return [];
    return forecast.products.map(p => p.product);
  }, [forecast]);

  const productOptions = useMemo(() => [
    { value: '', label: 'All Products' },
    ...productList.map(p => ({ value: p, label: p })),
  ], [productList]);

  /* ── Derived financial data ── */
  const data = useMemo(() => {
    try {
      setError(null);
      return deriveFinancialOverview(forecast, breakdown, selectedProduct || null, dateRange);
    } catch (e: any) {
      setError(e?.message || 'Failed to compute financial data.');
      return null;
    }
  }, [forecast, breakdown, selectedProduct, dateRange]);

  /* ── Sort handler ── */
  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  /* ── Sorted + filtered table rows ── */
  const sortedRows = useMemo(() => {
    if (!data?.tableRows) return [];
    let rows = [...data.tableRows];

    // Search filter (only meaningful in All Products mode)
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter(r =>
        r.product.toLowerCase().includes(q) || r.period.toLowerCase().includes(q)
      );
    }

    // Sort
    rows.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return rows;
  }, [data, tableSearch, sortKey, sortDir]);

  /* ── CSV export ── */
  const exportCsv = useCallback(() => {
    if (!sortedRows.length) return;
    const headers = ['Product', 'Period', 'Hist. Revenue', 'Forecast Revenue', 'Total Revenue', 'Growth %', 'Avg Price', 'Units Sold', 'Projected Units'];
    const rows = sortedRows.map(r => [
      r.product,
      r.period,
      r.historicalRevenue,
      r.forecastRevenue,
      r.totalRevenue,
      r.growthPct != null ? r.growthPct : '',
      r.avgPrice,
      r.unitsSold,
      r.projectedUnits,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-overview-${selectedProduct || 'all-products'}-${breakdown}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedRows, selectedProduct, breakdown]);

  /* ── Total row for table ── */
  const totalRow = useMemo(() => {
    if (!data || selectedProduct) return null; // Only for All Products
    const rows = sortedRows;
    if (!rows.length) return null;
    const totalHist = rows.reduce((s, r) => s + r.historicalRevenue, 0);
    const totalFore = rows.reduce((s, r) => s + r.forecastRevenue, 0);
    const totalRev = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalUnits = rows.reduce((s, r) => s + r.unitsSold, 0);
    const totalProjUnits = rows.reduce((s, r) => s + r.projectedUnits, 0);
    const weightedGrowth = totalHist > 0 && totalFore > 0
      ? +((totalFore - totalHist) / totalHist * 100).toFixed(1)
      : null;
    return { totalHist, totalFore, totalRev, totalUnits, totalProjUnits, weightedGrowth };
  }, [data, selectedProduct, sortedRows]);

  /* ── Sort icon helper ── */
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-3 py-3 text-left text-[11px] font-mono text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">{label}<SortIcon col={col} /></div>
    </th>
  );

  /* ─────────────── Empty / error states ─────────────── */
  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <PageHeader />
        <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="font-semibold text-foreground">Unable to load financial data.</p>
          <p className="text-sm font-mono text-muted-foreground">{error}</p>
          <button onClick={() => setError(null)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-mono rounded-lg hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </motion.div>
    );
  }

  if (!forecast || forecast.products.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <PageHeader />
        <EmptyForecastState title="No financial data" hint="Upload a sales dataset to view financial projections." />
      </motion.div>
    );
  }

  /* ─────────────── KPI cards ─────────────── */
  const kpis = [
    {
      label: 'Total Revenue (Historical)',
      value: data?.kpis.totalRevenueYtd ?? '—',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Projected Revenue (Annual)',
      value: data?.kpis.projectedAnnualRevenue ?? '—',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Growth Rate',
      value: data?.kpis.growthRatePct ?? 'N/A',
      icon: Activity,
      color: data?.kpis.rawGrowthRate != null && data.kpis.rawGrowthRate >= 0 ? 'text-sky-400' : 'text-rose-400',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Profit Margin',
      value: 'N/A',
      tooltip: 'Cost data is not available in the current dataset.',
      icon: Sparkles,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Avg Daily Revenue',
      value: data?.kpis.avgDailyRevenue ?? '—',
      icon: BarChart2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  /* ─────────────── Bar chart data ─────────────── */
  const barChartData = useMemo(() => {
    if (!data) return [];
    if (!selectedProduct) {
      // All Products: one bar per product
      return data.productRevenue.map(pr => ({
        name: pr.product.length > 22 ? pr.product.slice(0, 20) + '…' : pr.product,
        fullName: pr.product,
        'Total Revenue': pr.totalRevenue,
        'Historical': pr.historicalRevenue,
        'Forecast': pr.forecastRevenue,
      }));
    } else {
      // Single product: one bar per period
      return data.chartData.map(d => ({
        name: d.period,
        fullName: d.period,
        'Total Revenue': d.historicalRevenue + d.forecastedRevenue,
        'Historical': d.historicalRevenue,
        'Forecast': d.forecastedRevenue,
      }));
    }
  }, [data, selectedProduct]);

  const barChartHorizontal = !selectedProduct && barChartData.length > 8;
  const barChartHeight = barChartHorizontal
    ? Math.max(300, barChartData.length * 38)
    : 280;

  /* ─────────────── No data after filter ─────────────── */
  const hasNoData = !data || (data.kpis.rawTotalRev === 0 && data.kpis.rawProjRev === 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader />

      {/* ══ FILTER BAR ══ */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Product */}
          <Select
            label="Product"
            value={selectedProduct ?? ''}
            onChange={v => setSelectedProduct(v || null)}
            options={productOptions}
          />
          {/* Period */}
          <Select
            label="Period"
            value={breakdown}
            onChange={setBreakdown}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'annual', label: 'Annual' },
            ]}
          />
          {/* Date Range */}
          <Select
            label="Date Range"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'last7d', label: 'Last 7 Days' },
              { value: 'last30d', label: 'Last 30 Days' },
              { value: 'last90d', label: 'Last 90 Days' },
              { value: 'last6m', label: 'Last 6 Months' },
              { value: 'last12m', label: 'Last 12 Months' },
            ]}
          />
          {/* Active filter pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {selectedProduct && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/15 border border-primary/30 text-primary text-[11px] font-mono rounded-full">
                {selectedProduct.length > 18 ? selectedProduct.slice(0, 16) + '…' : selectedProduct}
                <button onClick={() => setSelectedProduct(null)} className="hover:text-primary/70 ml-0.5">×</button>
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary border border-border text-muted-foreground text-[11px] font-mono rounded-full">
                {dateRange}
                <button onClick={() => setDateRange('all')} className="hover:text-foreground ml-0.5">×</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ NO DATA STATE ══ */}
      <AnimatePresence mode="wait">
        {hasNoData ? (
          <motion.div key="nodata" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-card p-10 flex flex-col items-center gap-3 text-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No financial data available for the selected filters.</p>
            <p className="text-sm font-mono text-muted-foreground">Try expanding the date range or selecting a different product.</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* ══ KPI CARDS ══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {kpis.map((k, i) => {
                const Icon = k.icon;
                return (
                  <motion.div key={k.label}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="glass-card p-4 group relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground leading-tight">{k.label}</span>
                      {k.tooltip && (
                        <span className="relative ml-auto cursor-help group/tip">
                          <Info className="w-3 h-3 text-muted-foreground/50" />
                          <span className="absolute bottom-full right-0 mb-1 hidden group-hover/tip:block w-48 p-2 text-[10px] font-mono bg-popover border border-border rounded-lg shadow-lg text-muted-foreground z-50">
                            {k.tooltip}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className={`text-lg font-bold font-mono ${k.color} truncate`}>{k.value}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* ══ REVENUE LINE / BAR CHART ══ */}
            <div className="glass-card p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-semibold text-foreground">Historical vs Forecasted Revenue</h4>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Hybrid XGBoost + LSTM projections · {data?.chartData.length ?? 0} {breakdown} periods
                    {selectedProduct ? ` · ${selectedProduct}` : ' · All Products'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Breakdown pills (reuse existing style) */}
                  <div className="flex items-center gap-1 p-1 bg-secondary/40 rounded-lg border border-border">
                    {(['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as FinancialBreakdown[]).map(b => (
                      <button key={b} onClick={() => setBreakdown(b)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all capitalize ${breakdown === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {b === 'quarterly' ? 'Qtr' : b === 'annual' ? 'Annual' : b === 'weekly' ? 'Wk' : b.slice(0, 2).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {/* Chart type toggle */}
                  <button onClick={() => setChartType(t => t === 'line' ? 'bar' : 'line')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors">
                    {chartType === 'line' ? <><LineChartIcon className="w-3.5 h-3.5" /> Line</> : <><BarChart2 className="w-3.5 h-3.5" /> Bar</>}
                  </button>
                  {/* Model insights toggle */}
                  <button onClick={() => setShowInsights(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${showInsights ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'}`}>
                    <Cpu className="w-3.5 h-3.5" /> Insights
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={breakdown === 'daily' ? 340 : 300}>
                {chartType === 'line' ? (
                  <ComposedChart data={data?.chartData ?? []} margin={{ top: 5, right: 20, bottom: breakdown === 'daily' ? 40 : 5, left: 0 }}>
                    <defs>
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(168 80% 50%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(168 80% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                      angle={breakdown === 'daily' ? -45 : 0}
                      textAnchor={breakdown === 'daily' ? 'end' : 'middle'}
                      interval={breakdown === 'daily' ? Math.floor((data?.chartData.length ?? 12) / 12) : 0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                      tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="historicalRevenue" stroke="hsl(168 80% 50%)" strokeWidth={2} fill="url(#histGrad)" name="Historical Revenue" />
                    <Line type="monotone" dataKey="forecastedRevenue" stroke="hsl(240 80% 65%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: 'hsl(240 80% 65%)' }} name="Forecasted Revenue" />
                    {showInsights && (
                      <>
                        <Line type="monotone" dataKey="xgboostContribution" stroke="hsl(35 90% 65%)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="XGBoost" />
                        <Line type="monotone" dataKey="lstmContribution" stroke="hsl(280 70% 70%)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="LSTM" />
                      </>
                    )}
                  </ComposedChart>
                ) : (
                  <BarChart data={data?.chartData ?? []} margin={{ top: 5, right: 20, bottom: breakdown === 'daily' ? 40 : 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                      angle={breakdown === 'daily' ? -45 : 0}
                      textAnchor={breakdown === 'daily' ? 'end' : 'middle'}
                      interval={breakdown === 'daily' ? Math.floor((data?.chartData.length ?? 12) / 12) : 0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                      tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <Bar dataKey="historicalRevenue" fill="hsl(168 80% 50%)" opacity={0.85} name="Historical Revenue" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="forecastedRevenue" fill="hsl(240 80% 65%)" opacity={0.75} name="Forecasted Revenue" radius={[3, 3, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>

              {/* Model Insights Panel */}
              <AnimatePresence>
                {showInsights && data?.modelInsights && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                    <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/25">
                      <p className="text-xs font-mono font-semibold text-violet-400 mb-2 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" /> LSTM Trend Insights
                      </p>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trend Direction</span>
                          <span className={`font-semibold ${data.modelInsights.lstmTrendDirection === 'Upward' ? 'text-emerald-400' : data.modelInsights.lstmTrendDirection === 'Downward' ? 'text-rose-400' : 'text-sky-400'}`}>
                            {data.modelInsights.lstmTrendDirection === 'Upward' ? '↑' : data.modelInsights.lstmTrendDirection === 'Downward' ? '↓' : '→'} {data.modelInsights.lstmTrendDirection}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Projected Momentum</span>
                          <span className="text-foreground font-semibold">{data.modelInsights.lstmTrendStrength}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                      <p className="text-xs font-mono font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> XGBoost Feature Impact
                      </p>
                      <div className="space-y-1.5">
                        {data.modelInsights.xgbTopFeatures.map(f => (
                          <div key={f.name} className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground truncate max-w-[70%]">{f.name}</span>
                            <span className="text-amber-400 font-semibold">{f.impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ══ REVENUE BAR CHART (by product / by period) ══ */}
            {barChartData.length > 0 && (
              <div className="glass-card p-5">
                <div className="mb-4">
                  <h4 className="font-semibold text-foreground">
                    {selectedProduct ? `Revenue by Period — ${selectedProduct}` : 'Revenue by Product'}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {selectedProduct ? 'Historical vs. Forecast per period' : 'Total revenue across all products · sorted by revenue'}
                  </p>
                </div>
                <div className={barChartHorizontal ? 'overflow-x-auto' : ''}>
                  <ResponsiveContainer width="100%" height={barChartHeight}>
                    {barChartHorizontal ? (
                      /* Horizontal layout for many products */
                      <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                          tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" width={130} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                        <Bar dataKey="Historical" name="Historical Revenue" fill="hsl(168 80% 50%)" radius={[0, 3, 3, 0]} stackId="a" opacity={0.85}>
                          {barChartData.map((_, i) => <Cell key={i} fill={BAR_COLOURS[i % BAR_COLOURS.length]} opacity={0.85} />)}
                        </Bar>
                        <Bar dataKey="Forecast" name="Forecast Revenue" fill="hsl(240 80% 65%)" radius={[0, 3, 3, 0]} stackId="a" opacity={0.65} />
                      </BarChart>
                    ) : (
                      /* Vertical layout */
                      <BarChart data={barChartData} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                          angle={barChartData.length > 5 ? -30 : 0} textAnchor={barChartData.length > 5 ? 'end' : 'middle'} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono"
                          tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                        <Bar dataKey="Historical" name="Historical Revenue" fill="hsl(168 80% 50%)" radius={[4, 4, 0, 0]} opacity={0.85} />
                        <Bar dataKey="Forecast" name="Forecast Revenue" fill="hsl(240 80% 65%)" radius={[4, 4, 0, 0]} opacity={0.7} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ══ FINANCIAL DETAILS TABLE ══ */}
            <div className="glass-card overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 pb-0">
                <div>
                  <h4 className="font-semibold text-foreground">Financial Details</h4>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {sortedRows.length} row{sortedRows.length !== 1 ? 's' : ''} · click column headers to sort
                  </p>
                </div>
                <div className="flex items-center gap-2 pb-4 sm:pb-0">
                  {!selectedProduct && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={tableSearch}
                        onChange={e => setTableSearch(e.target.value)}
                        placeholder="Search products…"
                        className="pl-8 pr-3 py-1.5 text-xs font-mono bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors w-44"
                      />
                    </div>
                  )}
                  <button onClick={exportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-y border-border">
                    <tr>
                      <Th col="product" label="Product" />
                      {!!selectedProduct && <Th col="period" label="Period" />}
                      <Th col="historicalRevenue" label="Hist. Revenue" />
                      <Th col="forecastRevenue" label="Forecast Rev." />
                      <Th col="totalRevenue" label="Total Revenue" />
                      <Th col="growthPct" label="Growth %" />
                      <Th col="avgPrice" label="Avg Price" />
                      <Th col="unitsSold" label="Units Sold" />
                      <Th col="projectedUnits" label="Proj. Units" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-sm font-mono text-muted-foreground">
                          No matching rows.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row, i) => (
                        <tr key={`${row.product}-${row.period}-${i}`}
                          className={`border-b border-border/40 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                          <td className="px-3 py-3 text-xs font-mono text-foreground font-medium max-w-[200px]">
                            <span className="block truncate" title={row.product}>{row.product}</span>
                          </td>
                          {!!selectedProduct && <td className="px-3 py-3 text-xs font-mono text-muted-foreground">{row.period}</td>}
                          <td className="px-3 py-3 text-xs font-mono text-foreground">{inr(row.historicalRevenue)}</td>
                          <td className="px-3 py-3 text-xs font-mono text-foreground">{inr(row.forecastRevenue)}</td>
                          <td className="px-3 py-3 text-xs font-mono font-semibold text-primary">{inr(row.totalRevenue)}</td>
                          <td className="px-3 py-3 text-xs font-mono">
                            {row.growthPct != null ? (
                              <span className={row.growthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {row.growthPct >= 0 ? '+' : ''}{row.growthPct}%
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-3 py-3 text-xs font-mono text-muted-foreground">
                            {row.avgPrice > 0 ? inr(row.avgPrice) : '—'}
                          </td>
                          <td className="px-3 py-3 text-xs font-mono text-muted-foreground">
                            {row.unitsSold > 0 ? row.unitsSold.toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="px-3 py-3 text-xs font-mono text-muted-foreground">
                            {row.projectedUnits > 0 ? row.projectedUnits.toLocaleString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Total row — All Products mode only */}
                  {totalRow && (
                    <tfoot className="border-t-2 border-border bg-secondary/30">
                      <tr>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-foreground uppercase tracking-wide">TOTAL</td>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-foreground">{inr(totalRow.totalHist)}</td>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-foreground">{inr(totalRow.totalFore)}</td>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-primary">{inr(totalRow.totalRev)}</td>
                        <td className="px-3 py-3 text-xs font-mono">
                          {totalRow.weightedGrowth != null ? (
                            <span className={totalRow.weightedGrowth >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {totalRow.weightedGrowth >= 0 ? '+' : ''}{totalRow.weightedGrowth}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-3 text-xs font-mono text-muted-foreground">—</td>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-foreground">{totalRow.totalUnits.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-xs font-mono font-bold text-foreground">{totalRow.totalProjUnits.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ══ FINANCIAL INSIGHTS ══ */}
            {data?.insights && data.insights.length > 0 && (
              <div className="glass-card p-5">
                <button
                  onClick={() => setShowInsights(v => !v)}
                  className="w-full flex items-center justify-between mb-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-foreground">Financial Insights</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/15 text-primary rounded-full">
                      {data.insights.length} insight{data.insights.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {showInsights
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {showInsights && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2.5 overflow-hidden">
                      {data.insights.map((insight, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <span className="text-base">{insight.slice(0, 2)}</span>
                          <p className="text-sm font-mono text-muted-foreground leading-relaxed">{insight.slice(2).trim()}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Page header (shared) ─── */
function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dynamic Pricing</h2>
        <p className="text-sm font-mono text-muted-foreground mt-0.5">Elasticity-based revenue optimization</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <TrendingUp className="w-4 h-4 text-primary" />
        Financial Overview
      </div>
    </div>
  );
}
