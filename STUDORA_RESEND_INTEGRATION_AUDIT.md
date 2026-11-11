# STUDORA — RESEND INTEGRATION AUDIT

## 1. EXECUTIVE SUMMARY

Studora's notification and communication infrastructure has been formally integrated with **Resend** as the centralized, server-side email delivery engine. The architecture enforces separation of concerns:
- **Resend** delivers transactional emails, welcome sequences, booking confirmations, administrative notices, and bulk announcements.
- **Supabase Auth** serves as canonical identity provider for authentication, recovery session tokens, and custom SMTP delivery via Resend.
- **Studora Server** manages role verification, recipient targeting, deduplication, promotional opt-in/opt-out status, and event audit logging.

---

## 2. REPOSITORY & ARCHITECTURE AUDIT

| Component | Path / Reference | State | Verification Notes |
| :--- | :--- | :--- | :--- |
| **Node.js API Server** | `server/index.js`, `server/api.js` | Active | Handles `/api/auth/register`, `/api/admin/campaigns`, and `/api/email/*` endpoints. |
| **Database Persistence** | `server/db.js`, `supabase/migrations/` | Active | Integrated PostgreSQL tables for preferences, suppressions, campaigns, and delivery logs. |
| **Admin Console** | `admin/src/` | Active | React SPA with `AdminGuard` role protection; new `CampaignsPage.jsx` integrated. |
| **Client Application** | `src/` | Active | React SPA consuming API endpoints with zero exposure of server secrets. |

---

## 3. RESEND SDK & SERVER CONFIGURATION

The official `resend` SDK has been installed in the server environment.

### Environment Variable Standards:
```bash
# Server-only (NEVER expose to frontend or git)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Studora <notifications@studora.app>
RESEND_REPLY_TO=support@studora.app
APP_URL=https://studora.app
```

### Security Boundary:
- `RESEND_API_KEY` is loaded strictly inside `server/email-service.js`.
- Neither Vite config nor client bundles package or expose Resend credentials.

---

## 4. SUPABASE CUSTOM SMTP INTEGRATION

To route Supabase Auth confirmation and password reset emails through Resend:

1. In Supabase Dashboard -> **Authentication** -> **SMTP Settings**:
   - **Sender email**: `notifications@studora.app`
   - **Sender name**: `Studora`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **User**: `resend`
   - **Password**: `<RESEND_API_KEY>`
2. Password recovery links continue to follow Studora's secure redirect destination `/profile` / `/auth`.

---

## 5. DATABASE SCHEMA & DATA PROTECTION

Migration `20261111200000_studora_resend_email_infrastructure.sql` provisions:
1. `user_email_preferences`: Stores `promotional_opt_in`, `booking_notifications_opt_in`, and unique `unsubscribe_token`.
2. `email_suppressions`: Enforces blocking for bounces, spam complaints, and manual exclusions.
3. `email_campaigns`: Stores campaign drafts, audience targeting, delivery counters, and scheduling.
4. `email_logs`: Audit trail linking `resend_message_id`, template type, recipient, delivery status, and timestamps.
5. **Row Level Security**: Non-admin users cannot query or tamper with campaign data or other users' preferences.
