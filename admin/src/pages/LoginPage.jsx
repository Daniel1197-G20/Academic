import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { session, profile, loading, isAdmin, error, signIn } = useAdminAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const from = location.state?.from?.pathname || '/';

  // Already authenticated admin → go straight in
  if (!loading && session && isAdmin) {
    return <Navigate to={from} replace />;
  }

  // Authenticated but not admin
  if (!loading && session && profile && !isAdmin) {
    return <Navigate to="/denied" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setLocalError(err.message);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-navy mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-ink">Studora Admin</h1>
          <p className="text-xs text-muted mt-1">Restricted — authorised personnel only</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-card border border-border shadow-subtle p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/30 focus:border-academic transition-colors"
              placeholder="admin@studora.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 rounded-btn border border-border text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/30 focus:border-academic transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {displayError && (
            <div className="p-3 rounded-btn bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-btn bg-navy text-white text-sm font-semibold hover:bg-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Access is determined by database role assignment.
        </p>
      </div>
    </div>
  );
}
