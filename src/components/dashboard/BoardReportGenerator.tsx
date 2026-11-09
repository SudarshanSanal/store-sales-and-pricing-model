import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useForecast } from '@/lib/forecastStore';
import { generatePdfReport } from '@/lib/generateReport';

export function BoardReportGenerator() {
  const forecast = useForecast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!forecast) {
      setError('No forecast data loaded. Upload data and run a forecast first.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      // Small yield so the spinner renders before the heavy PDF work starts
      await new Promise(r => setTimeout(r, 80));
      generatePdfReport(forecast);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card p-5 border border-primary/20 bg-primary/5 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Executive Board Report
          </h3>
          <p className="text-sm text-muted-foreground font-mono mt-1 max-w-xl">
            Download a 4-page branded PDF with annual revenue, product forecasts, inventory
            intelligence, and model performance metrics — ready for stakeholder meetings.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isGenerating && !isDone && !error && (
            <motion.button
              key="generate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleGenerate}
              disabled={!forecast}
              title={!forecast ? 'Run a forecast first to enable the report' : 'Download PDF board report'}
              className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Generate PDF Report
            </motion.button>
          )}

          {isGenerating && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="shrink-0 flex items-center gap-3 px-6 py-2.5 rounded-lg text-sm font-bold font-mono bg-secondary border border-border text-foreground"
            >
              <Loader2 className="w-4 h-4 text-primary animate-spin" /> Building PDF…
            </motion.div>
          )}

          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="shrink-0 flex items-center gap-3 px-6 py-2.5 rounded-lg text-sm font-bold font-mono bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4" /> Saved to Downloads ✓
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono bg-red-500/15 border border-red-500/40 text-red-400 max-w-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* What's in the report */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
        {[
          { label: 'Page 1', desc: 'KPI Dashboard · Annual & Monthly Revenue' },
          { label: 'Page 2', desc: 'Product Forecast Table · Projected Revenue per SKU' },
          { label: 'Page 3', desc: 'Inventory Intelligence · EOQ, ROP, Safety Stock' },
          { label: 'Page 4', desc: 'Model Comparison · MAE / RMSE / MAPE / R²' },
        ].map(p => (
          <div key={p.label} className="rounded-md bg-secondary/40 border border-border p-2">
            <p className="text-[10px] font-mono font-bold text-primary">{p.label}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.desc}</p>
          </div>
        ))}
      </div>

      {!forecast && (
        <p className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          Upload data and run a forecast first — then generate the report.
        </p>
      )}
    </div>
  );
}
