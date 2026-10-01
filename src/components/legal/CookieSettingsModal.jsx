import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Lock, Save } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { api } from '../../services/api/client';

export function CookieSettingsModal({
  isOpen,
  onClose,
  showToast
}) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing preferences from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('academic_consent_preferences');
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnalyticsEnabled(!!parsed.analytics);
          setFunctionalEnabled(!!parsed.functional);
        }
      } catch (e) {
        console.warn('Failed to parse saved cookie preferences', e);
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
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

      // Sync with backend audit log if authenticated or available
      await api.recordConsent([
        { type: 'analytics_cookies', status: analyticsEnabled ? 'granted' : 'revoked', version: '1.0' },
        { type: 'functional_cookies', status: functionalEnabled ? 'granted' : 'revoked', version: '1.0' }
      ], 'cookie_modal').catch(err => console.warn('Consent sync to backend bypassed (unauthenticated or offline)', err));

      if (showToast) {
        showToast({
          type: 'success',
          title: 'Preferences Saved',
          message: 'Your cookie and privacy preferences have been updated.'
        });
      }
      onClose();
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Save Failed',
          message: 'Could not save cookie preferences. Please try again.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cookie & Privacy Settings"
      description="Manage non-essential technologies according to your privacy preferences. Strictly necessary technologies remain active to deliver core application services."
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs text-ink">
        {/* Category 1: Strictly Necessary */}
        <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-academic" />
              <span className="font-semibold text-ink text-sm">Strictly Necessary Technologies</span>
            </div>
            <Badge variant="academic" size="sm">Always Active</Badge>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Required to operate the Academic Platform securely. They maintain authenticated sessions, secure API communications, and enable local calculations. These cannot be disabled.
          </p>
          <div className="text-[11px] font-mono text-muted pt-1">
            Keys: <span className="text-ink">academic_platform_token</span>, <span className="text-ink">auth_token</span>
          </div>
        </div>

        {/* Category 2: Analytics Technologies */}
        <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted" />
              <span className="font-semibold text-ink text-sm">Diagnostic & Performance Telemetry</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-academic"></div>
            </label>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Optional anonymous telemetry that helps us identify application crashes, rendering bottlenecks, and response latency. No academic grades or course names are ever transmitted.
          </p>
        </div>

        {/* Category 3: Functional Preferences */}
        <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-muted" />
              <span className="font-semibold text-ink text-sm">Interface & Layout Preferences</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functionalEnabled}
                onChange={(e) => setFunctionalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-academic"></div>
            </label>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Optional technologies that remember user interface states such as sidebar collapse mode, active tabs, and last selected grading scale view.
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted">
            Policy Version: 1.0 • No advertising trackers
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="academic"
              size="sm"
              onClick={handleSave}
              loading={saving}
              icon={Save}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
