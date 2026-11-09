import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, X, Loader2, CheckCircle2, Database, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = 'http://localhost:5000';

interface DatasetOption {
  _id: string;
  name: string;
  rowCount: number;
  productCount: number;
}

interface CombineDatasetsProps {
  onUseForForecast?: (csvData: string, mapping: Record<string, string>, datasetName: string) => void;
}

export function CombineDatasets({ onUseForForecast }: CombineDatasetsProps = {}) {
  const { session } = useAuth();
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [combining, setCombining] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/datasets`, {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        if (!res.ok) throw new Error();
        setDatasets(await res.json());
      } catch {
        toast.error('Failed to load datasets');
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCombine = async () => {
    if (selected.length < 2) {
      toast.error('Select at least 2 datasets to combine');
      return;
    }
    if (!newName.trim()) {
      toast.error('Enter a name for the combined dataset');
      return;
    }
    if (!session) return;

    setCombining(true);
    try {
      // Fetch CSV content from each selected dataset
      const allCsvPromises = selected.map(id =>
        fetch(`${BACKEND_URL}/api/datasets/${id}`, {
          headers: { Authorization: `Bearer ${session.token}` }
        }).then(r => r.json())
      );
      const allData = await Promise.all(allCsvPromises);

      // Parse and combine: use headers from first dataset
      const csvTexts = allData.map(d => d.csvData || '');
      const allLines = csvTexts.map(t => t.split(/\r?\n/).filter((l: string) => l.trim()));

      if (allLines.length === 0 || allLines[0].length === 0) throw new Error('Empty datasets');

      const headers = allLines[0][0]; // header row from first file
      const combinedRows = [headers];
      for (const lines of allLines) {
        combinedRows.push(...lines.slice(1));
      }

      const combinedCsv = combinedRows.join('\n');
      const headerArr = headers.split(',').map((h: string) => h.trim());

      // Determine metadata
      const rowCount = combinedRows.length - 1;
      const productIdx = headerArr.findIndex((h: string) => /product|item|sku/i.test(h));
      let productCount = 0;
      if (productIdx >= 0) {
        const products = new Set<string>();
        combinedRows.slice(1).forEach(row => {
          const cols = row.split(',');
          if (cols[productIdx]) products.add(cols[productIdx].trim());
        });
        productCount = products.size;
      }

      // Save combined dataset
      const res = await fetch(`${BACKEND_URL}/api/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          name: newName,
          description: newDesc || `Combined from ${selected.length} datasets`,
          csvData: combinedCsv,
          rowCount,
          productCount,
          dateMin: '',
          dateMax: '',
          columnMapping: allData[0].columnMapping || {}
        })
      });

      if (!res.ok) throw new Error('Save failed');

      toast.success(`Combined dataset "${newName}" created with ${rowCount} rows!`);
      setSelected([]);
      setShowForm(false);

      if (onUseForForecast) {
        onUseForForecast(combinedCsv, allData[0].columnMapping || {}, newName);
        toast.info(`Loaded combined dataset "${newName}" into training pipeline!`);
      }

      setNewName('');
      setNewDesc('');

      // Refresh list
      const refreshRes = await fetch(`${BACKEND_URL}/api/datasets`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (refreshRes.ok) setDatasets(await refreshRes.json());
    } catch (err: any) {
      toast.error(err.message || 'Failed to combine datasets');
    } finally {
      setCombining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (datasets.length < 2) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
        <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Not enough datasets</h3>
        <p className="text-sm text-muted-foreground font-mono">You need at least 2 saved datasets to combine. Upload and save more datasets first.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Select datasets to combine</h3>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Select 2 or more datasets. They will be merged row-wise using the column headers from the first selected dataset.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {datasets.map(ds => {
            const isSelected = selected.includes(ds._id);
            return (
              <motion.button
                key={ds._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleSelect(ds._id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                    : 'border-border bg-secondary/20 hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{ds.name}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground flex gap-3">
                  <span>{ds.rowCount} rows</span>
                  <span>{ds.productCount} products</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {selected.length >= 2 && !showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
            <button onClick={() => setShowForm(true)} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-mono text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Combine {selected.length} Datasets
            </button>
          </motion.div>
        )}
      </div>

      {/* Combine Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Create Combined Dataset
                </h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>All {selected.length} datasets must share the same column structure (same header names in the same order).</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground">Combined Dataset Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. All Regions 2024" className="w-full mt-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground">Description (optional)</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Notes about this combined dataset" className="w-full mt-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50" />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-mono rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
                <button onClick={handleCombine} disabled={combining || !newName.trim()} className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
                  {combining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />} Merge & Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
