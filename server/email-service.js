/**
 * ==============================================================================
 * STUDORA CENTRALIZED RESEND EMAIL SERVICE
 *
 * Responsibilities:
 * - Server-only Resend SDK instantiation (resend)
 * - Safe environment variable credential resolution
 * - Delivery logging with provider message IDs
 * - Idempotency & retry tracking
 * - Unsubscribe token resolution & suppression checking
 * - Bulk audience resolution (students, tutors, all users, admins)
 * - Safe test mode when RESEND_API_KEY is not yet populated
 * ==============================================================================
 */

import { Resend } from 'resend';
import crypto from 'crypto';
import { db } from './db.js';
import {
  templateWelcomeStudent,
  templateWelcomeTutor,
  templateWelcomeAdmin,
  templateTutorApplicationReceived,
  templateTutorApplicationApproved,
  templateTutorApplicationRejected,
  templateBookingConfirmedStudent,
  templateBookingReceivedTutor,
  templateCampaignAnnouncement
} from './email-templates.js';

// Configuration from verified environment
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '';
const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO || 'support@studora.app';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || 'https://studora.app';

// Lazy-initialized Resend client
let resendClient = null;

export function getResendClient() {
  if (!resendClient && RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Check if Resend is fully configured with an active live key
 */
export function isResendConfigured() {
  return Boolean(RESEND_API_KEY.startsWith('re_') && FROM_EMAIL.trim());
}

/** Verify the raw Resend webhook body before processing provider events. */
export function verifyResendWebhook(rawPayload, headers) {
  if (!RESEND_WEBHOOK_SECRET) {
    const error = new Error('Resend webhook verification is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const client = getResendClient();
  if (!client) {
    const error = new Error('Resend API credentials are not configured.');
    error.statusCode = 503;
    throw error;
  }

  return client.webhooks.verify({
    payload: rawPayload,
    headers: {
      id: headers['svix-id'],
      timestamp: headers['svix-timestamp'],
      signature: headers['svix-signature']
    },
    webhookSecret: RESEND_WEBHOOK_SECRET
  });
}

/**
 * Ensure a user has an unsubscribe token and email preferences
 */
export async function getOrCreateEmailPreferences(userId, email = null) {
  if (!userId) return null;
  try {
    const res = await db.query(
      `SELECT * FROM user_email_preferences WHERE user_id = $1;`,
      [userId]
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    const token = crypto.randomBytes(24).toString('hex');
    const insertRes = await db.query(
      `INSERT INTO user_email_preferences (user_id, unsubscribe_token)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [userId, token]
    );
    return insertRes.rows[0] || null;
  } catch (err) {
    console.error('[EmailService] Error resolving email preferences:', err.message);
    return null;
  }
}

/**
 * Check if a recipient email is suppressed (hard bounce, complaint, or manual)
 */
export async function isEmailSuppressed(email) {
  if (!email) return true;
  try {
    const clean = email.toLowerCase().trim();
    const res = await db.query(
      `SELECT 1 FROM email_suppressions WHERE LOWER(email) = $1 LIMIT 1;`,
      [clean]
    );
    return res.rows.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Core primitive to send an email via Resend and record in email_logs
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  templateType = 'transactional',
  campaignId = null,
  recipientUserId = null,
  isPromotional = false,
  replyTo = REPLY_TO_EMAIL
}) {
  const recipientEmail = (to || '').toLowerCase().trim();
  if (!recipientEmail) {
    throw new Error('Recipient email address is required.');
  }

  // 1. Check suppression list
  if (await isEmailSuppressed(recipientEmail)) {
    console.warn(`[EmailService] Skipping send to suppressed address: ${recipientEmail}`);
    await recordEmailLog({
      campaignId,
      recipientEmail,
      recipientUserId,
      templateType,
      subject,
      status: 'failed',
      errorMessage: 'Recipient email address is on the suppression list.'
    });
    return { success: false, suppressed: true, error: 'Recipient address suppressed.' };
  }

  // 2. Check promotional opt-in if this email is a promotional campaign
  if (isPromotional && recipientUserId) {
    const prefs = await getOrCreateEmailPreferences(recipientUserId, recipientEmail);
    if (prefs && prefs.promotional_opt_in === false) {
      console.log(`[EmailService] User ${recipientUserId} has opted out of promotional communications.`);
      await recordEmailLog({
        campaignId,
        recipientEmail,
        recipientUserId,
        templateType,
        subject,
        status: 'failed',
        errorMessage: 'User opted out of promotional communications.'
      });
      return { success: false, optedOut: true, error: 'User unsubscribed from promotions.' };
    }
  }

  // 3. Dispatch through Resend SDK or Test Runner Log
  const client = getResendClient();
  let resendMessageId = null;
  let status = 'pending';
  let errorMsg = null;

  if (client && FROM_EMAIL.trim()) {
    try {
      const response = await client.emails.send({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject,
        html,
        text,
        reply_to: replyTo
      });

      if (response.error) {
        throw new Error(response.error.message || 'Resend API returned an error.');
      }

      resendMessageId = response.data?.id || null;
      status = 'sent';
    } catch (apiErr) {
      status = 'failed';
      errorMsg = apiErr.message;
      console.error(`[EmailService] Resend dispatch error to ${recipientEmail}:`, apiErr.message);
    }
  } else {
    status = 'failed';
    errorMsg = !RESEND_API_KEY
      ? 'Resend API key is not configured on the server.'
      : 'Resend sender address is not configured on the server.';
    console.error(`[EmailService] ${errorMsg}`);
  }

  // 4. Record audit log
  const log = await recordEmailLog({
    campaignId,
    recipientEmail,
    recipientUserId,
    templateType,
    subject,
    resendMessageId,
    status,
    errorMessage: errorMsg,
    sentAt: status === 'sent' ? new Date().toISOString() : null
  });

  return {
    success: status === 'sent',
    messageId: resendMessageId,
    logId: log?.id,
    error: errorMsg
  };
}

/**
 * Audit log helper
 */
async function recordEmailLog({
  campaignId,
  recipientEmail,
  recipientUserId,
  templateType,
  subject,
  resendMessageId,
  status,
  errorMessage,
  sentAt
}) {
  try {
    const id = crypto.randomUUID();

    // Check if recipientUserId actually exists in users table to prevent FK violation
    let verifiedUserId = null;
    if (recipientUserId) {
      const uCheck = await db.query(`SELECT 1 FROM users WHERE id = $1 LIMIT 1;`, [recipientUserId]);
      if (uCheck.rows.length > 0) {
        verifiedUserId = recipientUserId;
      }
    }

    const res = await db.query(
      `INSERT INTO email_logs (
        id, campaign_id, recipient_email, recipient_user_id,
        template_type, subject, resend_message_id, status, error_message, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        id,
        campaignId || null,
        recipientEmail,
        verifiedUserId,
        templateType,
        subject,
        resendMessageId || null,
        status,
        errorMessage || null,
        sentAt || null
      ]
    );
    return res.rows[0];
  } catch (err) {
    console.error('[EmailService] Failed to record email log:', err.message);
    return null;
  }
}

// =============================================================================
// HIGH-LEVEL TRANSACTIONAL WORKFLOW METHODS
// =============================================================================

export async function sendStudentWelcomeEmail({ email, firstName, userId = null }) {
  const tpl = templateWelcomeStudent({ firstName, destinationUrl: `${APP_URL}/dashboard` });
  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateType: 'welcome_student',
    recipientUserId: userId,
    isPromotional: false
  });
}

export async function sendTutorWelcomeEmail({ email, firstName, userId = null }) {
  const tpl = templateWelcomeTutor({ firstName, destinationUrl: `${APP_URL}/tutor-dashboard` });
  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateType: 'welcome_tutor',
    recipientUserId: userId,
    isPromotional: false
  });
}

export async function sendAdminWelcomeEmail({ email, firstName, userId = null }) {
  const tpl = templateWelcomeAdmin({ firstName, destinationUrl: `${APP_URL}/admin` });
  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateType: 'welcome_admin',
    recipientUserId: userId,
    isPromotional: false
  });
}

