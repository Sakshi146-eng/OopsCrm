import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Phone, Mail, Building2, MapPin,
  FileText, StickyNote, Calendar, Tag, X, Clock,
  CheckCircle2, XCircle, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import StatusPill from '../components/StatusPill';
import { api } from '../lib/api';
import { formatDate, formatDateTime, formatCurrency } from '../lib/utils';
import type { Customer, CustomerStatus, CustomerType, SalesChallan } from '../types';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = (c: Customer): Partial<Customer> => ({
  name: c.name, mobile: c.mobile, email: c.email ?? '',
  business_name: c.business_name ?? '', gst_number: c.gst_number ?? '',
  type: c.type, address: c.address ?? '', status: c.status,
  follow_up_date: c.follow_up_date ? c.follow_up_date.split('T')[0] : '',
  notes: c.notes ?? '',
});

// ── Field row helper ────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [submitting, setSubmitting] = useState(false);

  // Note modal state
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const load = async () => {
    if (!id) return;
    try {
      const res = await api.customers.get(id);
      const data = res.data as Customer & { salesChallans?: SalesChallan[] };
      setCustomer(data);
      setChallans(data.salesChallans || []);
    } catch {
      toast.error('Customer not found');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    if (!customer) return;
    setFormData(EMPTY_FORM(customer));
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSubmitting(true);
    try {
      await api.customers.update(customer.id, formData);
      toast.success('Customer updated');
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally { setSubmitting(false); }
  };

  const handleNote = async () => {
    if (!customer) return;
    try {
      await api.customers.addNote(customer.id, noteText);
      toast.success('Note saved');
      setNoteOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Customer Detail" subtitle="Loading...">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-1 space-y-3">
            <div className="h-40 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <div className="h-10 bg-muted rounded-xl" />
            <div className="h-72 bg-muted rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!customer) return null;

  const initials = customer.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  // Colour by status for the avatar ring
  const ringColor: Record<string, string> = {
    ACTIVE: 'ring-emerald-400/60',
    LEAD:   'ring-amber-400/60',
    INACTIVE: 'ring-slate-400/40',
  };

  return (
    <Layout
      title={customer.name}
      subtitle={customer.business_name || 'Customer Detail'}
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/customers')} className="btn-secondary gap-1.5 py-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          {canEdit && (
            <button onClick={openEdit} className="btn-primary gap-1.5 py-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: identity + info ─────────────────────────── */}
        <div className="space-y-5">

          {/* Avatar + core identity */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
            <div className={`w-16 h-16 rounded-full bg-primary/10 border-2 ring-4 ${ringColor[customer.status] || ''} border-primary/30 flex items-center justify-center text-primary text-2xl font-bold`}>
              {initials}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{customer.name}</h2>
              {customer.business_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{customer.business_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <StatusPill status={customer.status} />
              <StatusPill status={customer.type} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>

          {/* Contact & metadata */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Contact Info</p>
            <InfoRow icon={Phone}    label="Mobile"       value={customer.mobile} />
            <InfoRow icon={Mail}     label="Email"        value={customer.email} />
            <InfoRow icon={Building2} label="Business"    value={customer.business_name} />
            <InfoRow icon={Hash}     label="GST Number"   value={customer.gst_number} />
            <InfoRow icon={MapPin}   label="Address"      value={customer.address} />
            <InfoRow icon={Calendar} label="Follow-up"    value={formatDate(customer.follow_up_date)} />
            <InfoRow icon={Tag}      label="Last Updated" value={formatDateTime(customer.updatedAt)} />
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
              {canEdit && (
                <button
                  onClick={() => { setNoteText(customer.notes || ''); setNoteOpen(true); }}
                  className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit note"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {customer.notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes yet.</p>
            )}
          </div>
        </div>

        {/* ── Right column: challan history ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Challans', value: challans.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Confirmed', value: challans.filter(c => c.status === 'CONFIRMED').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50' },
              { label: 'Pending Draft', value: challans.filter(c => c.status === 'DRAFT').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="stat-card flex-row items-center gap-3 py-3">
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Challans table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Recent Challans</h3>
              <Link to="/challans" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            {challans.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No challans for this customer yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.map(ch => (
                    <tr key={ch.id} className="table-row-hover">
                      <td className="font-mono text-xs text-primary">{ch.challan_number}</td>
                      <td><StatusPill status={ch.status} /></td>
                      <td className="text-sm text-muted-foreground">
                        {ch.items?.length ?? '—'} item{(ch.items?.length ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="text-sm font-medium">{ch.total_quantity}</td>
                      <td className="text-xs text-muted-foreground">{formatDate(ch.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Challan line items (expanded view for the latest confirmed challan) */}
          {(() => {
            const latest = challans.find(c => c.status === 'CONFIRMED' && c.items && c.items.length > 0);
            if (!latest) return null;
            return (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    Last Confirmed Challan — <span className="font-mono text-primary">{latest.challan_number}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(latest.createdAt)}</p>
                </div>
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
                    {latest.items!.map(item => (
                      <tr key={item.id} className="table-row-hover">
                        <td className="text-sm font-medium">{item.product_name_snapshot}</td>
                        <td className="text-sm text-muted-foreground">{formatCurrency(item.unit_price_snapshot)}</td>
                        <td className="text-sm">{item.quantity}</td>
                        <td className="text-sm font-semibold text-right">
                          {formatCurrency(Number(item.unit_price_snapshot) * item.quantity)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30">
                      <td colSpan={3} className="text-xs font-semibold text-muted-foreground text-right pr-4 py-3">Total</td>
                      <td className="text-sm font-bold text-right text-foreground">
                        {formatCurrency(
                          latest.items!.reduce((s, i) => s + Number(i.unit_price_snapshot) * i.quantity, 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Edit Customer</h2>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label block mb-1">Name *</label>
                  <input required className="form-input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Mobile *</label>
                  <input required className="form-input" value={formData.mobile || ''} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Email</label>
                  <input type="email" className="form-input" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Business Name</label>
                  <input className="form-input" value={formData.business_name || ''} onChange={e => setFormData({ ...formData, business_name: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">GST Number</label>
                  <input className="form-input font-mono text-xs" value={formData.gst_number || ''} onChange={e => setFormData({ ...formData, gst_number: e.target.value })} />
                </div>
                <div>
                  <label className="form-label block mb-1">Type *</label>
                  <select required className="form-input" value={formData.type || 'RETAIL'} onChange={e => setFormData({ ...formData, type: e.target.value as CustomerType })}>
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="form-label block mb-1">Status</label>
                  <select className="form-input" value={formData.status || 'LEAD'} onChange={e => setFormData({ ...formData, status: e.target.value as CustomerStatus })}>
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="form-label block mb-1">Follow-up Date</label>
                  <input type="date" className="form-input" value={formData.follow_up_date || ''} onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label block mb-1">Address</label>
                <textarea rows={2} className="form-input resize-none" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? 'Saving...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Notes Modal ─────────────────────────────────────────────────────── */}
      {noteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Notes — {customer.name}</h2>
              <button onClick={() => setNoteOpen(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                rows={6}
                className="form-input resize-none"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Enter notes about this customer..."
              />
              <div className="flex gap-3">
                <button onClick={() => setNoteOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleNote} className="btn-primary flex-1 justify-center">Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
