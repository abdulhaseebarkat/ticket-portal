import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
      return;
    }
    setError(result.message || 'Invalid email or password.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="grid max-w-6xl grid-cols-1 gap-8 rounded-[32px] border border-slate-800 bg-slate-900/95 p-6 shadow-card md:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 p-10 text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.25),_transparent_35%)]" />
          <div className="relative z-10">
            <div className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Plant IT Support Portal</div>
            <h1 className="mt-6 text-4xl font-bold leading-tight">IT Complaint Monitoring &amp; Operations Dashboard</h1>
            <p className="mt-6 max-w-md text-slate-300">This portal provides centralized visibility into WhatsApp-based IT complaints across the plant without changing the field workflow.</p>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950/95 p-8 shadow-card border border-slate-800">
          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-500">Sign in</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Welcome back</h2>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                placeholder="you@company.com"
                autoFocus
              />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pr-12 text-white outline-none transition focus:border-sky-500"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
