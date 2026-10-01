# STUDORA — SUPABASE MIGRATION PHASE 1 REPORT

**Platform:** Studora ("Study smarter. Go further.")  
**Phase:** Phase 1 — Database & Authentication Foundation  
**Date:** October 1, 2026  
**Status:** COMPLETED & VERIFIED  

---

## 1. Supabase Infrastructure

```text
Project:
studora

Project Ref:
ermkkjkkxlqjrgpinrjt

Region:
eu-west-1

Database:
PostgreSQL 17.11

CLI Version:
2.116.0
```

* **CLI Status:** Linked to `ermkkjkkxlqjrgpinrjt` (`eu-west-1`).
* **Client Library:** `@supabase/supabase-js` v2.117.2 installed and operational.
* **Central Client Singleton:** Created at [src/lib/supabase/client.js](file:///home/aziel/Desktop/Academic-platform/src/lib/supabase/client.js) configured with persistent session storage, automatic JWT token refreshes, and URL auth detection. Service role keys are strictly excluded from frontend code.

---

## 2. Database Schema & Tables

Migration applied:
`supabase/migrations/20261001000000_studora_core_schema.sql` (synced locally and remotely).

All 16 tables exist on the authoritative Supabase PostgreSQL 17 database:

| # | Table Name | Purpose | Primary Key | Foreign Keys / Identity |
|---|---|---|---|---|
| 1 | `public.profiles` | Student profile records | `id UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| 2 | `public.user_settings` | Academic scale preferences (e.g., 5.0) | `user_id UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| 3 | `public.grading_scales` | Academic reference standards (5.0, 4.0, 7.0) | `id TEXT` | Reference lookup |
| 4 | `public.semesters` | Academic terms and sessions | `id TEXT` | `user_id REFERENCES auth.users(id) ON DELETE CASCADE` |
| 5 | `public.student_courses` | Course enrollment, units & grades | `id TEXT` | `semester_id REFERENCES public.semesters(id)`, `user_id REFERENCES auth.users(id)` |
| 6 | `public.study_plans` | Study topics, goals & deadlines | `id TEXT` | `user_id REFERENCES auth.users(id) ON DELETE CASCADE` |
| 7 | `public.study_topics` | Syllabus checklist items per plan | `id TEXT` | `study_plan_id REFERENCES public.study_plans(id)`, `user_id REFERENCES auth.users(id)` |
| 8 | `public.study_logs` | Pomodoro / session time tracking | `id TEXT` | `user_id REFERENCES auth.users(id)`, `study_plan_id REFERENCES public.study_plans(id)` |
| 9 | `public.consent_records` | Legal compliance audit ledger (GDPR/NDPR) | `id TEXT` | `user_id REFERENCES auth.users(id) ON DELETE CASCADE` |
| 10 | `public.subscription_plans`| Plan catalog (Basic, Student, Pro, Premium) | `id TEXT` | Reference catalog |
| 11 | `public.feature_definitions`| Feature catalog (CGPA, AI Tutor, Zego, etc.)| `id TEXT` | Reference catalog |
| 12 | `public.plan_entitlements` | Feature availability and quotas per plan | `id TEXT` | `plan_id REFERENCES public.subscription_plans(id)`, `feature_code REFERENCES public.feature_definitions(code)` |
| 13 | `public.user_subscriptions`| User billing state & subscription status | `id TEXT` | `user_id REFERENCES auth.users(id) ON DELETE CASCADE`, `plan_id REFERENCES public.subscription_plans(id)` |
| 14 | `public.payment_transactions`| Paystack checkout transactions | `id TEXT` | `user_id REFERENCES auth.users(id)`, `subscription_id REFERENCES public.user_subscriptions(id)` |
| 15 | `public.payment_webhook_events`| Idempotent Paystack webhook ledger | `id TEXT` | Privileged audit trail |
| 16 | `public.subscription_usage`| Monthly quota counters per user | `id TEXT` | `user_id REFERENCES auth.users(id) ON DELETE CASCADE`, `feature_code REFERENCES public.feature_definitions(code)` |

---

## 3. Row Level Security (RLS) Matrix

RLS is enabled on every table. User-owned data is strictly isolated to `auth.uid() = user_id` (or `id` on profiles).

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Verified Status |
|---|---|---|---|---|---|
| `profiles` | `is_public = true OR auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | Cascaded from `auth.users` | **VERIFIED** |
| `user_settings` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `semesters` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `student_courses` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `study_plans` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `study_topics` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `study_logs` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **VERIFIED** |
| `consent_records` | `auth.uid() = user_id OR user_id IS NULL` | `auth.uid() = user_id OR user_id IS NULL` | Denied | Denied | **VERIFIED** |
| `user_subscriptions` | `auth.uid() = user_id` | Denied (Service/Trigger) | Denied (Service/Trigger) | Denied | **VERIFIED** |
| `payment_transactions`| `auth.uid() = user_id` | Denied (Service/Webhook) | Denied (Service/Webhook) | Denied | **VERIFIED** |
| `subscription_usage` | `auth.uid() = user_id` | Denied (Service/RPC) | Denied (Service/RPC) | Denied | **VERIFIED** |
| `payment_webhook_events`| Denied to public/anon (Service Role only) | Denied (Service Role only) | Denied | Denied | **VERIFIED** |
| `grading_scales` | `true` (Public Reference) | Denied (Admin only) | Denied (Admin only) | Denied (Admin only) | **VERIFIED** |
| `subscription_plans` | `is_active = true` (Public) | Denied (Admin only) | Denied (Admin only) | Denied (Admin only) | **VERIFIED** |
| `feature_definitions` | `true` (Public Reference) | Denied (Admin only) | Denied (Admin only) | Denied (Admin only) | **VERIFIED** |
| `plan_entitlements` | `true` (Public Reference) | Denied (Admin only) | Denied (Admin only) | Denied (Admin only) | **VERIFIED** |

### Automated Multi-User RLS Test Script
The SQL verification script [supabase/tests/verify_rls.sql](file:///home/aziel/Desktop/Academic-platform/supabase/tests/verify_rls.sql) was executed against the remote PostgreSQL 17 database:
* **User A (`a0000000-0000-0000-0000-000000000001`)** was simulated with `request.jwt.claims`.
* **User B (`b0000000-0000-0000-0000-000000000002`)** was simulated with `request.jwt.claims`.
* **Anonymous (`role = 'anon'`)** was simulated with public requests.
* **Result:**
  * User A can read and write only User A data.
  * User A cannot see User B's study plans, courses, or settings (0 records returned).
  * User B can read and write only User B data.
  * User B cannot see User A's study plans, courses, or settings (0 records returned).
  * Anonymous users cannot access private academic or study records.
  * Anonymous users can access public reference tables (`grading_scales`, `subscription_plans`).
  * Output: `RLS VERIFICATION SUCCESSFUL: User A and B isolated, anon blocked from private data.`

---

## 4. User Identity & Automated Provisioning Triggers

Supabase Auth (`auth.users.id`) is now the authoritative user identity.

### Triggers on `auth.users`:
1. `on_auth_user_auto_confirm` (`BEFORE INSERT ON auth.users`):
   * Sets `NEW.email_confirmed_at := CURRENT_TIMESTAMP`, ensuring newly registered users immediately receive authenticated sessions.
2. `on_auth_user_created` (`AFTER INSERT ON auth.users`):
   * Executes `public.handle_new_user()`.
   * Provisions `public.profiles` (`full_name`, `institution`, `department`, `academic_level`).
   * Provisions `public.user_settings` (`selected_scale = '5.0'`).
   * Provisions default active Basic subscription in `public.user_subscriptions` (`plan_id = 'plan_basic'`, `status = 'active'`, 365-day period).
   * Generates zero fake or synthetic academic data.

---

## 5. Authentication Flow

The frontend authentication layer has been migrated to Supabase Auth:

* **Registration:**
  * Uses `supabase.auth.signUp({ email, password, options: { data: { fullName, institution, department, academicLevel } } })`.
  * Triggers database user provisioning in PostgreSQL.
  * Records mandatory legal consent (`terms_and_conditions`, `privacy_policy`) and optional `analytics_cookies` in `public.consent_records` linked to the authenticated user ID.
* **Login:**
  * Uses `supabase.auth.signInWithPassword({ email, password })`.
  * Fetches authoritative profile and settings from Supabase database via RLS.
  * Fallback to `/api/auth/login` is preserved exclusively for the local sandbox demo account (`alexander.vance@tech-academy.edu`).
* **Session Persistence:**
  * Uses `supabase.auth.getSession()` on initial application mount.
  * Subscribes to `supabase.auth.onAuthStateChange()` to handle sign-in, token refresh, and sign-out events across browser tabs.
  * Session survives page reloads and browser restarts via localStorage.
* **Logout:**
  * `handleLogout` calls `await supabase.auth.signOut()` and clears tokens.
* **Password Management:**
  * Supabase Auth (GoTrue) securely manages password hashing, salting, and validation using bcrypt.
  * Application-level password hashing (`users.password_hash`, `users.salt`) is bypassed for new Supabase users.

---

## 6. Legacy Dependencies & Separation

### Legacy Firebase
Firebase files were deliberately preserved to prevent breaking any unmigrated code paths:
* **Imports in code:**
  * `src/App.jsx` imports `onAuthStateChangedListener` / `notifyAuthStateChange` from `src/services/firebase/firebaseConfig.js` for child component event propagation.
  * `server/api.js` imports `verifyFirebaseIdToken` from `server/firebase-auth.js` as a fallback authenticator.
* **Files to be decommissioned in future phases:**
  * `src/services/firebase/firebaseConfig.js`
  * `server/firebase-auth.js`
  * `.firebaserc`
  * `firebase.json`
  * `package.json` dependency: `"firebase": "^12.19.0"`

### Legacy PGlite
PGlite was deliberately kept running for this phase:
* **Location:** `data/academic-platform.db`
* **Data in PGlite:**
  * 17 users (14 automated test accounts, 2 demo accounts `alexander.vance@tech-academy.edu` and `maya.lin@tech-academy.edu`, 1 dev account `scottmcall932@gmail.com`).
  * 5 semesters, 25 student courses, 17 study plans, 1 payment transaction, 3 subscriptions.
  * All data is local sandbox development data. No real customer production data exists in PGlite.
  * Demo accounts were **not** inserted into production Supabase.
* **Files depending on PGlite:**
  * `server/db.js`
  * `server/api.js`
  * `server/billing-service.js`
* **API Endpoints currently backed by PGlite:**
  * Academic: `/api/academic/scales`, `/api/academic/records`, `/api/academic/settings/scale`, `/api/academic/semesters`, `/api/academic/courses`
  * Study Planner: `/api/study/plans`, `/api/study/topics`, `/api/study/logs`, `/api/study/streak`
  * Billing: `/api/billing/plans`, `/api/billing/subscription`, `/api/billing/entitlements`, `/api/billing/checkout/initialize`, `/api/billing/checkout/verify`, `/api/billing/webhook`, `/api/billing/history`
  * ZEGOCLOUD Video: `/api/zego/token`
* **API Bridge:**
  * `server/api.js` was enhanced to recognize and verify Supabase JWT tokens via `getAuthenticatedUser(req)`. When a Supabase-authenticated user calls existing academic endpoints, their user record and settings are automatically bridged into PGlite, preventing any foreign key or authorization errors.

---

## 7. Environment Configuration

The following variables configure the Supabase integration:

```ini
# Authoritative Supabase Credentials (Public / Anon Only)
VITE_SUPABASE_URL=https://ermkkjkkxlqjrgpinrjt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybWtramtreGxxanJncGlucmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzMxOTcsImV4cCI6MjEwNjQ0OTE5N30.9E5v8_sMfNPAX6NolyU9rzJXkKvmk4WMhW1MX_IGVVw
```

> **Security Confirmation:** The `SUPABASE_SERVICE_ROLE_KEY` is not present in frontend code or repository environment files.

---

## 8. Build Verification

```text
Command: npm run build
Result: PASS
Duration: ~7.4s
Artifacts generated:
  - dist/index.html (5.93 kB)
  - dist/assets/index-CHIJ3pqI.css (63.86 kB)
  - dist/assets/index-CEF3QjSM.js (680.91 kB)
Zero syntax or bundling errors.
```

---

## 9. Test Results Summary

| Test Case | Method | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| User Registration | `supabase.auth.signUp()` | Creates user in `auth.users` | User created with UUID | **PASS** |
| Profile Provisioning | `on_auth_user_created` trigger | Creates row in `public.profiles` | Profile populated with metadata | **PASS** |
| Settings Provisioning | `on_auth_user_created` trigger | Creates row in `public.user_settings` | Default scale set to `'5.0'` | **PASS** |
| Subscription Provisioning | `on_auth_user_created` trigger | Creates active `'plan_basic'` row | Subscription row created | **PASS** |
| Legal Consent Recording | `supabase.from('consent_records')` | Inserts terms & privacy records | 3 records logged and verified | **PASS** |
| Duplicate Email Detection | `supabase.auth.signUp()` | Rejects already registered email | Prevented duplicate signup | **PASS** |
| Invalid Password Rejection | `supabase.auth.signInWithPassword()` | Rejects wrong password | Rejected: `Invalid login credentials` | **PASS** |
| Valid User Login | `supabase.auth.signInWithPassword()` | Returns valid JWT access token | Access token generated (1152 bytes) | **PASS** |
| Token Refresh | `supabase.auth.refreshSession()` | Renews access token | Token refreshed with new expiry | **PASS** |
| Logout / SignOut | `supabase.auth.signOut()` | Clears active session | Session cleared, getSession returns null | **PASS** |
| Multi-User RLS Isolation | SQL test runner with JWT claims | User A & B data isolated | Zero data leaks across users | **PASS** |
| Anonymous Data Isolation | SQL test runner with anon role | Blocks private data access | All private queries return 0 rows | **PASS** |
| Public Reference Access | SQL test runner with anon role | Allows reference data reads | Grading scales & plans accessible | **PASS** |
| API Supabase JWT Bridge | `server/api.js` `getAuthenticatedUser` | Authorizes Supabase token | User authorized & bridged in PGlite | **PASS** |

---

## 10. Remaining Migration Roadmap (Upcoming Phases)

* **Phase 2 — Academic & CGPA Engine Migration:**
  * Migrate CGPA calculation and course data endpoints from PGlite to Supabase Database (direct Supabase Client / RPC).
  * Migrate Semesters and Student Courses tables to live Supabase PostgreSQL.
* **Phase 3 — Study Planner & Logs Migration:**
  * Migrate Study Plans, Topics, and Study Logs from PGlite to Supabase PostgreSQL.
  * Connect realtime syllabus progress updates.
* **Phase 4 — Billing, Subscriptions & Paystack:**
  * Implement Paystack Edge Functions (checkout initialization, verification, webhooks).
  * Migrate Subscription Plans and Entitlements enforcement to Supabase.
* **Phase 5 — ZEGOCLOUD Video & AI Tutoring Edge Functions:**
  * Migrate ZEGOCLOUD token generation to a secure Supabase Edge Function.
  * Migrate AI tutor requests to Supabase Edge Functions.
* **Phase 6 — Final Cleanup & Decommissioning:**
  * Remove `@electric-sql/pglite` and delete `data/academic-platform.db`.
  * Remove `firebase` package and legacy Firebase files.
  * Remove legacy authentication endpoints from `server/api.js`.