export async function sendTutorApplicationStatusEmail({ email, applicantName, decision, reason = null }) {
  let tpl;
  let type;
  if (decision === 'approved' || decision === 'approve') {
    tpl = templateTutorApplicationApproved({ applicantName, dashboardUrl: `${APP_URL}/tutor-dashboard` });
    type = 'tutor_application_approved';
  } else if (decision === 'received') {
    tpl = templateTutorApplicationReceived({ applicantName });
    type = 'tutor_application_received';
  } else {
    tpl = templateTutorApplicationRejected({ applicantName, reason });
    type = 'tutor_application_rejected';
  }

  return sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateType: type,
    isPromotional: false
  });
}

export async function sendBookingNotifications({
  studentEmail,
  studentName,
  tutorEmail,
  tutorName,
  subject,
  bookingTime = null
}) {
  const results = { student: null, tutor: null };

  if (studentEmail) {
    const sTpl = templateBookingConfirmedStudent({
      studentName,
      tutorName,
      subject,
      bookingTime,
      sessionUrl: `${APP_URL}/messages`
    });
    results.student = await sendEmail({
      to: studentEmail,
      subject: sTpl.subject,
      html: sTpl.html,
      text: sTpl.text,
      templateType: 'booking_confirmed_student'
    });
  }

  if (tutorEmail) {
    const tTpl = templateBookingReceivedTutor({
      tutorName,
      studentName,
      subject,
      bookingTime,
      dashboardUrl: `${APP_URL}/tutor-dashboard`
    });
    results.tutor = await sendEmail({
      to: tutorEmail,
      subject: tTpl.subject,
      html: tplToText(tTpl),
      text: tTpl.text,
      templateType: 'booking_received_tutor'
    });
  }

  return results;
}

