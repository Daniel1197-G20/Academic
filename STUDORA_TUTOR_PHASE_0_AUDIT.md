# STUDORA — PHASE 0 ARCHITECTURAL AUDIT REPORT
**Product Identity:** Studora ("Study smarter. Go further.")  
**System:** Student Tutor Marketplace + Tutor Application + Admin Platform  
**Date:** October 2, 2026  
**Status:** AUDIT COMPLETED & GATED  

---

## 1. Executive Summary

This audit assesses the existing Studora codebase across client architecture, Supabase integration, PostgreSQL database schema, authorization and RLS policies, routing, server APIs, and UI component libraries prior to implementing the new **Student Tutor Marketplace, Tutor Application & Onboarding, Question Bank & Assessment Engine, and Admin Dashboard Platform**.

---

## 2. Existing Architecture & Tech Stack

```text
React 18 + Vite 6
      │
      ├── UI / Frontend Layer (Tailwind CSS, Lucide icons, Tactile/Neumorphic Design System)
      ├── Supabase Client (@supabase/supabase-js v2.117.2, persistent session, URL auth)
      │       ├── PostgreSQL 17 Database (Remote: ermkkjkkxlqjrgpinrjt, eu-west-1)
      │       ├── Supabase Auth (authoritative user identities & JWTs)
      │       ├── Row Level Security (RLS) policies on all tables
      │       └── PostgreSQL Triggers & Stored Functions (Role protection, user provisioning)
      ├── Local Dev / Serverless Bridge (PGlite PostgreSQL WASM, Node.js HTTP API, Vercel /api rewrite)
      └── ZEGOCLOUD Video Integration (@zegocloud/zego-uikit-prebuilt v2.18.4)
```

### Build & Test Baseline
* **Vite Build (`npm run build`):** Tested and passes with zero errors (built in ~16.6s).
* **Test Suite (`node server/test-suite.js`):** Tested and passes 101/101 automated test cases spanning auth, CGPA engine, study planner, RLS isolation, subscription entitlements, Paystack billing, and webhooks.
* **Git Status:** Clean on branch `origin/main`.

---

## 3. Existing Database Tables & Schema

### PostgreSQL Remote Migrations
1. `20261001000000_studora_core_schema.sql` (Phase 1 core schema):
   - `profiles`: Student profile records (`id UUID PRIMARY KEY REFERENCES auth.users(id)`).
   - `user_settings`: Academic scale selection (`5.0`, `4.0`, etc.).
   - `grading_scales`: Academic scale definitions.
   - `semesters`: Academic terms & sessions.
   - `student_courses`: Enrolled courses, credit units, grades.
   - `study_plans`: Student study plans & targets.
   - `study_topics`: Checklist topics within study plans.
   - `study_logs`: Time-tracking sessions.
   - `consent_records`: Legal compliance (GDPR/NDPR consent).
   - `subscription_plans`: Billing catalog (Basic, Student, Pro, Premium).
   - `feature_definitions`: System feature catalog (`AI_TUTOR`, `TUTOR_MARKETPLACE`, `TUTOR_BOOKING`, `VIDEO_TUTORING`, etc.).
   - `plan_entitlements`: Quotas and feature flags per plan.
   - `user_subscriptions`: Active subscription records.
   - `payment_transactions`: Paystack transactions.
   - `payment_webhook_events`: Idempotent webhook logs.
   - `subscription_usage`: Monthly usage counters per feature.

2. `20261001010000_studora_auth_roles_and_tutoring.sql`:
   - `profiles.role`: Added `role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'admin'))`.
   - `protect_profile_role()`: PostgreSQL trigger preventing client-side role elevation.
   - `is_admin(user_id)` and `is_tutor(user_id)`: PostgreSQL `SECURITY DEFINER` helper functions.
   - `tutor_profiles`: Initial table (`id UUID REFERENCES profiles(id)`, `title`, `hourly_rate`, `subjects JSONB`, `bio`, `rating`, `review_count`, `is_verified`).
   - `tutor_availability`: Weekly slots (`id TEXT`, `tutor_id UUID`, `day_of_week`, `start_time`, `end_time`, `is_active`).
   - `tutor_bookings`: Bookings table (`id TEXT`, `student_id UUID`, `tutor_id UUID`, `subject`, `slot_time`, `status`, `notes`).
   - `tutoring_sessions`: Live sessions (`id TEXT`, `booking_id TEXT`, `student_id`, `tutor_id`, `room_id`, `zego_room_id`, `status`).

