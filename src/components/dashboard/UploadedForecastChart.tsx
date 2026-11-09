import { useState, useMemo, useEffect, useRef } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { useForecast, forecastStore, SeriesPoint } from '@/lib/forecastStore';
import { Inbox, Package, DollarSign, Search, Download, ChevronLeft, ChevronRight, Calendar, TrendingUp, Filter, Folder, Tag, ChevronDown } from 'lucide-react';

/** Normalize a series point so chart always has the right keys regardless of data source */
function normalizePoint(pt: SeriesPoint): SeriesPoint & {
  _hybrid_q: number | null;
  _xgb_q: number | null;
  _lstm_q: number | null;
  _actual_q: number | null;
  _hybrid_p: number | null;
  _xgb_p: number | null;
  _lstm_p: number | null;
  _actual_p: number | null;
} {
  // Quantity
  const _actual_q = pt.actual_quantity ?? (pt.actual !== null && pt.actual !== undefined ? pt.actual : null);
  const _hybrid_q = pt.hybrid_quantity ?? pt.predicted_quantity ?? pt.hybrid ?? null;
  const _xgb_q = pt.xgboost_quantity ?? pt.xgboost ?? null;
  const _lstm_q = pt.lstm_quantity ?? pt.lstm ?? null;

  // Price - DO NOT fallback to item quantity
  const _actual_p = pt.actual_price ?? null;
  const _hybrid_p = pt.hybrid_price ?? pt.predicted_price ?? null;
  const _xgb_p = pt.xgboost_price ?? null;
  const _lstm_p = pt.lstm_price ?? null;

  return {
    ...pt,
    _actual_q,
    _hybrid_q,
    _xgb_q,
    _lstm_q,
    _actual_p,
    _hybrid_p,
    _xgb_p,
    _lstm_p,
  };
}

