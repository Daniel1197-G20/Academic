import React from 'react';
import { Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Badge } from '../ui';
import { useBilling } from '../../context/BillingContext';

export function UpgradePrompt({
  feature,
  featureTitle,
  description,
  requiredPlan = 'Student',
  requiredPlanCode = 'student',
  onUpgrade,
  className = ''
}) {
  const { startCheckout } = useBilling();

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade(requiredPlanCode);
    } else {
      startCheckout(requiredPlanCode).catch(() => {});
    }
  };

  const featureLabels = {
    CGPA_ADVANCED: { title: 'Target GPA Modeling & Forecasting', plan: 'Student', price: '₦2,500/mo' },
    STUDY_PLANNER_ADVANCED: { title: 'Unlimited Study Engine & Streaks', plan: 'Student', price: '₦2,500/mo' },
    TEST_PREP_BASIC: { title: 'Practice Exam Drills', plan: 'Basic', price: 'Free' },
    TEST_PREP_ADVANCED: { title: 'Unlimited Exam Simulation & Drills', plan: 'Pro', price: '₦5,000/mo' },
    AI_TUTOR: { title: 'AI Academic Assistant', plan: 'Student', price: '₦2,500/mo' },
    AI_TUTOR_ADVANCED: { title: 'Multi-Mode AI Problem Solver', plan: 'Pro', price: '₦5,000/mo' },
    TUTOR_BOOKING: { title: 'Verified Tutor 1-on-1 Booking', plan: 'Student', price: '₦2,500/mo' },
    VIDEO_TUTORING: { title: 'ZEGOCLOUD Live Video Tutoring', plan: 'Pro', price: '₦5,000/mo' },
    PRIVATE_GROUPS: { title: 'Private Cohort Study Groups', plan: 'Student', price: '₦2,500/mo' },
    ADVANCED_ANALYTICS: { title: 'Predictive Academic Trend Modeling', plan: 'Pro', price: '₦5,000/mo' },
    PREMIUM_RESOURCES: { title: 'Curated Academic Vault', plan: 'Student', price: '₦2,500/mo' },
    PRIORITY_SUPPORT: { title: 'Priority Support & Fast-Track Matching', plan: 'Premium', price: '₦10,000/mo' }
  };

  const meta = feature ? featureLabels[feature] : null;
  const displayTitle = featureTitle || meta?.title || 'Premium Feature';
  const targetPlanName = meta?.plan || requiredPlan;
  const targetPlanPrice = meta?.price || (targetPlanName === 'Pro' ? '₦5,000/mo' : targetPlanName === 'Premium' ? '₦10,000/mo' : '₦2,500/mo');

  return (
    <div className={`bg-white border border-border rounded-card p-6 sm:p-8 shadow-tactile-raised text-center max-w-lg mx-auto ${className}`}>
      {/* Tactile Lock Pill */}
      <div className="w-12 h-12 rounded-xl bg-academic-50 border border-academic-200 text-academic flex items-center justify-center mx-auto mb-4 shadow-tactile-surface">
        <Lock className="w-5 h-5 text-academic" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas border border-border text-[11px] font-mono font-medium text-muted mb-3 select-none">
        <Sparkles className="w-3 h-3 text-gold-600" />
        <span>{targetPlanName} Plan Entitlement</span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight">
        {displayTitle}
      </h3>

      <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed max-w-sm mx-auto">
        {description || `Unlock full access to ${displayTitle} by upgrading your academic workspace to the ${targetPlanName} tier.`}
      </p>

      {/* Plan Value Badge */}
      <div className="mt-5 p-3 rounded-btn bg-canvas border border-border flex items-center justify-between gap-3 text-left">
        <div>
          <p className="text-xs font-semibold text-ink">{targetPlanName} Tier</p>
          <p className="text-[11px] text-muted font-mono">{targetPlanPrice} • Billed monthly via Paystack</p>
        </div>
        <Badge variant="academic" size="sm">Instant Activation</Badge>
      </div>

      {/* CTA Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="academic"
          size="md"
          onClick={handleUpgradeClick}
          className="w-full sm:w-auto shadow-tactile-btn flex items-center justify-center gap-2"
        >
          <span>Upgrade to {targetPlanName}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted/80 mt-4 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-academic" />
        <span>Cancel anytime • Academic data remains 100% preserved</span>
      </p>
    </div>
  );
}
