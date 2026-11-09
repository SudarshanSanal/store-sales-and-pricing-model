import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Trash2, Edit3, TrendingUp, Eye, Loader2, Calendar, Package, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { forecastStore } from '@/lib/forecastStore';

const BACKEND_URL = 'http://localhost:5000';

interface DatasetItem {
  _id: string;
  name: string;
  description: string;
  rowCount: number;
  productCount: number;
  dateMin: string;
  dateMax: string;
  createdAt: string;
  updatedAt: string;
}

interface MyDatasetsProps {
  onUseForForecast?: (csvData: string, mapping: Record<string, string>, datasetName: string, datasetId: string) => void;
  onLoadForecast?: (datasetId: string) => void;
}

export function MyDatasets({ onUseForForecast, onLoadForecast }: MyDatasetsProps) {
  const { session } = useAuth();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [loadingForecast, setLoadingForecast] = useState<string | null>(null);

  const fetchDatasets = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/datasets`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDatasets(data);
    } catch {
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  const handleDelete = async () => {
    if (!deleteId || !session) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/datasets/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Dataset permanently deleted');
      setDatasets(prev => prev.filter(d => d._id !== deleteId));
    } catch {
      toast.error('Failed to delete dataset');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEdit = async () => {
    if (!editId || !session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/datasets/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ name: editName, description: editDesc })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Dataset updated');
      setDatasets(prev => prev.map(d => d._id === editId ? { ...d, name: editName, description: editDesc } : d));
    } catch {
      toast.error('Failed to update dataset');
    } finally {
      setEditId(null);
    }
  };

  const handlePreview = async (id: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/datasets/${id}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      const lines = (data.csvData || '').split(/\r?\n/).filter((l: string) => l.trim());
      const headers = lines[0]?.split(',').map((h: string) => h.trim()) || [];
      const rows = lines.slice(1, 6).map((l: string) => l.split(',').map((c: string) => c.trim()));
      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setPreviewId(id);
    } catch {
      toast.error('Failed to preview dataset');
    }
  };

  const handleUseForForecast = async (id: string) => {
    if (!session) return;
    setLoadingForecast(id);
    // Clear global forecastStore first to prevent stale forecast leakage
    forecastStore.set(null);
    
    try {
      // 1. Try to load existing forecast for this dataset from MongoDB
      const forecastRes = await fetch(`${BACKEND_URL}/api/forecasts/dataset/${id}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      
      if (forecastRes.ok) {
        const existingForecast = await forecastRes.json();
        forecastStore.set({
          generatedAt: new Date(existingForecast.createdAt).getTime(),
          horizonDays: existingForecast.horizonDays ?? 30,
          products: existingForecast.products ?? [],
          source: existingForecast.source ?? "remote",
          datasetId: id,
        });
        toast.success(`Loaded forecast for selected dataset`);
        if (onLoadForecast) onLoadForecast(id);
        return;
      }

      // 2. If no forecast exists for this dataset, navigate to forecast view where empty state will prompt to train
      if (onLoadForecast) {
        onLoadForecast(id);
      }
    } catch {
      toast.error('Failed to load forecast for dataset');
    } finally {
      setLoadingForecast(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No datasets saved yet</h3>
        <p className="text-sm text-muted-foreground font-mono">Upload a CSV and click "Save to MongoDB" to persist your data.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground font-mono">{datasets.length} dataset{datasets.length !== 1 ? 's' : ''} saved</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((ds, i) => (
          <motion.div
            key={ds._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5 space-y-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-foreground text-sm truncate">{ds.name}</h4>
                {ds.description && <p className="text-xs text-muted-foreground font-mono mt-0.5 line-clamp-2">{ds.description}</p>}
              </div>
              <Database className="w-5 h-5 text-primary shrink-0 ml-2" />
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {ds.productCount} products</span>
              <span>{ds.rowCount} rows</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ds.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
              <button onClick={() => handlePreview(ds._id)} className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-md bg-secondary/60 border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-1">
                <Eye className="w-3 h-3" /> View
              </button>
              <button onClick={() => { setEditId(ds._id); setEditName(ds.name); setEditDesc(ds.description || ''); }} className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-md bg-secondary/60 border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => handleUseForForecast(ds._id)} disabled={!!loadingForecast} className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-md bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors flex items-center gap-1 disabled:opacity-50">
                {loadingForecast === ds._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />} Forecast
              </button>
              <button onClick={() => setDeleteId(ds._id)} className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-base font-semibold text-foreground">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-muted-foreground font-mono">This action is permanent and cannot be undone. The dataset and all its data will be permanently deleted from the database.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-xs font-mono rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Edit Dataset</h3>
                <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground">Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditId(null)} className="px-4 py-2 text-xs font-mono rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
                <button onClick={handleEdit} className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 max-w-3xl w-full space-y-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Data Preview (first 5 rows)</h3>
                <button onClick={() => setPreviewId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      {previewHeaders.map((h, i) => (
                        <th key={i} className="text-left py-2 px-2 text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="py-1.5 px-2 text-foreground">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