export function UploadedForecastChart() {
  const forecast = useForecast();
  const [selected, setSelected] = useState<string | null>(null);
  const [targetView, setTargetView] = useState<'quantity' | 'price'>('quantity');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    if (categoryDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [categoryDropdownOpen]);

  // Table search, pagination, and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'actual' | 'forecast'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortAsc, setSortAsc] = useState(false);

  // Derive unique categories from all products
  const allCategories = useMemo(() => {
    if (!forecast?.products) return [];
    const cats = forecast.products.map((p: any) => p.category).filter((c: any) => c && typeof c === 'string');
    return Array.from(new Set(cats)) as string[];
  }, [forecast?.products]);

  const hasCategories = allCategories.length > 0;

  // Filter products by category when applicable
  const visibleProducts = useMemo(() => {
    if (!forecast?.products) return [];
    if (!hasCategories || !categoryFilter) return forecast.products;
    return forecast.products.filter((p: any) => p.category === categoryFilter);
  }, [forecast?.products, hasCategories, categoryFilter]);

  const active = visibleProducts.find((p: any) => p.product === selected) ?? visibleProducts[0] ?? forecast?.products[0];

  useEffect(() => {
    if (active?.product) {
      forecastStore.setSelectedProduct(active.product);
    }
  }, [active?.product]);

  // Normalize series so chart always has consistent keys
  const series = useMemo(() => (active?.series || []).map(normalizePoint), [active?.series]);

  const filteredSeries = useMemo(() => {
    let result = [...series];
    
    // Filter by type
    if (filterMode === 'actual') {
      result = result.filter(pt => pt._actual_q !== null);
    } else if (filterMode === 'forecast') {
      result = result.filter(pt => pt._actual_q === null);
    }
    
    // Filter by search query (date match)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(pt => pt.date.toLowerCase().includes(q));
    }
    
    // Sort chronologically (ascending or descending)
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
    
    return result;
  }, [series, filterMode, searchQuery, sortAsc]);

  const paginatedSeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSeries.slice(start, start + pageSize);
  }, [filteredSeries, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, searchQuery, pageSize]);

  if (!forecast || forecast.products.length === 0 || !active) {
    return (
      <div className="glass-card p-10 text-center">
        <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-foreground font-medium">No forecast yet</p>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Upload a CSV in the Data Upload tab and click "Generate Forecast".
        </p>
      </div>
    );
  }

  if (typeof window !== 'undefined') {
    (window as any).__uploadedForecastChartDebug = {
      product: active.product,
      targetView,
      seriesLength: series.length,
      firstPoints: series.slice(0, 5),
      rawFirstPoint: active.series[0],
      forecastPoints: series.filter(d => d._actual_q === null).length,
      splitDate: series.find(d => d._actual_q === null)?.date,
    };
  }

  const splitDate = series.find(d => d._actual_q === null)?.date;

  const currentMetrics = targetView === 'price'
    ? (active.metrics_price || active.metrics)
    : (active.metrics_quantity || active.metrics);

  // Pick predicted values from last forecast point
  const forecastPoints = series.filter(d => d._actual_q === null);
  const lastForecastPt = forecastPoints[forecastPoints.length - 1];
  const predQty = Math.round(lastForecastPt?._hybrid_q ?? active.predicted_quantity ?? 0);
  const predPrice = lastForecastPt?._hybrid_p ?? active.predicted_price ?? 150;

  console.log('UploadedForecastChart debug', {
    product: active.product,
    seriesLength: series.length,
    seriesSample: series.slice(0, 5),
    targetView,
    forecastPoints: forecastPoints.length,
    splitDate,
  });

  const chartTooltipStyle = {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
    fontFamily: 'JetBrains Mono',
    fontSize: '12px',
    padding: '10px 14px',
    color: 'hsl(var(--popover-foreground))',
  };

  const totalPages = Math.ceil(filteredSeries.length / pageSize) || 1;

  // Export full prediction and historical series as CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Status',
      'Actual Quantity (Units)',
      'Predicted Hybrid Quantity (Units)',
      'XGBoost Quantity (Units)',
      'LSTM Quantity (Units)',
      'Actual Price (₹)',
      'Predicted Hybrid Price (₹)',
      'XGBoost Price (₹)',
      'LSTM Price (₹)'
    ];

    const rows = series.map(pt => {
      const status = pt._actual_q !== null ? 'Historical' : 'Forecasted';
      return [
        pt.date,
        status,
        pt._actual_q !== null ? pt._actual_q : '',
        pt._hybrid_q !== null ? Math.round(pt._hybrid_q) : '',
        pt._xgb_q !== null ? Math.round(pt._xgb_q) : '',
        pt._lstm_q !== null ? Math.round(pt._lstm_q) : '',
        pt._actual_p !== null ? pt._actual_p.toFixed(2) : '',
        pt._hybrid_p !== null ? pt._hybrid_p.toFixed(2) : '',
        pt._xgb_p !== null ? pt._xgb_p.toFixed(2) : '',
        pt._lstm_p !== null ? pt._lstm_p.toFixed(2) : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `forecast_report_${active.product}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 md:p-6 space-y-6 glow-subtle"
    >
      <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-border/60">
        {/* Left: Title & active product meta */}
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">Dual-Target Forecast</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {forecast.products.length} product(s) · {forecast.horizonDays}-day horizon · XGBoost + LSTM Ensembling
              </p>
            </div>
          </div>
          {/* Active product category badge */}
          {(active as any)?.category && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                <Folder className="w-3 h-3" /> {(active as any).category}
              </span>
              {(active as any)?.subProduct && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20">
                  <Tag className="w-3 h-3" /> {(active as any).subProduct}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Category + Product Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown — shown only when categories exist */}
          {hasCategories && (
            <div className="relative" ref={categoryDropdownRef}>
              <button
                onClick={() => setCategoryDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-all shadow-sm min-w-[150px] justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono">{categoryFilter ?? 'All Categories'}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden min-w-[180px] py-1">
                  <button
                    onClick={() => { setCategoryFilter(null); setCategoryDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors ${
                      !categoryFilter ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    All Categories
                  </button>
                  <div className="h-px bg-border/60 my-1" />
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setSelected(null); setCategoryDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors ${
                        categoryFilter === cat ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Folder className="w-3 h-3 text-indigo-400 shrink-0" />
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product Selector Dropdown */}
          {visibleProducts.length > 1 ? (
            <div className="relative">
              <select
                value={active?.product ?? ''}
                onChange={e => setSelected(e.target.value)}
                className="appearance-none flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-all shadow-sm pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[160px]"
              >
                {visibleProducts.map((p: any) => (
                  <option key={p.product} value={p.product}>
                    {p.product}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <span className="px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary">
              {active?.product}
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Dual Output Prediction Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center text-primary">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="metric-label text-primary">Predicted Item Quantity</p>
            <p className="text-xl font-mono font-bold text-foreground">
              {predQty.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">units</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-success/20 flex items-center justify-center text-success">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="metric-label text-success">Predicted Sales Price</p>
            <p className="text-xl font-mono font-bold text-foreground">
              ₹{Number(predPrice).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">per unit</span>
            </p>
          </div>
        </div>
      </div>

      {/* Target Toggle */}
      <div className="flex items-center gap-2 p-1 rounded-md bg-secondary/50 border border-border w-fit">
        <button
          onClick={() => setTargetView('quantity')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            targetView === 'quantity' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Item Quantity View
        </button>
        <button
          onClick={() => setTargetView('price')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            targetView === 'price' ? 'bg-success text-background font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Sales Price View
        </button>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric
          label={targetView === 'price' ? 'Price MAE (₹)' : 'Qty MAE (units)'}
          value={Number.isFinite(currentMetrics.mae) ? (targetView === 'price' ? `₹${currentMetrics.mae.toFixed(2)}` : currentMetrics.mae.toFixed(2)) : 'N/A'}
          sub={currentMetrics.train_mae && Number.isFinite(currentMetrics.train_mae) ? `Train: ${targetView === 'price' ? '₹' : ''}${currentMetrics.train_mae.toFixed(2)}` : undefined}
        />
        <Metric
          label={targetView === 'price' ? 'Price RMSE (₹)' : 'Qty RMSE (units)'}
          value={Number.isFinite(currentMetrics.rmse) ? (targetView === 'price' ? `₹${currentMetrics.rmse.toFixed(2)}` : currentMetrics.rmse.toFixed(2)) : 'N/A'}
          sub={currentMetrics.train_rmse && Number.isFinite(currentMetrics.train_rmse) ? `Train: ${targetView === 'price' ? '₹' : ''}${currentMetrics.train_rmse.toFixed(2)}` : undefined}
        />
        <Metric
          label="Validation MAPE"
          value={Number.isFinite(currentMetrics.mape) ? `${currentMetrics.mape.toFixed(2)}%` : 'N/A'}
        />
        <Metric
          label="Validation R²"
          value={Number.isFinite(currentMetrics.r2) ? currentMetrics.r2.toFixed(3) : 'N/A'}
          highlight={Number.isFinite(currentMetrics.r2) && currentMetrics.r2 >= 0.8}
        />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            fontFamily="JetBrains Mono"
            tickFormatter={(v) => String(v).slice(5)}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            fontFamily="JetBrains Mono"
            domain={['auto', 'auto']}
            tickFormatter={(v) => targetView === 'price' ? `₹${Number(v).toFixed(0)}` : `${Math.round(Number(v))}`}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
          {splitDate && (
            <ReferenceLine x={splitDate} stroke="hsl(38 92% 55%)" strokeDasharray="5 5"
              label={{ value: 'Forecast →', fill: 'hsl(38 92% 55%)', fontSize: 10 }} />
          )}

          {targetView === 'quantity' ? (
            <>
              <Line type="monotone" dataKey="_actual_q" stroke="hsl(210 20% 75%)" strokeWidth={2}
                dot={false} name="Actual Quantity" connectNulls={false} />
              <Line type="monotone" dataKey="_hybrid_q" stroke="hsl(168 80% 50%)" strokeWidth={2.5}
                dot={false} name="Hybrid Quantity" connectNulls />
              <Line type="monotone" dataKey="_xgb_q" stroke="hsl(260 60% 65%)" strokeWidth={1.5}
                dot={false} name="XGBoost Quantity" strokeDasharray="4 2" connectNulls />
              <Line type="monotone" dataKey="_lstm_q" stroke="hsl(30 90% 65%)" strokeWidth={1.5}
                dot={false} name="LSTM Quantity" strokeDasharray="4 2" connectNulls />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="_actual_p" stroke="hsl(210 20% 75%)" strokeWidth={2}
                dot={false} name="Actual Price" connectNulls={false} />
              <Line type="monotone" dataKey="_hybrid_p" stroke="hsl(142 70% 55%)" strokeWidth={2.5}
                dot={false} name="Hybrid Price" connectNulls />
              <Line type="monotone" dataKey="_xgb_p" stroke="hsl(260 60% 65%)" strokeWidth={1.5}
                dot={false} name="XGBoost Price" strokeDasharray="4 2" connectNulls />
              <Line type="monotone" dataKey="_lstm_p" stroke="hsl(30 90% 65%)" strokeWidth={1.5}
                dot={false} name="LSTM Price" strokeDasharray="4 2" connectNulls />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Forecast Data Explorer Table */}
      <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Forecast Data Explorer
            </h4>
            <p className="text-xs text-muted-foreground">
              Detailed predictions, historical results, and model components in tabular form
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white transition-all w-fit shadow-md hover:shadow-emerald-950/20"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV Report
          </button>
        </div>

        {/* Filters and Search controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-md bg-secondary/30 border border-border w-fit">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                filterMode === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Rows ({series.length})
            </button>
            <button
              onClick={() => setFilterMode('actual')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                filterMode === 'actual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Historical ({series.filter(d => d._actual_q !== null).length})
            </button>
            <button
              onClick={() => setFilterMode('forecast')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                filterMode === 'forecast' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Projections ({series.filter(d => d._actual_q === null).length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Date */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground font-mono"
              />
            </div>
            
            {/* Date Sorting Toggle */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary/30 border border-border hover:bg-secondary/60 text-foreground flex items-center gap-1.5 transition-all font-mono"
            >
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{sortAsc ? 'Date ↑' : 'Date ↓'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-lg border border-border/80 bg-secondary/15">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-muted-foreground font-semibold">
                <th className="p-2.5 text-center w-10">#</th>
                <th className="p-2.5 text-left">Date</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-right">
                  {targetView === 'quantity' ? 'Actual Qty' : 'Actual Price'}
                </th>
                <th className="p-2.5 text-right text-primary font-bold">
                  {targetView === 'quantity' ? 'Hybrid (Ensembled)' : 'Hybrid Price (Ensembled)'}
                </th>
                <th className="p-2.5 text-right">
                  {targetView === 'quantity' ? 'XGBoost Qty' : 'XGBoost Price'}
                </th>
                <th className="p-2.5 text-right">
                  {targetView === 'quantity' ? 'LSTM Qty' : 'LSTM Price'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedSeries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-sans">
                    No records found matching current criteria.
                  </td>
                </tr>
              ) : (
                paginatedSeries.map((pt, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isForecast = pt._actual_q === null;
                  
                  // Active values depending on view
                  const actVal = targetView === 'quantity' ? pt._actual_q : pt._actual_p;
                  const hybVal = targetView === 'quantity' ? pt._hybrid_q : pt._hybrid_p;
                  const xgbVal = targetView === 'quantity' ? pt._xgb_q : pt._xgb_p;
                  const lstmVal = targetView === 'quantity' ? pt._lstm_q : pt._lstm_p;

                  // Formatted values
                  const fmtAct = actVal !== null && actVal !== undefined
                    ? (targetView === 'quantity' ? Math.round(actVal).toLocaleString() : `₹${actVal.toFixed(2)}`)
                    : '—';
                    
                  const fmtHyb = hybVal !== null && hybVal !== undefined
                    ? (targetView === 'quantity' ? Math.round(hybVal).toLocaleString() : `₹${hybVal.toFixed(2)}`)
                    : '—';
                    
                  const fmtXgb = xgbVal !== null && xgbVal !== undefined
                    ? (targetView === 'quantity' ? Math.round(xgbVal).toLocaleString() : `₹${xgbVal.toFixed(2)}`)
                    : '—';
                    
                  const fmtLstm = lstmVal !== null && lstmVal !== undefined
                    ? (targetView === 'quantity' ? Math.round(lstmVal).toLocaleString() : `₹${lstmVal.toFixed(2)}`)
                    : '—';

                  return (
                    <tr
                      key={pt.date}
                      className={`hover:bg-secondary/10 transition-colors ${
                        isForecast ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center text-muted-foreground font-mono">{globalIdx}</td>
                      <td className="p-2.5 font-mono font-medium text-foreground">{pt.date}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-semibold inline-block ${
                          isForecast 
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {isForecast ? 'Forecast' : 'Historical'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-medium text-foreground">{fmtAct}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-primary">{fmtHyb}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{fmtXgb}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{fmtLstm}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredSeries.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] font-mono">
            <span className="text-muted-foreground text-center sm:text-left">
              Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, filteredSeries.length)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{filteredSeries.length}</span> entries
            </span>

            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-muted-foreground font-sans">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded bg-secondary/30 border border-border hover:bg-secondary/60 disabled:opacity-40 disabled:hover:bg-secondary/30 transition-all text-foreground"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 font-semibold text-primary">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded bg-secondary/30 border border-border hover:bg-secondary/60 disabled:opacity-40 disabled:hover:bg-secondary/30 transition-all text-foreground"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3">
      <p className="metric-label">{label}</p>
      <p className={`font-mono font-semibold mt-1 ${highlight ? 'text-success' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
