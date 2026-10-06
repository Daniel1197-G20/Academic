/**
 * PaymentsPage.jsx
 *
 * Admin Dashboard page for financial management:
 *  - Overview of platform earnings, pending payouts, completed payouts
 *  - Tutor session payments ledger
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function PaymentsPage() {
  const [sessionLedger, setSessionLedger] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payoutProfiles, setPayoutProfiles] = useState([]);
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
      // 1. Fetch platform commission
      const { data: configData } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'commission_percentage')
        .maybeSingle();

      if (configData) {
        setCommissionPct(configData.value);
      }

      // 2. Fetch session ledger
      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('tutor_session_ledger')
        .select(`
          *,
          tutor:profiles!tutor_session_ledger_tutor_id_fkey(full_name),
          student:profiles!tutor_session_ledger_student_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (ledgerErr) throw new Error(ledgerErr.message);
      setSessionLedger(ledgerData || []);

      // 3. Fetch withdrawal requests
      const { data: wdData, error: wdErr } = await supabase
        .from('tutor_withdrawals')
        .select(`
          *,
          tutor:profiles!tutor_withdrawals_tutor_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (wdErr) throw new Error(wdErr.message);
      setWithdrawals(wdData || []);

      // 4. Fetch payout profiles
      const { data: payoutData, error: pErr } = await supabase
        .from('tutor_payout_profiles')
        .select(`
          *,
          tutor:profiles!tutor_payout_profiles_tutor_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (pErr) throw new Error(pErr.message);
      setPayoutProfiles(payoutData || []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-academic" />
        <span className="text-sm font-medium">Loading financial records…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Financial Operations & Payouts</h1>
          <p className="text-xs text-white/60 mt-0.5">
            Monitor session ledger, manage platform commission, approve tutor withdrawals, and verify bank accounts.
          </p>
        </div>
        <button
          onClick={fetchFinancialData}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-medium text-white/60">Total Session GMV</p>
          <p className="text-xl font-extrabold text-white font-mono mt-1">{formatNaira(totalVolumeKobo)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Gross student payments</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-medium text-white/60">Platform Revenue ({commissionPct}%)</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{formatNaira(totalCommissionKobo)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Studora 20% commission share</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-medium text-white/60">Total Tutor Earnings (80%)</p>
          <p className="text-xl font-extrabold text-white font-mono mt-1">{formatNaira(totalTutorEarningsKobo)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Tutor earnings pool</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-medium text-white/60">Total Transferred Payouts</p>
          <p className="text-xl font-extrabold text-white font-mono mt-1">{formatNaira(totalPaidOutKobo)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Successful Paystack transfers</p>
        </div>
      </div>

      {/* Commission Configuration Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Platform Commission Configuration</h2>
        </div>
        <form onSubmit={handleUpdateCommission} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/70">Commission Percentage (%):</label>
            <input
              type="number"
              min="0"
              max="100"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-20 px-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-md text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
            />
          </div>
          <span className="text-xs text-white/40 font-mono">
            Tutor Share = {100 - (parseInt(commissionPct, 10) || 0)}%
          </span>
          <button
            type="submit"
            disabled={savingCommission}
            className="ml-auto px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {savingCommission ? 'Saving…' : 'Save Commission'}
          </button>
        </form>
      </div>

      {/* Pending Withdrawal Requests Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Tutor Withdrawal Requests</h2>
          <span className="text-xs font-mono text-white/40">{withdrawals.length} total</span>
        </div>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-white/40 py-4 text-center">No withdrawal requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/40 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Tutor / ID</th>
                  <th className="py-2 px-3">Bank Details</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{w.tutor?.full_name || 'Tutor'}</p>
                      <p className="text-[10px] font-mono text-white/40">{w.id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium">{w.bank_name}</p>
                      <p className="text-[10px] font-mono text-white/40">{w.account_number} ({w.account_name})</p>
                      {w.paystack_recipient_code && (
                        <p className="text-[9px] font-mono text-emerald-400">RCP: {w.paystack_recipient_code}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-emerald-400">
                      {formatNaira(w.amount_kobo)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          w.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : w.status === 'failed'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {w.status === 'requested' ? (
                        <button
                          onClick={() => handleApproveWithdrawal(w.id)}
                          disabled={processingWdId === w.id}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {processingWdId === w.id ? 'Processing…' : 'Approve & Pay'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/30 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tutor Payout Accounts Verification */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Tutor Bank Payout Profiles</h2>
          <span className="text-xs font-mono text-white/40">{payoutProfiles.length} registered</span>
        </div>

        {payoutProfiles.length === 0 ? (
          <p className="text-xs text-white/40 py-4 text-center">No payout profiles registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/40 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Tutor</th>
                  <th className="py-2 px-3">Bank Name</th>
                  <th className="py-2 px-3">Account Number</th>
                  <th className="py-2 px-3">Account Name</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {payoutProfiles.map((p) => (
                  <tr key={p.tutor_id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-bold text-white">{p.tutor?.full_name || p.tutor_id}</td>
                    <td className="py-3 px-3">{p.bank_name} ({p.bank_code})</td>
                    <td className="py-3 px-3 font-mono">{p.account_number}</td>
                    <td className="py-3 px-3">{p.account_name}</td>
                    <td className="py-3 px-3">
                      {p.is_verified ? (
                        <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-yellow-400 font-mono text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!p.is_verified ? (
                        <button
                          onClick={() => handleVerifyPayoutProfile(p.tutor_id)}
                          disabled={verifyingTutorId === p.tutor_id}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {verifyingTutorId === p.tutor_id ? 'Verifying…' : 'Verify Account'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400/60 font-mono">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Payment Ledger */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Immutable Session Ledger</h2>
          <span className="text-xs font-mono text-white/40">{sessionLedger.length} rows</span>
        </div>

        {sessionLedger.length === 0 ? (
          <p className="text-xs text-white/40 py-4 text-center">No paid sessions in ledger yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/40 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Ref / Booking</th>
                  <th className="py-2 px-3">Student → Tutor</th>
                  <th className="py-2 px-3">Gross</th>
                  <th className="py-2 px-3">Comm (20%)</th>
                  <th className="py-2 px-3">Tutor (80%)</th>
                  <th className="py-2 px-3">Earning Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {sessionLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono">
                      <p className="font-bold text-white">{row.payment_reference}</p>
                      <p className="text-[10px] text-white/40">{row.booking_id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-white">{row.student?.full_name || 'Student'}</p>
                      <p className="text-[10px] text-white/50">→ {row.tutor?.full_name || 'Tutor'}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-white font-bold">{formatNaira(row.gross_amount_kobo)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">{formatNaira(row.platform_commission_amount_kobo)}</td>
                    <td className="py-3 px-3 font-mono text-white font-semibold">{formatNaira(row.tutor_amount_kobo)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-white/10 text-white/80">
                        {row.earning_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
