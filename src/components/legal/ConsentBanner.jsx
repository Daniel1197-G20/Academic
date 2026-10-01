import React, { useState, useEffect } from 'react';
import { Shield, Cookie, Check, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui';
import { api } from '../../services/api/client';

export function ConsentBanner({ onOpenSettings }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been recorded
    const timestamp = localStorage.getItem('academic_consent_timestamp');
    if (!timestamp) {
      // Small timeout for smooth entry animation
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
      <div className="max-w-4xl mx-auto bg-[#090C0E]/95 backdrop-blur-xl border border-ghost-200/20 rounded-2xl p-5 sm:p-6 shadow-2xl pointer-events-auto shadow-black/80">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Information & Human-Readable Notice */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-ghost-200/10 border border-ghost-200/25 flex items-center justify-center text-ghost-200 shadow-ghost-glow">
                <Cookie className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Your Privacy Matters to Us
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              We use necessary technologies to keep the platform secure, authenticated, and functional. With your permission, we may also use optional analytics and preference technologies to understand how the platform is used and improve your experience. You can change your preferences at any time.
            </p>
          </div>

          {/* Non-Dark-Pattern Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectNonEssential}
              className="flex-1 md:flex-initial text-xs border-white/[0.08] hover:bg-white/[0.04]"
            >
              Reject Non-Essential
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onOpenSettings?.();
              }}
              icon={SlidersHorizontal}
              className="flex-1 md:flex-initial text-xs border-ghost-200/20 text-ghost-200"
            >
              Manage Preferences
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptAll}
              icon={Check}
              className="flex-1 md:flex-initial text-xs shadow-ghost-glow"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
