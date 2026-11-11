import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Mail,
  Send,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Eye,
  Filter,
  Check,
  ShieldAlert,
  Inbox,
  Sparkles,
  Info
} from 'lucide-react';

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLiveConfigured, setIsLiveConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compose Modal State
  const [showCompose, setShowCompose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [campaignType, setCampaignType] = useState('promotional'); // 'promotional' | 'operational_urgent' | 'general_announcement'
  const [targetAudience, setTargetAudience] = useState('all_users'); // 'all_users' | 'students_only' | 'tutors_only' | 'admins_only'
  const [contentHtml, setContentHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [confirmUrgent, setConfirmUrgent] = useState(false);

  // Active Tab: 'campaigns' | 'logs'
  const [activeTab, setActiveTab] = useState('campaigns');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;

      const res = await fetch('/api/admin/campaigns', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch campaigns (${res.status})`);
      }

      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setMetrics(data.metrics || null);
      setRecentLogs(data.recentLogs || []);
      setIsLiveConfigured(Boolean(data.isLiveConfigured));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!title || !subject || !contentHtml) return;
    if (campaignType === 'operational_urgent' && !confirmUrgent) {
      alert('Please confirm that this is a critical operational notice before proceeding.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;

      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title,
          subject,
          campaignType,
          targetAudience,
          contentHtml
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to create campaign');
      }

      const { campaign } = await res.json();
      
      // Prompt immediate dispatch confirmation
      if (window.confirm(`Campaign "${title}" created successfully! Do you want to dispatch it to eligible recipients right now?`)) {
        await handleDispatchCampaign(campaign.id);
      }

      setShowCompose(false);
      resetForm();
      await fetchCampaigns();
    } catch (err) {
      alert(`Error creating campaign: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchCampaign = async (campaignId) => {
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;

      const res = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to send campaign');
      }

      const resJson = await res.json();
      alert(`Campaign sent successfully! Total: ${resJson.total}, Sent: ${resJson.sent}, Failed: ${resJson.failed}`);
      await fetchCampaigns();
    } catch (err) {
      alert(`Error sending campaign: ${err.message}`);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !subject || !contentHtml) {
      alert('Please enter a test email, subject, and content.');
      return;
    }

    setTestSending(true);
    setTestResult(null);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;

      const res = await fetch('/api/admin/campaigns/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          testEmail,
          subject,
          contentHtml,
          campaignType
        })
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to send test email');
      setTestResult({ success: true, message: `Test preview delivered to ${testEmail}` });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestSending(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setCampaignType('promotional');
    setTargetAudience('all_users');
    setContentHtml('');
    setTestEmail('');
    setTestResult(null);
    setConfirmUrgent(false);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-academic" />
            Email Communications
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Centralized Resend delivery infrastructure, audience broadcast campaigns, and audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaigns}
            className="p-2 border border-border bg-white text-muted hover:text-ink rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { resetForm(); setShowCompose(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-academic text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:bg-[#13583F] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compose Campaign
          </button>
        </div>
      </div>

      {/* Provider Status Pill */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
        isLiveConfigured ? 'bg-academic-50/60 border-academic-200 text-[#13583F]' : 'bg-amber-50/70 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Resend Delivery Status: </span>
            {isLiveConfigured ? (
              <span>Live production provider connected with verified sending credentials.</span>
            ) : (
              <span>Development mode active. Dispatches are cryptographically logged and previewable.</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-muted uppercase">Campaigns</span>
            <p className="text-2xl font-bold text-ink mt-1">{metrics.total_campaigns}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-muted uppercase">Queued</span>
            <p className="text-2xl font-bold text-ink mt-1">{metrics.total_queued}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-academic uppercase">Dispatched</span>
            <p className="text-2xl font-bold text-academic mt-1">{metrics.total_sent}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Delivered</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.total_delivered}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Bounced</span>
            <p className="text-2xl font-bold text-rose-700 mt-1">{metrics.total_bounced}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Complaints</span>
            <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.total_complaints}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`py-2 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'campaigns'
              ? 'border-academic text-academic'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Campaigns History
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-academic text-academic'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Delivery Audit Outbox ({recentLogs.length})
        </button>
      </div>

      {/* Tab 1: Campaigns Table */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No email campaigns created yet</p>
              <p className="text-xs mt-1">Click "Compose Campaign" above to draft and deliver an announcement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-canvas border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3 px-4">Title &amp; Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Audience</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{c.title}</div>
                        <div className="text-xs text-muted truncate max-w-xs">{c.subject}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          c.campaign_type === 'operational_urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : c.campaign_type === 'promotional'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.campaign_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted font-mono text-xs">{c.target_audience}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          c.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'sending'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {c.sent_count} / {c.total_recipients}
                      </td>
                      <td className="py-3 px-4 text-muted text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'draft' ? (
                          <button
                            onClick={() => handleDispatchCampaign(c.id)}
                            className="px-3 py-1 bg-academic text-white rounded-lg text-xs font-semibold hover:bg-[#13583F] transition-colors"
                          >
                            Send
                          </button>
                        ) : (
                          <span className="text-xs text-muted">Sent</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Logs Table */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          {recentLogs.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No recent email delivery logs</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Template Type</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Provider Message ID</th>
                    <th className="py-3 px-4">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-semibold text-ink">{log.recipient_email}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-academic">{log.template_type}</td>
                      <td className="py-2.5 px-4 text-muted truncate max-w-xs">{log.subject}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-muted">
                        {log.resend_message_id || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-muted">
                        {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Compose Campaign Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-border shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Send className="w-5 h-5 text-academic" />
                Compose Campaign Announcement
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="text-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Campaign Title (Internal)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Studora Spring Study Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-border rounded-lg outline-none focus:border-academic"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Email Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Academic Features: Timed Diagnostics & Tutor Connect"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-border rounded-lg outline-none focus:border-academic"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Campaign Type</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-border rounded-lg outline-none focus:border-academic bg-white"
                  >
                    <option value="promotional">Promotional (Respects Unsubscribes)</option>
                    <option value="general_announcement">General Announcement</option>
                    <option value="operational_urgent">Urgent Operational Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-border rounded-lg outline-none focus:border-academic bg-white"
                  >
                    <option value="all_users">All Eligible Users (Students &amp; Tutors)</option>
                    <option value="students_only">Students Only</option>
                    <option value="tutors_only">Tutors Only</option>
                    <option value="admins_only">Administrators Only</option>
                  </select>
                </div>
              </div>

              {campaignType === 'operational_urgent' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4" />
                    Urgent Operational Safeguard
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Urgent operational communications bypass non-critical marketing unsubscribes strictly for system maintenance, security incidents, or critical policy updates.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-rose-900 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmUrgent}
                      onChange={(e) => setConfirmUrgent(e.target.checked)}
                      className="rounded text-academic focus:ring-academic"
                    />
                    I certify this is an essential operational notice
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">HTML Message Body</label>
                <textarea
                  rows={6}
                  required
                  placeholder="<p>Enter your announcement content. HTML formatting is supported.</p>"
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-border rounded-lg outline-none focus:border-academic"
                />
              </div>

              {/* Test Email Section */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="block text-xs font-semibold text-ink">Send Test Preview Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your-admin-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-academic"
                  />
                  <button
                    type="button"
                    disabled={testSending || !testEmail}
                    onClick={handleSendTest}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-ink text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testSending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {testResult && (
                  <p className={`text-xs ${testResult.success ? 'text-emerald-600 font-semibold' : 'text-rose-600'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-academic hover:bg-[#13583F] text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create & Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
