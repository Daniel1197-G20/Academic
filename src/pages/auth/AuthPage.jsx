import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  School, 
  Check, 
  Sparkles, 
  ArrowLeft,
  Loader2,
  BookOpen,
  Award,
  Shield
} from 'lucide-react';
import { Footer } from '../../components/common/Footer';
import { api } from '../../services/api/client';
import { supabase } from '../../lib/supabase/client';
import { StudoraMark } from '../../components/ui';

/**
 * Dedicated Neumorphic Input Component
 * Sunken debossed well with soft dual shadow and focus indicator
 */
function NeuInput({ 
  label, 
  id, 
  icon: Icon, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false 
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-bold text-slate-700 tracking-tight"
        >
          {label} {required && <span className="text-academic">*</span>}
        </label>
      )}
      <div className="relative flex items-center neu-inset neu-inset-focus px-3.5 py-2.5 transition-all">
        {Icon && (
          <div className="text-slate-400 shrink-0 pointer-events-none mr-2.5">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent text-slate-900 text-sm placeholder:text-slate-400/80 focus:outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Dedicated Neumorphic Checkbox Component
 * Physical tactile click with debossed/extruded state transitions
 */
function NeuCheckbox({ 
  checked = false, 
  onChange, 
  ariaLabel 
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (animating) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onChange && onChange(!checked);
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      onChange && onChange(!checked);
      setAnimating(false);
    }, 120);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`relative w-5 h-5 shrink-0 transition-transform duration-100 ease-out select-none flex items-center justify-center cursor-pointer focus:outline-none ${
        animating ? 'scale-90' : 'scale-100'
      } ${checked ? 'neu-checkbox-checked' : 'neu-checkbox-unchecked'}`}
    >
      <Check
        className={`w-3.5 h-3.5 stroke-[2.8] transition-opacity duration-150 ${
          checked ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  );
}

export function AuthPage({ 
  onLoginSuccess, 
  onNavigateLegal, 
  onOpenCookieSettings, 
  initialMode = 'login',
  onBackToLanding,
  selectedPlanCode 
}) {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
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

    const trimmedEmail = email.toLowerCase().trim();

    if (isRegistering) {
      if (!termsAccepted) {
        setError('You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create an account.');
        return;
      }
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);

      try {
        // Supabase Auth signUp
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              fullName: fullName.trim(),
              full_name: fullName.trim(),
              institution: institution.trim() || 'General Academy',
              department: department.trim() || 'General Studies',
              academicLevel: academicLevel || 'Year 1',
              academic_level: academicLevel || 'Year 1'
            }
          }
        });

        if (signUpError) {
          throw new Error(signUpError.message || 'Registration failed.');
        }

        const user = authData.user;
        if (!user) {
          throw new Error('Registration failed. Please try again.');
        }

        // STEP 10: Legal Consent Records (associated with authenticated Supabase user)
        try {
          const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'browser';
          const consentPayload = [
            {
              id: `c_${Date.now()}_terms`,
              user_id: user.id,
              consent_type: 'terms_and_conditions',
              consent_status: 'granted',
              policy_version: '1.0',
              context: 'registration',
              user_agent: userAgent
            },
            {
              id: `c_${Date.now()}_privacy`,
              user_id: user.id,
              consent_type: 'privacy_policy',
              consent_status: 'granted',
              policy_version: '1.0',
              context: 'registration',
              user_agent: userAgent
            }
          ];

          // Record optional analytics consent only if explicitly opted in
          if (analyticsConsent) {
            consentPayload.push({
              id: `c_${Date.now()}_analytics`,
              user_id: user.id,
              consent_type: 'analytics_cookies',
              consent_status: 'granted',
              policy_version: '1.0',
              context: 'registration',
              user_agent: userAgent
            });
          }

          await supabase.from('consent_records').insert(consentPayload);
        } catch (consentErr) {
          console.warn('Consent recording notice:', consentErr.message);
        }

        // Fetch user profile provisioned by database trigger
        let profile = null;
        let selectedScale = '5.0';
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          profile = prof;

          const { data: settings } = await supabase
            .from('user_settings')
            .select('selected_scale')
            .eq('user_id', user.id)
            .maybeSingle();
          if (settings?.selected_scale) {
            selectedScale = settings.selected_scale;
          }
        } catch (fetchErr) {
          console.warn('Profile fetch notice:', fetchErr.message);
        }

        if (!profile) {
          profile = {
            id: user.id,
            full_name: fullName.trim(),
            institution: institution.trim() || 'General Academy',
            department: department.trim() || 'General Studies',
            academic_level: academicLevel || 'Year 1'
          };
        }

        const session = authData.session;
        if (session?.access_token) {
          api.setToken(session.access_token);
        }

        onLoginSuccess({
          token: session?.access_token,
          user: {
            id: user.id,
            email: user.email,
            role: 'student'
          },
          profile,
          selectedScale
        });
      } catch (err) {
        setError(err.message || 'An error occurred during registration.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login Mode
      setLoading(true);

      try {
        // Authoritative: Authenticate against Supabase Auth
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (signInError) {
          // If this is the development demo account, allow fallback to local API sandbox
          if (trimmedEmail === 'alexander.vance@tech-academy.edu') {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: trimmedEmail, password })
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || 'Authentication failed');
            }
            if (data.token) {
              api.setToken(data.token);
            }
            onLoginSuccess(data);
            return;
          }

          throw new Error(signInError.message || 'Invalid email or password.');
        }

        const user = authData.user;
        const session = authData.session;

        if (session?.access_token) {
          api.setToken(session.access_token);
        }

        // Fetch user profile and settings from authoritative Supabase database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const { data: settings } = await supabase
          .from('user_settings')
          .select('selected_scale')
          .eq('user_id', user.id)
          .maybeSingle();

        onLoginSuccess({
          token: session?.access_token,
          user: {
            id: user.id,
            email: user.email,
            role: 'student'
          },
          profile: profile || {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            institution: 'General Academy',
            department: 'General Studies',
            academic_level: 'Year 1'
          },
          selectedScale: settings?.selected_scale || '5.0'
        });
      } catch (err) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#e9eef5] text-slate-800 flex flex-col justify-between relative selection:bg-academic/20 selection:text-academic overflow-x-hidden font-sans">
      {/* Neumorphic Atmospheric Ambient Lighting Gradients */}
      <div 
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/40 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#b8c5d6]/20 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" 
        aria-hidden="true" 
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto w-full p-6 sm:p-10 lg:p-14 gap-10 lg:gap-16 my-auto z-10">
        
        {/* Left Side: Brand & Academic Mission Narrative (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between space-y-8 max-w-xl">
          {/* Top Brand Crest Lockup */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl neu-surface flex items-center justify-center text-academic p-3.5 shadow-[6px_6px_14px_#b8c5d6,-6px_-6px_14px_#ffffff]">
              <StudoraMark className="w-7 h-7 text-academic" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-sans">
                  Studora
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold neu-inset-sm text-academic">
                  STUDY OS
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Study smarter. Go further.
              </p>
            </div>
          </div>

          {/* Editorial Narrative */}
          <div className="space-y-6 py-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full neu-inset-sm text-[11px] font-semibold text-academic">
              <Sparkles className="w-3.5 h-3.5 text-academic" />
              <span>All-In-One Academic Platform</span>
            </div>

            <h1 className="font-serif text-3xl xl:text-4xl text-slate-900 leading-[1.25] tracking-tight">
              Your academic life, organized.
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              Studora helps you plan your semester, track your academic progress, prepare for tests, learn with AI, and connect with tutors — all in one academic platform.
            </p>

            {/* Academic Value Pillars with Sculpted Surfaces */}
            <div className="space-y-4 pt-2">
              <div className="neu-surface neu-surface-hover p-4.5 rounded-2xl flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-academic shrink-0 mt-0.5">
                  <Award className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Precision Grade Accounting</h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Configurable grading scales (4.0, 5.0, 7.0) with course-unit weights and honors classifications.
                  </p>
                </div>
              </div>

              <div className="neu-surface neu-surface-hover p-4.5 rounded-2xl flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-academic shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Structured Study Habits</h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Targeted study objectives, streak metrics, and syllabus progress without distracting gamification.
                  </p>
                </div>
              </div>

              <div className="neu-surface neu-surface-hover p-4.5 rounded-2xl flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-academic shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Data Privacy & Sovereignty</h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    No advertising trackers. Export or permanently delete your records at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Capsule */}
          <div className="neu-inset-sm py-2.5 px-4 rounded-full flex items-center gap-3 text-xs text-slate-600 max-w-fit">
            <ShieldCheck className="w-4 h-4 text-academic shrink-0" />
            <span className="text-[11px] font-medium">Encrypted local session • Real-time database synchronisation</span>
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center">
          {/* Mobile Brand Lockup */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl neu-surface text-academic mb-2 p-3.5 shadow-[6px_6px_14px_#b8c5d6,-6px_-6px_14px_#ffffff]">
              <StudoraMark className="w-7 h-7 text-academic" strokeWidth={2.4} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-sans">
              Studora
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Study smarter. Go further.
            </p>
          </div>

          {/* Neumorphic Form Slab */}
          <div className="w-full max-w-md neu-plate p-7 sm:p-9 space-y-6">
            {/* Top Navigation Row: Back Button */}
            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 neu-btn px-3 py-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Studora</span>
              </button>
            )}

            {/* Selected Plan Banner */}
            {selectedPlanCode && selectedPlanCode !== 'basic' && (
              <div className="p-3.5 rounded-2xl neu-inset-sm text-xs flex items-center justify-between gap-3 text-slate-700">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-academic animate-pulse" />
                  <span>Selected Plan: <strong className="capitalize text-academic font-bold">{selectedPlanCode}</strong></span>
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md neu-surface text-academic font-semibold">
                  Paystack Checkout Next
                </span>
              </div>
            )}

            {/* Neumorphic Segmented Tab Switcher */}
            <div className="neu-tab-track grid grid-cols-2 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  !isRegistering
                    ? 'neu-tab-active text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isRegistering
                    ? 'neu-tab-active text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form Header */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {isRegistering ? 'Create Student Account' : 'Welcome to Studora'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {isRegistering 
                  ? 'Begin with the free plan. Plan your semester and track your CGPA.'
                  : 'Your academic journey starts here.'}
              </p>
            </div>

            {/* Demo Account Quick-Fill Card (Login Mode) */}
            {!isRegistering && (
              <div className="p-4 rounded-2xl neu-inset flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-academic" />
                    Development Demo Account (Sandbox)
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    alexander.vance@tech-academy.edu
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseDemoAccount}
                  className="neu-btn px-3 py-1.5 text-xs text-academic font-bold shrink-0 hover:text-academic-700 cursor-pointer"
                >
                  Quick Fill
                </button>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="neu-alert-danger p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                <span className="text-sm shrink-0">⚠️</span>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <>
                  <NeuInput
                    label="Full Name"
                    id="fullName"
                    placeholder="e.g. Maya Lin"
                    icon={User}
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <NeuInput
                      label="Institution / University"
                      id="institution"
                      placeholder="e.g. Apex Tech"
                      icon={School}
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                    />
                    <NeuInput
                      label="Department / Major"
                      id="department"
                      placeholder="e.g. Computer Science"
                      icon={GraduationCap}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </>
              )}

              <NeuInput
                label="Academic Email"
                id="email"
                type="email"
                placeholder="student@university.edu"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <NeuInput
                label="Password"
                id="password"
                type="password"
                placeholder="••••••••••••"
                icon={Lock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Registration Consent & Disclosures */}
              {isRegistering && (
                <div className="space-y-3 pt-1 text-xs text-slate-600">
                  <div className="flex items-start gap-3 select-none">
                    <NeuCheckbox
                      checked={termsAccepted}
                      onChange={setTermsAccepted}
                      ariaLabel="Agree to Terms and Privacy Policy"
                    />
                    <span className="leading-snug text-slate-700 text-xs">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => onNavigateLegal?.('terms')}
                        className="text-academic hover:underline font-bold"
                      >
                        Terms of Service
                      </button>{' '}
                      and acknowledge the{' '}
                      <button
                        type="button"
                        onClick={() => onNavigateLegal?.('privacy')}
                        className="text-academic hover:underline font-bold"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </div>

                  <div className="flex items-start gap-3 select-none">
                    <NeuCheckbox
                      checked={analyticsConsent}
                      onChange={setAnalyticsConsent}
                      ariaLabel="Allow anonymous diagnostic telemetry"
                    />
                    <span className="text-[11px] text-slate-500 leading-snug">
                      Allow anonymous diagnostic telemetry to help improve platform reliability (Optional).
                    </span>
                  </div>
                </div>
              )}

              {/* Neumorphic Primary Submit Action */}
              <button
                type="submit"
                disabled={loading}
                className="neu-btn-primary w-full py-3.5 px-5 flex items-center justify-center gap-2.5 text-sm font-bold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{isRegistering ? 'Create Student Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Register/Login Prompt */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-xs text-slate-500 hover:text-academic transition-colors font-medium cursor-pointer"
              >
                {isRegistering 
                  ? 'Already have an academic profile? Sign In' 
                  : "Don't have an account yet? Register here"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer seamlessly blended into the Neumorphic world */}
      <Footer
        onNavigate={onNavigateLegal}
        onOpenCookieSettings={onOpenCookieSettings}
        className="bg-[#e9eef5] border-t border-white/60 shadow-[0_-4px_16px_rgba(184,197,214,0.35)]"
      />
    </div>
  );
}
