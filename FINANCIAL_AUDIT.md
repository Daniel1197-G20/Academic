# Studora Financial System — Audit Report

Generated: 2026-10-06

---

## 1. Existing Relevant Tables (Supabase/PostgreSQL)

| Table | Status | Notes |
|---|---|---|
| `profiles` | ✅ Exists | `id`, `full_name`, `role` — role protected by trigger |
| `tutor_profiles` | ✅ Exists | Extended: `session_price_kobo` column added |
| `tutor_bookings` | ✅ Exists | Extended: financial snapshot columns added |
| `tutor_session_ledger` | ✅ Exists | New — immutable financial record per session |
| `tutor_payout_profiles` | ✅ Exists | New — bank account storage for payouts |
| `tutor_withdrawals` | ✅ Exists | New — withdrawal state machine |
| `platform_config` | ✅ Exists | Seeded: `commission_percentage = 20` |
| `payment_webhook_events` | ✅ Exists | Subscription webhook idempotency (reusable) |
| `admin_audit_logs` | ✅ Exists | Admin action logging |

---

## 2. Existing RPCs / Functions

| Function | Status |
|---|---|
| `get_platform_commission()` | ✅ Exists |
| `calculate_session_split(p_gross_kobo)` | ✅ Exists |
| `set_tutor_session_price(p_price_kobo)` | ✅ Exists |
| `initialize_booking_payment(...)` | ✅ Exists |
| `confirm_session_payment(booking_id, txn_id)` | ✅ Exists |
| `complete_booking_and_release_earning(booking_id)` | ✅ Exists |
| `get_tutor_earnings_summary()` | ✅ Exists |
| `request_tutor_withdrawal(amount_kobo)` | ✅ Exists |
| `admin_approve_withdrawal(withdrawal_id)` | ✅ Exists |
| `reverse_session_earning(booking_id, reason)` | ✅ Exists |

---

## 3. Existing Booking/Payment Flow

### Before This Implementation
- Student selects tutor → calls legacy stub `/api/tutors/book` → returns fake `bookingId` — **no real booking created**
- Marketplace "Book a Session" button shows "coming soon" toast
- No Paystack transaction initialized for tutor sessions
- Existing webhook `/api/webhooks/paystack` handles **subscription** events only

### What the Migration Added
- DB-level financial tables and 10 RPCs with full integer kobo arithmetic
- All commission calculation is server-side (client cannot influence amounts)
- Ledger is write-protected by trigger (core fields immutable)
- Withdrawal status protected by trigger (only admin/service role can advance state)

---

## 4. Files to Modify

| File | Change |
|---|---|
| `server/api.js` | Replace `/api/tutors/book` stub; add financial API routes |
| `server/billing-service.js` | Add tutor-session Paystack initialization + transfer logic |
| `src/pages/tutor/TutorDashboardPage.jsx` | Replace "Coming Soon" placeholder with real earnings UI |
| `src/pages/tutor/TutorMarketplacePage.jsx` | Replace "Coming Soon" booking modal with real booking flow |
| `admin/src/App.jsx` | Add `/payments`, `/withdrawals` routes |
| `admin/src/components/AdminSidebar.jsx` | Enable Payments nav item |
| `server/test-suite.js` | Add financial/withdrawal/webhook tests |

---

## 5. New Files to Create

| File | Purpose |
|---|---|
| `server/tutor-financial-service.js` | Tutor session Paystack init, webhook handler extension, payout transfers |
| `admin/src/pages/PaymentsPage.jsx` | Admin payments/earnings/withdrawals management |
| `admin/src/pages/WithdrawalsPage.jsx` | Admin withdrawal approval + transfer initiation |
| `src/pages/tutor/EarningsSection.jsx` | Earnings panel for tutor dashboard |
| `src/pages/tutor/PayoutSetupSection.jsx` | Bank account setup for tutor |
| `src/components/tutor/BookingModal.jsx` | Real booking + payment modal for marketplace |

---

## 6. Missing Components

- ❌ Server-side tutor session financial service (Paystack init + transfer)
- ❌ API routes for: booking init, payment verify, earnings summary, withdrawal request, payout setup
- ❌ Admin financial management pages (payments, withdrawals, commission config)
- ❌ Tutor earnings/payout UI in TutorDashboardPage
- ❌ Real booking modal in marketplace
- ❌ Financial test suite

---

## 7. Conflicts / Risks

| Risk | Mitigation |
|---|---|
| Legacy `/api/tutors/book` stub returns fake bookingId | Replace stub entirely with `initialize_booking_payment` RPC call |
| `billing-service.js` has `PAYSTACK_WEBHOOK_SECRET` validation only for subscriptions | Extend webhook handler to route tutor session events |
| Admin `/payments` route exists as `ComingSoonPage` | Replace with real `PaymentsPage` |
| `PAYSTACK_SECRET_KEY` has mock fallback in billing-service.js | Must not add new fallbacks; treat missing key as test mode only |
| Tutor withdrawal requires verified payout profile — verification is server-side | Tutor can submit bank details; admin/server verifies via Paystack API |

---

## 8. Environment Variables Required

| Variable | Server | Frontend | Status |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | ✅ Required | ❌ Never | Placeholder in billing-service.js |
| `PAYSTACK_WEBHOOK_SECRET` | ✅ Required | ❌ Never | Required in production |
| `VITE_PAYSTACK_PUBLIC_KEY` | — | ✅ Required | Exists in .env (test value) |
| `APP_SECRET` | ✅ Required | ❌ Never | Set in .env |
| `VITE_SUPABASE_URL` | — | ✅ Required | Set in .env |
| `VITE_SUPABASE_ANON_KEY` | — | ✅ Required | Set in .env |
