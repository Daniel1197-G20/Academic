import React, { useState, useEffect } from 'react';
import { Cookie, Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui';
import { api } from '../../services/api/client';

export function ConsentBanner({ onOpenSettings }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been recorded
    const timestamp = localStorage.getItem('academic_consent_timestamp');
    if (!timestamp) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    const preferences = {
      necessary: true,
      analytics: true,
      functional: true,
      updatedAt: new Date().toISOString(),
      policyVersion: '1.0'
    };

    localStorage.setItem('academic_consent_preferences', JSON.stringify(preferences));
    localStorage.setItem('academic_consent_timestamp', new Date().toISOString());
    setIsVisible(false);

    // Sync with backend audit log if possible
    await api.recordConsent([
      { type: 'analytics_cookies', status: 'granted', version: '1.0' },
      { type: 'functional_cookies', status: 'granted', version: '1.0' }
    ], 'consent_banner_accept_all').catch(() => {});
  };

  const handleRejectNonEssential = async () => {
    const preferences = {
      necessary: true,
      analytics: false,
      functional: false,
      updatedAt: new Date().toISOString(),
      policyVersion: '1.0'
    };

    localStorage.setItem('academic_consent_preferences', JSON.stringify(preferences));
    localStorage.setItem('academic_consent_timestamp', new Date().toISOString());
    setIsVisible(false);

    // Sync with backend audit log if possible
    await api.recordConsent([
      { type: 'analytics_cookies', status: 'revoked', version: '1.0' },
      { type: 'functional_cookies', status: 'revoked', version: '1.0' }
    ], 'consent_banner_reject_non_essential').catch(() => {});
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none transition-all duration-300">
      <div className="max-w-4xl mx-auto bg-white border border-border rounded-hero p-5 sm:p-6 shadow-tactile-raised pointer-events-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Information Notice */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-btn bg-academic-100 flex items-center justify-center text-academic border border-academic-200 shadow-tactile-surface">
                <Cookie className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-ink">
                Your Privacy and Cookie Preferences
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              We use strictly necessary technologies to secure your sessions and calculate your academic records. With your permission, we also use optional telemetry to improve platform stability. We never sell personal data or display third-party advertisements.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRejectNonEssential}
              className="flex-1 md:flex-initial text-xs"
            >
              Reject Non-Essential
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onOpenSettings?.();
              }}
              icon={SlidersHorizontal}
              className="flex-1 md:flex-initial text-xs"
            >
              Manage Preferences
            </Button>
            <Button
              variant="academic"
              size="sm"
              onClick={handleAcceptAll}
              icon={Check}
              className="flex-1 md:flex-initial text-xs"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
