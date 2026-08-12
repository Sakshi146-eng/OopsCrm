import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Clock, FileText, X, ArrowRight, CheckCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Product, Customer, SalesChallan } from '../types';

interface AlertData {
  type: 'low_stock' | 'followups' | 'draft_challans' | 'confirmed_challans';
  title: string;
  description: string;
  items: string[];
  navigateTo: string;
  linkLabel: string;
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}

export default function LoginAlertDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const fetched = useRef(false);

  useEffect(() => {
    if (!user || fetched.current) return;
    fetched.current = true;

    const role = user.role;
    const collected: AlertData[] = [];

    const run = async () => {
      try {
        // ── ADMIN & WAREHOUSE: low stock alerts ──────────────────
        if (role === 'ADMIN' || role === 'WAREHOUSE') {
          const res = await api.products.list();
          const low = (res.data as Product[]).filter(p => p.is_low_stock);
          if (low.length > 0) {
            collected.push({
              type: 'low_stock',
              title: `${low.length} Product${low.length > 1 ? 's' : ''} Below Minimum Stock`,
              description: 'These items need immediate restocking to avoid fulfilment delays.',
              items: low.slice(0, 5).map(p => `${p.name} — ${p.current_stock} left (min: ${p.min_stock_alert})`),
              navigateTo: '/inventory',
              linkLabel: 'Go to Inventory',
              icon: AlertTriangle,
              iconColor: 'text-red-400',
              borderColor: 'border-red-800/60',
              bgColor: 'bg-red-950/30',
            });
          }
        }

        // ── ADMIN & SALES: overdue follow-ups ────────────────────
        if (role === 'ADMIN' || role === 'SALES') {
          const res = await api.customers.list({ limit: '100' });
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const overdue = (res.data as Customer[]).filter(c => {
            if (!c.follow_up_date || c.status === 'INACTIVE') return false;
            return new Date(c.follow_up_date) <= today;
          });
          if (overdue.length > 0) {
            collected.push({
              type: 'followups',
              title: `${overdue.length} Customer Follow-up${overdue.length > 1 ? 's' : ''} Due`,
              description: 'These customers have a follow-up scheduled for today or earlier.',
              items: overdue.slice(0, 5).map(c => `${c.name}${c.business_name ? ` (${c.business_name})` : ''}`),
              navigateTo: '/customers',
              linkLabel: 'Go to Customers',
              icon: Clock,
              iconColor: 'text-amber-400',
              borderColor: 'border-amber-800/60',
              bgColor: 'bg-amber-950/30',
            });
          }
        }

        // ── ADMIN & SALES: pending draft challans ────────────────
        if (role === 'ADMIN' || role === 'SALES') {
          const res = await api.challans.list({ status: 'DRAFT', limit: '50' });
          const drafts = res.data as SalesChallan[];
          if (drafts.length > 0) {
            collected.push({
              type: 'draft_challans',
              title: `${drafts.length} Draft Challan${drafts.length > 1 ? 's' : ''} Pending`,
              description: 'These challans are still in draft and have not been confirmed yet.',
              items: drafts.slice(0, 5).map(ch => `${ch.challan_number} — ${ch.customer?.business_name || ch.customer?.name || 'Unknown'}`),
              navigateTo: '/challans',
              linkLabel: 'Go to Challans',
              icon: FileText,
              iconColor: 'text-blue-400',
              borderColor: 'border-blue-800/60',
              bgColor: 'bg-blue-950/30',
            });
          }
        }

        // ── ACCOUNTS: confirmed challans to review ───────────────
        if (role === 'ACCOUNTS') {
          const res = await api.challans.list({ status: 'CONFIRMED', limit: '50' });
          const confirmed = res.data as SalesChallan[];
          if (confirmed.length > 0) {
            collected.push({
              type: 'confirmed_challans',
              title: `${confirmed.length} Confirmed Challan${confirmed.length > 1 ? 's' : ''} Awaiting Review`,
              description: 'These challans are confirmed and may require invoice generation.',
              items: confirmed.slice(0, 5).map(ch => `${ch.challan_number} — ${ch.customer?.business_name || ch.customer?.name || 'Unknown'}`),
              navigateTo: '/reports',
              linkLabel: 'Go to Reports',
              icon: CheckCircle,
              iconColor: 'text-emerald-400',
              borderColor: 'border-emerald-800/60',
              bgColor: 'bg-emerald-950/30',
            });
          }
        }

        if (collected.length > 0) {
          setAlerts(collected);
          setActiveIdx(0);
          setOpen(true);
        }
      } catch {
        // silently ignore — don't block login on alert fetch failure
      }
    };

    run();
  }, [user]);

  if (!open || alerts.length === 0) return null;

  const alert = alerts[activeIdx];
  const Icon = alert.icon;
  const isLast = activeIdx === alerts.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`relative bg-card border ${alert.borderColor} rounded-2xl w-full max-w-md shadow-2xl animate-fade-in`}>
        {/* Header */}
        <div className={`flex items-start gap-3 p-5 pb-4 rounded-t-2xl ${alert.bgColor} border-b ${alert.borderColor}`}>
          <div className="w-10 h-10 rounded-xl bg-card/50 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${alert.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-card/50 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item list */}
        <div className="px-5 py-4">
          <ul className="space-y-2">
            {alert.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${alert.iconColor.replace('text-', 'bg-')}`} />
                {item}
              </li>
            ))}
          </ul>
          {alerts.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Alert {activeIdx + 1} of {alerts.length}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => {
              if (isLast) {
                setOpen(false);
              } else {
                setActiveIdx(i => i + 1);
              }
            }}
            className="btn-secondary flex-1 justify-center"
          >
            {isLast ? 'Continue to Dashboard' : 'Next Alert'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate(alert.navigateTo);
            }}
            className="btn-primary flex-1 justify-center"
          >
            {alert.linkLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
