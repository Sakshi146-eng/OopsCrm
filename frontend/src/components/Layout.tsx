import { useEffect, useState, useRef, ReactNode } from 'react';
import { Bell, X, AlertTriangle, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import type { Product } from '../types';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:     'bg-violet-600',
  SALES:     'bg-blue-600',
  WAREHOUSE: 'bg-amber-600',
  ACCOUNTS:  'bg-emerald-600',
};

export default function Layout({ children, title, subtitle, action }: LayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const lowStockCount = lowStockProducts.length;

  const canSeeStock = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  useEffect(() => {
    if (!canSeeStock) return;
    api.products.list()
      .then(res => {
        const low = res.data.filter((p: Product) => p.is_low_stock);
        setLowStockProducts(low);
      })
      .catch(() => {});
  }, [canSeeStock]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar lowStockCount={canSeeStock ? lowStockCount : 0} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20 min-h-[65px]">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground no-print"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell — only for ADMIN & WAREHOUSE (inventory access) */}
            {canSeeStock && <div className="relative" ref={bellRef}>
              <button
                id="notification-bell"
                onClick={() => setBellOpen(prev => !prev)}
                className="relative p-2 rounded-lg hover:bg-accent transition-colors"
                title="Notifications"
              >
                <Bell className={`w-4 h-4 ${lowStockCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
                {lowStockCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                      <p className="text-sm font-semibold text-foreground">Low Stock Alerts</p>
                      {lowStockCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800">
                          {lowStockCount}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setBellOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {lowStockProducts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        ✅ All products have sufficient stock
                      </div>
                    ) : (
                      lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 hover:bg-red-100 dark:hover:bg-red-950/20 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{p.sku} · {p.location || 'No location'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">{p.current_stock}</p>
                            <p className="text-[10px] text-muted-foreground">min: {p.min_stock_alert}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {lowStockProducts.length > 0 && (
                    <div className="px-4 py-3 border-t border-border bg-card/50">
                      <Link
                        to="/inventory"
                        onClick={() => setBellOpen(false)}
                        className="block text-center text-xs text-primary hover:underline font-medium"
                      >
                        Manage Inventory →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* User chip */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${ROLE_COLORS[user.role] || 'bg-slate-600'}`}>
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-foreground leading-none">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.role}</p>
                </div>
              </div>
            )}

            {action && action}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
