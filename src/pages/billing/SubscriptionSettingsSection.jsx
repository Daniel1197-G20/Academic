import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  ArrowUpRight, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Button, Badge, ProgressBar, Modal } from '../../components/ui';
import { useBilling } from '../../context/BillingContext';
import { api } from '../../services/api/client';

export function SubscriptionSettingsSection({ onNavigatePricing, showToast }) {
  const { subscription, entitlements, cancelPlan, refetchBilling, loading } = useBilling();
  const [billingHistory, setBillingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const res = await api.getBillingHistory();
        if (isMounted) {
          setBillingHistory(res.history || []);
        }
      } catch (err) {
        console.warn('Failed to load billing history:', err);
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    }
    loadHistory();
    return () => { isMounted = false; };
  }, [subscription]);

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await cancelPlan();
      setShowCancelModal(false);
    } catch (err) {
      // Toast handled by context
    } finally {
      setCancelling(false);
    }
  };

  const planName = subscription?.planName || 'Basic';
  const planAmount = subscription?.amount || 0;
  const isPaid = subscription?.planCode !== 'basic';
  const status = subscription?.status || 'active';
  const isNonRenewing = subscription?.cancelAtPeriodEnd || status === 'non_renewing';

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const nextBillingDate = formatDate(subscription?.currentPeriodEnd);

  // Key usage meters
  const aiUsage = entitlements?.usage?.AI_TUTOR || 0;
  const aiLimit = entitlements?.limits?.AI_TUTOR ?? 10;
  const aiProgress = aiLimit ? Math.min(100, Math.round((aiUsage / aiLimit) * 100)) : 0;

  const testUsage = entitlements?.usage?.TEST_PREP_BASIC || 0;
  const testLimit = entitlements?.limits?.TEST_PREP_BASIC ?? 3;
  const testProgress = testLimit ? Math.min(100, Math.round((testUsage / testLimit) * 100)) : 0;

  // Key feature checklist strictly matching prompt
  const featureList = [
    { code: 'CGPA_ADVANCED', name: 'Advanced CGPA Tracking & Target Modeling', fallbackCode: 'CGPA_BASIC' },
    { code: 'STUDY_PLANNER_ADVANCED', name: 'Study Planner & Unlimited Streaks', fallbackCode: 'STUDY_PLANNER_BASIC' },
    { code: 'AI_TUTOR', name: 'AI Academic Coursework Assistant' },
    { code: 'TUTOR_BOOKING', name: 'Verified University Tutor Booking' },
    { code: 'VIDEO_TUTORING', name: 'ZEGOCLOUD Live Video Tutoring Sessions' },
    { code: 'PRIVATE_GROUPS', name: 'Private Cohort Study Groups' },
    { code: 'ADVANCED_ANALYTICS', name: 'Predictive Semester Analytics' }
  ];

  const scrollToBillingHistory = () => {
    const el = document.getElementById('billing-history-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* 1. Current Plan Card */}
      <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <span className="text-[11px] font-semibold text-muted tracking-wider uppercase font-mono">
              CURRENT PLAN
            </span>
            <div className="flex items-center gap-2.5 mt-1">
              <h3 className="text-2xl font-bold text-ink">{planName}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 select-none
                ${status === 'active' && !isNonRenewing
                  ? 'bg-academic-100 text-academic border border-academic-200'
                  : isNonRenewing
                    ? 'bg-gold-50 text-gold-700 border border-gold-200'
                    : 'bg-canvas text-muted border border-border'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {isNonRenewing ? 'Non-Renewing (Active until period end)' : status === 'active' ? 'Active' : status}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 font-mono">
              {planAmount > 0 ? `₦${planAmount.toLocaleString()}/month` : '₦0/month (Free Tier)'}
            </p>
          </div>

          {/* Action Buttons as requested */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="academic"
              size="sm"
              onClick={onNavigatePricing}
              className="flex items-center gap-1.5 shadow-tactile-btn"
            >
              <span>{isPaid ? 'Upgrade Plan' : 'Upgrade Plan'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowManageModal(true)}
              className="shadow-tactile-btn"
            >
              Manage Subscription
            </Button>

            {isPaid && !isNonRenewing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-muted hover:text-danger hover:border-danger-200"
              >
                Cancel Subscription
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={scrollToBillingHistory}
              className="text-muted hover:text-ink"
            >
              Billing History
            </Button>
          </div>
        </div>

        {/* Next Billing & Preservation Notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-academic" />
            <span>
              {isNonRenewing ? 'Access expires on:' : 'Next billing date:'}{' '}
              <strong className="text-ink font-mono">{nextBillingDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-academic" />
            <span>Academic records permanently preserved regardless of plan</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Usage Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Tutor Usage */}
        <div className="bg-white border border-border rounded-card p-5 shadow-tactile-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-academic" />
              <span className="text-xs font-bold text-ink">AI Tutor Usage</span>
            </div>
            <span className="text-xs font-mono font-semibold text-ink">
              {aiUsage} / {aiLimit ?? '∞'}
            </span>
          </div>
          <ProgressBar progress={aiProgress} variant="academic" />
          <p className="text-[11px] text-muted flex items-center justify-between">
            <span>Monthly quota resets on the 1st</span>
            <span className="font-mono text-academic font-medium">
              {entitlements?.remaining?.AI_TUTOR ?? 'Unlimited'} remaining
            </span>
          </p>
        </div>

        {/* Test Prep Drills */}
        <div className="bg-white border border-border rounded-card p-5 shadow-tactile-surface space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-academic" />
              <span className="text-xs font-bold text-ink">Test Prep Drills</span>
            </div>
            <span className="text-xs font-mono font-semibold text-ink">
              {testUsage} / {testLimit ?? '∞'}
            </span>
          </div>
          <ProgressBar progress={testProgress} variant="gold" />
          <p className="text-[11px] text-muted flex items-center justify-between">
            <span>Exam simulator attempts</span>
            <span className="font-mono text-academic font-medium">
              {entitlements?.remaining?.TEST_PREP_BASIC ?? 'Unlimited'} remaining
            </span>
          </p>
        </div>
      </div>

      {/* 3. Feature Entitlements Breakdown */}
      <div className="bg-white border border-border rounded-card p-6 shadow-tactile-surface space-y-4">
        <h4 className="text-xs font-bold text-ink tracking-wider uppercase">
          Active Feature Entitlements
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featureList.map((f) => {
            const hasAccess = Boolean(entitlements?.features?.[f.code]);

            return (
              <div
                key={f.code}
                className={`p-3 rounded-btn border flex items-center justify-between gap-3 select-none
                  ${hasAccess
                    ? 'bg-canvas/50 border-border text-ink'
                    : 'bg-canvas/20 border-border/60 text-muted opacity-60'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {hasAccess ? (
                    <div className="w-5 h-5 rounded-full bg-academic-100 text-academic flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-canvas text-muted flex items-center justify-center shrink-0 border border-border">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                  <span className="text-xs font-medium truncate">{f.name}</span>
                </div>

                {!hasAccess && (
                  <span className="text-[10px] font-mono text-muted shrink-0">
                    Upgrade required
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Billing History Table */}
      <div id="billing-history-section" className="bg-white border border-border rounded-card p-6 shadow-tactile-surface space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-ink tracking-wider uppercase">
            Billing & Invoicing History
          </h4>
          <span className="text-[11px] text-muted font-mono">
            {billingHistory.length} recorded transaction{billingHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {historyLoading ? (
          <p className="text-xs text-muted py-4 text-center">Loading transactions...</p>
        ) : billingHistory.length === 0 ? (
          <div className="p-6 text-center rounded-btn bg-canvas border border-border text-xs text-muted">
            No paid billing transactions recorded yet. When you upgrade, your receipts and transaction references will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 font-semibold">Date</th>
                  <th className="pb-2.5 font-semibold">Plan</th>
                  <th className="pb-2.5 font-semibold">Reference</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billingHistory.map((item) => (
                  <tr key={item.id} className="text-ink">
                    <td className="py-3 font-mono text-[11px] text-muted">
                      {formatDate(item.paidAt || item.createdAt)}
                    </td>
                    <td className="py-3 font-medium">
                      {item.planName || 'Academic Plan'}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-muted truncate max-w-[150px]">
                      {item.reference}
                    </td>
                    <td className="py-3 font-mono font-semibold">
                      ₦{item.amount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono
                        ${item.status === 'success'
                          ? 'bg-academic-100 text-academic border border-academic-200'
                          : 'bg-danger-50 text-danger border border-danger-100'}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manage Subscription Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Subscription"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-card bg-canvas border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Active Plan Tier:</span>
              <Badge variant="academic">{planName} Tier</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Billing Cycle:</span>
              <span className="font-mono text-ink">Monthly via Paystack</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Subscription Status:</span>
              <span className="font-mono font-semibold text-academic uppercase text-[11px]">{status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Next Renewal:</span>
              <span className="font-mono text-ink">{nextBillingDate}</span>
            </div>
            {subscription?.authorizationReference && (
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted font-mono text-[10px]">Auth Reference:</span>
                <span className="font-mono text-[10px] text-muted truncate max-w-[180px]">{subscription.authorizationReference}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            To switch plans, adjust quotas, or update payment information, use the plan upgrade instrument. To stop recurring charges, use the cancel button below.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowManageModal(false)}
            >
              Close
            </Button>
            <Button
              variant="academic"
              size="sm"
              onClick={() => { setShowManageModal(false); onNavigatePricing(); }}
            >
              Change Tier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-btn bg-gold-50 border border-gold-200 text-gold-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-gold-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Your benefits will remain active until {nextBillingDate}.</p>
              <p className="text-[11px] text-gold-700 leading-relaxed">
                You will not be billed again. After your billing period ends, your account will smoothly transition to the free Basic plan. None of your grades, courses, or study plans will be deleted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
            >
              Keep My Plan
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={cancelling}
            >
              {cancelling ? 'Updating...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
