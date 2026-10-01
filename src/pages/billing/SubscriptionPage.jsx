import React from 'react';
import { PageHeader, Button } from '../../components/ui';
import { SubscriptionSettingsSection } from './SubscriptionSettingsSection';
import { ArrowLeft, Sparkles } from 'lucide-react';

export function SubscriptionPage({ onNavigateDashboard, onNavigatePricing, showToast }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="p-1 rounded-md text-muted hover:text-ink hover:bg-canvas transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
              Subscription & Entitlements
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 ml-6">
            Authoritative billing controls, active plan features, and monthly resource consumption.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="academic"
            size="sm"
            onClick={onNavigatePricing}
            className="shadow-tactile-btn flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore All Plans</span>
          </Button>
        </div>
      </div>

      <SubscriptionSettingsSection 
        onNavigatePricing={onNavigatePricing}
        showToast={showToast}
      />
    </div>
  );
}
