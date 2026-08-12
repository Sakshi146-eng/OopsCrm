import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, StickyNote, X, ChevronDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusPill from '../components/StatusPill';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { Customer, CustomerStatus, CustomerType } from '../types';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM: Partial<Customer> = {
  name: '', mobile: '', email: '', business_name: '', gst_number: '',
  type: 'RETAIL', address: '', status: 'LEAD', notes: '',
};

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [noteModal, setNoteModal] = useState<Customer | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchCustomers = async (overrides?: Record<string, string>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      Object.assign(params, overrides || {});
      const res = await api.customers.list(params);
      setCustomers(res.data);
      setTotal(res.pagination?.total || res.data.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [statusFilter, typeFilter]);
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchCustomers(), 400);
  }, [search]);

  const openCreate = () => { setEditingCustomer(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditingCustomer(c); setFormData({ ...c }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await api.customers.update(editingCustomer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await api.customers.create(formData);
        toast.success('Customer created successfully');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving customer');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (c: Customer) => {
    try {
      await api.customers.delete(c.id);
      setDeleteConfirm(null);
      fetchCustomers();
      toast.success('Customer deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleNote = async () => {
    if (!noteModal) return;
    try {
      await api.customers.addNote(noteModal.id, noteText);
      setNoteModal(null);
      fetchCustomers();
      toast.success('Note saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    }
  };

  return (
    <Layout
      title="Customers"
      subtitle={`${total} total customers`}
      action={canEdit ? (
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      ) : undefined}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="form-input pl-9"
            placeholder="Search name, mobile, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input pr-8 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LEAD">Lead</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="form-input pr-8 appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Business</th>
              <th>Mobile</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No customers found</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="table-row-hover">
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="text-sm">{c.business_name || '—'}</td>
                <td className="font-mono text-xs">{c.mobile}</td>
                <td><StatusPill status={c.type} /></td>
                <td><StatusPill status={c.status} /></td>
                <td className="text-xs text-muted-foreground">{formatDate(c.follow_up_date)}</td>
                <td className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/customers/${c.id}`}
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="View Detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => { setNoteModal(c); setNoteText(c.notes || ''); }}
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Add Note"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded hover:bg-destructive/15 transition-colors text-muted-foreground hover:text-destructive" title="Delete">
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

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  <input type="date" className="form-input" value={formData.follow_up_date ? formData.follow_up_date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label block mb-1">Address</label>
                <textarea rows={2} className="form-input resize-none" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Notes — {noteModal.name}</h2>
              <button onClick={() => setNoteModal(null)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <textarea rows={5} className="form-input resize-none" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Enter notes about this customer..." />
              <div className="flex gap-3">
                <button onClick={() => setNoteModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleNote} className="btn-primary flex-1 justify-center">Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in p-6">
            <h2 className="text-base font-semibold mb-2">Delete Customer?</h2>
            <p className="text-sm text-muted-foreground mb-6">This will permanently delete <strong>{deleteConfirm.name}</strong>. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-destructive flex-1 justify-center">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
