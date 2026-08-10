import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth, ROLE_CREDENTIALS } from '../context/AuthContext';
import type { Role } from '../types';

const QUICK_ROLES: { role: Role; dot: string }[] = [
  { role: 'ADMIN',     dot: 'bg-violet-500' },
  { role: 'SALES',     dot: 'bg-blue-500'   },
  { role: 'WAREHOUSE', dot: 'bg-amber-500'  },
  { role: 'ACCOUNTS',  dot: 'bg-emerald-500'},
];

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: Role) => {
    setLoading(true);
    setError('');
    try {
      const creds = ROLE_CREDENTIALS[role];
      await login(creds.email, creds.password);
      navigate('/dashboard');
    } catch {
      setError('Login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMmEzYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">OpsPortal</h1>
            <p className="text-xs text-muted-foreground">Mini ERP + CRM</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-1">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your credentials to access the portal</p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label block mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials — click row to auto-login */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Demo Credentials — click to login
            </p>
            <div className="space-y-1.5">
              {QUICK_ROLES.map(({ role, dot }) => {
                const creds = ROLE_CREDENTIALS[role];
                return (
                  <button
                    key={role}
                    onClick={() => quickLogin(role)}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-left transition-colors disabled:opacity-50"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-xs text-muted-foreground font-mono flex-1">{creds.email}</span>
                    <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">{role}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Password for all: <span className="font-mono">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
