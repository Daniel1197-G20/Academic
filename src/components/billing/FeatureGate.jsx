import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { UpgradePrompt } from './UpgradePrompt';
import { LoadingSpinner } from '../ui';

export function FeatureGate({
  feature,
  featureTitle,
  description,
  requiredPlan,
  requiredPlanCode,
  children,
  fallback = null,
  showRemaining = false,
  onUpgrade
}) {
  const { canAccess, getRemaining, getLimit, getUsage, loading } = useBilling();

  if (loading) {
    return (
      <div className="py-8 flex justify-center items-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const isAllowed = canAccess(feature);

  if (!isAllowed) {
    if (fallback) return fallback;
    return (
      <UpgradePrompt
        feature={feature}
        featureTitle={featureTitle}
        description={description}
        requiredPlan={requiredPlan}
        requiredPlanCode={requiredPlanCode}
        onUpgrade={onUpgrade}
      />
    );
  }

  // If allowed, check if usage counter banner should be rendered
  const limit = getLimit(feature);
  const usage = getUsage(feature);
  const remaining = getRemaining(feature);

  return (
    <div>
      {showRemaining && limit !== null && (
        <div className="mb-4 p-2.5 px-3 rounded-btn bg-canvas border border-border text-xs text-muted flex items-center justify-between">
          <span className="font-medium text-ink">
            Monthly Quota: <strong className="font-mono">{usage}</strong> of <strong className="font-mono">{limit}</strong> used
          </span>
          <span className="font-mono text-academic text-[11px] font-semibold">
            {remaining} remaining this month
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
