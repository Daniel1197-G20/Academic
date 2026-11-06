/**
 * PaymentsPage.jsx
 *
 * Admin Dashboard page for financial management:
 *  - Overview of platform earnings, pending payouts, completed payouts
 *  - Tutor session payments ledger & platform subscription transactions
 *  - Tutor withdrawal approval and transfer initiation
 *  - Bank payout profile verification
 *  - Platform commission configuration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

export function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('withdrawals'); // 'withdrawals' | 'ledger' | 'bank_accounts' | 'commission'
  const [sessionLedger, setSessionLedger] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payoutProfiles, setPayoutProfiles] = useState([]);
  const [billingMetrics, setBillingMetrics] = useState(null);
  const [commissionPct, setCommissionPct] = useState('20');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action loading states
  const [processingWdId, setProcessingWdId] = useState(null);
  const [verifyingTutorId, setVerifyingTutorId] = useState(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchFinancialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch platform commission from Supabase if table exists
      try {
        const { data: configData } = await supabase
          .from('platform_config')
          .select('value')
          .eq('key', 'commission_percentage')
          .maybeSingle();

        if (configData) {
          setCommissionPct(configData.value);
        }
      } catch (e) {
        // Safe fallback to 20%
      }

      // 2. Fetch session ledger if table exists
      try {
        const { data: ledgerData } = await supabase
          .from('tutor_session_ledger')
          .select(`
            *,
            tutor:profiles!tutor_session_ledger_tutor_id_fkey(full_name),
            student:profiles!tutor_session_ledger_student_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false });

        setSessionLedger(ledgerData || []);
      } catch (e) {
        setSessionLedger([]);
      }

      // 3. Fetch withdrawal requests if table exists
      try {
        const { data: wdData } = await supabase
          .from('tutor_withdrawals')
          .select(`
            *,
            tutor:profiles!tutor_withdrawals_tutor_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false });

        setWithdrawals(wdData || []);
      } catch (e) {
        setWithdrawals([]);
      }

      // 4. Fetch payout profiles if table exists
      try {
        const { data: payoutData } = await supabase
          .from('tutor_payout_profiles')
          .select(`
            *,
            tutor:profiles!tutor_payout_profiles_tutor_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false });

        setPayoutProfiles(payoutData || []);
      } catch (e) {
        setPayoutProfiles([]);
      }

      // 5. Fetch verified subscription billing metrics from backend API
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token;
        const res = await fetch('/api/admin/billing', {
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.metrics) setBillingMetrics(json.metrics);
        }
      } catch (apiErr) {
        // Backend proxy offline
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Admin approves withdrawal + triggers Paystack Transfer via server API
  const handleApproveWithdrawal = async (withdrawalId) => {
    setProcessingWdId(withdrawalId);
    setActionMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      const res = await fetch(`/api/admin/tutors/withdrawal/${withdrawalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve withdrawal');

      setActionMessage({ type: 'success', text: `Withdrawal ${withdrawalId} approved and transfer initiated!` });
      fetchFinancialData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingWdId(null);
    }
  };

  // Admin verifies tutor bank account (creates Paystack Transfer recipient)
  const handleVerifyPayoutProfile = async (tutorId) => {
    setVerifyingTutorId(tutorId);
    setActionMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      const res = await fetch(`/api/admin/tutors/payout-profile/${tutorId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify payout account');

      setActionMessage({ type: 'success', text: `Bank account verified for tutor!` });
      fetchFinancialData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setVerifyingTutorId(null);
    }
  };

  // Update commission %
  const handleUpdateCommission = async (e) => {
    e.preventDefault();
    const val = parseInt(commissionPct, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      setActionMessage({ type: 'error', text: 'Commission must be an integer between 0 and 100.' });
      return;
    }

    setSavingCommission(true);
    setActionMessage(null);
    try {
      const { error: updateErr } = await supabase
        .from('platform_config')
        .upsert({ key: 'commission_percentage', value: String(val) });

      if (updateErr) throw new Error(updateErr.message);

      setActionMessage({ type: 'success', text: `Platform commission updated to ${val}%.` });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setSavingCommission(false);
    }
  };

  const formatNaira = (kobo) => {
    if (kobo == null) return '₦0.00';
    return (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
  };

  // Calculate metrics
  const totalVolumeKobo = sessionLedger.reduce((sum, row) => sum + (row.gross_amount_kobo || 0), 0);
  const totalCommissionKobo = sessionLedger.reduce((sum, row) => sum + (row.platform_commission_amount_kobo || 0), 0);
  const totalTutorEarningsKobo = sessionLedger.reduce((sum, row) => sum + (row.tutor_amount_kobo || 0), 0);
  const totalPaidOutKobo = withdrawals.filter((w) => w.status === 'paid').reduce((sum, w) => sum + w.amount_kobo, 0);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Financial Operations & Payouts</h1>
          <p className="text-sm text-muted mt-0.5">
            Monitor session ledger, manage platform commission, approve tutor withdrawals, and verify bank accounts
          </p>
        </div>
        <button
          onClick={fetchFinancialData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {actionMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-card text-xs font-semibold flex items-center justify-between',
            actionMessage.type === 'success'
              ? 'bg-academic-light/60 border border-academic/20 text-academic'
              : 'bg-red-50 border border-red-200 text-danger'
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border shadow-subtle rounded-card p-5">
          <p className="text-xs font-semibold text-muted">Session GMV</p>
          <p className="text-2xl font-bold text-ink font-mono mt-1">{formatNaira(totalVolumeKobo)}</p>
          <p className="text-[11px] text-muted mt-0.5">Gross student bookings</p>
        </div>

        <div className="bg-surface border border-border shadow-subtle rounded-card p-5">
          <p className="text-xs font-semibold text-muted">Platform Revenue ({commissionPct}%)</p>
          <p className="text-2xl font-bold text-academic font-mono mt-1">{formatNaira(totalCommissionKobo)}</p>
          <p className="text-[11px] text-muted mt-0.5">Platform commission share</p>
        </div>

        <div className="bg-surface border border-border shadow-subtle rounded-card p-5">
          <p className="text-xs font-semibold text-muted">Subscription Volume</p>
          <p className="text-2xl font-bold text-ink font-mono mt-1">
            ₦{((billingMetrics?.totalRevenueNgn || 0)).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {billingMetrics?.totalTransactions || 0} verified transactions
          </p>
        </div>

        <div className="bg-surface border border-border shadow-subtle rounded-card p-5">
          <p className="text-xs font-semibold text-muted">Total Paid Out</p>
          <p className="text-2xl font-bold text-ink font-mono mt-1">{formatNaira(totalPaidOutKobo)}</p>
          <p className="text-[11px] text-muted mt-0.5">Completed Paystack transfers</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-border/40 rounded-btn w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
            activeTab === 'withdrawals' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Withdrawal Requests ({withdrawals.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
            activeTab === 'ledger' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Session Ledger ({sessionLedger.length})
        </button>
        <button
          onClick={() => setActiveTab('bank_accounts')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
            activeTab === 'bank_accounts' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Payout Profiles ({payoutProfiles.length})
        </button>
        <button
          onClick={() => setActiveTab('commission')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
            activeTab === 'commission' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Commission Settings
        </button>
      </div>

      {/* TAB 1: WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-academic" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <CreditCard className="w-10 h-10 text-muted" />
              <p className="text-base font-semibold text-ink">No withdrawal requests</p>
              <p className="text-xs text-muted max-w-sm">
                No tutors have submitted payout requests at this time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                <span className="col-span-4">Tutor & Identifier</span>
                <span className="col-span-3">Bank Details</span>
                <span className="col-span-2">Amount</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-2 text-right">Action</span>
              </div>
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 transition-colors text-xs"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="font-bold text-ink truncate">{w.tutor?.full_name || 'Tutor'}</p>
                    <p className="text-[10px] text-muted font-mono truncate">{w.id}</p>
                  </div>

                  <div className="col-span-3 min-w-0 mt-1 sm:mt-0">
                    <p className="text-xs font-semibold text-ink truncate">{w.bank_name}</p>
                    <p className="text-[10px] text-muted font-mono truncate">
                      {w.account_number} ({w.account_name})
                    </p>
                    {w.paystack_recipient_code && (
                      <p className="text-[9px] font-mono text-academic">RCP: {w.paystack_recipient_code}</p>
                    )}
                  </div>

                  <div className="col-span-2 mt-1 sm:mt-0 font-mono font-bold text-academic">
                    {formatNaira(w.amount_kobo)}
                  </div>

                  <div className="col-span-1 mt-1 sm:mt-0">
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                        w.status === 'paid'
                          ? 'bg-academic-light text-academic border-academic/20'
                          : w.status === 'failed'
                          ? 'bg-red-50 text-danger border-red-200'
                          : 'bg-gold/10 text-gold border-gold/20'
                      )}
                    >
                      {w.status}
                    </span>
                  </div>

                  <div className="col-span-2 text-right mt-2 sm:mt-0">
                    {w.status === 'requested' ? (
                      <button
                        onClick={() => handleApproveWithdrawal(w.id)}
                        disabled={processingWdId === w.id}
                        className="px-3 py-1.5 rounded-btn bg-academic text-white text-xs font-semibold hover:bg-academic/90 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {processingWdId === w.id ? 'Processing…' : 'Approve & Pay'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted font-mono">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESSION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {sessionLedger.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <DollarSign className="w-10 h-10 text-muted" />
              <p className="text-base font-semibold text-ink">No paid sessions in ledger</p>
              <p className="text-xs text-muted max-w-sm">
                As students book and complete peer tutoring sessions, the immutable split ledger entries will record here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                <span className="col-span-3">Payment Reference</span>
                <span className="col-span-3">Participants</span>
                <span className="col-span-2">Gross</span>
                <span className="col-span-2">Platform Comm.</span>
                <span className="col-span-2 text-right">Tutor (80%)</span>
              </div>
              {sessionLedger.map((row) => (
                <div
                  key={row.id}
                  className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 transition-colors text-xs"
                >
                  <div className="col-span-3 min-w-0">
                    <p className="font-mono text-ink font-bold truncate">{row.payment_reference}</p>
                    <p className="text-[10px] text-muted font-mono truncate">{row.booking_id}</p>
                  </div>

                  <div className="col-span-3 min-w-0 mt-1 sm:mt-0">
                    <p className="text-xs font-semibold text-ink truncate">{row.student?.full_name || 'Student'}</p>
                    <p className="text-[10px] text-muted truncate">→ {row.tutor?.full_name || 'Tutor'}</p>
                  </div>

                  <div className="col-span-2 mt-1 sm:mt-0 font-mono font-bold text-ink">
                    {formatNaira(row.gross_amount_kobo)}
                  </div>

                  <div className="col-span-2 mt-1 sm:mt-0 font-mono font-semibold text-academic">
                    {formatNaira(row.platform_commission_amount_kobo)}
                  </div>

                  <div className="col-span-2 text-right mt-1 sm:mt-0 font-mono font-bold text-ink">
                    {formatNaira(row.tutor_amount_kobo)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANK PAYOUT PROFILES */}
      {activeTab === 'bank_accounts' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {payoutProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <Building2 className="w-10 h-10 text-muted" />
              <p className="text-base font-semibold text-ink">No payout accounts registered</p>
              <p className="text-xs text-muted max-w-sm">
                When tutors connect their Nigerian bank accounts in the tutor portal, profiles will appear here for verification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                <span className="col-span-4">Tutor Profile</span>
                <span className="col-span-4">Bank Account Details</span>
                <span className="col-span-2">Verification</span>
                <span className="col-span-2 text-right">Action</span>
              </div>
              {payoutProfiles.map((p) => (
                <div
                  key={p.tutor_id}
                  className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 transition-colors text-xs"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="font-bold text-ink truncate">{p.tutor?.full_name || p.tutor_id}</p>
                    <p className="text-[10px] text-muted font-mono truncate">{p.tutor_id}</p>
                  </div>

                  <div className="col-span-4 min-w-0 mt-1 sm:mt-0">
                    <p className="font-semibold text-ink">{p.bank_name}</p>
                    <p className="text-[10px] text-muted font-mono">
                      {p.account_number} · {p.account_name}
                    </p>
                  </div>

                  <div className="col-span-2 mt-1 sm:mt-0">
                    {p.is_verified ? (
                      <span className="text-academic font-bold text-[10px] flex items-center gap-1 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-gold font-bold text-[10px] flex items-center gap-1 uppercase">
                        <Clock className="w-3.5 h-3.5" /> Unverified
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-right mt-2 sm:mt-0">
                    {!p.is_verified ? (
                      <button
                        onClick={() => handleVerifyPayoutProfile(p.tutor_id)}
                        disabled={verifyingTutorId === p.tutor_id}
                        className="px-3 py-1.5 rounded-btn bg-navy text-white text-xs font-semibold hover:bg-ink transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {verifyingTutorId === p.tutor_id ? 'Verifying…' : 'Verify Account'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted font-mono">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMMISSION CONFIGURATION */}
      {activeTab === 'commission' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sliders className="w-4 h-4 text-academic" />
            <h3 className="text-sm font-bold text-ink">Platform Commission Rate</h3>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Configure the global platform take-rate deducted from student payments before releasing tutor earnings. The default standard is 20%.
          </p>

          <form onSubmit={handleUpdateCommission} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Commission Percentage (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(e.target.value)}
                  className="w-24 px-3 py-2 text-sm bg-canvas border border-border rounded-btn text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-academic/20"
                />
                <span className="text-xs text-muted font-mono">
                  &rarr; Tutor Payout Share: <strong>{100 - (parseInt(commissionPct, 10) || 0)}%</strong>
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCommission}
              className="px-4 py-2 rounded-btn bg-academic text-white text-xs font-semibold hover:bg-academic/90 transition-colors disabled:opacity-50 cursor-pointer shadow-subtle"
            >
              {savingCommission ? 'Saving…' : 'Save Commission Rate'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
