/**
 * PayoutSetupSection.jsx
 *
 * Configures tutor session pricing and bank account payout profile.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, DollarSign, ShieldCheck, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { supabase } from '../../lib/supabase/client';

export function PayoutSetupSection({ tutorProfile, userProfile, showToast, onProfileUpdated }) {
  // Session Pricing state
  const [priceNaira, setPriceNaira] = useState(
    tutorProfile?.session_price_kobo ? (tutorProfile.session_price_kobo / 100).toString() : '10000'
  );
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);

  // Bank Payout Profile state
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [payoutProfile, setPayoutProfile] = useState(null);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState(null);

  // Fetch banks & existing payout profile
  const fetchPayoutData = useCallback(async () => {
    setLoadingBanks(true);
    try {
      // 1. Fetch Nigerian banks
      const res = await fetch('/api/tutors/banks');
      const data = await res.json();
      setBanks(data.banks || []);

      // 2. Fetch tutor's existing payout profile from Supabase
      if (userProfile?.id) {
        const { data: profileData, error: profErr } = await supabase
          .from('tutor_payout_profiles')
          .select('*')
          .eq('tutor_id', userProfile.id)
          .maybeSingle();

        if (profileData) {
          setPayoutProfile(profileData);
          setBankCode(profileData.bank_code);
          setBankName(profileData.bank_name);
          setAccountNumber(profileData.account_number);
          setAccountName(profileData.account_name);
        }
      }
    } catch (err) {
      setPayoutError(err.message);
    } finally {
      setLoadingBanks(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetchPayoutData();
  }, [fetchPayoutData]);

  // Handle Session Price Update
  const handleSavePrice = async (e) => {
    e.preventDefault();
    const num = parseFloat(priceNaira);
    if (isNaN(num) || num < 1000 || num > 100000) {
      setPriceError('Session price must be between ₦1,000 and ₦100,000.');
      return;
    }

    const priceKobo = Math.round(num * 100);
    setSavingPrice(true);
    setPriceError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      const { data, error } = await supabase.rpc('set_tutor_session_price', {
        p_price_kobo: priceKobo,
      });

      if (error) throw new Error(error.message);

      showToast?.({
        type: 'success',
        title: 'Price Updated',
        message: `Your session price has been updated to ₦${num.toLocaleString()}.`,
      });

      onProfileUpdated?.();
    } catch (err) {
      setPriceError(err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  // Handle Bank Account Save
  const handleSavePayoutProfile = async (e) => {
    e.preventDefault();
    if (!bankCode || !accountNumber || !accountName) {
      setPayoutError('Please fill in all bank details.');
      return;
    }

    setSavingPayout(true);
    setPayoutError(null);

    try {
      const selectedBank = banks.find((b) => b.code === bankCode);
      const nameOfBank = selectedBank ? selectedBank.name : bankName;

      const { data, error } = await supabase.from('tutor_payout_profiles').upsert({
        tutor_id: userProfile.id,
        bank_code: bankCode,
        bank_name: nameOfBank,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      });

      if (error) throw new Error(error.message);

      showToast?.({
        type: 'success',
        title: 'Bank Details Saved',
        message: 'Your bank account has been saved. Admin will verify it for payouts.',
      });

      fetchPayoutData();
    } catch (err) {
      setPayoutError(err.message);
    } finally {
      setSavingPayout(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── 1. Session Pricing ── */}
      <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-academic-50 border border-academic-200 flex items-center justify-center text-academic">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Session Pricing</h3>
            <p className="text-xs text-muted">Set your 1-hour tutoring session fee</p>
          </div>
        </div>

        <form onSubmit={handleSavePrice} className="space-y-4">
          {priceError && (
            <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{priceError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Price per Session (₦)</label>
            <input
              type="number"
              step="500"
              min="1000"
              max="100000"
              value={priceNaira}
              onChange={(e) => setPriceNaira(e.target.value)}
              className="w-full text-sm p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none font-mono font-bold"
              required
            />
            <p className="text-[10px] text-muted mt-1 font-mono">
              Min: ₦1,000 | Max: ₦100,000. You keep 80% (₦
              {((parseFloat(priceNaira) || 0) * 0.8).toLocaleString()}), platform keeps 20%.
            </p>
          </div>

          <Button
            variant="academic"
            size="sm"
            type="submit"
            disabled={savingPrice}
            icon={savingPrice ? Loader2 : DollarSign}
            className="w-full shadow-tactile-btn"
          >
            {savingPrice ? 'Saving Price…' : 'Update Session Price'}
          </Button>
        </form>
      </div>

      {/* ── 2. Bank Account / Payout Setup ── */}
      <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Payout Bank Account</h3>
              <p className="text-xs text-muted">Destination for your earnings transfers</p>
            </div>
          </div>
          {payoutProfile?.is_verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        <form onSubmit={handleSavePayoutProfile} className="space-y-4">
          {payoutError && (
            <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{payoutError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Select Bank *</label>
            <select
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                const b = banks.find((item) => item.code === e.target.value);
                if (b) setBankName(b.name);
              }}
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none"
              required
            >
              <option value="">Select a Nigerian bank…</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Account Number *</label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. 0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Account Holder Name *</label>
            <input
              type="text"
              placeholder="Must match bank account name exactly"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none"
              required
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            type="submit"
            disabled={savingPayout}
            icon={savingPayout ? Loader2 : Building2}
            className="w-full"
          >
            {savingPayout ? 'Saving Bank Details…' : 'Save Bank Account Details'}
          </Button>
        </form>
      </div>
    </div>
  );
}
