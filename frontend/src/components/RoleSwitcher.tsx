import { useState, useEffect } from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { useAuth, ROLE_CREDENTIALS } from '../context/AuthContext';
import type { Role } from '../types';

export default function RoleSwitcher() {
  const { user, login } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) return null;

  const handleSwitch = async (role: Role) => {
    setSwitching(true);
    setOpen(false);
    try {
      const creds = ROLE_CREDENTIALS[role];
      await login(creds.email, creds.password);
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setSwitching(false);
    }
  };

  const ROLE_COLORS: Record<Role, string> = {
    ADMIN: 'text-violet-400 bg-violet-950 border-violet-800',
    SALES: 'text-blue-400 bg-blue-950 border-blue-800',
    WAREHOUSE: 'text-amber-400 bg-amber-950 border-amber-800',
    ACCOUNTS: 'text-emerald-400 bg-emerald-950 border-emerald-800',
  };

  const ROLE_DOT: Record<Role, string> = {
    ADMIN: 'bg-violet-400',
    SALES: 'bg-blue-400',
    WAREHOUSE: 'bg-amber-400',
    ACCOUNTS: 'bg-emerald-400',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-800 bg-amber-950/50 text-amber-400 text-xs font-medium hover:bg-amber-950 transition-colors"
      >
        <FlaskConical className="w-3 h-3" />
        <span>{switching ? 'Switching...' : `Dev: ${user?.role || '?'}`}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Switch Role</p>
          </div>
          {(Object.entries(ROLE_CREDENTIALS) as [Role, typeof ROLE_CREDENTIALS[Role]][]).map(([role, creds]) => (
            <button
              key={role}
              onClick={() => handleSwitch(role)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors ${user?.role === role ? 'bg-accent' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOT[role]}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{creds.label}</p>
                <p className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-block mt-0.5 ${ROLE_COLORS[role]}`}>{role}</p>
              </div>
              {user?.role === role && <span className="ml-auto text-[10px] text-muted-foreground">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
