

import React, { useEffect, useState } from 'react';
import {
  Video,
  MapPin,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button, Modal } from '../ui';
import { supabase } from '../../lib/supabase/client';

export function BookingModal({ tutor, isOpen, onClose, onPaymentInitialized, showToast }) {
  const [subject, setSubject] = useState(tutor?.subjectNames?.[0] || '');
  const [slotTime, setSlotTime] = useState('');
  const [mode, setMode] = useState('virtual');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [payableAmountKobo, setPayableAmountKobo] = useState(
    Number.isSafeInteger(Number(tutor?.sessionPriceKobo)) && Number(tutor?.sessionPriceKobo) > 0
      ? Number(tutor.sessionPriceKobo)
      : null
  );

  useEffect(() => {
    const price = Number(tutor?.sessionPriceKobo);
    setSubject(tutor?.subjectNames?.[0] || '');
    setPayableAmountKobo(tutor?.sessionPriceKobo != null && Number.isSafeInteger(price) && price > 0 ? price : null);
    setAuthorizationUrl('');
    setError(null);
  }, [tutor?.tutorId, tutor?.id, tutor?.sessionPriceKobo]);

  if (!tutor) return null;

  const sessionPriceNaira = payableAmountKobo == null
    ? 'Price unavailable'
    : (payableAmountKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (authorizationUrl) {
      window.location.href = authorizationUrl;
      return;
    }
    if (payableAmountKobo == null) {
      setError('This tutor has not listed a session price yet. Please choose another tutor or check back later.');
      return;
    }
    if (!subject.trim()) {
      setError('Please select or enter a subject.');
      return;
    }
    if (!slotTime.trim()) {
      setError('Please select a preferred date and time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current Supabase session JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (!jwt) {
        throw new Error('Please sign in to book a tutoring session.');
      }

      const response = await fetch('/api/tutors/booking/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          tutorId: tutor.tutorId || tutor.id,
          subject: subject.trim(),
          slotTime: slotTime.trim(),
          mode,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize booking');
      }

      if (data.authorizationUrl) {
        const serverAmountKobo = Number(data.grossAmountKobo);
        if (!Number.isSafeInteger(serverAmountKobo) || serverAmountKobo <= 0) {
          throw new Error('The tutor price could not be confirmed. Please try again.');
        }
        if (serverAmountKobo !== payableAmountKobo) {
          setPayableAmountKobo(serverAmountKobo);
          setAuthorizationUrl(data.authorizationUrl);
          setError('The tutor updated their session price. Review the current amount, then continue to Paystack.');
          return;
        }
        showToast?.({
          type: 'success',
          title: 'Booking Initialized',
          message: 'Redirecting to Paystack checkout to complete payment…',
        });
        window.location.href = data.authorizationUrl;
      } else {
        onPaymentInitialized?.(data);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Book Session with ${tutor.fullName}`} maxWidth="max-w-xl">
      <form onSubmit={handleBookSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-btn bg-danger-50 dark:bg-danger-700/15 border border-danger-200 dark:border-danger-500/30 text-xs text-danger dark:text-danger-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tutor info banner */}
        <div className="bg-academic-50 dark:bg-academic-900/35 border border-academic-200 dark:border-academic-700/60 rounded-btn p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-academic text-white font-bold flex items-center justify-center text-sm shrink-0">
            {tutor.fullName?.[0] || 'T'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink truncate">{tutor.fullName}</p>
            <p className="text-xs text-muted dark:text-white/60 truncate">{tutor.title || 'Verified Studora Tutor'}</p>
          </div>
        </div>

        {/* Subject Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink dark:text-white/85 mb-1">Select Subject *</label>
          {tutor.subjectNames && tutor.subjectNames.length > 0 ? (
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs p-2.5 bg-white dark:bg-navy-900 border border-border dark:border-navy-700 rounded-btn text-ink dark:text-white focus:border-academic focus:outline-none"
              required
            >
              {tutor.subjectNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="e.g. Organic Chemistry, Calculus"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs p-2.5 bg-white dark:bg-navy-900 border border-border dark:border-navy-700 rounded-btn text-ink dark:text-white focus:border-academic focus:outline-none"
              required
            />
          )}
        </div>

        {/* Session Mode */}
        <div>
          <label className="block text-xs font-semibold text-ink dark:text-white/85 mb-1">Session Mode *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('virtual')}
              className={`p-2.5 rounded-btn border text-xs font-medium flex items-center justify-center gap-2 transition-all ${mode === 'virtual'
                  ? 'bg-academic-50 dark:bg-academic-900/60 border-academic-300 dark:border-academic-500 text-academic dark:text-academic-200 font-bold shadow-tactile-surface'
                  : 'bg-white dark:bg-navy-900 border-border dark:border-navy-700 text-muted dark:text-white/65 hover:text-ink dark:hover:text-white'
                }`}
            >
              <Video className="w-4 h-4" />
              Virtual (Online Video)
            </button>
            <button
              type="button"
              onClick={() => setMode('physical')}
              className={`p-2.5 rounded-btn border text-xs font-medium flex items-center justify-center gap-2 transition-all ${mode === 'physical'
                  ? 'bg-academic-50 dark:bg-academic-900/60 border-academic-300 dark:border-academic-500 text-academic dark:text-academic-200 font-bold shadow-tactile-surface'
                  : 'bg-white dark:bg-navy-900 border-border dark:border-navy-700 text-muted dark:text-white/65 hover:text-ink dark:hover:text-white'
                }`}
            >
              <MapPin className="w-4 h-4" />
              Physical (In-Person)
            </button>
          </div>
        </div>

        {/* Preferred Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-ink dark:text-white/85 mb-1">Preferred Date & Time *</label>
          <input
            type="datetime-local"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-navy-900 border border-border dark:border-navy-700 rounded-btn text-ink dark:text-white focus:border-academic focus:outline-none font-mono"
            required
          />
        </div>

        {/* Notes for Tutor */}
        <div>
          <label className="block text-xs font-semibold text-ink dark:text-white/85 mb-1">Notes / Specific Topics (Optional)</label>
          <textarea
            rows={2}
            placeholder="Tell the tutor what specific topics or exam prep you need help with…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-navy-900 border border-border dark:border-navy-700 rounded-btn text-ink dark:text-white focus:border-academic focus:outline-none resize-none"
          />
        </div>

        <div className="bg-canvas dark:bg-navy-900/80 border border-border dark:border-navy-700 rounded-btn p-4 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-ink dark:text-white">Amount to Pay:</span>
          <span className="text-base font-extrabold font-mono text-academic dark:text-academic-300 text-right">
            {sessionPriceNaira}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="academic"
            size="sm"
            type="submit"
            disabled={loading || payableAmountKobo == null}
            icon={loading ? Loader2 : CreditCard}
            className="shadow-tactile-btn"
          >
            {loading ? 'Initializing Paystack…' : authorizationUrl ? 'Continue to Paystack' : payableAmountKobo != null ? `Pay ${sessionPriceNaira} with Paystack` : 'Price unavailable'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
