/**
 * EarningsSection.jsx
 *
 * Real earnings summary, withdrawal request modal, and withdrawal history for tutors.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  RefreshCw,
  Award,
} from 'lucide-react';
import { Button, Modal, Badge } from '../../components/ui';
import { supabase } from '../../lib/supabase/client';

export function EarningsSection({ userProfile, showToast }) {
  const [summary, setSummary] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Withdrawal modal state
  const [isWdModalOpen, setIsWdModalOpen] = useState(false);
  const [wdAmountNaira, setWdAmountNaira] = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdError, setWdError] = useState(null);

  const fetchEarningsAndWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) return;

      // 1. Fetch summary via API
      const res = await fetch('/api/tutors/earnings', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch earnings');
      setSummary(data.summary);

      // 2. Fetch tutor's withdrawal history from Supabase
      const { data: wdData, error: wdErr } = await supabase
        .from('tutor_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!wdErr) {
        setWithdrawals(wdData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarningsAndWithdrawals();
  }, [fetchEarningsAndWithdrawals]);

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(wdAmountNaira);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWdError('Enter a valid amount in Naira');
      return;
    }
    if (amountNum < 5000) {
      setWdError('Minimum withdrawal is ₦5,000');
      return;
    }

    const amountKobo = Math.round(amountNum * 100);

    setWdSubmitting(true);
    setWdError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      const res = await fetch('/api/tutors/withdrawal/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ amountKobo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');

      showToast?.({
        type: 'success',
        title: 'Withdrawal Requested',
        message: `Your request for ${(amountKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })} has been submitted for admin approval.`,
      });

      setIsWdModalOpen(false);
      setWdAmountNaira('');
      fetchEarningsAndWithdrawals();
    } catch (err) {
      setWdError(err.message);
    } finally {
      setWdSubmitting(false);
    }
  };

  const formatNaira = (kobo) => {
    if (kobo == null) return '₦0.00';
    return (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin text-academic" />
        <span className="text-xs">Loading earnings summary…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-card bg-white border border-danger-100 text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-danger mx-auto" />
        <p className="text-xs font-semibold text-ink">Could not load earnings</p>
        <p className="text-[11px] text-muted">{error}</p>
        <Button variant="secondary" size="xs" onClick={fetchEarningsAndWithdrawals} icon={RefreshCw}>
          Retry
        </Button>
      </div>
    );
  }

  const availableKobo = summary?.available_kobo || 0;
  const pendingKobo = summary?.pending_kobo || 0;
  const totalEarnedKobo = summary?.total_earned_kobo || 0;
  const withdrawnKobo = summary?.withdrawn_kobo || 0;

  return (
    <div className="space-y-6">
      {/* ── Stats Overview Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-card p-4 shadow-tactile-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Available Balance</span>
            <Wallet className="w-4 h-4 text-academic" />
          </div>
          <p className="text-xl font-extrabold text-ink font-mono mt-2">{formatNaira(availableKobo)}</p>
          <p className="text-[10px] text-muted mt-0.5">Ready for withdrawal</p>
        </div>

        <div className="bg-white border border-border rounded-card p-4 shadow-tactile-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Pending Earnings</span>
            <Clock className="w-4 h-4 text-gold-600" />
          </div>
          <p className="text-xl font-extrabold text-ink font-mono mt-2">{formatNaira(pendingKobo)}</p>
          <p className="text-[10px] text-muted mt-0.5">Releases on session completion</p>
        </div>

        <div className="bg-white border border-border rounded-card p-4 shadow-tactile-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total Earned</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-ink font-mono mt-2">{formatNaira(totalEarnedKobo)}</p>
          <p className="text-[10px] text-muted mt-0.5">Tutor share (80%) net</p>
        </div>

        <div className="bg-white border border-border rounded-card p-4 shadow-tactile-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total Withdrawn</span>
            <ArrowUpRight className="w-4 h-4 text-navy-700" />
          </div>
          <p className="text-xl font-extrabold text-ink font-mono mt-2">{formatNaira(withdrawnKobo)}</p>
          <p className="text-[10px] text-muted mt-0.5">Paid to bank account</p>
        </div>
      </div>

      {/* ── Request Withdrawal Action ── */}
      <div className="bg-academic-50 border border-academic-200 rounded-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-tactile-surface">
        <div>
          <h4 className="text-sm font-bold text-ink">Ready to withdraw your earnings?</h4>
          <p className="text-xs text-muted mt-0.5">
            Minimum withdrawal is ₦5,000. Transferred via Paystack to your verified bank account.
          </p>
        </div>
        <Button
          variant="academic"
          size="sm"
          onClick={() => setIsWdModalOpen(true)}
          disabled={availableKobo < 500000}
          icon={ArrowUpRight}
          className="shrink-0 shadow-tactile-btn"
        >
          Request Withdrawal
        </Button>
      </div>

      {/* ── Withdrawal History Table ── */}
      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Withdrawal History</h3>
        {withdrawals.length === 0 ? (
          <div className="bg-white border border-border rounded-card p-8 text-center text-xs text-muted">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="bg-white border border-border rounded-card overflow-hidden shadow-tactile-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-border text-muted font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Reference / Date</th>
                    <th className="p-3">Bank Account</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-canvas/50">
                      <td className="p-3 font-mono">
                        <p className="font-bold truncate">{w.id}</p>
                        <p className="text-[10px] text-muted">
                          {new Date(w.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{w.bank_name}</p>
                        <p className="text-[10px] font-mono text-muted">{w.account_number} ({w.account_name})</p>
                      </td>
                      <td className="p-3 font-bold font-mono text-academic">
                        {formatNaira(w.amount_kobo)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                            w.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : w.status === 'failed'
                              ? 'bg-danger-50 text-danger border border-danger-200'
                              : 'bg-gold-50 text-gold-700 border border-gold-200'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Request Withdrawal Modal ── */}
      <Modal
        isOpen={isWdModalOpen}
        onClose={() => setIsWdModalOpen(false)}
        title="Request Earnings Withdrawal"
        size="sm"
      >
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          {wdError && (
            <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{wdError}</span>
            </div>
          )}

          <div className="bg-canvas border border-border rounded-btn p-3 text-xs space-y-1">
            <div className="flex justify-between text-muted font-mono">
              <span>Available for Withdrawal:</span>
              <span className="font-bold text-ink">{formatNaira(availableKobo)}</span>
            </div>
            <div className="flex justify-between text-muted font-mono">
              <span>Minimum Request:</span>
              <span>₦5,000.00</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Withdrawal Amount (₦) *</label>
            <input
              type="number"
              step="100"
              min="5000"
              max={availableKobo / 100}
              placeholder="e.g. 10000"
              value={wdAmountNaira}
              onChange={(e) => setWdAmountNaira(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none font-mono"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsWdModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="academic"
              size="sm"
              type="submit"
              disabled={wdSubmitting}
              icon={wdSubmitting ? Loader2 : ArrowUpRight}
              className="shadow-tactile-btn"
            >
              {wdSubmitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
