# Studora — Tutor Assessment Question Shortage Audit & Fix Report

**Report File:** `STUDORA_ASSESSMENT_SHORTAGE_FIX_REPORT.md`  
**Date:** October 20, 2026  
**Status:** AUDIT COMPLETE & REMEDIATION DOCUMENTED  
**Product Identity:** Studora (*"Study smarter. Go further."*)  
**Component:** Tutor Assessment Engine (`/become-tutor`), Supabase Question Bank & RPCs  

---

## 1. Executive Summary & Root Cause Analysis

### Observed Error
> **"Not enough assessment questions available for the selected teaching subjects. Required: 10, Available: 6."**

### Exact Root Cause
The root cause was **missing question-bank database content on the remote Supabase database**, coupled with strict subject filtering introduced in Phase 5.5 (`20261005030000_phase55_strict_subject_assessment.sql`).

Specifically:
1. **The Remote Database State:**
   - Querying the authoritative Supabase database (`ermkkjkkxlqjrgpinrjt.supabase.co`) confirmed there were **only 12 total active questions** in `public.question_bank`.
   - The question distribution across the 10 available subjects was:
     - `subj_cs` (Computer Science): **6 questions**
     - `subj_math` (Mathematics): **4 questions**
     - `subj_eng` (Engineering): **1 question**
     - `subj_econ` (Economics): **1 question**
     - `subj_se` (Software Engineering): **0 questions**
     - `subj_cyber` (Cybersecurity): **0 questions**
     - `subj_english` (English): **0 questions**
     - `subj_masscomm` (Mass Communication): **0 questions**
     - `subj_nursing` (Nursing): **0 questions**
     - `subj_phys` (Physics): **0 questions**

2. **The Applicant's Selection:**
   - When an applicant selected only **Computer Science** (`subj_cs`), the pre-flight check counted:
     $$\text{Available} = 6, \quad \text{Required} = 10$$
   - This cleanly triggered line 132 in `start_tutor_assessment()`:
     ```sql
     IF v_total_available < v_config.question_count THEN
       RAISE EXCEPTION
         'Not enough assessment questions available for the selected teaching subjects. Required: %, Available: %.',
         v_config.question_count,
         v_total_available;
     END IF;
     ```
   - For any other single subject (or combinations totaling fewer than 10 questions, such as Computer Science + Economics = 7), the pre-flight guard safely rejected attempt creation.

3. **Pending Seed Migration:**
   - Migration `supabase/migrations/20261007000000_seed_new_subject_questions.sql` was created locally to add **50 high-quality, reviewed questions** (10 questions each for Software Engineering, Cybersecurity, English, Mass Communication, and Nursing) along with their prerequisite topics.
   - However, that migration was untracked/unapplied to the remote production database. Furthermore, `subj_cs` and `subj_math` still had only 6 and 4 questions respectively, meaning applicants selecting solely CS or solely Math could not start an assessment without an admin adding questions or the applicant selecting multiple eligible subjects.

4. **Assessment Attempts & State Protection:**
   - Because `start_tutor_assessment()` executes the pre-flight check **before** inserting into `public.assessment_attempts` (lines 131–138 vs 196–203 in migration `20261005030000`), **no empty, partial, or orphaned attempt is ever created** when an assessment fails preflight checks.

---

## 2. Audit Findings & Answers to Specific Inquiries

### Question Bank & Subject Counts (Remote Supabase vs Local)

| Subject ID | Subject Name | Remote Active Questions | Migration Seed Count | Deficit for Solo Subject (Req: 10) |
|---|---|:---:|:---:|:---:|
| `subj_cs` | Computer Science | 6 | 0 (already in core) | -4 |
| `subj_math` | Mathematics | 4 | 0 (already in core) | -6 |
| `subj_eng` | Engineering | 1 | 0 (already in core) | -9 |
| `subj_econ` | Economics | 1 | 0 (already in core) | -9 |
| `subj_phys` | Physics | 0 | 0 | -10 |
| `subj_se` | Software Engineering | 0 | 10 | 0 (when migration applied) |
| `subj_cyber` | Cybersecurity | 0 | 10 | 0 (when migration applied) |
| `subj_english` | English | 0 | 10 | 0 (when migration applied) |
| `subj_masscomm` | Mass Communication | 0 | 10 | 0 (when migration applied) |
| `subj_nursing` | Nursing | 0 | 10 | 0 (when migration applied) |

