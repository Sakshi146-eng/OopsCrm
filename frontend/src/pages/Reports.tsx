import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Package, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Layout from '../components/Layout';
import StatusPill from '../components/StatusPill';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/utils';
import type { SalesChallan, StockMovement, Product } from '../types';

export default function Reports() {
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.challans.list({ limit: '100' }),
      api.products.movements(),
      api.products.list(),
    ]).then(([chRes, movRes, prodRes]) => {
      setChallans(chRes.data);
      setMovements(movRes.data);
      setProducts(prodRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const confirmed = challans.filter(c => c.status === 'CONFIRMED');

  // Revenue by customer
  const customerRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
  confirmed.forEach(ch => {
    const snap = ch.customer_snapshot as Record<string, string>;
    const key = ch.customer_id;
    const name = snap.business_name || snap.name || 'Unknown';
    const revenue = (ch.items || []).reduce((sum, i) => sum + parseFloat(String(i.unit_price_snapshot)) * i.quantity, 0);
    if (!customerRevenue[key]) customerRevenue[key] = { name, revenue: 0, orders: 0 };
    customerRevenue[key].revenue += revenue;
    customerRevenue[key].orders += 1;
  });
  const topCustomers = Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Total stats
  const totalRevenue = Object.values(customerRevenue).reduce((s, c) => s + c.revenue, 0);
  const totalQty = confirmed.reduce((s, c) => s + c.total_quantity, 0);
  const lowStock = products.filter(p => p.is_low_stock).length;

  const inMovements = movements.filter(m => m.movement_type === 'IN');
  const outMovements = movements.filter(m => m.movement_type === 'OUT');

  if (loading) {
    return (
      <Layout title="Reports" subtitle="Business analytics & insights">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm animate-pulse">Loading reports...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports" subtitle="Business analytics & insights">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Confirmed Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-950/50' },
          { label: 'Items Sold', value: totalQty, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-950/50' },
          { label: 'Stock IN', value: inMovements.reduce((s, m) => s + m.quantity_changed, 0), icon: ArrowUpCircle, color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
          { label: 'Stock OUT', value: outMovements.reduce((s, m) => s + m.quantity_changed, 0), icon: ArrowDownCircle, color: 'text-red-400', bg: 'bg-red-950/30' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Revenue */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Top Customers by Revenue</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Based on confirmed challans</p>
          </div>
          {topCustomers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No confirmed challans yet</div>
          ) : (
            <div className="p-4 space-y-3">
              {topCustomers.map((c, i) => {
                const pct = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.orders} order{c.orders !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(c.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Products */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Stock Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{lowStock} product{lowStock !== 1 ? 's' : ''} below alert threshold</p>
            </div>
            {lowStock > 0 && <span className="badge-red">{lowStock} LOW</span>}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Min</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.sort((a, b) => (a.current_stock - a.min_stock_alert) - (b.current_stock - b.min_stock_alert)).slice(0, 8).map(p => (
                <tr key={p.id} className={`table-row-hover ${p.is_low_stock ? 'bg-red-950/10' : ''}`}>
                  <td>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[160px]">{p.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{p.sku}</p>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{p.category}</td>
                  <td className={`text-sm font-bold ${p.is_low_stock ? 'text-red-400' : 'text-emerald-400'}`}>{p.current_stock}</td>
                  <td className="text-xs text-muted-foreground">{p.min_stock_alert}</td>
                  <td>
                    {p.is_low_stock
                      ? <span className="badge-red">LOW</span>
                      : <span className="badge-green">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Challan Summary */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Challan Status Summary</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Draft', status: 'DRAFT', count: challans.filter(c => c.status === 'DRAFT').length, color: 'border-amber-800 bg-amber-950/30 text-amber-400' },
                { label: 'Confirmed', status: 'CONFIRMED', count: confirmed.length, color: 'border-emerald-800 bg-emerald-950/30 text-emerald-400' },
                { label: 'Cancelled', status: 'CANCELLED', count: challans.filter(c => c.status === 'CANCELLED').length, color: 'border-red-800 bg-red-950/30 text-red-400' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-4 flex flex-col items-center gap-2 ${s.color}`}>
                  <p className="text-3xl font-bold">{s.count}</p>
                  <span><StatusPill status={s.status} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Stock Movements</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 10).map(m => (
                <tr key={m.id} className="table-row-hover">
                  <td>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[140px]">{m.product?.name || '—'}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{m.product?.sku}</p>
                    </div>
                  </td>
                  <td><StatusPill status={m.movement_type} /></td>
                  <td className={`text-sm font-bold ${m.movement_type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.movement_type === 'IN' ? '+' : '-'}{m.quantity_changed}
                  </td>
                  <td className="text-xs text-muted-foreground">{m.user?.name || '—'}</td>
                  <td className="text-[10px] text-muted-foreground">{formatDateTime(m.timestamp)}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No movements yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
