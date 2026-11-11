# STUDORA — RESEND PRODUCTION READINESS AUDIT

**Audit Date:** November 11, 2026  
**Auditor:** Independent Production Readiness & Security Reviewer  
**Target Repository:** Studora Academic Platform (`main` branch @ `229eee8`)  
**Scope:** Resend Email Integration, Supabase Auth SMTP, Email Campaigns, Webhooks, Delivery Security & RLS  

---

## 1. EXECUTIVE SUMMARY & VERDICT

### Production Recommendation: **NO-GO (BLOCKED PENDING LIVE CREDENTIALS & DOMAIN VERIFICATION)**

The programmatic architecture, template systems, database schemas, and security bounds for Resend email communications are **fully implemented in code**. However, an independent audit of the active runtime and hosting configuration reveals that **live production delivery is not operational**:
1. **Provider Credentials Missing**: Neither `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, nor `RESEND_WEBHOOK_SECRET` are configured in `.env` or production secrets. The application operates in development mock simulator mode.
2. **Domain & DNS Unverified**: No verified DNS records (SPF, DKIM, DMARC, MX) exist for `studora.app` or `notifications@studora.app` on Resend.
3. **Remote Supabase Migrations Not Executed**: The migration `20261111200000_studora_resend_email_infrastructure.sql` exists locally in code and runs in local PGlite, but has not been applied to the production Supabase instance (`ermkkjkkxlqjrgpinrjt.supabase.co`).
4. **Supabase Auth Custom SMTP Not Configured**: Supabase Auth continues to use standard default email rate-limited services; Resend SMTP credentials (`smtp.resend.com:465`) have not been set up.
5. **Webhook Cryptographic Verification Incomplete**: `/api/email/webhook/resend` parses incoming JSON payloads without verifying `svix-signature` / HMAC signatures against `RESEND_WEBHOOK_SECRET`.

---

## 2. PRODUCTION READINESS VERIFICATION MATRIX

| # | Audit Item | Implementation in Code | Live Production Configuration | Status Classification | Key Findings & Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Production Supabase migration status & tables | Complete in SQL file and server init | Not applied to remote Supabase DB | **PASS (CODE) / NOT CONFIGURED (REMOTE DB)** | `20261111200000_studora_resend_email_infrastructure.sql` creates `user_email_preferences`, `email_suppressions`, `email_campaigns`, and `email_logs`. Requires migration approval before execution on remote DB. |
| **2** | RLS policies & administrator authorization | Complete in migration & `api.js` | Enforced at code & API boundary | **PASS** | RLS declared on all 4 tables. `/api/admin/*` endpoints strictly enforce session JWT parsing and require `role === 'admin' \|\| role === 'ADMIN'`. |
| **3** | Resend domain verification & sender configuration | Configured via env defaults in code | Unverified domain & missing DNS | **NOT CONFIGURED** | Default sender set to `Studora <notifications@studora.app>`. Domain is unverified on Resend dashboard; DNS SPF/DKIM TXT records are absent. |
| **4** | Server-side API key protection | Isolated in `server/email-service.js` | Key not exposed to browser bundle | **PASS** | `RESEND_API_KEY` is loaded strictly on the Node.js backend. Zero leakage detected in `src/` or `admin/src/` frontend bundles. |
| **5** | Supabase Auth custom SMTP configuration | Delegated to Supabase Auth client | Not configured in dashboard | **NOT CONFIGURED** | Supabase Auth handles email verification and password resets (`resetPasswordForEmail`). Requires SMTP configuration (`smtp.resend.com`, port 465, user: `resend`). |
| **6** | Real welcome, verification & password-reset delivery | Simulated via mock harness | Provider delivery inactive | **BLOCKED** | Transactional templates generate valid HTML/text and log mock IDs (`mock_<hex>`). Actual delivery cannot reach real inboxes without an active API key. |
| **7** | Transactional email delivery | Registered in registration & booking hooks | Provider delivery inactive | **PASS (CODE) / BLOCKED (LIVE)** | Student welcome, tutor welcome, admin onboarding, application approval/rejection, and booking confirmations are asynchronously dispatched without blocking HTTP responses. |
| **8** | Promotional unsubscribe enforcement | Implemented in audience query & preferences | Fully operational in logic | **PASS** | Unsubscribe tokens are generated with 192 bits of entropy (`crypto.randomBytes(24)`). `resolveCampaignAudience` strictly excludes users where `promotional_opt_in === false`. |
| **9** | Urgent operational email safeguards | Implemented in Admin UI & backend schema | Guarded against spam classification | **PASS** | `operational_urgent` campaigns bypass promotional opt-outs but require mandatory admin confirmation checkbox and exclude marketing elements. |
| **10**| Bounce & complaint suppression | Implemented in webhook & suppression ledger | Automatic insertion on events | **PASS** | Webhook events `email.bounced` and `email.complained` insert rows into `email_suppressions`. `sendEmail()` drops suppressed addresses upfront. |
| **11**| Webhook signature verification & idempotency | Endpoint exists at `/api/email/webhook/resend` | Missing Svix cryptographic verification | **FAIL** | Webhook updates logs and suppression by `resend_message_id`, but lacks `svix` HMAC signature check, allowing potential spoofing if publicly reachable. |
| **12**| Campaign persistence & retry safety | State machine in `email_campaigns` | Atomic status transitions enforced | **PASS** | Campaigns transition `draft` -> `sending` -> `completed`. Any campaign already in `sending` or `completed` rejects duplicate triggers. |
| **13**| Duplicate recipient & duplicate email prevention | Normalized Set deduplication | Deduplicates prior to dispatch | **PASS** | `resolveCampaignAudience` sanitizes email strings (`toLowerCase().trim()`) and tracks uniqueness via `Set<string>`. |
| **14**| Resend rate limits & bulk delivery reliability | Batching of 10 with 500ms sleep | Complies with Resend rate boundaries | **PASS** | Outgoing batches are throttled to prevent exceeding Resend default tier limits (2–10 req/sec). |
| **15**| Campaign access control & audit logs | Full outbox audit ledger in `email_logs` | Protected behind admin session auth | **PASS** | Every email attempt logs recipient, template type, Resend message ID, status, and error message. Admin UI provides live metric tracking. |

---

## 3. DETAILED TECHNICAL FINDINGS

### 3.1. Supabase Schema & Row-Level Security
- **Local SQLite/PGlite**: All four tables (`user_email_preferences`, `email_suppressions`, `email_campaigns`, `email_logs`) are created during `initializeDatabase()`.
- **Remote Supabase PostgreSQL**: Schema file `supabase/migrations/20261111200000_studora_resend_email_infrastructure.sql` includes correct RLS policies:
  - `user_email_preferences`: Only owning user and admins can read; only owning user can update.
  - `email_suppressions`: Only administrators can view or mutate.
  - `email_campaigns`: Restricted exclusively to administrators (`public.is_admin(auth.uid())`).
  - `email_logs`: Admins can view all; individual users can only inspect their own recipient logs (`auth.uid() = recipient_user_id`).
- **Trigger**: Automatic preference row provisioning via trigger `trg_new_user_email_preferences` on `auth.users`.

### 3.2. Authorization & Server-Side Security
- All campaign endpoints (`POST /api/admin/campaigns`, `POST /api/admin/campaigns/:id/send`, `POST /api/admin/campaigns/test`, `GET /api/admin/campaigns`) verify session tokens via `getAuthenticatedUser(req)`.
- Rejects non-authenticated or non-admin roles with `403 Forbidden`.

### 3.3. Webhook Security Vulnerability (FAIL)
- File [server/api.js](file:///home/aziel/Desktop/Academic-platform/server/api.js#L1915-L1925) exposes:
  ```javascript
  if (pathname === '/api/email/webhook/resend' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = await processResendWebhook(body);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }
  ```
- **Finding**: Does not check headers `svix-id`, `svix-timestamp`, and `svix-signature`. An unauthorized actor could forge bounce or complaint notifications to suppress arbitrary user emails.

---

## 4. GO / NO-GO PRODUCTION ROADMAP

Before issuing a **GO** for production launch, the following steps must be completed:

1. **DNS & Resend Domain Verification**:
   - Add `studora.app` sending domain in Resend dashboard.
   - Configure DNS records: SPF (`v=spf1 include:amazonses.com ~all` or Resend custom SPF), DKIM (Resend CNAMEs), and DMARC (`v=DMARC1; p=none; ...`).
2. **Environment Variable Configuration**:
   - Set `RESEND_API_KEY=re_live_...`
   - Set `RESEND_FROM_EMAIL=Studora <notifications@studora.app>`
   - Set `RESEND_WEBHOOK_SECRET=whsec_...`
   - Set `APP_URL=https://studora.app`
3. **Apply Remote Migration**:
   - Execute `20261111200000_studora_resend_email_infrastructure.sql` against the production Supabase instance (`ermkkjkkxlqjrgpinrjt.supabase.co`).
4. **Supabase Auth Custom SMTP**:
   - Enable Custom SMTP in Supabase Project Settings -> Auth -> SMTP.
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: `<RESEND_API_KEY>`.
5. **Install Svix & Hardened Webhook Check**:
   - Add `svix` package to verify incoming webhook payloads before processing state mutations.