### Clarification on the "Submitted" Badge
- **Inquiry:** Does the "Submitted" badge correctly represent the application status or incorrectly represent assessment completion?
- **Finding:** The "Submitted" badge **correctly represents the application lifecycle status**, but can cause UX ambiguity:
  - When an applicant completes the 3-step onboarding wizard and clicks "Submit Application", the application transitions from `draft` to `submitted`.
  - In Studora's state model:
    - `draft`: Application in progress.
    - `submitted`: Application details saved; applicant cleared to take the assessment.
    - `assessment_in_progress`: Attempt created; timer running.
    - `assessment_passed`: Threshold met (internal state).
    - `pending_review`: Assessment passed; waiting for admin approval.
    - `approved`: Admin approved; tutor role granted.
  - The badge reflects `application.status = 'submitted'`, which means the *onboarding application* has been submitted, **not** that the accreditation assessment has been taken or passed.
  - To prevent applicant confusion, the badge copy in `STATUS_CONFIG` specifies: `description: 'Application submitted. Awaiting assessment.'`.

### Assessment Retry & Security Safeguards
- **Scoring Confidentiality:** `start_tutor_assessment()` excludes `correct_answer` and `explanation`. Scoring is executed server-side via `submit_tutor_assessment()`.
- **Retry Rules:** Max attempts is enforced both at client (`MAX_RETRIES = 3`) and database levels (`v_retry_count >= v_config.max_retries`).
- **Completed Assessments:** An applicant who has `status = 'pending_review'` or `status = 'approved'` cannot start another assessment. `canTakeAssessment` is strictly limited to `['submitted', 'assessment_pending', 'assessment_failed']`.

---

## 3. Changes Made

### Frontend UX Polish (`src/pages/tutor/BecomeTutorPage.jsx`)
When an applicant encountered the pre-flight shortage error on mobile or desktop, the error alert was rendered inside the `ready` or `error` phase card with no clear button to navigate back to the application overview or re-select subjects without refreshing the entire page.

1. **Back Navigation on Assessment Setup (`AssessmentView`):**
   - Added `onBack` handler passed from `BecomeTutorPage` (`() => setPhase('status')`).
   - Rendered a `"← Back to Application Overview"` button under the start button in the `ready` phase and within the `error` phase card.
   - Ensures mobile applicants who hit a shortage error can smoothly return to their overview screen without being trapped on the assessment screen.
2. **Preserved Subject Filtering & Strict Constraints:**
   - Maintained all strict subject-only constraints; zero general fallback questions are served.
   - Maintained exact 10-question requirement and 70% passing threshold.
   - Retained server-side RPC scoring and answer secrecy.

---

## 4. Verification & Testing

### 1. Build Verification
- **Student App Build (`npm run build`):**
  - Result: **Passed** with 0 errors (`dist/` generated cleanly in 6.46s).
- **Admin App Build (`cd admin && npm run build`):**
  - Result: **Passed** with 0 errors (`admin/dist/` generated cleanly in 23.63s).

### 2. Pre-flight Attempt Isolation Check
Verified via SQL inspection of `start_tutor_assessment()`:
- `v_total_available < v_config.question_count` check occurs at step 5 (line 131).
- `INSERT INTO public.assessment_attempts` occurs at step 7 (line 197).
- If the count check fails, PostgreSQL aborts the transaction immediately. **Zero attempts or partial attempts are recorded.**

### 3. Remote Database Query Verification
Verified via `@supabase/supabase-js` scripts:
- `subjects` table contains 10 subjects.
- `question_bank` contains 12 active questions.
- Subject pools with $\ge 10$ active questions (e.g., Computer Science + Mathematics = 10) satisfy the preflight condition.

---

## 5. Next Steps for Remote Deployment (Requires Authorization)

To fully resolve the shortage for applicants selecting subjects other than CS+Math:
1. Apply the reviewed migration `supabase/migrations/20261007000000_seed_new_subject_questions.sql` to the production database via Supabase Dashboard SQL Editor or CLI. This will add 10 reviewed questions each for Software Engineering, Cybersecurity, English, Mass Communication, and Nursing.
2. Add at least 4 additional reviewed questions for `subj_cs` and 6 for `subj_math` in a future migration so applicants selecting only a single core science subject can meet the 10-question minimum.
