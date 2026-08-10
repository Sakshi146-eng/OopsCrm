import { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Eye, X, Trash2, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout';
import StatusPill from '../components/StatusPill';
import { api } from '../lib/api';
import { formatDate, formatCurrency } from '../lib/utils';
import type { SalesChallan, Customer, Product, ChallanStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface LineItem { product_id: string; quantity: number; product?: Product }

export default function Challans() {
  const { user } = useAuth();
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<SalesChallan | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ product_id: '', quantity: 1 }]);
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.challans.list(params);
      setChallans(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchChallans(); }, [statusFilter]);

  const openCreate = async () => {
    if (customers.length === 0) {
      const [custRes, prodRes] = await Promise.all([api.customers.list({ status: 'ACTIVE', limit: '100' }), api.products.list()]);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    }
    setSelectedCustomer('');
    setLineItems([{ product_id: '', quantity: 1 }]);
    setCreateStatus('DRAFT');
    setModalOpen(true);
  };

  const addLine = () => setLineItems([...lineItems, { product_id: '', quantity: 1 }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, val: string | number) => {
    const updated = [...lineItems];
    if (field === 'product_id') {
      updated[i] = { ...updated[i], product_id: val as string, product: products.find(p => p.id === val) };
    } else {
      updated[i] = { ...updated[i], [field]: val };
    }
    setLineItems(updated);
  };

  const challanTotal = lineItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return sum;
    return sum + (parseFloat(String(product.unit_price)) * item.quantity);
  }, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || lineItems.some(i => !i.product_id)) {
      alert('Please select customer and all products');
      return;
    }
    setSubmitting(true);
    try {
      await api.challans.create({
        customer_id: selectedCustomer,
        items: lineItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        status: createStatus,
      });
      setModalOpen(false);
      fetchChallans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating challan');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (challan: SalesChallan, status: 'CONFIRMED' | 'CANCELLED') => {
    if (!confirm(`${status === 'CONFIRMED' ? 'Confirm' : 'Cancel'} challan ${challan.challan_number}?`)) return;
    try {
      await api.challans.updateStatus(challan.id, status);
      fetchChallans();
      if (viewModal?.id === challan.id) setViewModal(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  const openView = async (ch: SalesChallan) => {
    const res = await api.challans.get(ch.id);
    setViewModal(res.data);
  };

  return (
    <Layout
      title="Sales Challans"
      subtitle={`${challans.length} challans loaded`}
      action={canCreate ? (
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> New Challan
        </button>
      ) : undefined}
    >
      {/* Status filter */}
      <div className="flex gap-2 mb-5">
        {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>)
            ) : challans.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No challans found</td></tr>
            ) : challans.map(ch => (
              <tr key={ch.id} className="table-row-hover">
                <td className="font-mono text-xs font-bold text-primary">{ch.challan_number}</td>
                <td>
                  <div>
                    <p className="text-sm font-medium">{ch.customer?.business_name || ch.customer?.name || '—'}</p>
                    {ch.customer?.business_name && <p className="text-[10px] text-muted-foreground">{ch.customer?.name}</p>}
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{ch.items?.length || 0} items</td>
                <td className="text-sm font-medium">{ch.total_quantity}</td>
                <td><StatusPill status={ch.status} /></td>
                <td className="text-xs text-muted-foreground">{ch.created_by_user?.name || '—'}</td>
                <td className="text-xs text-muted-foreground">{formatDate(ch.createdAt)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openView(ch)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {ch.status === 'DRAFT' && canCreate && (
                      <>
                        <button onClick={() => handleStatusUpdate(ch, 'CONFIRMED')} className="p-1.5 rounded hover:bg-emerald-950 text-muted-foreground hover:text-emerald-400 transition-colors" title="Confirm">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleStatusUpdate(ch, 'CANCELLED')} className="p-1.5 rounded hover:bg-red-950 text-muted-foreground hover:text-red-400 transition-colors" title="Cancel">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold">New Sales Challan</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="form-label block mb-1">Customer *</label>
                <div className="relative">
                  <select required className="form-input pr-8 appearance-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select active customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name || c.name} — {c.mobile}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label">Line Items *</label>
                  <button type="button" onClick={addLine} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, i) => {
                    const prod = products.find(p => p.id === item.product_id);
                    return (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                        <div className="relative flex-1">
                          <select
                            required
                            className="form-input pr-8 appearance-none text-sm"
                            value={item.product_id}
                            onChange={e => updateLine(i, 'product_id', e.target.value)}
                          >
                            <option value="">Select product...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <input
                          type="number" min="1" required
                          className="form-input w-20 text-sm text-center"
                          value={item.quantity}
                          onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)}
                        />
                        <div className="text-xs text-muted-foreground w-24 text-right">
                          {prod ? formatCurrency(parseFloat(String(prod.unit_price)) * item.quantity) : '—'}
                        </div>
                        {lineItems.length > 1 && (
                          <button type="button" onClick={() => removeLine(i)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {challanTotal > 0 && (
                  <div className="flex justify-end mt-2 px-3">
                    <p className="text-sm font-bold text-foreground">Total: {formatCurrency(challanTotal)}</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="form-label block mb-1">Create as</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCreateStatus('DRAFT')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${createStatus === 'DRAFT' ? 'border-amber-700 bg-amber-950 text-amber-400' : 'border-border bg-secondary text-muted-foreground hover:bg-accent'}`}>
                    Draft
                  </button>
                  <button type="button" onClick={() => setCreateStatus('CONFIRMED')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${createStatus === 'CONFIRMED' ? 'border-emerald-700 bg-emerald-950 text-emerald-400' : 'border-border bg-secondary text-muted-foreground hover:bg-accent'}`}>
                    Confirm & Deduct Stock
                  </button>
                </div>
                {createStatus === 'CONFIRMED' && (
                  <p className="text-xs text-amber-400 mt-1.5">⚠️ This will immediately deduct stock from inventory.</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? 'Creating...' : `Create ${createStatus === 'CONFIRMED' ? '& Confirm' : 'Draft'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-base font-semibold">{viewModal.challan_number}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(viewModal.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={viewModal.status} />
                <button onClick={() => setViewModal(null)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer snapshot */}
              <div className="p-3 rounded-lg bg-secondary border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</p>
                {(() => {
                  const snap = viewModal.customer_snapshot as Record<string, string>;
                  return (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{snap.business_name || snap.name}</p>
                      <p className="text-xs text-muted-foreground">{snap.mobile} {snap.email ? `· ${snap.email}` : ''}</p>
                      {snap.gst_number && <p className="text-xs font-mono text-muted-foreground">GST: {snap.gst_number}</p>}
                    </div>
                  );
                })()}
              </div>

              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Unit Price</th>
                      <th>Qty</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewModal.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="text-sm">{item.product_name_snapshot}</td>
                        <td className="text-sm">{formatCurrency(item.unit_price_snapshot)}</td>
                        <td className="text-sm font-medium">{item.quantity}</td>
                        <td className="text-sm font-medium text-right">{formatCurrency(parseFloat(String(item.unit_price_snapshot)) * item.quantity)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="text-sm font-bold text-foreground text-right pr-4">Total</td>
                      <td className="text-sm font-bold text-primary text-right">
                        {formatCurrency((viewModal.items || []).reduce((sum, i) => sum + parseFloat(String(i.unit_price_snapshot)) * i.quantity, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {viewModal.status === 'DRAFT' && canCreate && (
                <div className="flex gap-3">
                  <button onClick={() => handleStatusUpdate(viewModal, 'CANCELLED')} className="btn-destructive flex-1 justify-center">
                    <XCircle className="w-4 h-4" /> Cancel Challan
                  </button>
                  <button onClick={() => handleStatusUpdate(viewModal, 'CONFIRMED')} className="btn-primary flex-1 justify-center">
                    <CheckCircle className="w-4 h-4" /> Confirm & Deduct Stock
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