function tplToText(tpl) {
  return tpl.html;
}

// =============================================================================
// AUDIENCE TARGETING & CAMPAIGN DISPATCH
// =============================================================================

export async function resolveCampaignAudience(targetAudience, isPromotional = false) {
  let query = '';
  const params = [];

  switch (targetAudience) {
    case 'students_only':
      query = `SELECT u.id, u.email, u.display_name, p.full_name 
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.role = 'student' AND u.status = 'active';`;
      break;

    case 'tutors_only':
      query = `SELECT u.id, u.email, u.display_name, p.full_name 
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.role = 'tutor' AND u.status = 'active';`;
      break;

    case 'admins_only':
      query = `SELECT u.id, u.email, u.display_name, p.full_name 
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.role IN ('admin', 'ADMIN') AND u.status = 'active';`;
      break;

    case 'all_users':
    default:
      // All active students and tutors. Admins are excluded unless explicitly requested
      query = `SELECT u.id, u.email, u.display_name, p.full_name 
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.role IN ('student', 'tutor') AND u.status = 'active';`;
      break;
  }

  const res = await db.query(query, params);
  const eligible = [];
  const seenEmails = new Set();

  for (const row of res.rows) {
    const email = (row.email || '').toLowerCase().trim();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    // Filter suppressions
    if (await isEmailSuppressed(email)) continue;

    // Filter promotional opt-outs if promotional
    if (isPromotional) {
      const prefs = await getOrCreateEmailPreferences(row.id, email);
      if (prefs && prefs.promotional_opt_in === false) continue;
    }

    eligible.push({
      userId: row.id,
      email,
      name: row.full_name || row.display_name || email.split('@')[0]
    });
  }

  return eligible;
}

/**
 * Execute a campaign in safe controlled batches (10 per batch, 500ms delay)
 */
