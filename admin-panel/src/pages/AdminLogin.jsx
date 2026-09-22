import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { IconMail, IconLock, IconCheckCircle2, IconDatabase, IconSearch, IconBarChart3, IconLoader2 } from '../components/common/Icons';

function BrandFeature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
        {icon}
      </div>
      <div>
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-sm text-white/75 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex">
      {/* Left branding panel */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 60%, white 0%, transparent 35%)',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white text-brand-700 flex items-center justify-center font-black text-xl shadow-lg">
                DS
              </div>
              <div>
                <div className="font-serif font-black text-white text-2xl leading-tight">
                  DataSync Pro
                </div>
                <div className="text-xs text-white/70 uppercase tracking-[0.18em] font-bold mt-1">
                  Admin Console
                </div>
              </div>
            </div>

            <div className="mt-16 max-w-lg">
              <h2 className="font-serif font-black text-white text-4xl xl:text-5xl leading-tight">
                Centralized data,
                <br />
                simplified oversight.
              </h2>
              <p className="mt-5 text-base text-white/80 leading-relaxed max-w-md">
                A powerful dashboard for administrators to review, search, and manage all
                collected family and business records from one secure place.
              </p>
            </div>

            <div className="mt-14 space-y-5 max-w-md">
              <BrandFeature
                icon={<IconDatabase size={18} />}
                title="Secure Data Repository"
                desc="All family records stored in a searchable, permission-controlled database."
              />
              <BrandFeature
                icon={<IconSearch size={18} />}
                title="Powerful Search & Filters"
                desc="Find records quickly using name, location, occupation, date, and more."
              />
              <BrandFeature
                icon={<IconBarChart3 size={18} />}
                title="Insightful Analytics"
                desc="Trends and breakdowns across geography, occupation, education, and family."
              />
            </div>
          </div>

          <div className="text-sm text-white/60">
            © {new Date().getFullYear()} DataSync Pro · Built for data collection teams.
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black">
              DS
            </div>
            <div>
              <div className="font-serif font-bold text-navy-900 text-xl leading-tight">
                DataSync Pro
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Admin Console
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-gray-900/5 p-7 sm:p-9">
            <div className="mb-7">
              <h1 className="font-serif font-black text-navy-900 text-2xl leading-tight">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Sign in to access the DataSync Pro admin dashboard.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 text-red-700 border border-red-200 p-4 text-sm flex items-start gap-3">
                <svg className="flex-shrink-0 mt-0.5 h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="flex-1">
                  <div className="font-bold text-sm">Sign in failed</div>
                  <div className="mt-0.5">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <IconMail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-3 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <IconLock
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-3 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 px-4 text-sm font-bold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <IconLoader2 size={17} />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-5">
              <IconCheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              <span>Connection secured via JWT authentication.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
