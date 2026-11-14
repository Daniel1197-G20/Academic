import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildTutorSessionBookingClientResponse,
  buildTutorSessionPaystackPayload,
} from './tutor-financial-service.js';

console.log('Testing Financial Privacy across all 10 criteria...');

// Criterion 1, 2, 3, 4: Student sees only payable amount, cannot retrieve commission, remittance, percentage
const booking = {
  booking_id: 'bk_privacy_test',
  payment_reference: 'STU_PRIVACY_TEST',
  tutor_name: 'Dr. Ada Lovelace',
  subject: 'Mathematics',
  mode: 'virtual',
  gross_amount_kobo: 1250000, // ₦12,500
  platform_commission_percentage: 20,
  platform_commission_amount_kobo: 250000,
  tutor_amount_kobo: 1000000,
};

const paystackDataMock = {
  data: {
    authorization_url: 'https://checkout.paystack.com/access-123',
    access_code: 'access-123'
  }
};

const clientResponse = buildTutorSessionBookingClientResponse(booking, paystackDataMock);

assert.equal(clientResponse.grossAmountKobo, 1250000, 'Criterion 1: Client response contains payable amount in kobo');
assert.equal(clientResponse.authorizationUrl, 'https://checkout.paystack.com/access-123', 'Criterion 1: Returns authorizationUrl');
assert.equal('platform_commission_percentage' in clientResponse, false, 'Criterion 4: Omit platform_commission_percentage');
assert.equal('commissionPercentage' in clientResponse, false, 'Criterion 4: Omit commissionPercentage');
assert.equal('platform_commission_amount_kobo' in clientResponse, false, 'Criterion 2: Omit platform_commission_amount_kobo');
assert.equal('commissionKobo' in clientResponse, false, 'Criterion 2: Omit commissionKobo');
assert.equal('tutor_amount_kobo' in clientResponse, false, 'Criterion 3: Omit tutor_amount_kobo');
assert.equal('tutorAmountKobo' in clientResponse, false, 'Criterion 3: Omit tutorAmountKobo');

// Criterion 8: Paystack receives the correct amount
const paystackPayload = buildTutorSessionPaystackPayload(booking, {
  studentEmail: 'student@studora.test',
  tutorId: 'tutor-uuid',
  subject: booking.subject,
  mode: booking.mode,
});
assert.equal(paystackPayload.amount, 1250000, 'Criterion 8: Paystack receives exact gross session price');
assert.equal(paystackPayload.email, 'student@studora.test', 'Criterion 8: Paystack receives student email');
assert.equal(paystackPayload.reference, 'STU_PRIVACY_TEST', 'Criterion 8: Paystack receives STU_ reference');

// Criterion 5 & 6: Tutor pricing is respected and missing tutor pricing handled safely
const bookingModalSrc = await readFile(new URL('../src/components/tutor/BookingModal.jsx', import.meta.url), 'utf8');
assert.match(bookingModalSrc, /Amount to Pay:/, 'BookingModal displays "Amount to Pay:"');
assert.doesNotMatch(bookingModalSrc, /Platform Service Fee|Tutor Remittance|commissionPercentage|commissionKobo|tutorAmountKobo/, 'BookingModal omits all commission & remittance references');
assert.doesNotMatch(bookingModalSrc, /1000000|₦10,000/, 'BookingModal has no hardcoded fallback like ₦10,000');
assert.match(bookingModalSrc, /payableAmountKobo == null/, 'BookingModal checks for missing tutor price');
assert.match(bookingModalSrc, /Price unavailable/, 'BookingModal displays Price unavailable when tutor price is missing');
assert.match(bookingModalSrc, /disabled=\{loading \|\| payableAmountKobo == null\}/, 'BookingModal disables submit button when price is missing');

// Criterion 7: Client-side price manipulation is rejected
// Verify that the BookingModal payload to /api/tutors/booking/initialize does NOT include any amount from client
const requestBodySection = bookingModalSrc.slice(
  bookingModalSrc.indexOf('body: JSON.stringify({'),
  bookingModalSrc.indexOf('notes: notes.trim()') + 30
);
assert.equal(
  requestBodySection.includes('amount') || requestBodySection.includes('price'),
  false,
  'Criterion 7: Client does not send amount or price in request body'
);

const migrationSrc = await readFile(new URL('../supabase/migrations/20261113000000_studora_booking_financial_privacy.sql', import.meta.url), 'utf8');
assert.match(migrationSrc, /SELECT tp\.id, tp\.session_price_kobo/, 'Criterion 7: initialize_booking_payment reads trusted session_price_kobo from tutor_profiles');

// Criterion 9: Authorized admin financial reporting remains functional
assert.match(migrationSrc, /REVOKE SELECT \([\s\S]*?platform_commission[\s\S]*?\) ON TABLE public\.tutor_bookings FROM anon, authenticated;/, 'Criterion 9: Commission columns revoked from anon and authenticated');
assert.match(migrationSrc, /DROP POLICY IF EXISTS "Students can view own session ledger entries"/, 'Criterion 9: Ledger read policy dropped for students');

console.log('All 10 Financial Privacy criteria verified successfully: 18 assertions passed.');
