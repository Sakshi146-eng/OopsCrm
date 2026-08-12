import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Package, FileText, AlertTriangle, TrendingUp,
  ArrowRight, Clock, ShieldCheck, Warehouse, BookOpen,
} from 'lucide-react';
import Layout from '../components/Layout';
import StatusPill from '../components/StatusPill';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type { Customer, Product, SalesChallan } from '../types';

interface DashStats {
  totalCustomers: number;
  activeCustomers: number;
  leads: number;
  totalProducts: number;
  lowStockProducts: number;
  draftChallans: number;
  confirmedChallans: number;
}

// ─── Role-specific welcome banners ────────────────────────────────────────────
const ROLE_META: Record<string, { icon: React.ElementType; color: string; bg: string; desc: string }> = {
  ADMIN:     { icon: ShieldCheck, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100/80 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800/50', desc: 'Full system access — manage customers, inventory, challans and reports.' },
  SALES:     { icon: Users,       color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/50',     desc: 'Manage your customers and create sales challans.' },
  WAREHOUSE: { icon: Warehouse,   color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-100/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/50',   desc: 'Monitor stock levels and record inventory movements.' },
  ACCOUNTS:  { icon: BookOpen,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/50', desc: 'Review confirmed challans and financial reports.' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentChallans, setRecentChallans] = useState<SalesChallan[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [];

    // Always fetch challans for ADMIN and SALES
    const needsChallans = ['ADMIN', 'SALES'].includes(role);
    // Always fetch products for ADMIN and WAREHOUSE
    const needsProducts = ['ADMIN', 'WAREHOUSE'].includes(role);
    // Always fetch customers for ADMIN and SALES
    const needsCustomers = ['ADMIN', 'SALES'].includes(role);

    const promises = [
      needsCustomers ? api.customers.list({ limit: '100' }) : Promise.resolve({ data: [], pagination: null }),
      needsProducts  ? api.products.list()                  : Promise.resolve({ data: [] }),
      needsChallans  ? api.challans.list({ limit: '10' })   : Promise.resolve({ data: [] }),
    ];

    Promise.all(promises).then(([custRes, prodRes, challanRes]) => {
      const customers = custRes.data as Customer[];
      const products  = prodRes.data as Product[];
      const challans  = challanRes.data as SalesChallan[];

      setStats({
        totalCustomers:   (custRes as { pagination?: { total?: number }; data: Customer[] }).pagination?.total || customers.length,
        activeCustomers:  customers.filter(c => c.status === 'ACTIVE').length,
        leads:            customers.filter(c => c.status === 'LEAD').length,
        totalProducts:    products.length,
        lowStockProducts: products.filter(p => p.is_low_stock).length,
        draftChallans:    challans.filter(c => c.status === 'DRAFT').length,
        confirmedChallans: challans.filter(c => c.status === 'CONFIRMED').length,
      });

      setRecentChallans(challans.slice(0, 5));
      setLowStockProducts(products.filter(p => p.is_low_stock).slice(0, 5));

      const followUps = customers
        .filter(c => c.follow_up_date && c.status !== 'INACTIVE')
        .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
        .slice(0, 4);
      setUpcomingFollowups(followUps);
    }).finally(() => setLoading(false));
  }, [role]);

  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Overview of your operations">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-8 bg-muted rounded w-1/2 mt-2" />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // ── ADMIN Dashboard ──────────────────────────────────────────────────────────
  if (role === 'ADMIN') {
    const statCards = [
      { label: 'Total Customers', value: stats?.totalCustomers || 0, sub: `${stats?.leads || 0} Leads · ${stats?.activeCustomers || 0} Active`, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/50', link: '/customers' },
      { label: 'Products', value: stats?.totalProducts || 0, sub: stats?.lowStockProducts ? `⚠️ ${stats.lowStockProducts} Low Stock` : 'All stock OK', icon: Package, color: stats?.lowStockProducts ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400', bg: stats?.lowStockProducts ? 'bg-red-100 dark:bg-red-950/50' : 'bg-emerald-100 dark:bg-emerald-950/50', link: '/inventory' },
      { label: 'Draft Challans', value: stats?.draftChallans || 0, sub: `${stats?.confirmedChallans || 0} Confirmed`, icon: FileText, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50', link: '/challans' },
      { label: 'Revenue (Confirmed)', value: '—', sub: 'View Reports for details', icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950/50', link: '/reports' },
    ];
    return (
      <Layout title="Dashboard" subtitle="Full system overview">
        <WelcomeBanner name={user?.name || ''} role={role} meta={meta} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <Link key={card.label} to={card.link} className="stat-card group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChallansTable challans={recentChallans} />
          <div className="space-y-6">
            <LowStockPanel products={lowStockProducts} />
            <FollowUpsPanel followups={upcomingFollowups} />
          </div>
        </div>
      </Layout>
    );
  }

  // ── SALES Dashboard ──────────────────────────────────────────────────────────
  if (role === 'SALES') {
    return (
      <Layout title="Sales Dashboard" subtitle="Your customers and challans">
        <WelcomeBanner name={user?.name || ''} role={role} meta={meta} />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link to="/customers" className="stat-card group cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Customers</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalCustomers || 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.leads || 0} Leads · {stats?.activeCustomers || 0} Active</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
              <span>Manage customers</span><ArrowRight className="w-3 h-3" />
            </div>
          </Link>
          <Link to="/challans" className="stat-card group cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Draft Challans</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.draftChallans || 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.confirmedChallans || 0} Confirmed</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
              <span>View challans</span><ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChallansTable challans={recentChallans} />
          <FollowUpsPanel followups={upcomingFollowups} />
        </div>
      </Layout>
    );
  }

  // ── WAREHOUSE Dashboard ──────────────────────────────────────────────────────
  if (role === 'WAREHOUSE') {
    return (
      <Layout title="Warehouse Dashboard" subtitle="Stock levels and inventory">
        <WelcomeBanner name={user?.name || ''} role={role} meta={meta} />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link to="/inventory" className="stat-card group cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Products</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalProducts || 0}</p>
            <p className="text-xs text-muted-foreground">Across all warehouses</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
              <span>Manage inventory</span><ArrowRight className="w-3 h-3" />
            </div>
          </Link>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Low Stock Items</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats?.lowStockProducts ? 'bg-red-100 dark:bg-red-950/50' : 'bg-emerald-100 dark:bg-emerald-950/50'}`}>
                <AlertTriangle className={`w-4 h-4 ${stats?.lowStockProducts ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats?.lowStockProducts ? 'text-red-400' : 'text-foreground'}`}>{stats?.lowStockProducts || 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.lowStockProducts ? 'Require immediate restocking' : 'All items well stocked'}</p>
          </div>
        </div>
        <LowStockPanel products={lowStockProducts} expanded />
      </Layout>
    );
  }

  // ── ACCOUNTS Dashboard ───────────────────────────────────────────────────────
  return (
    <Layout title="Accounts Dashboard" subtitle="Financial overview and reports">
      <WelcomeBanner name={user?.name || ''} role={role} meta={meta} />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/reports" className="stat-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Confirmed Challans</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.confirmedChallans || 0}</p>
          <p className="text-xs text-muted-foreground">Ready for invoicing</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
            <span>View reports</span><ArrowRight className="w-3 h-3" />
          </div>
        </Link>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending (Draft)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.draftChallans || 0}</p>
          <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
        <TrendingUp className="w-8 h-8 mx-auto mb-3 text-emerald-400 opacity-60" />
        <p className="font-medium text-foreground mb-1">Revenue Reports</p>
        <p className="text-xs mb-4">View detailed financial summaries and challan reports</p>
        <Link to="/reports" className="btn-primary inline-flex items-center gap-2 text-xs">
          Open Reports <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </Layout>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function WelcomeBanner({ name, role, meta }: { name: string; role: string; meta: typeof ROLE_META[string] }) {
  const Icon = meta.icon;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border mb-6 ${meta.bg}`}>
      <div className={`w-10 h-10 rounded-xl bg-white dark:bg-card border border-border flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${meta.color}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Welcome back, {name}!</p>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
      </div>
      <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${meta.bg} ${meta.color}`}>
        {role}
      </span>
    </div>
  );
}

function ChallansTable({ challans }: { challans: SalesChallan[] }) {
  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Challans</h2>
        <Link to="/challans" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Challan #</th>
            <th>Customer</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {challans.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No challans yet</td></tr>
          ) : challans.map(ch => (
            <tr key={ch.id} className="table-row-hover">
              <td className="font-mono text-xs text-primary">{ch.challan_number}</td>
              <td className="text-sm">{ch.customer?.business_name || ch.customer?.name || '—'}</td>
              <td className="text-sm">{ch.total_quantity}</td>
              <td><StatusPill status={ch.status} /></td>
              <td className="text-xs text-muted-foreground">{formatDate(ch.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockPanel({ products, expanded = false }: { products: Product[]; expanded?: boolean }) {
  if (products.length === 0 && !expanded) return null;
  return (
    <div className="bg-card border border-red-300 dark:border-red-900/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Low Stock Alert</h2>
        <span className="ml-auto badge-red">{products.length}</span>
      </div>
      {products.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">✅ All items are well stocked</div>
      ) : (
        <div className="p-2">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/20 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{p.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{p.current_stock}</p>
                <p className="text-[10px] text-muted-foreground">min: {p.min_stock_alert}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-4 pb-3">
        <Link to="/inventory" className="btn-destructive w-full justify-center text-xs py-1.5">
          Manage Inventory
        </Link>
      </div>
    </div>
  );
}

function FollowUpsPanel({ followups }: { followups: Customer[] }) {
  if (followups.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-foreground">Upcoming Follow-ups</h2>
      </div>
      <div className="p-2">
        {followups.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold flex-shrink-0">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{formatDate(c.follow_up_date)}</p>
            </div>
            <StatusPill status={c.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