export async function executeCampaign(campaignId) {
  const campRes = await db.query(`SELECT * FROM email_campaigns WHERE id = $1;`, [campaignId]);
  if (campRes.rows.length === 0) throw new Error('Campaign not found.');
  const campaign = campRes.rows[0];

  if (campaign.status === 'completed' || campaign.status === 'sending') {
    return { message: 'Campaign is already processing or completed.' };
  }

  const isPromotional = campaign.campaign_type === 'promotional';
  const recipients = await resolveCampaignAudience(campaign.target_audience, isPromotional);

  await db.query(
    `UPDATE email_campaigns 
     SET status = 'sending', total_recipients = $1, started_at = CURRENT_TIMESTAMP
     WHERE id = $2;`,
    [recipients.length, campaignId]
  );

  let sentCount = 0;
  let failedCount = 0;

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const unsubUrl = `${APP_URL}/api/email/unsubscribe?token=${r.userId}`;
          const tpl = templateCampaignAnnouncement({
            title: campaign.subject,
            bodyHtml: campaign.content_html,
            campaignType: campaign.campaign_type,
            unsubscribeUrl: isPromotional ? unsubUrl : null,
            recipientEmail: r.email
          });

          const result = await sendEmail({
            to: r.email,
            subject: campaign.subject,
            html: tpl.html,
            templateType: `campaign_${campaign.campaign_type}`,
            campaignId,
            recipientUserId: r.userId,
            isPromotional
          });

          if (result.success) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
        }
      })
    );

    // Rate limit buffer between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  await db.query(
    `UPDATE email_campaigns 
     SET status = 'completed', sent_count = $1, failed_count = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $3;`,
    [sentCount, failedCount, campaignId]
  );

  return { success: true, total: recipients.length, sent: sentCount, failed: failedCount };
}

// =============================================================================
// WEBHOOK EVENT PROCESSOR
// =============================================================================

export async function processResendWebhook(payload) {
  if (!payload || !payload.type) {
    throw new Error('Invalid webhook payload structure.');
  }

  const eventType = payload.type; // email.sent, email.delivered, email.bounced, email.complained
  const data = payload.data || {};
  const messageId = data.email_id || data.id;
  const recipient = (data.to && data.to[0]) ? data.to[0].toLowerCase().trim() : null;

  console.log(`[EmailService] Processing webhook event: ${eventType} for message: ${messageId}`);

  const eventStatuses = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.complained': 'complaint'
  };
  const newStatus = eventStatuses[eventType];
  if (!newStatus) return { received: true, event: eventType, ignored: true };

  let updatedCampaignId = null;
  if (messageId) {
    // Update once per status transition so provider retries do not inflate metrics.
    const updateRes = await db.query(
      `UPDATE email_logs 
       SET status = $1,
           delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE resend_message_id = $2
         AND status IS DISTINCT FROM $1
         AND NOT (status IN ('delivered', 'bounced', 'complaint') AND $1 = 'sent')
       RETURNING campaign_id;`,
      [newStatus, messageId]
    );
    updatedCampaignId = updateRes.rows[0]?.campaign_id || null;
  }

  if (updatedCampaignId) {
    const metricByStatus = {
      delivered: 'delivered_count',
      bounced: 'bounced_count',
      complaint: 'complaint_count'
    };
    const metric = metricByStatus[newStatus];
    if (metric) {
      await db.query(`UPDATE email_campaigns SET ${metric} = ${metric} + 1 WHERE id = $1;`, [updatedCampaignId]);
    }
  }

  // Handle suppression automatically on bounce or complaint
  if ((newStatus === 'bounced' || newStatus === 'complaint') && recipient) {
    await db.query(
      `INSERT INTO email_suppressions (id, email, reason, details)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING;`,
      [
        crypto.randomUUID(),
        recipient,
        newStatus === 'bounced' ? 'bounce' : 'complaint',
        `Provider reported ${eventType} event.`
      ]
    );
  }

  return { received: true, event: eventType };
}
