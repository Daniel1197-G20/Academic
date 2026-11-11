# STUDORA — EMAIL SECURITY VERIFICATION REPORT

**Date:** November 11, 2026  
**Auditor:** Application Security & Compliance Audit  
**Target:** Studora Email Subsystem (`server/email-service.js`, `server/api.js`, `supabase/migrations/`)  
**Security Status:** **CONDITIONALLY SECURE (CRITICAL WEBHOOK ACTION ITEM REQUIRED)**

---

## 1. CRYPTOGRAPHIC BOUNDARIES & SECRET MANAGEMENT

| Asset / Parameter | Security Control | Verification Result | Classification |
| :--- | :--- | :--- | :--- |
| **Resend API Key** | `process.env.RESEND_API_KEY` | Zero references found in frontend bundles (`src/`, `admin/src/`). Strictly executed in Node.js backend. | **PASS** |
| **Unsubscribe Tokens** | `crypto.randomBytes(24).toString('hex')` | High-entropy (192-bit) cryptographically unguessable token per user. Prevents ID enumeration attacks. | **PASS** |
| **Session & Auth Tokens** | HMAC SHA-256 / Ed25519 Bearer tokens | Administrator endpoints enforce signature verification before processing campaign actions. | **PASS** |
| **Webhook Signature Verification** | Inbound HTTP header verification | `/api/email/webhook/resend` currently does not verify `svix-signature` with `RESEND_WEBHOOK_SECRET`. | **FAIL** |
| **Template XSS Sanitization** | `escapeHtml()` regex substitution | Replaces `&`, `<`, `>`, `"`, `'` on all user-interpolated variables across email templates. | **PASS** |

---

## 2. ROW LEVEL SECURITY (RLS) POLICIES AUDIT

The database schema defined in `supabase/migrations/20261111200000_studora_resend_email_infrastructure.sql` incorporates explicit RLS policies:

### Policy Breakdown

```sql
-- 1. user_email_preferences
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON public.user_email_preferences FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own email preferences"
  ON public.user_email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user email preferences"
  ON public.user_email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 2. email_suppressions
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to email suppressions"
  ON public.email_suppressions FOR ALL
  USING (public.is_admin(auth.uid()));

-- 3. email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to email campaigns"
  ON public.email_campaigns FOR ALL
  USING (public.is_admin(auth.uid()));

-- 4. email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to email logs"
  ON public.email_logs FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own email log summary"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = recipient_user_id);
```

### RLS Verification Notes
- **Isolation:** Regular authenticated users cannot access or view campaigns, suppressions, or other users' logs.
- **Admin Function:** Relies on `public.is_admin(auth.uid())` which checks `users.role IN ('admin', 'ADMIN')`.
- **Status:** **PASS** (Design & SQL implementation verified; requires deployment to remote database).

---

## 3. AUDIT OF API ACCESS CONTROLS & AUTHORIZATION

Every administrative email endpoint in [server/api.js](file:///home/aziel/Desktop/Academic-platform/server/api.js#L1912-L2115) enforces strict server-side checks:

```javascript
const authUser = await getAuthenticatedUser(req);
if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'ADMIN')) {
  return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' });
}
```

- Unauthorized requests with missing, invalid, expired, or non-admin tokens receive an immediate `403 Forbidden` response.
- Protected endpoints:
  - `GET /api/admin/campaigns`
  - `POST /api/admin/campaigns`
  - `POST /api/admin/campaigns/:id/send`
  - `POST /api/admin/campaigns/test`
  - `POST /api/admin/tutor-applications/notify`

---

## 4. ANTI-SPAM & COMPLIANCE VERIFICATION

1. **CAN-SPAM & GDPR Opt-Out Compliance:**
   - Every promotional email includes an explicit unsubscribe link (`/api/email/unsubscribe?token=<token>`).
   - Clicking the link triggers an atomic DB update setting `promotional_opt_in = false` and recording `unsubscribed_at`.
   - `resolveCampaignAudience()` permanently honors this flag and strips the user from future promotional campaigns.
2. **Operational Safeguards:**
   - Administrative broadcasts classified as `operational_urgent` bypass promotional unsubscribe filters only for critical service interruptions, terms updates, or security advisories.
   - The Admin UI requires an explicit affirmation checkbox confirming the notice is non-promotional before the broadcast can be created.
3. **Suppression Enforcement:**
   - Hard bounces and spam complaints trigger automatic population of `email_suppressions`.
   - `sendEmail()` inspects `email_suppressions` before making any external API request. Suppressed addresses are dropped immediately and logged with `status: 'failed', errorMessage: 'Recipient address suppressed'`.

---

## 5. VULNERABILITY ANALYSIS & REMEDIATION (CRITICAL FINDING)

### Issue: Unsigned Webhook Payload Ingestion (FAIL)
- **Location:** [server/api.js:1916](file:///home/aziel/Desktop/Academic-platform/server/api.js#L1916)
- **Risk:** Without cryptographic signature validation, an adversary who discovers the webhook URL could post fake `email.bounced` or `email.complained` events for targeted email addresses. This would insert them into `email_suppressions`, performing a Denial-of-Service (DoS) on legitimate users receiving platform emails.
- **Remediation Specification:**
  Install `svix` and verify the incoming request headers before delegating to `processResendWebhook`:
  ```bash
  npm install svix
  ```
  ```javascript
  import { Webhook } from 'svix';

  // In /api/email/webhook/resend handler:
  const payload = await getRawBody(req);
  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature']
  };

  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
  try {
    const verifiedEvent = wh.verify(payload, headers);
    await processResendWebhook(verifiedEvent);
    return sendJson(res, 200, { received: true });
  } catch (err) {
    return sendJson(res, 401, { error: 'Invalid webhook signature.' });
  }
  ```

---

## 6. SECURITY VERDICT

**Status: NO-GO FOR PRODUCTION LAUNCH** until:
1. Webhook signature verification is deployed using `svix` and `RESEND_WEBHOOK_SECRET`.
2. Supabase migration is applied to the production database instance.
3. Production API keys are stored in secure environment secrets management (e.g. Vercel environment variables or encrypted secrets).