---

## 4. Existing Authentication Flow & Roles

1. **Authentication Source of Truth:** Supabase Auth (`supabase.auth`).
   - Sign up calls `supabase.auth.signUp(...)`.
   - Sign in calls `supabase.auth.signInWithPassword(...)`.
   - Sessions are persistent in `localStorage` and monitored via `supabase.auth.onAuthStateChange(...)`.
   - Trigger `on_auth_user_created` calls `handle_new_user()`, which provisions a default `profiles` row with `role = 'student'` and initial active Basic subscription.

2. **Role Model:**
   - Default role is strictly `'student'`.
   - Roles permitted: `'student'`, `'tutor'`, `'admin'`.
   - Client queries are explicitly prevented by `trg_protect_profile_role` from updating the `role` column. Only admins or server-side security definers can elevate roles.
   - **Crucial Rule:** Students must NEVER be registered as tutors directly. A student must complete onboarding and assessment, and wait for manual administrator approval.

---

## 5. Existing Tutor, Booking & ZEGOCLOUD Implementations

### Frontend
- **Landing Page (`src/pages/landing/LandingPage.jsx`):**
  - Section 9 currently has badge: `"Verified University Directory"`.
  - Header: `"When you need a human perspective."`
  - Hardcoded demo tutors array with mock ratings.
  - CTA button: `"Find a Tutor"`.
- **Student Dashboard / App (`src/App.jsx`):**
  - Active tab `'tutors'` currently shows 2 hardcoded cards (Dr. Elena Rostova, Marcus Chen) with badge `"Verified University Directory"`.
  - Button calls `/api/tutors/book`.
  - Gated with `FeatureGate` checking entitlement `TUTOR_BOOKING`.
- **Navigation (`Sidebar.jsx`, `BottomNav.jsx`):**
  - Sidebar has a single `'tutors'` item labeled `"Tutors"`.
  - BottomNav has an item `'tutors'` labeled `"Tutors"`.
  - No `"Become a Tutor"` option exists currently in the sidebar or mobile nav.
- **ZEGOCLOUD (`server/zego.js`, `server/api.js`, `src/App.jsx`):**
  - Generates token via `/api/video/token` using `generatePrebuiltToken(appId, serverSecret, roomID, userId, userName)`.
  - ServerSecret is kept exclusively on the server (`server/zego.js`) and never exposed to the frontend.

---

## 6. Existing Admin Functionality

- Currently, there is **NO** admin dashboard UI (`/admin` does not exist in routes).
- Admin helper functions exist in SQL (`public.is_admin(user_id)`) and RLS grants admin full access to catalog tables (`subscription_plans`, `plan_entitlements`, `profiles`).
- A dedicated, secure Admin Control Center must be built from the ground up for tutor application reviews, question bank moderation, user management, and platform metrics.

---

## 7. Reusable Components & Design System

The application uses an established design system documented in `DESIGN.md`:
* **Colors:** Ink (`#111827`, `#0B0F17`), Deep Navy (`#0F172A`), Academic Green (`#176B4D`, `#1B835E`), Light Green (`#ECFDF5`), Gold (`#D97706`, `#FEF3C7`), White/Canvas (`#F8FAFC`).
* **Typography:** Manrope (body/UI), DM Serif Display (headings), JetBrains Mono (metrics, codes).
* **Components in `src/components/ui/`:**
  - `Card`, `Button`, `Badge`, `Input`, `Avatar`, `Stat`, `ProgressBar`, `Modal`, `TactileCheckbox`, `Tabs`, `Toast`, `EmptyState`, `PageHeader`, `AnimatedNumber`.
