import React, { useState, useEffect } from 'react';
import { Cookie, Lock, Shield, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Button, Badge, PageHeader } from '../../components/ui';
import { api } from '../../services/api/client';

export function CookieSettingsPage({ onBack, showToast }) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('academic_consent_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAnalyticsEnabled(!!parsed.analytics);
        setFunctionalEnabled(!!parsed.functional);
      }
    } catch (e) {
      console.warn('Failed to parse cookie preferences', e);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    const preferences = {
      necessary: true,
      analytics: analyticsEnabled,
      functional: functionalEnabled,
      updatedAt: new Date().toISOString(),
      policyVersion: '1.0'
    };

    try {
      localStorage.setItem('academic_consent_preferences', JSON.stringify(preferences));
      localStorage.setItem('academic_consent_timestamp', new Date().toISOString());

      await api.recordConsent([
        { type: 'analytics_cookies', status: analyticsEnabled ? 'granted' : 'revoked', version: '1.0' },
        { type: 'functional_cookies', status: functionalEnabled ? 'granted' : 'revoked', version: '1.0' }
      ], 'cookie_page').catch(err => console.warn('Consent sync skipped', err));

      setSavedSuccess(true);
      if (showToast) {
        showToast({
          type: 'success',
          title: 'Preferences Updated',
          message: 'Your cookie choices have been successfully persisted.'
        });
      }
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to update preferences.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-4 px-4 sm:px-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      )}

      {/* Header */}
      <PageHeader
        title="Cookie & Local Storage Preferences"
        description="Configure how the Academic Platform uses device local storage and session tokens."
        badge={<Badge variant="academic" size="sm">Policy Version 1.0</Badge>}
      />

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-academic-50 border border-academic-200 text-academic text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Your preferences are saved and currently active.
        </div>
      )}

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Strictly Necessary */}
        <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-academic" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Strictly Necessary Technologies</h3>
                <p className="text-xs text-muted">Essential for core security and session validation</p>
              </div>
            </div>
            <Badge variant="academic" size="sm">Always Active</Badge>
          </div>
          <p className="text-xs text-muted leading-relaxed pt-1">
            Required for user authentication, cryptographic session integrity, preventing cross-site request forgery, and maintaining your verified student session. They cannot be deactivated.
          </p>
        </div>

        {/* Analytics */}
        <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-muted" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Diagnostic & Performance Telemetry</h3>
                <p className="text-xs text-muted">Error reporting and latency telemetry</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-academic"></div>
            </label>
          </div>
          <p className="text-xs text-muted leading-relaxed pt-1">
            Enables anonymous measurement of screen transition latency and client-side error reporting. This helps our team optimize software responsiveness. No grades, CGPA records, or personal data are collected.
          </p>
        </div>

        {/* Functional */}
        <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cookie className="w-4 h-4 text-muted" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Functional & Interface Preferences</h3>
                <p className="text-xs text-muted">Workspace display memory and sidebar preference</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functionalEnabled}
                onChange={(e) => setFunctionalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-academic"></div>
            </label>
          </div>
          <p className="text-xs text-muted leading-relaxed pt-1">
            Allows the platform to remember your navigation sidebar collapse preference and active grading scale view across browser sessions.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex items-center justify-between">
        <span className="text-xs text-muted">
          We do not use advertising or third-party behavioral marketing trackers.
        </span>
        <Button
          variant="academic"
          onClick={handleSave}
          loading={saving}
          icon={Save}
        >
          Save Cookie Preferences
        </Button>
      </div>
    </div>
  );
}
