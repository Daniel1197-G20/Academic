import React, { useState } from 'react';
import { 
  Check, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { Button, Badge, LoadingSpinner } from '../../components/ui';
import { useBilling } from '../../context/BillingContext';

export function PricingPage({ onBack, onSelectPlan, showToast }) {
  const { plans, subscription, startCheckout, loading, refetchBilling } = useBilling();
  const [submittingPlan, setSubmittingPlan] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [mobileComparisonPlan, setMobileComparisonPlan] = useState('student');

  const currentPlanCode = subscription?.planCode || 'basic';
  const isSubscriptionActive = subscription?.isActive;

  const handlePlanAction = async (plan) => {
    if (plan.code === 'basic') {
      if (onBack) onBack();
      return;
    }

    if (plan.code === currentPlanCode && isSubscriptionActive) {
      if (showToast) {
        showToast({ type: 'info', title: 'Current Plan', message: `You are currently on the ${plan.name} plan.` });
      }
      return;
    }

    setSubmittingPlan(plan.code);
    try {
      if (onSelectPlan) {
        await onSelectPlan(plan.code);
      } else {
        await startCheckout(plan.code);
      }
    } catch (err) {
      // Toast handled by context
    } finally {
      setSubmittingPlan(null);
    }
  };

  // Human-readable feature highlights per plan
  const planHighlights = {
    basic: [
      'Multi-scale CGPA calculation (4.0, 5.0, 7.0)',
      'Up to 2 active study plans',
      '3 test prep practice tests / month',
      '10 AI Tutor queries / month',
      'Browse tutor directory',
      'Standard student academic profile'
    ],
    student: [
      'Everything in Basic, plus:',
      'Target GPA & honors forecasting',
      'Unlimited concurrent study plans',
      '15 test prep practice tests / month',
      '100 AI Tutor queries / month',
      'Book verified campus tutors (up to 5/mo)',
      'Access to private peer study groups',
      'Curated academic past question vault'
    ],
    pro: [
      'Everything in Student, plus:',
      'Unlimited test prep simulation & drills',
      '300 AI Tutor queries / month',
      'Multi-mode AI tutoring (Quiz, Exam, Summary)',
      '10 hours / month ZEGOCLOUD HD video tutoring',
      'Unlimited verified tutor bookings',
      'Predictive semester analytics & grade curves'
    ],
    premium: [
      'Everything in Pro, plus:',
      '1,000 AI Tutor queries / month',
      'Unlimited ZEGOCLOUD video tutoring sessions',
      'Priority university tutor matching',
      'Priority platform customer support',
      'Early access to new academic modules'
    ]
  };

  const comparisonRows = [
    { name: 'CGPA Tracking & Units', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Target GPA Modeling', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Study Planner Plans', basic: '2 Active Plans', student: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'Study Streaks & Timelines', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Test Prep Simulation', basic: '3 Tests / mo', student: '15 Tests / mo', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'AI Tutor Queries', basic: '10 / mo', student: '100 / mo', pro: '300 / mo', premium: '1,000 / mo' },
    { name: 'Multi-Mode AI Problem Solver', basic: '—', student: '—', pro: 'Included', premium: 'Included' },
    { name: 'Tutor Directory Browsing', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Verified Tutor Booking', basic: '—', student: '5 Bookings / mo', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'Private Cohort Study Groups', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Live Video Tutoring (ZEGOCLOUD)', basic: '—', student: '—', pro: '10 hrs / mo', premium: 'Unlimited' },
    { name: 'Advanced Predictive Analytics', basic: '—', student: '—', pro: 'Included', premium: 'Included' },
    { name: 'Curated Academic Vault', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Priority Tutor Matching & Support', basic: '—', student: '—', pro: '—', premium: 'Included' }
  ];

  const faqs = [
    {
      q: 'What is the Basic plan?',
      a: 'The Basic plan is our free forever academic tier. It provides core CGPA calculation across multiple grading scales, study planning for up to two active courses, 3 practice test drills per month, directory browsing of accredited campus tutors, and 10 monthly AI Tutor queries.'
    },
    {
      q: 'Can I use the platform without paying?',
      a: 'Yes. University students can use the Basic plan at no cost. There are no mandatory trials, no required credit cards, and your academic records are never locked behind a paywall.'
    },
    {
      q: 'What happens when I upgrade?',
      a: 'When you upgrade to Student, Pro, or Premium, your new feature entitlements, expanded AI allowances, and study limits unlock instantly through our Paystack integration. Your existing grades, courses, and schedules are seamlessly preserved.'
    },
    {
      q: 'How does monthly billing work?',
      a: 'Billing is handled on a 30-day recurring cycle through Paystack in Nigerian Naira (NGN). You will receive an official transaction reference for every payment, which is automatically cataloged in your billing history.'
    },
    {
      q: 'Can I cancel my subscription?',
      a: 'Yes, you can cancel your subscription at any time directly from /settings/subscription. There are no cancellation penalties or hidden procedures.'
    },
    {
      q: 'What happens after cancellation?',
      a: 'When you cancel, your account remains on its active paid tier until the end of your current 30-day billing period. After that date, your account gently transitions back to the Basic plan. We never delete your historical grades, courses, study notes, or transcripts.'
    },
    {
      q: 'Can I upgrade from Student to Pro?',
      a: 'Yes. You can switch between tiers whenever your academic needs expand, such as during midterm revision or final examination preparations.'
    },
    {
      q: 'What happens to my academic data if I downgrade?',
      a: 'All your academic data—including past semester courses, CGPA projections, completed topics, and test scores—remains completely intact and accessible. Only active usage caps (like monthly AI queries) adjust to the Basic plan allowance.'
    },
    {
      q: 'How are Paystack payments handled?',
      a: 'All payment processing is executed via Paystack’s PCI-DSS Level 1 compliant secure infrastructure. The Academic Platform server never touches, stores, or transmits your sensitive credit/debit card numbers or CVV codes.'
    },
    {
      q: 'Does the platform support video tutoring?',
      a: 'Yes. Live 1-on-1 and cohort tutoring is powered by our high-performance WebRTC and ZEGOCLOUD integration, offering low-latency encrypted video, voice, screen sharing, and an interactive whiteboard for mathematical derivations.'
    },
    {
      q: 'Can I use the AI Tutor on the Basic plan?',
      a: 'Yes. Basic plan members receive 10 complimentary AI Tutor queries each month to help debug complex coursework and explain difficult university topics.'
    }
  ];

  if (loading && plans.length === 0) {
    return (
      <div className="py-24 text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono text-muted">Retrieving database pricing and entitlement plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="academic" size="md">Transparent Academic Pricing</Badge>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif text-ink tracking-tight">
          Start free. Upgrade when you need more.
        </h1>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Use the essentials at no cost, then unlock more powerful academic tools as your needs grow.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode && isSubscriptionActive;
          const isPopular = plan.code === 'student';
          const highlights = planHighlights[plan.code] || [];
          const isSubmitting = submittingPlan === plan.code;

          return (
            <div
              key={plan.id}
              className={`bg-white border rounded-hero p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 select-none relative
                ${isPopular 
                  ? 'border-academic ring-2 ring-academic/15 shadow-tactile-raised' 
                  : 'border-border shadow-tactile-surface hover:shadow-tactile-raised'}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-academic text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                    Popular
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-ink">{plan.name}</h3>
                  {isCurrent ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-academic-100 text-academic border border-academic-200">
                      Current Plan
                    </span>
                  ) : plan.amount === 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-canvas text-muted border border-border">
                      Free Tier
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-muted leading-relaxed min-h-[36px]">
                  {plan.description}
                </p>

                {/* Price Lockup */}
                <div className="my-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold font-mono text-ink tracking-tight">
                      ₦{plan.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted font-sans">
                      /{plan.interval === 'monthly' ? 'month' : plan.interval}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted/80 mt-1 font-mono">
                    {plan.amount === 0 ? 'No credit card required' : 'Processed securely via Paystack'}
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-ink tracking-wider uppercase font-mono">
                    What's included:
                  </p>
                  <ul className="space-y-2.5">
                    {highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-ink/90 leading-snug">
                        <div className="w-4 h-4 rounded-full bg-academic-50 border border-academic-200 text-academic flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-border">
                <Button
                  variant={isCurrent ? 'secondary' : isPopular ? 'academic' : 'secondary'}
                  size="md"
                  onClick={() => handlePlanAction(plan)}
                  disabled={isCurrent || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 shadow-tactile-btn"
                >
                  {isSubmitting ? (
                    <span>Redirecting to Paystack...</span>
                  ) : isCurrent ? (
                    <span>Active Plan</span>
                  ) : plan.amount === 0 ? (
                    <span>Start Free</span>
                  ) : (
                    <>
                      <span>Get {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="space-y-6 pt-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif text-ink tracking-tight">
            Compare Plan Capabilities
          </h3>
          <p className="text-xs text-muted">
            Detailed breakdown of all features, limits, and quotas across each tier.
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white border border-border rounded-hero overflow-hidden shadow-tactile-raised">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas/40 text-ink">
                <th className="py-4 px-6 font-bold text-sm">Feature</th>
                <th className="py-4 px-6 font-bold text-center">Basic (₦0)</th>
                <th className="py-4 px-6 font-bold text-center bg-academic-50/50 text-academic">Student (₦2,500)</th>
                <th className="py-4 px-6 font-bold text-center">Pro (₦5,000)</th>
                <th className="py-4 px-6 font-bold text-center">Premium (₦10,000)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-canvas/20 transition-colors">
                  <td className="py-3 px-6 font-medium text-ink">{row.name}</td>
                  <td className="py-3 px-6 text-center font-mono text-muted">{row.basic}</td>
                  <td className="py-3 px-6 text-center font-mono font-medium text-academic bg-academic-50/20">{row.student}</td>
                  <td className="py-3 px-6 text-center font-mono text-muted">{row.pro}</td>
                  <td className="py-3 px-6 text-center font-mono text-muted">{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Accordion / Tab View */}
        <div className="md:hidden space-y-4">
          <div className="flex p-1 rounded-btn bg-white border border-border">
            {['basic', 'student', 'pro', 'premium'].map(p => (
              <button
                key={p}
                onClick={() => setMobileComparisonPlan(p)}
                className={`flex-1 py-1.5 rounded-[8px] text-xs font-semibold capitalize transition-all
                  ${mobileComparisonPlan === p ? 'bg-academic text-white shadow-sm' : 'text-muted'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="bg-white border border-border rounded-card p-4 space-y-3 shadow-tactile-surface">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              {mobileComparisonPlan} Plan Features
            </h4>
            <div className="divide-y divide-border text-xs">
              {comparisonRows.map((row, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-muted font-medium">{row.name}</span>
                  <span className="font-mono text-ink font-semibold text-right">
                    {row[mobileComparisonPlan]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-6 pt-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif text-ink tracking-tight">
            Frequently Asked Questions
          </h3>
          <p className="text-xs text-muted">
            Direct answers on payment processing, data preservation, and plan changes.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div 
                key={idx}
                className="border border-border rounded-card overflow-hidden bg-white shadow-tactile-surface transition-all select-none"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left font-bold text-xs sm:text-sm text-ink hover:text-academic transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-academic' : 'text-muted'}`} />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-muted leading-relaxed border-t border-border/60 pt-3 bg-canvas/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Academic Trust Banner */}
      <div className="bg-white border border-border rounded-card p-6 shadow-tactile-surface flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-academic-100 text-academic flex items-center justify-center shrink-0 border border-academic-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-ink">
              Enterprise Grade Academic Data Protection
            </h4>
            <p className="text-[11px] sm:text-xs text-muted">
              Card details are never stored on our servers. Recurring billing can be cancelled at any time without data loss.
            </p>
          </div>
        </div>

        {onBack && (
          <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
            Return to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
