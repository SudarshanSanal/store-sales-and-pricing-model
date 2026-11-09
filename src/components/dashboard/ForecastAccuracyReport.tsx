import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Area, BarChart, Cell, ScatterChart, Scatter,
  ReferenceLine,
} from 'recharts';
import {
  Target, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ChevronDown, Download, FileText, BarChart3, Package, DollarSign,
  ArrowUpRight, ArrowDownRight, Filter,
} from 'lucide-react';
import { useForecast, deriveModelComparison, type ProductForecast, type ForecastResult } from '@/lib/forecastStore';
import { EmptyForecastState } from './EmptyForecastState';

/* ── helpers ─────────────────────────────────────────────────────────── */
function mean(a: number[]) {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

interface ProductAccuracy {
  product: string;
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  accuracy: number;
  bias: number;        // mean error (positive = over-predicting)
  direction: 'up' | 'down' | 'flat';
  forecastPoints: number;
  actualPoints: number;
  series: {
    date: string;
    actual: number | null;
    predicted: number | null;
    error: number | null;
    pctError: number | null;
  }[];
  residuals: number[];
}

function computeProductAccuracy(p: ProductForecast): ProductAccuracy {
  const pairs: { date: string; actual: number; predicted: number }[] = [];

  p.series.forEach(pt => {
    const actual = pt.actual_quantity ?? pt.actual;
    const predicted = pt.predicted_quantity ?? pt.hybrid_quantity ?? pt.hybrid;
    if (actual != null && predicted != null) {
      pairs.push({ date: pt.date, actual, predicted });
    }
  });

  const errors = pairs.map(d => d.actual - d.predicted);
  const absErrors = errors.map(Math.abs);
  const pctErrors = pairs.map((d, i) => d.actual !== 0 ? Math.abs(errors[i] / d.actual) * 100 : 0);

  const mae = mean(absErrors);
  const rmse = Math.sqrt(mean(errors.map(e => e * e)));
  const mape = mean(pctErrors);
  const bias = mean(errors);

  const actualMean = mean(pairs.map(d => d.actual));
  const ssRes = errors.reduce((s, e) => s + e * e, 0);
  const ssTot = pairs.reduce((s, d) => s + (d.actual - actualMean) ** 2, 0) || 1;
  const r2 = Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  const accuracy = Math.max(0, Math.min(100, 100 - mape));

  // Determine trend from last 7 forecast values
  const forecastVals = p.series
    .filter(pt => (pt.actual_quantity === null && pt.actual === null) && (pt.predicted_quantity ?? pt.hybrid_quantity ?? pt.hybrid) != null)
    .map(pt => (pt.predicted_quantity ?? pt.hybrid_quantity ?? pt.hybrid) as number);
  const last7 = forecastVals.slice(-7);
  const first7 = forecastVals.slice(0, 7);
  const direction: 'up' | 'down' | 'flat' =
    last7.length > 0 && first7.length > 0
      ? mean(last7) > mean(first7) * 1.02 ? 'up' : mean(last7) < mean(first7) * 0.98 ? 'down' : 'flat'
      : 'flat';

  const series = p.series.map(pt => {
    const actual = pt.actual_quantity ?? pt.actual;
    const predicted = pt.predicted_quantity ?? pt.hybrid_quantity ?? pt.hybrid;
    const error = actual != null && predicted != null ? actual - predicted : null;
    const pctError = actual != null && predicted != null && actual !== 0
      ? ((actual - predicted) / actual) * 100
      : null;
    return { date: pt.date, actual, predicted, error, pctError };
  });

  return {
    product: p.product,
    mae: +mae.toFixed(2),
    rmse: +rmse.toFixed(2),
    mape: +mape.toFixed(2),
    r2: +r2.toFixed(4),
    accuracy: +accuracy.toFixed(1),
    bias: +bias.toFixed(2),
    direction,
    forecastPoints: forecastVals.length,
    actualPoints: pairs.length,
    series,
    residuals: errors,
  };
}

/* ── sub-components ──────────────────────────────────────────────────── */

function AccuracyGauge({ value, size = 110 }: { value: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = Math.PI * r;
  const offset = circ * (1 - Math.min(1, value / 100));
  const color =
    value >= 90 ? 'hsl(168 80% 50%)' :
    value >= 75 ? 'hsl(48 96% 53%)' :
    'hsl(0 84% 60%)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        {/* Background arc */}
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{value}%</span>
        <p className="text-[9px] text-muted-foreground font-mono -mt-0.5">ACCURACY</p>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold font-mono ${good ? 'text-emerald-400' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

const chartTooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontFamily: 'JetBrains Mono',
  fontSize: '11px',
  color: 'hsl(var(--popover-foreground))',
};

/* ── main component ──────────────────────────────────────────────────── */

export function ForecastAccuracyReport() {
  const forecast = useForecast();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'accuracy' | 'mae' | 'mape' | 'r2'>('accuracy');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const productAccuracies = useMemo(() => {
    if (!forecast || forecast.products.length === 0) return [];
    return forecast.products.map(computeProductAccuracy);
  }, [forecast]);

  const sorted = useMemo(() => {
    const list = [...productAccuracies];
    list.sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'accuracy') return mult * (a.accuracy - b.accuracy);
      if (sortBy === 'mae') return mult * (a.mae - b.mae);
      if (sortBy === 'mape') return mult * (a.mape - b.mape);
      return mult * (a.r2 - b.r2);
    });
    return list;
  }, [productAccuracies, sortBy, sortDir]);

  const selected = selectedProduct
    ? productAccuracies.find(p => p.product === selectedProduct) ?? productAccuracies[0]
    : productAccuracies[0];

  const overallAccuracy = productAccuracies.length
    ? +(mean(productAccuracies.map(p => p.accuracy))).toFixed(1)
    : 0;
  const overallR2 = productAccuracies.length
    ? +(mean(productAccuracies.map(p => p.r2))).toFixed(3)
    : 0;
  const overallMAE = productAccuracies.length
    ? +(mean(productAccuracies.map(p => p.mae))).toFixed(2)
    : 0;
  const overallMAPE = productAccuracies.length
    ? +(mean(productAccuracies.map(p => p.mape))).toFixed(2)
    : 0;

  // Residual histogram
  const residualBins = useMemo(() => {
    if (!selected) return [];
    const res = selected.residuals;
    if (res.length === 0) return [];
    const min = Math.min(...res);
    const max = Math.max(...res);
    const range = max - min || 1;
    const nBins = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(res.length))));
    const binWidth = range / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      bin: +(min + binWidth * (i + 0.5)).toFixed(1),
      label: `${(min + binWidth * i).toFixed(0)}`,
      count: 0,
    }));
    res.forEach(r => {
      const idx = Math.min(nBins - 1, Math.floor((r - min) / binWidth));
      bins[idx].count++;
    });
    return bins;
  }, [selected]);

  if (!forecast || forecast.products.length === 0) {
    return (
      <EmptyForecastState
        title="No accuracy data"
        hint="Upload data and run a forecast to see per-product accuracy reports with error breakdowns."
      />
    );
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir(col === 'mae' || col === 'mape' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc'
      ? <ArrowDownRight className="w-3 h-3 text-primary" />
      : <ArrowUpRight className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* ─── Overall Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}
          className="glass-card p-4 flex flex-col items-center gap-2 border-primary/20"
        >
          <AccuracyGauge value={overallAccuracy} size={100} />
          <span className="text-[10px] text-muted-foreground font-mono">Overall Forecast Accuracy</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-4 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-3xl font-bold font-mono text-foreground">{overallR2}</span>
          <span className="text-[10px] text-muted-foreground font-mono">Average R² Score</span>
          <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${overallR2 >= 0.85 ? 'bg-emerald-500/20 text-emerald-400' : overallR2 >= 0.7 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
            {overallR2 >= 0.85 ? 'Excellent' : overallR2 >= 0.7 ? 'Good' : 'Needs Improvement'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-4 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-3xl font-bold font-mono text-foreground">{overallMAE}</span>
          <span className="text-[10px] text-muted-foreground font-mono">Average MAE</span>
          <span className="text-[10px] text-muted-foreground font-mono mt-1">Mean Absolute Error</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card p-4 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-3xl font-bold font-mono text-foreground">{overallMAPE}%</span>
          <span className="text-[10px] text-muted-foreground font-mono">Average MAPE</span>
          <span className="text-[10px] text-muted-foreground font-mono mt-1">Mean Abs % Error</span>
        </motion.div>
      </div>

      {/* ─── Per-Product Table ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Per-Product Accuracy Breakdown
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              Click a row to inspect its forecast chart and residual distribution
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <Filter className="w-3 h-3" /> {productAccuracies.length} products
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 metric-label">Product</th>
                <th className="text-right py-2.5 px-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('accuracy')}>
                  <span className="inline-flex items-center gap-1">Accuracy <SortIcon col="accuracy" /></span>
                </th>
                <th className="text-right py-2.5 px-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('mae')}>
                  <span className="inline-flex items-center gap-1">MAE <SortIcon col="mae" /></span>
                </th>
                <th className="text-right py-2.5 px-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('mape')}>
                  <span className="inline-flex items-center gap-1">MAPE% <SortIcon col="mape" /></span>
                </th>
                <th className="text-right py-2.5 px-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('r2')}>
                  <span className="inline-flex items-center gap-1">R² <SortIcon col="r2" /></span>
                </th>
                <th className="text-right py-2.5 px-3 metric-label">RMSE</th>
                <th className="text-right py-2.5 px-3 metric-label">Bias</th>
                <th className="text-center py-2.5 px-3 metric-label">Trend</th>
                <th className="text-center py-2.5 px-3 metric-label">Grade</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const isSelected = selected?.product === p.product;
                const grade =
                  p.accuracy >= 95 ? { label: 'A+', color: 'text-emerald-400 bg-emerald-500/15' } :
                  p.accuracy >= 90 ? { label: 'A', color: 'text-emerald-400 bg-emerald-500/15' } :
                  p.accuracy >= 85 ? { label: 'B+', color: 'text-sky-400 bg-sky-500/15' } :
                  p.accuracy >= 80 ? { label: 'B', color: 'text-sky-400 bg-sky-500/15' } :
                  p.accuracy >= 70 ? { label: 'C', color: 'text-amber-400 bg-amber-500/15' } :
                  { label: 'D', color: 'text-red-400 bg-red-500/15' };

                return (
                  <tr
                    key={p.product}
                    onClick={() => setSelectedProduct(p.product)}
                    className={`border-b border-border/50 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-foreground font-medium text-xs truncate max-w-[200px]">
                      {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2" />}
                      {p.product}
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span className={`font-semibold ${p.accuracy >= 90 ? 'text-emerald-400' : p.accuracy >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.accuracy}%
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 text-muted-foreground">{p.mae}</td>
                    <td className="text-right py-2.5 px-3 text-muted-foreground">{p.mape}%</td>
                    <td className={`text-right py-2.5 px-3 font-semibold ${p.r2 >= 0.85 ? 'text-emerald-400' : 'text-foreground'}`}>
                      {p.r2.toFixed(3)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-muted-foreground">{p.rmse}</td>
                    <td className={`text-right py-2.5 px-3 ${p.bias > 0 ? 'text-amber-400' : p.bias < 0 ? 'text-sky-400' : 'text-muted-foreground'}`}>
                      {p.bias > 0 ? '+' : ''}{p.bias}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {p.direction === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400 inline" />}
                      {p.direction === 'down' && <TrendingDown className="w-4 h-4 text-red-400 inline" />}
                      {p.direction === 'flat' && <Minus className="w-4 h-4 text-muted-foreground inline" />}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${grade.color}`}>
                        {grade.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ─── Selected Product Detail ─── */}
      {selected && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.product}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="glass-card p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground font-mono">
                    📊 {selected.product}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {selected.actualPoints} actual data points · {selected.forecastPoints} forecast points
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <MetricBadge label="Accuracy" value={`${selected.accuracy}%`} good={selected.accuracy >= 90} />
                  <MetricBadge label="MAE" value={String(selected.mae)} />
                  <MetricBadge label="R²" value={selected.r2.toFixed(3)} good={selected.r2 >= 0.85} />
                  <MetricBadge label="Bias" value={`${selected.bias > 0 ? '+' : ''}${selected.bias}`} />
                </div>
              </div>

              {/* Actual vs Predicted Chart */}
              <div className="mb-2">
                <p className="text-xs text-muted-foreground font-mono mb-2">Actual vs Predicted (Hybrid Model)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={selected.series} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={9}
                      fontFamily="JetBrains Mono"
                      tickFormatter={(v: string) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      dot={false}
                      name="Actual"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(168 80% 50%)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      name="Predicted"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="error"
                      fill="hsl(260 60% 60% / 0.15)"
                      stroke="none"
                      name="Error"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Distribution & % Error Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Residual Histogram */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-foreground font-mono mb-1">Residual Distribution</h4>
                <p className="text-[10px] text-muted-foreground font-mono mb-3">
                  Distribution of prediction errors (actual − predicted). Centered = unbiased model.
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={residualBins} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} fontFamily="JetBrains Mono" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <ReferenceLine x="0" stroke="hsl(48 96% 53%)" strokeDasharray="4 4" strokeWidth={1} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Frequency">
                      {residualBins.map((b, i) => (
                        <Cell
                          key={i}
                          fill={b.bin >= 0 ? 'hsl(168 80% 50% / 0.7)' : 'hsl(260 60% 60% / 0.7)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* % Error over time */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-foreground font-mono mb-1">Percentage Error Timeline</h4>
                <p className="text-[10px] text-muted-foreground font-mono mb-3">
                  How prediction error % evolves over time. Closer to 0% = better.
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart
                    data={selected.series.filter(s => s.pctError != null)}
                    margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={9}
                      fontFamily="JetBrains Mono"
                      tickFormatter={(v: string) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" unit="%" />
                    <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v?.toFixed(1)}%`} />
                    <ReferenceLine y={0} stroke="hsl(48 96% 53%)" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="pctError"
                      fill="hsl(30 90% 60% / 0.15)"
                      stroke="hsl(30 90% 60%)"
                      strokeWidth={1.5}
                      name="% Error"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interpretation */}
            <div className="glass-card p-5 border-primary/20 bg-primary/5">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" /> Interpretation
              </h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground font-mono">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">{selected.product}</strong> achieves <strong className="text-foreground">{selected.accuracy}%</strong> forecast accuracy
                    with R²={selected.r2.toFixed(3)}.
                    {selected.accuracy >= 90
                      ? ' This is an excellent fit — the model closely tracks actual demand patterns.'
                      : selected.accuracy >= 75
                        ? ' This is a good fit, though there is room for improvement with additional features.'
                        : ' Consider adding more training data or external features to improve predictions.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  {selected.bias > 1 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : selected.bias < -1 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>
                    Bias: <strong className="text-foreground">{selected.bias > 0 ? '+' : ''}{selected.bias}</strong> —
                    {Math.abs(selected.bias) <= 1
                      ? ' the model is well-calibrated with minimal systematic error.'
                      : selected.bias > 0
                        ? ' the model tends to under-predict actual demand. Consider adjusting safety stock upward.'
                        : ' the model tends to over-predict actual demand. Review for excess inventory risk.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    On average, each prediction deviates by <strong className="text-foreground">{selected.mae}</strong> units (MAE)
                    and <strong className="text-foreground">{selected.mape}%</strong> (MAPE) from actuals.
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
