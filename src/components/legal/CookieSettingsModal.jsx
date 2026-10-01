import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, Lock, Info, Save } from 'lucide-react';
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
      size="lg"
    >
      <div className="space-y-4 text-xs text-zinc-300">
        {/* Category 1: Strictly Necessary */}
        <div className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-ghost-200" />
              <span className="font-semibold text-zinc-100 text-sm">Strictly Necessary Technologies</span>
            </div>
            <Badge variant="ghost" size="sm">Always Active</Badge>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            These technologies are strictly required to operate the Student Academic Platform securely. They maintain your authenticated session, store cryptographic HMAC session tokens, prevent CSRF attacks, and enable real-time database synchronization. Because the platform cannot operate without them, they cannot be turned off.
          </p>
          <div className="text-[10px] font-mono text-zinc-500 pt-1">
            Keys: <span className="text-zinc-400">academic_platform_token</span>, <span className="text-zinc-400">auth_token</span>
          </div>
        </div>

        {/* Category 2: Analytics Technologies */}
        <div className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-100 text-sm">Analytics & Diagnostic Technologies</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ghost-200"></div>
            </label>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Optional technologies that assist us in understanding platform performance, measuring screen transition latency, and capturing uncaught exceptions. No personal grades or academic records are transmitted in analytics telemetry.
          </p>
        </div>

        {/* Category 3: Functional Preferences */}
        <div className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-100 text-sm">Functional & Interface Preferences</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={functionalEnabled}
                onChange={(e) => setFunctionalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ghost-200"></div>
            </label>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Optional technologies that remember your localized user interface states, such as sidebar collapse mode, active dashboard filters, and selected grading scale views.
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-500">
            Policy Version: 1.0 • No advertising trackers used
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
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
