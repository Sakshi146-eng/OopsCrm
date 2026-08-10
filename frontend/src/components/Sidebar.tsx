import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, BarChart3,
  ChevronLeft, ChevronRight, LogOut, Zap, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import type { Role } from '../types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  roles: Role[]; // which roles can see this item
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, to: '/dashboard', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { label: 'Customers',     icon: Users,           to: '/customers', roles: ['ADMIN', 'SALES'] },
  { label: 'Inventory',     icon: Package,         to: '/inventory', roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Sales Challans',icon: FileText,        to: '/challans',  roles: ['ADMIN', 'SALES'] },
  { label: 'Reports',       icon: BarChart3,       to: '/reports',   roles: ['ADMIN', 'ACCOUNTS'] },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN:     'bg-violet-600',
  SALES:     'bg-blue-600',
  WAREHOUSE: 'bg-amber-600',
  ACCOUNTS:  'bg-emerald-600',
};

export default function Sidebar({ lowStockCount = 0 }: { lowStockCount?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    item => user && item.roles.includes(user.role)
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border min-h-[65px]">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-accent-foreground truncate">OpsPortal</p>
            <p className="text-[10px] text-sidebar-foreground">Mini ERP + CRM</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Role badge */}
      {!collapsed && user && (
        <div className="px-3 pt-3 pb-1">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md text-white',
            ROLE_COLORS[user.role] || 'bg-slate-600'
          )}>
            {user.role}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-sidebar-primary' : '')} />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {/* Low stock badge on Inventory */}
              {!collapsed && item.to === '/inventory' && lowStockCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {lowStockCount}
                </span>
              )}
              {collapsed && item.to === '/inventory' && lowStockCount > 0 && (
                <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile + Logout */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {user && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', ROLE_COLORS[user.role] || 'bg-slate-600')}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-red-950 hover:text-red-400 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
