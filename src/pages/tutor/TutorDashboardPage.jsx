/**
 * TutorDashboardPage
 *
 * Workspace for approved Studora tutors (role === 'tutor').
 *
 * Shown when an approved tutor navigates to the 'become-tutor' tab.
 * Reads tutor_profiles + tutor_subjects from Supabase for the current user.
 *
 * Security:
 *  - Only reads the tutor's own profile (eq filter on user_id = auth user).
 *  - Never reads assessment answers, admin notes, or rejection reasons.
 *  - Role check is for UI routing only; RLS is the real security boundary.
 *
 * @param {object} props
 * @param {object} props.userProfile        - Authenticated user profile
 * @param {Function} props.onNavigate       - App navigation function
 * @param {Function} props.showToast        - Toast notification function
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  BookOpen,
  Users,
  Video,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Compass,
  Clock,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Building2,
} from 'lucide-react';
import { Button, Badge, Avatar, PageHeader } from '../../components/ui';
import { supabase } from '../../lib/supabase/client';
import { EarningsSection } from './EarningsSection';
import { PayoutSetupSection } from './PayoutSetupSection';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = 'academic' }) {
  const accentMap = {
    academic: 'bg-academic-50 border-academic-200 text-academic',
    gold: 'bg-gold-50 border-gold-200 text-gold-700',
    navy: 'bg-navy-50 border-navy-200 text-navy-700',
    muted: 'bg-canvas border-border text-muted',
  };
  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-tactile-surface flex flex-col justify-between gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-ink font-mono tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-ink mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TutorDashboardPage({ userProfile, onNavigate, showToast }) {
  const [tutorProfile, setTutorProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTutorData = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch own tutor profile — RLS limits this to the authenticated user's own row
      const { data: profileData, error: profErr } = await supabase
        .from('tutor_profiles')
        .select(`
          id,
          title,
          bio,
          teaching_approach,
          rating,
          review_count,
          is_verified,
          is_active,
          is_visible,
          academic_level,
          institution,
          department,
          hourly_rate,
          session_price_kobo,
          approved_at
        `)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (profErr) throw new Error(profErr.message);

      setTutorProfile(profileData || null);

      if (profileData?.id) {
        // Fetch approved subjects for this tutor
        const { data: subjectRows, error: subErr } = await supabase
          .from('tutor_subjects')
          .select(`
            proficiency_level,
            subjects!inner (
              id,
              name,
              code,
              category
            )
          `)
          .eq('tutor_id', profileData.id);

        if (!subErr) {
          setSubjects(
            (subjectRows || []).map((r) => ({
              name: r.subjects.name,
              code: r.subjects.code,
              category: r.subjects.category,
              proficiency: r.proficiency_level,
            }))
          );
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetchTutorData();
  }, [fetchTutorData]);

  const tutorFirstName = userProfile?.full_name?.split(' ')[0] || 'Tutor';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-academic animate-spin" />
        <p className="text-sm text-muted">Loading your tutor workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white border border-danger-100 rounded-card p-6 text-center space-y-3 shadow-tactile-surface">
        <AlertCircle className="w-8 h-8 text-danger mx-auto" />
        <p className="text-sm font-semibold text-ink">Could not load tutor workspace</p>
        <p className="text-xs text-muted">{error}</p>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchTutorData}>
          Retry
        </Button>
      </div>
    );
  }

  const isProfileActive = tutorProfile?.is_active && tutorProfile?.is_verified;
  const sessionPriceFormatted = tutorProfile?.session_price_kobo
    ? `₦${(tutorProfile.session_price_kobo / 100).toLocaleString()}`
    : 'Not Set';

  return (
    <div className="max-w-6xl space-y-8 pb-20 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-academic-100 border border-academic-200 flex items-center justify-center text-academic shrink-0 shadow-tactile-surface">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="academic">Tutor Workspace</Badge>
              {isProfileActive && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-academic-50 border border-academic-200 text-academic">
                  <ShieldCheck className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Welcome back, {tutorFirstName}.
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Your Studora tutor workspace — manage session pricing, earnings, and payouts.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Button
            variant="academic"
            size="sm"
            onClick={() => onNavigate('tutors')}
            icon={Compass}
            className="shadow-tactile-btn"
          >
            View Marketplace
          </Button>
        </div>
      </div>

      {/* ── Overview Stats ── */}
      <div>
        <SectionHeader title="Overview" subtitle="Your tutor workspace at a glance" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Approved Subjects"
            value={subjects.length || '—'}
            sub="Subjects you can teach"
            icon={BookOpen}
            accent="academic"
          />
          <StatCard
            label="Rating"
            value={tutorProfile?.rating ? `${parseFloat(tutorProfile.rating).toFixed(1)}★` : '—'}
            sub={tutorProfile?.review_count ? `${tutorProfile.review_count} reviews` : 'No reviews yet'}
            icon={Star}
            accent="gold"
          />
          <StatCard
            label="Session Price"
            value={sessionPriceFormatted}
            sub="Per 1-hour session (80% tutor share)"
            icon={DollarSign}
            accent="academic"
          />
          <StatCard
            label="Session Status"
            value={isProfileActive ? 'Active' : 'Inactive'}
            sub={isProfileActive ? 'Visible in marketplace' : 'Not visible to students'}
            icon={Video}
            accent={isProfileActive ? 'academic' : 'muted'}
          />
        </div>
      </div>

      {/* ── Pricing & Payout Setup ── */}
      <div>
        <SectionHeader title="Pricing & Payout Setup" subtitle="Configure your hourly session rate and bank account" />
        <PayoutSetupSection
          tutorProfile={tutorProfile}
          userProfile={userProfile}
          showToast={showToast}
          onProfileUpdated={fetchTutorData}
        />
      </div>

      {/* ── Earnings & Withdrawals ── */}
      <div>
        <SectionHeader title="Earnings & Withdrawals" subtitle="Track your tutor balance and request Paystack transfers" />
        <EarningsSection userProfile={userProfile} showToast={showToast} />
      </div>

      {/* ── Tutor Profile Details ── */}
      <div>
        <SectionHeader title="Tutor Profile" subtitle="Your public marketplace identity" />
        <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative shrink-0">
              <Avatar
                name={userProfile?.full_name || 'Tutor'}
                src={userProfile?.avatar_url}
                size="xl"
              />
              {isProfileActive && (
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-academic border-2 border-white flex items-center justify-center"
                  title="Verified Studora Tutor"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  {userProfile?.full_name || 'Studora Tutor'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {tutorProfile?.title || 'Verified Studora Tutor'}
                </p>
              </div>

              {tutorProfile?.bio && (
                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                  {tutorProfile.bio}
                </p>
              )}

              {/* Approved Subjects */}
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <span
                      key={s.name}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-academic-50 border border-academic-200 text-academic"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono text-muted">
                {tutorProfile?.institution && (
                  <div>
                    <span className="text-muted">Institution</span>
                    <p className="text-ink font-medium truncate">{tutorProfile.institution}</p>
                  </div>
                )}
                {tutorProfile?.academic_level && (
                  <div>
                    <span className="text-muted">Level</span>
                    <p className="text-ink font-medium">{tutorProfile.academic_level}</p>
                  </div>
                )}
                {tutorProfile?.approved_at && (
                  <div>
                    <span className="text-muted">Approved</span>
                    <p className="text-ink font-medium">
                      {new Date(tutorProfile.approved_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

