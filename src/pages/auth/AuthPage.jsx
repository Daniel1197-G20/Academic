import React, { useState } from 'react';
import { GraduationCap, ArrowRight, ShieldCheck, Mail, Lock, User, School, Sparkles, CheckSquare, Square } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { Footer } from '../../components/common/Footer';

export function AuthPage({ onLoginSuccess, onNavigateLegal, onOpenCookieSettings }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [academicLevel, setAcademicLevel] = useState('Year 1');

  // Consent states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  // Handle Demo Fill
  const handleUseDemoAccount = () => {
    setEmail('alexander.vance@tech-academy.edu');
    setPassword('Password123!');
    setIsRegistering(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegistering && !termsAccepted) {
      setError('You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create an account.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering
        ? { email, password, fullName, institution, department, academicLevel, termsAccepted, analyticsConsent }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zero flex flex-col justify-between bg-grid-pattern relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-ghost-200/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto p-4 sm:p-6 my-auto relative z-10 pt-10 sm:pt-14">
        {/* Brand Lockup */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ghost-200/10 border border-ghost-200/25 text-ghost-200 mb-4 shadow-ghost-glow">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            ACADEMIC<span className="text-ghost-200 font-mono">OS</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-mono">
            Learn. Connect. Track. Improve.
          </p>
        </div>

        {/* Auth Card */}
        <Card variant="glass" className="border-ghost-200/15 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">
              {isRegistering ? 'Create Student Account' : 'Welcome to Your Academic Hub'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isRegistering 
                ? 'Create your student account to manage your courses, CGPA, and study plans.'
                : 'Sign in to access your CGPA, study schedule, and course analytics.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <Input
                  label="Full Name"
                  placeholder="e.g. Maya Lin"
                  icon={User}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Institution / University"
                    placeholder="e.g. Apex Tech"
                    icon={School}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  />
                  <Input
                    label="Department / Major"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}

            <Input
              label="Academic Email"
              type="email"
              placeholder="student@university.edu"
              icon={Mail}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Registration Consent & Disclosures */}
            {isRegistering && (
              <div className="space-y-3 pt-2 text-xs text-zinc-400">
                {/* Mandatory Terms & Privacy Acknowledgement */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-ghost-200 focus:ring-ghost-200/40 focus:ring-offset-0 shrink-0"
                    required
                  />
                  <span className="leading-snug">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateLegal?.('terms')}
                      className="text-ghost-200 hover:underline font-medium"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and acknowledge the{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateLegal?.('privacy')}
                      className="text-ghost-200 hover:underline font-medium"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>

                {/* Optional Analytics Consent (Unchecked by default) */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={analyticsConsent}
                    onChange={(e) => setAnalyticsConsent(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-ghost-200 focus:ring-ghost-200/40 focus:ring-offset-0 shrink-0"
                  />
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    Allow anonymous usage analytics to help improve platform performance (Optional).
                  </span>
                </label>

                {/* Age Eligibility Notice */}
                <p className="text-[10px] text-zinc-500 font-mono leading-relaxed pt-1">
                  Intended for students aged 13 and above. Users under the age of majority require parental or institutional consent.
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              icon={ArrowRight}
              iconPosition="right"
            >
              {isRegistering ? 'Initialize Student Workspace' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Quick Demo Pre-fill */}
          {!isRegistering && (
            <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={handleUseDemoAccount}
                className="inline-flex items-center gap-2 text-xs font-mono text-ghost-200 hover:text-white bg-ghost-200/5 hover:bg-ghost-200/10 border border-ghost-200/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill Demo Account (Alexander Vance)
              </button>
            </div>
          )}

          {/* Toggle Register/Login */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-zinc-400 hover:text-ghost-200 transition-colors"
            >
              {isRegistering 
                ? 'Already have an academic profile? Sign In' 
                : "Don't have an account yet? Register here"}
            </button>
          </div>
        </Card>

        {/* Security / Privacy notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-ghost-200" />
          <span>Secure Authentication • HMAC-SHA256 Signed Session</span>
        </div>
      </div>

      {/* Footer */}
      <Footer
        onNavigate={onNavigateLegal}
        onOpenCookieSettings={onOpenCookieSettings}
      />
    </div>
  );
}
