import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, ArrowUp, ArrowDown, Edit2, Trash2, X, Package } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { Product } from '../types';
import { useAuth } from '../context/AuthContext';

const EMPTY: Partial<Product> = {
  name: '', sku: '', category: '', unit_price: 0, current_stock: 0, min_stock_alert: 10, location: '',
};

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [movModal, setMovModal] = useState<Product | null>(null);
  const [movType, setMovType] = useState<'IN' | 'OUT'>('IN');
  const [movQty, setMovQty] = useState(1);
  const [movReason, setMovReason] = useState('');
  const [movSubmitting, setMovSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list();
      setProducts(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const categories = [...new Set(products.map(p => p.category))].sort();
  const filtered = categoryFilter ? products.filter(p => p.category === categoryFilter) : products;
  const lowCount = products.filter(p => p.is_low_stock).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.products.update(editing.id, formData);
      } else {
        await api.products.create(formData);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally { setSubmitting(false); }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movModal) return;
    setMovSubmitting(true);
    try {
      await api.products.stockMovement({
        product_id: movModal.id,
        quantity_changed: movQty,
        movement_type: movType,
        reason: movReason || undefined,
      });
      setMovModal(null);
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally { setMovSubmitting(false); }
  };

  return (
    <Layout
      title="Inventory"
      subtitle={`${products.length} products${lowCount > 0 ? ` · ${lowCount} low stock` : ''}`}
      action={canEdit ? (
        <button onClick={() => { setEditing(null); setFormData(EMPTY); setModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      ) : undefined}
    >
      {/* Low stock banner */}
      {lowCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/30 border border-red-900 mb-5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-medium">
            {lowCount} product{lowCount > 1 ? 's' : ''} below minimum stock threshold — immediate restocking required.
          </p>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!categoryFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock</th>
              <th>Min Alert</th>
              <th>Location</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No products found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`table-row-hover ${p.is_low_stock ? 'bg-red-950/10' : ''}`}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.is_low_stock ? 'bg-red-950 border border-red-800' : 'bg-muted border border-border'}`}>
                      {p.is_low_stock ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <Package className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="text-sm">{p.category}</td>
                <td className="text-sm font-medium">{formatCurrency(p.unit_price)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${p.is_low_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                      {p.current_stock}
                    </span>
                    {p.is_low_stock && (
                      <span className="badge-red animate-pulse">LOW</span>
                    )}
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{p.min_stock_alert}</td>
                <td className="text-xs text-muted-foreground">{p.location || '—'}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => { setMovModal(p); setMovType('IN'); setMovQty(1); setMovReason(''); }}
                          className="p-1.5 rounded hover:bg-emerald-950 text-muted-foreground hover:text-emerald-400 transition-colors"
                          title="Stock IN"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setMovModal(p); setMovType('OUT'); setMovQty(1); setMovReason(''); }}
                          className="p-1.5 rounded hover:bg-red-950 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Stock OUT"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(p); setFormData({ ...p }); setModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button onClick={() => setDeleteConfirm(p)} className="p-1.5 rounded hover:bg-red-950 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label block mb-1">Name *</label>
                  <input required className="form-input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">SKU *</label>
                  <input required className="form-input font-mono text-xs" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} disabled={!!editing} />
                </div>
                <div>
                  <label className="form-label block mb-1">Category *</label>
                  <input required className="form-input" value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Unit Price (₹) *</label>
                  <input required type="number" min="0" step="0.01" className="form-input" value={formData.unit_price || ''} onChange={e => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Current Stock</label>
                  <input type="number" min="0" className="form-input" value={formData.current_stock || 0} onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) })} disabled={!!editing} />
                </div>
                <div>
                  <label className="form-label block mb-1">Min Stock Alert</label>
                  <input type="number" min="0" className="form-input" value={formData.min_stock_alert || 10} onChange={e => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Location</label>
                  <input className="form-input" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Shelf A-1" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {movModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Stock Movement</h2>
              <button onClick={() => setMovModal(null)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleMovement} className="p-6 space-y-4">
              <div className="px-3 py-2.5 rounded-lg bg-secondary border border-border">
                <p className="text-sm font-medium text-foreground">{movModal.name}</p>
                <p className="text-xs text-muted-foreground">Current stock: <span className="font-bold text-foreground">{movModal.current_stock}</span></p>
              </div>
              <div>
                <label className="form-label block mb-1">Type *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMovType('IN')} className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${movType === 'IN' ? 'border-emerald-700 bg-emerald-950 text-emerald-400' : 'border-border bg-secondary text-muted-foreground hover:bg-accent'}`}>
                    <ArrowUp className="w-4 h-4" /> Stock IN
                  </button>
                  <button type="button" onClick={() => setMovType('OUT')} className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${movType === 'OUT' ? 'border-red-700 bg-red-950 text-red-400' : 'border-border bg-secondary text-muted-foreground hover:bg-accent'}`}>
                    <ArrowDown className="w-4 h-4" /> Stock OUT
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label block mb-1">Quantity *</label>
                <input required type="number" min="1" className="form-input" value={movQty} onChange={e => setMovQty(parseInt(e.target.value))} />
              </div>
              <div>
                <label className="form-label block mb-1">Reason</label>
                <input className="form-input" value={movReason} onChange={e => setMovReason(e.target.value)} placeholder="e.g. Purchase from supplier" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMovModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={movSubmitting} className={`flex-1 justify-center ${movType === 'IN' ? 'btn-primary' : 'btn-destructive'} inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium`}>
                  {movSubmitting ? 'Processing...' : `Apply ${movType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <h2 className="text-base font-semibold mb-2">Delete Product?</h2>
            <p className="text-sm text-muted-foreground mb-6">Permanently delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={async () => { await api.products.delete(deleteConfirm.id); setDeleteConfirm(null); fetchProducts(); }} className="btn-destructive flex-1 justify-center">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
