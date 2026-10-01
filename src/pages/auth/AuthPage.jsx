import React, { useState } from 'react';
import { GraduationCap, ArrowRight, ShieldCheck, Mail, Lock, User, School, Check, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-canvas flex flex-col justify-between">
      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side: Brand & Academic Mission (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 bg-navy text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
          {/* Subtle architectural border accent */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-white/10" />

          {/* Top Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-academic flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                Academic Platform
              </span>
              <p className="text-xs text-navy-300">
                University Academic Productivity
              </p>
            </div>
          </div>

          {/* Center Editorial Narrative */}
          <div className="space-y-6 max-w-lg my-auto py-12">
            <h1 className="font-serif text-3xl xl:text-4xl text-white leading-tight">
              A disciplined platform for serious university students.
            </h1>
            <p className="text-sm text-navy-200 leading-relaxed">
              Unify your multi-year CGPA calculations, weekly study scheduling, and academic performance tracking in a single, focused environment.
            </p>

            {/* Academic Value Pillars */}
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-academic-900 border border-academic-700/60 flex items-center justify-center text-academic-300 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Precision Grade Accounting</h2>
                  <p className="text-xs text-navy-300">Configurable grading scales (4.0, 5.0, 7.0) with course-unit weights and honors classifications.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-academic-900 border border-academic-700/60 flex items-center justify-center text-academic-300 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Structured Study Habits</h2>
                  <p className="text-xs text-navy-300">Targeted study objectives, streak metrics, and syllabus progress without distracting gamification.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-academic-900 border border-academic-700/60 flex items-center justify-center text-academic-300 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Data Privacy & Sovereignty</h2>
                  <p className="text-xs text-navy-300">No advertising trackers. Export or permanently delete your records at any time.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-navy-300">
            <ShieldCheck className="w-4 h-4 text-academic-400" />
            <span>Encrypted local session • Real-time database synchronisation</span>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
          {/* Mobile Brand Lockup */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-academic-100 text-academic mb-2 border border-academic-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Academic Platform
            </h1>
            <p className="text-xs text-muted">
              University Academic Productivity
            </p>
          </div>

          <div className="w-full max-w-md space-y-6">
            {/* Form Header */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {isRegistering ? 'Create Student Account' : 'Sign In'}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                {isRegistering 
                  ? 'Set up your student profile to manage courses, CGPA, and study schedules.'
                  : 'Enter your academic credentials to access your workspace.'}
              </p>
            </div>

            {/* Demo Account Quick-Fill Card */}
            {!isRegistering && (
              <div className="p-3.5 rounded-xl bg-academic-50 border border-academic-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-academic-800">
                    Sample Student Account
                  </p>
                  <p className="text-[11px] text-academic-700/80 truncate">
                    Alexander Vance (alexander.vance@tech-academy.edu)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="academic"
                  size="sm"
                  onClick={handleUseDemoAccount}
                  className="shrink-0 text-xs py-1 px-2.5"
                >
                  Quick Fill
                </Button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-100 text-xs text-danger font-medium">
                {error}
              </div>
            )}

            {/* Auth Form */}
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
                <div className="space-y-3 pt-1 text-xs text-muted">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-academic focus:ring-academic shrink-0"
                      required
                    />
                    <span className="leading-snug text-ink text-xs">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => onNavigateLegal?.('terms')}
                        className="text-academic hover:underline font-semibold"
                      >
                        Terms of Service
                      </button>{' '}
                      and acknowledge the{' '}
                      <button
                        type="button"
                        onClick={() => onNavigateLegal?.('privacy')}
                        className="text-academic hover:underline font-semibold"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-academic focus:ring-academic shrink-0"
                    />
                    <span className="text-[11px] text-muted leading-snug">
                      Allow anonymous diagnostic telemetry to help improve platform reliability (Optional).
                    </span>
                  </label>
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
                {isRegistering ? 'Create Student Account' : 'Sign In'}
              </Button>
            </form>

            {/* Toggle Register/Login */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-xs text-muted hover:text-academic transition-colors font-medium"
              >
                {isRegistering 
                  ? 'Already have an academic profile? Sign In' 
                  : "Don't have an account yet? Register here"}
              </button>
            </div>
          </div>
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