* **Navigation in `src/components/navigation/`:**
  - `Sidebar`, `TopHeader`, `BottomNav`.

---

## 8. Conflicts & Gaps Identified

1. **Landing Page & Marketplace Terminology:**
   - Wording currently refers to *"Verified University Directory"* and implies university affiliation.
   - Must be changed to **Studora Tutor Network**, heading **Find a Tutor**, and explicit peer-student messaging.
2. **Missing Database Entities:**
   - Need proper `subjects` and `topics` relational tables.
   - Need `tutor_applications` table with state machine (`draft`, `submitted`, `assessment_pending`, `assessment_in_progress`, `assessment_failed`, `assessment_passed`, `pending_review`, `approved`, `rejected`, `suspended`, `withdrawn`).
   - Need `tutor_subjects` junction table.
   - Need `question_bank` with categories, difficulty, options, correct answers, and explanations.
   - Need `assessment_configs`, `assessment_attempts`, and `assessment_answers` tables.
   - Need `admin_audit_logs` table.
3. **Assessment Security:**
   - Frontend must never receive correct answers.
   - Scoring must be performed server-side/database-side via a `SECURITY DEFINER` RPC (`submit_tutor_assessment`).
4. **Marketplace Filtering:**
   - Marketplace must query and display ONLY approved, active, visible tutors.
5. **Role Gating:**
   - Normal students must not access `/admin` or approve themselves. Database RLS and server checks must enforce this.

---

## 9. Recommended Implementation Plan & Order

1. **Phase 1 — Database & Authorization Foundation:**
   - Create migration adding `subjects`, `topics`, `tutor_applications`, `tutor_subjects`, `question_bank`, `assessment_configs`, `assessment_attempts`, `assessment_answers`, `admin_audit_logs`, and updating `tutor_profiles`.
   - Define PostgreSQL functions for state transitions (`start_tutor_assessment`, `submit_tutor_assessment`, `admin_review_tutor_application`, `admin_set_tutor_suspension`).
   - Configure RLS policies for students, applicants, approved tutors, and admins.
   - Seed standard subjects, topics, and question bank questions.
   - Synchronize with local server/PGlite in `server/db.js`.
2. **Phase 2 — Tutor Application & Onboarding:**
   - Add `"Become a Tutor"` to student sidebar and mobile profile/navigation.
   - Build 7-step onboarding wizard with draft persistence.
3. **Phase 3 — Question Bank & Assessment Engine:**
   - Secure assessment UI with question navigation, timer, answer selection, confirmation modal, and server-side RPC scoring.
   - Results screen for Pass (`pending_review`) and Fail with retry policy.
4. **Phase 4 & 5 — Admin Dashboard & Application Review:**
   - Build `/admin` control center with Overview metrics, Tutor Applications list, Application Review page with Approve/Reject/Notes/Reason, and Audit trail.
5. **Phase 6 — Tutor Profile & Tutor Dashboard:**
   - Build `/tutor-dashboard` accessible only to approved tutors.
6. **Phase 7 & 8 — Tutor Marketplace & Booking Integration:**
   - Update Landing Page copy and dynamic approved tutor cards.
   - Update Marketplace in-app tab to load real approved tutors.
7. **Phase 9-16 — Admin Tools, Mobile & Visual Polish, Comprehensive Security & Regression Testing.**

---

## 10. Gate Verification

- [x] Codebase audited
- [x] Schema & migrations reviewed
- [x] Auth & role model verified
- [x] Baseline build tested (`npm run build` PASS)
- [x] Baseline test suite executed (101/101 PASS)
- [x] Phase 0 Report generated: `STUDORA_TUTOR_PHASE_0_AUDIT.md`

**Status:** GATE CLEARED. Proceeding to **PHASE 1 — DATABASE & AUTHORIZATION FOUNDATION**.
