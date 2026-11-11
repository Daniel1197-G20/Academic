# STUDORA — EMAIL CAMPAIGN SECURITY AUDIT

## 1. ADMINISTRATIVE AUTHORIZATION CONTROLS

### Backend Role Enforcement:
Every campaign creation, test dispatch, and recipient resolution endpoint enforces strict server-side authorization:
```javascript
const authUser = await getAuthenticatedUser(req);
if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'ADMIN')) {
  return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' });
}
```
Client-side UI suppression in the Admin panel is supplemented by cryptographic token inspection (`Bearer <JWT>` or signed session cookies).

---

## 2. RECIPIENT RESOLUTION & PRIVACY PROTECTION

1. **Trusted Database Queries**:
   - Audience lists are constructed strictly by executing parameterized SQL queries against active users in the database (`server/email-service.js`).
   - The frontend never submits arbitrary or uncontrolled lists of email addresses.
2. **Deduplication**:
   - `resolveCampaignAudience()` uses a `Set<string>` normalization step (`LOWER(email).trim()`) guaranteeing that duplicate email addresses are eliminated before batching.
3. **Suppression Enforcement**:
   - Every recipient is evaluated against `email_suppressions`. Bounced, complained, or blocked addresses are omitted automatically.
4. **Data Minimization**:
   - Email logs omit sensitive payload data, recording only `recipient_email`, `template_type`, `resend_message_id`, and delivery outcomes.

---

## 3. PROMOTIONAL CONSENT & CAN-SPAM COMPLIANCE

1. **Unsubscribe Infrastructure**:
   - Every promotional email includes an automated unsubscribe footer referencing a cryptographic token (`/api/email/unsubscribe?token=<token>`).
   - Clicking unsubscribe sets `promotional_opt_in = false` persistently in `user_email_preferences`.
2. **Urgent Operational Safeguards**:
   - The UI and backend classify campaigns as `promotional`, `general_announcement`, or `operational_urgent`.
   - `operational_urgent` requires explicit administrator checkbox certification in the UI.
   - Promotional emails strictly respect `promotional_opt_in = false`.

---

## 4. BULK DELIVERY & RATE LIMITING

- Campaigns deliver recipients in batches of 10 with a mandatory 500ms delay between batches.
- Transient API rejections or network failures log individual errors without terminating the entire queue.
- Duplicate sends on retries are guarded by campaign state (`status = 'sending' | 'completed'`).
