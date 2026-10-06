/**
 * BookingModal.jsx
 *
 * Real student booking modal for the Studora Tutor Marketplace.
 * Displays tutor price, session mode options, fee breakdown, and initializes
 * server-side Paystack payment for tutor sessions.
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Video,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Button, Modal, Badge } from '../ui';
import { supabase } from '../../lib/supabase/client';

export function BookingModal({ tutor, isOpen, onClose, onPaymentInitialized, showToast }) {
  const [subject, setSubject] = useState(tutor?.subjectNames?.[0] || '');
  const [slotTime, setSlotTime] = useState('');
  const [mode, setMode] = useState('virtual');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!tutor) return null;

  const sessionPriceNaira = tutor.sessionPriceKobo
    ? (tutor.sessionPriceKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
    : '₦10,000';

  const rawKobo = tutor.sessionPriceKobo || 1000000;
  const platformFeeKobo = Math.floor((rawKobo * 20) / 100);
  const tutorShareKobo = rawKobo - platformFeeKobo;

  const platformFeeNaira = (platformFeeKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
  const tutorShareNaira = (tutorShareKobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

  const handleBookSubmit = async (e) => {
    e.preventDefault();
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Book Session with ${tutor.fullName}`} size="md">
      <form onSubmit={handleBookSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tutor info banner */}
        <div className="bg-academic-50 border border-academic-200 rounded-btn p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-academic text-white font-bold flex items-center justify-center text-sm shrink-0">
            {tutor.fullName?.[0] || 'T'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink truncate">{tutor.fullName}</p>
            <p className="text-xs text-muted truncate">{tutor.title || 'Verified Studora Tutor'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-extrabold font-mono text-academic">{sessionPriceNaira}</p>
            <p className="text-[10px] text-muted font-mono">per session</p>
          </div>
        </div>

        {/* Subject Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Select Subject *</label>
          {tutor.subjectNames && tutor.subjectNames.length > 0 ? (
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none"
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
              className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none"
              required
            />
          )}
        </div>

        {/* Session Mode */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Session Mode *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('virtual')}
              className={`p-2.5 rounded-btn border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                mode === 'virtual'
                  ? 'bg-academic-50 border-academic-300 text-academic font-bold shadow-tactile-surface'
                  : 'bg-white border-border text-muted hover:text-ink'
              }`}
            >
              <Video className="w-4 h-4" />
              Virtual (Online Video)
            </button>
            <button
              type="button"
              onClick={() => setMode('physical')}
              className={`p-2.5 rounded-btn border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                mode === 'physical'
                  ? 'bg-academic-50 border-academic-300 text-academic font-bold shadow-tactile-surface'
                  : 'bg-white border-border text-muted hover:text-ink'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Physical (In-Person)
            </button>
          </div>
        </div>

        {/* Preferred Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Preferred Date & Time *</label>
          <input
            type="datetime-local"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none font-mono"
            required
          />
        </div>

        {/* Notes for Tutor */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Notes / Specific Topics (Optional)</label>
          <textarea
            rows={2}
            placeholder="Tell the tutor what specific topics or exam prep you need help with…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-border rounded-btn text-ink focus:border-academic focus:outline-none resize-none"
          />
        </div>

        {/* Financial Breakdown */}
        <div className="bg-canvas border border-border rounded-btn p-3 space-y-1.5 text-[11px] font-mono">
          <div className="flex justify-between text-muted">
            <span>Session Fee:</span>
            <span className="font-semibold text-ink">{sessionPriceNaira}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Platform Service Fee (20%):</span>
            <span>{platformFeeNaira}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Tutor Remittance (80%):</span>
            <span>{tutorShareNaira}</span>
          </div>
          <div className="pt-1.5 border-t border-border flex justify-between font-bold text-ink text-xs">
            <span>Total Payable Now:</span>
            <span className="text-academic">{sessionPriceNaira}</span>
          </div>
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
            disabled={loading}
            icon={loading ? Loader2 : CreditCard}
            className="shadow-tactile-btn"
          >
            {loading ? 'Initializing Paystack…' : `Pay ${sessionPriceNaira} with Paystack`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
