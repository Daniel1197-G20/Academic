import React, { useState, useEffect } from 'react';
import { Cookie, Lock, Shield, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-4 px-4 sm:px-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-ghost-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      )}

      {/* Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0B0F13] to-[#050608] border border-ghost-200/20 shadow-neu-raised-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ghost" size="sm">Privacy Control</Badge>
            <span className="text-[11px] font-mono text-zinc-400">Policy Version 1.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Cookie className="w-7 h-7 text-ghost-200" />
            Cookie & Local Storage Preferences
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Configure how the Student Academic Platform uses local storage and cookies on your device. We use strictly necessary technologies to deliver secure core services, and optional technologies for diagnostics and interface customization.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-ghost-200/10 border border-ghost-200/30 text-ghost-200 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Your preferences are saved and active.
        </div>
      )}

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Strictly Necessary */}
        <Card variant="neu" className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-ghost-200" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Strictly Necessary Technologies</h3>
                <p className="text-[11px] font-mono text-zinc-500">Essential for core security & database synchronization</p>
              </div>
            </div>
            <Badge variant="ghost" size="sm">Always Active</Badge>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            These cookies and local storage tokens are required for user authentication, cryptographic session signing, preventing cross-site request forgery, and maintaining your verified student session. They cannot be deactivated without rendering the application inoperable.
          </p>
        </Card>

        {/* Analytics */}
        <Card variant="neu" className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-zinc-400" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Analytics Technologies</h3>
                <p className="text-[11px] font-mono text-zinc-500">Performance telemetry and diagnostic monitoring</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ghost-200"></div>
            </label>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Enables anonymous measurement of page loading speed, component render times, and client-side error reporting. This data helps our engineering team optimize software responsiveness across high refresh rate displays. No grades, CGPA records, or personal identifying data are collected.
          </p>
        </Card>

        {/* Functional */}
        <Card variant="neu" className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cookie className="w-5 h-5 text-zinc-400" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Functional & Layout Preferences</h3>
                <p className="text-[11px] font-mono text-zinc-500">Interface layout and workspace display memory</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functionalEnabled}
                onChange={(e) => setFunctionalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ghost-200"></div>
            </label>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Allows the platform to remember your navigation sidebar collapse preference, active grading scale view (e.g. 5.0 vs 4.0), and table density settings across browser sessions.
          </p>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">
          We do not use advertising or third-party behavioral marketing trackers.
        </span>
        <Button
          variant="primary"
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
