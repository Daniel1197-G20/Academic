import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Button, LoadingSpinner, Badge } from '../../components/ui';
import { useBilling } from '../../context/BillingContext';

export function BillingCallbackPage({ onNavigateDashboard, onNavigatePricing, showToast }) {
  const { confirmPayment } = useBilling();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
      setError('No transaction reference found in payment callback URL.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        const data = await confirmPayment(reference);
        if (isMounted) {
          setResult(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Payment confirmation failed');
          setLoading(false);
        }
      }
    }

    verify();
    return () => { isMounted = false; };
  }, [confirmPayment]);

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center">
      <div className="bg-white border border-border rounded-hero p-8 shadow-tactile-raised space-y-6">
        {loading && (
          <div className="space-y-4 py-4">
            <LoadingSpinner size="lg" />
            <h2 className="text-lg font-bold text-ink">Confirming your subscription...</h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              We are verifying your transaction with Paystack and activating your academic feature entitlements.
            </p>
          </div>
        )}

        {!loading && result && result.verified && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto shadow-tactile-surface">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <Badge variant="academic" size="sm">Payment Verified</Badge>
              <h2 className="text-xl font-bold text-ink mt-2">
                Your {result.planName || 'Premium'} plan is active!
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                All feature entitlements and usage limits have been applied to your student workspace.
              </p>
            </div>

            <div className="p-3 rounded-btn bg-canvas border border-border text-xs text-muted font-mono">
              Reference: {result.reference}
            </div>

            <div className="pt-2">
              <Button
                variant="academic"
                size="md"
                onClick={onNavigateDashboard}
                className="w-full flex items-center justify-center gap-2 shadow-tactile-btn"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-danger-50 border border-danger-100 text-danger flex items-center justify-center mx-auto shadow-tactile-surface">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <Badge variant="danger" size="sm">Verification Pending</Badge>
              <h2 className="text-xl font-bold text-ink mt-2">
                Subscription Status Notice
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                {error}
              </p>
              <p className="text-[11px] text-muted/80 mt-1">
                If your payment was completed, Paystack webhook synchronization will automatically activate your plan within 1-2 minutes. You don't need to pay again.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                variant="academic"
                size="md"
                onClick={onNavigateDashboard}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              {onNavigatePricing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onNavigatePricing}
                  className="w-full"
                >
                  Return to Pricing
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
