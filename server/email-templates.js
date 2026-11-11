/**
 * ==============================================================================
 * STUDORA EMAIL NOTIFICATION & TEMPLATE SYSTEM
 * Brand Palette:
 *  - Primary Ink:       #111827
 *  - Navy:              #172033
 *  - Academic Green:    #176B4D
 *  - Academic Light:    #DDEFE5
 *  - Canvas:            #F6F7F3
 *  - Surface:           #FFFFFF
 *  - Muted:             #667085
 *  - Gold:              #C89B3C
 * ==============================================================================
 */

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Base layout wrapper wrapping every Studora branded email
 */
export function renderEmailLayout({
  title,
  preheader = '',
  contentHtml,
  unsubscribeUrl = null,
  recipientEmail = '',
  isPromotional = false
}) {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #F6F7F3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      mso-line-height-rule: exactly;
    }
    a {
      color: #176B4D;
      text-decoration: none;
      font-weight: 600;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      box-shadow: 0 4px 16px rgba(17, 24, 39, 0.05);
    }
    .btn-academic {
      display: inline-block;
      background-color: #176B4D;
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 14px;
      line-height: 20px;
      padding: 12px 28px;
      border-radius: 10px;
      text-align: center;
      text-decoration: none;
      letter-spacing: -0.01em;
    }
    .badge-pill {
      display: inline-block;
      background-color: #DDEFE5;
      color: #176B4D;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
      }
      .content-padding {
        padding: 24px 20px !important;
      }
    }
  </style>
</head>
<body style="background-color: #F6F7F3; margin: 0; padding: 32px 0;">
  ${safePreheader ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${safePreheader}</div>` : ''}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6F7F3;">
    <tr>
      <td align="center" style="padding: 16px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0">
          <!-- Top Header Brand Bar -->
          <tr>
            <td style="background-color: #172033; padding: 24px 32px; border-bottom: 2px solid #176B4D;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Studora
                    </span>
                    <span style="font-size: 11px; color: #DDEFE5; margin-left: 8px; font-weight: 600; vertical-align: middle; padding: 2px 6px; background-color: rgba(23, 107, 77, 0.4); border-radius: 4px;">
                      Academic Platform
                    </span>
                  </td>
                  <td align="right">
                    <span style="color: #98ACCA; font-size: 11px; font-weight: 500;">
                      Study smarter. Go further.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 28px 36px; background-color: #FFFFFF;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F6F7F3; padding: 24px 36px; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #667085; line-height: 16px;">
                © ${currentYear} Studora Inc. Official Academic Intelligence &amp; Verified Tutoring Platform.
              </p>
              ${recipientEmail ? `<p style="margin: 0 0 8px 0; font-size: 11px; color: #9CA3AF;">This email was sent to <strong style="color: #4B5563;">${escapeHtml(recipientEmail)}</strong>.</p>` : ''}
              
              <p style="margin: 0; font-size: 11px; color: #667085; line-height: 18px;">
                <a href="https://studora.app/terms" style="color: #667085; text-decoration: underline; font-weight: 500;">Terms</a> • 
                <a href="https://studora.app/privacy" style="color: #667085; text-decoration: underline; font-weight: 500;">Privacy Policy</a> • 
                <a href="https://studora.app/support" style="color: #667085; text-decoration: underline; font-weight: 500;">Support</a>
                ${unsubscribeUrl ? ` • <a href="${escapeHtml(unsubscribeUrl)}" style="color: #C24141; text-decoration: underline; font-weight: 600;">Unsubscribe from promotional emails</a>` : ''}
              </p>
              ${isPromotional ? `
              <p style="margin: 12px 0 0 0; font-size: 10px; color: #9CA3AF; line-height: 14px;">
                You are receiving this promotional communication because you opted in to Studora platform updates. You can adjust your preferences or opt out at any time using the link above.
              </p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// 1. WELCOME TEMPLATES
// -----------------------------------------------------------------------------

export function templateWelcomeStudent({ firstName, destinationUrl = 'https://studora.app/dashboard' }) {
  const name = firstName ? escapeHtml(firstName) : 'Student';
  const url = escapeHtml(destinationUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill">Welcome to Studora</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">
      Welcome to your academic edge, ${name}! 🎓
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 16px 0;">
      We're thrilled to have you join Studora. Your dedicated student workspace is fully prepared to help you calculate your accurate CGPA, access verified subject tutors, and track your study progression with precision.
    </p>

    <div style="background-color: #F2F8F5; border-left: 4px solid #176B4D; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #176B4D;">
        What you can do right now:
      </h3>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #1F2937; line-height: 20px;">
        <li style="margin-bottom: 6px;"><strong>Compute your CGPA</strong> using your institution's official 4.0 or 5.0 grading scale.</li>
        <li style="margin-bottom: 6px;"><strong>Generate personalized study plans</strong> and practice diagnostics tailored to your courses.</li>
        <li><strong>Connect with verified tutors</strong> for 1-on-1 scheduled academic sessions.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${url}" class="btn-academic">
        Open Student Dashboard →
      </a>
    </div>

    <p style="font-size: 13px; color: #667085; line-height: 20px; margin: 24px 0 0 0;">
      Need assistance? Reply directly to this email or visit our Help Center at any time.
    </p>
  `;

  return {
    subject: `Welcome to Studora, ${name}! Your academic dashboard is ready`,
    html: renderEmailLayout({
      title: 'Welcome to Studora',
      preheader: 'Your academic workspace is ready. Calculate CGPA, plan studies, and connect with tutors.',
      contentHtml
    }),
    text: `Welcome to Studora, ${name}!\n\nYour dedicated student workspace is ready. You can now calculate your accurate CGPA, plan studies, and connect with verified tutors.\n\nOpen your dashboard: ${destinationUrl}\n\nStudy smarter. Go further.\nTeam Studora`
  };
}

export function templateWelcomeTutor({ firstName, destinationUrl = 'https://studora.app/tutor-dashboard' }) {
  const name = firstName ? escapeHtml(firstName) : 'Tutor';
  const url = escapeHtml(destinationUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="background-color: #FAF0DB; color: #7E5B21;">Verified Tutor Network</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">
      Welcome to the Studora Tutor Faculty, ${name}! 🌟
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 16px 0;">
      Congratulations on joining our verified educator community. Students rely on your expertise for personalized 1-on-1 instruction, exam preparation, and conceptual clarity.
    </p>

    <div style="background-color: #FDF9F0; border-left: 4px solid #C89B3C; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #7E5B21;">
        Recommended next steps for success:
      </h3>
      <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #1F2937; line-height: 20px;">
        <li style="margin-bottom: 6px;"><strong>Complete your public tutor profile</strong> — highlight your teaching approach and academic background.</li>
        <li style="margin-bottom: 6px;"><strong>Configure your hourly rate</strong> and session fees in your Tutor Dashboard.</li>
        <li><strong>Set up your verified payout details</strong> to receive direct bank earnings upon completed sessions.</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${url}" class="btn-academic">
        Open Tutor Dashboard →
      </a>
    </div>
  `;

  return {
    subject: `Welcome to the Studora Tutor Faculty, ${name}!`,
    html: renderEmailLayout({
      title: 'Welcome to Studora Tutoring',
      preheader: 'Welcome to the verified educator community. Set up your profile and hourly pricing.',
      contentHtml
    }),
    text: `Welcome to the Studora Tutor Faculty, ${name}!\n\nYour tutor authorization is active. Please complete your profile and set your session rates.\n\nOpen Tutor Dashboard: ${destinationUrl}\n\nTeam Studora`
  };
}

export function templateWelcomeAdmin({ firstName, destinationUrl = 'https://studora.app/admin' }) {
  const name = firstName ? escapeHtml(firstName) : 'Administrator';
  const url = escapeHtml(destinationUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="background-color: #E8ECF2; color: #1F3456;">Administrative Security</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">
      Administrator Access Granted, ${name}
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 16px 0;">
      Your account has been provisioned with administrator authorization on the Studora platform. You have privileged access to platform operations, tutor applications, user moderation, billing oversight, and communications.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #C24141; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #8A2727;">
        Security Notice
      </h3>
      <p style="margin: 0; font-size: 12px; color: #374151; line-height: 18px;">
        All administrative sessions, tutor approvals, payout authorizations, and email campaigns are cryptographically logged in the official audit registry. Always adhere to administrative security guidelines.
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${url}" class="btn-academic">
        Access Admin Console →
      </a>
    </div>
  `;

  return {
    subject: `[Studora Security] Administrator Onboarding & Privileged Access`,
    html: renderEmailLayout({
      title: 'Administrator Onboarding',
      preheader: 'Your administrative access to Studora has been provisioned.',
      contentHtml
    }),
    text: `Administrator Access Granted, ${name}\n\nYour account has been provisioned with administrator authorization on Studora.\nAccess Console: ${destinationUrl}\n\nAll administrative actions are logged in the audit registry.`
  };
}

// -----------------------------------------------------------------------------
// 2. TUTOR WORKFLOW TEMPLATES
// -----------------------------------------------------------------------------

export function templateTutorApplicationReceived({ applicantName }) {
  const name = applicantName ? escapeHtml(applicantName) : 'Applicant';

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill">Application Received</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111827;">
      We've received your Tutor Application, ${name}
    </h1>
    <p style="font-size: 14px; color: #374151; line-height: 22px; margin: 0 0 16px 0;">
      Thank you for applying to become an accredited tutor on Studora. Your submitted credentials, subject proficiencies, and diagnostic assessment scores are currently in queue for review by our academic administration team.
    </p>
    <div style="background-color: #F6F7F3; padding: 16px 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #E5E7EB;">
      <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 20px;">
        <strong>Review Turnaround:</strong> Application reviews are typically finalized within <strong>24 to 48 business hours</strong>. You will receive an email notification as soon as a determination has been reached.
      </p>
    </div>
  `;

  return {
    subject: `We've received your Studora Tutor Application`,
    html: renderEmailLayout({
      title: 'Tutor Application Received',
      preheader: 'Your application has been received and is currently under academic review.',
      contentHtml
    }),
    text: `We've received your Studora Tutor Application, ${name}.\n\nYour application is in queue for review by our academic administration team (usually within 24-48 business hours).\n\nTeam Studora`
  };
}

export function templateTutorApplicationApproved({ applicantName, dashboardUrl = 'https://studora.app/tutor-dashboard' }) {
  const name = applicantName ? escapeHtml(applicantName) : 'Tutor';
  const url = escapeHtml(dashboardUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="background-color: #DDEFE5; color: #176B4D;">Application Approved</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827;">
      Congratulations ${name}! You are approved as a Studora Tutor 🎉
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 16px 0;">
      Our academic review board has verified your qualifications and approved your application. Your account has been upgraded with full tutor privileges.
    </p>
    <p style="font-size: 14px; color: #374151; line-height: 22px; margin: 0 0 20px 0;">
      You can now publish your schedule, set your session price, and start accepting booking requests from eager students across the platform.
    </p>
    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${url}" class="btn-academic">
        Open Tutor Workspace →
      </a>
    </div>
  `;

  return {
    subject: `Congratulations! Your Studora Tutor Application is Approved`,
    html: renderEmailLayout({
      title: 'Tutor Application Approved',
      preheader: 'Your application has been verified and approved. Start accepting student bookings.',
      contentHtml
    }),
    text: `Congratulations ${name}! Your Studora Tutor Application has been approved.\n\nOpen your workspace: ${dashboardUrl}\n\nTeam Studora`
  };
}

export function templateTutorApplicationRejected({ applicantName, reason = null }) {
  const name = applicantName ? escapeHtml(applicantName) : 'Applicant';
  const safeReason = reason ? escapeHtml(reason) : 'Application criteria could not be verified at this time.';

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="background-color: #FEF2F2; color: #C24141;">Application Update</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111827;">
      Update regarding your Tutor Application
    </h1>
    <p style="font-size: 14px; color: #374151; line-height: 22px; margin: 0 0 16px 0;">
      Dear ${name}, thank you for your interest in joining the Studora Tutor Faculty. After thorough evaluation of your submitted application and diagnostic metrics, our review board was unable to approve your application at this time.
    </p>
    <div style="background-color: #FEF2F2; border-left: 4px solid #C24141; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #8A2727; line-height: 18px;">
        <strong>Review Notes:</strong> ${safeReason}
      </p>
    </div>
    <p style="font-size: 13px; color: #4B5563; line-height: 20px; margin: 20px 0 0 0;">
      You remain fully active as a student with unrestricted access to all academic planning, CGPA tools, and tutoring sessions. You may re-apply after 30 days.
    </p>
  `;

  return {
    subject: `Studora Tutor Application Status Update`,
    html: renderEmailLayout({
      title: 'Tutor Application Update',
      preheader: 'Update regarding your recent tutor application.',
      contentHtml
    }),
    text: `Dear ${name},\n\nThank you for your interest. We were unable to approve your application at this time.\nNotes: ${reason || 'Application criteria could not be verified.'}\n\nYou remain active as a student and may re-apply after 30 days.\n\nTeam Studora`
  };
}

// -----------------------------------------------------------------------------
// 3. BOOKING NOTIFICATIONS
// -----------------------------------------------------------------------------

export function templateBookingConfirmedStudent({
  studentName,
  tutorName,
  subject,
  bookingTime = null,
  sessionUrl = 'https://studora.app/messages'
}) {
  const sName = studentName ? escapeHtml(studentName) : 'Student';
  const tName = tutorName ? escapeHtml(tutorName) : 'your tutor';
  const subj = escapeHtml(subject || 'Academic Session');
  const url = escapeHtml(sessionUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill">Booking Confirmed</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111827;">
      Your session with ${tName} is confirmed! 📚
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 20px 0;">
      Hello ${sName}, your booking payment has been verified and your tutoring session has been secured.
    </p>
    <div style="background-color: #F6F7F3; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #667085; padding-bottom: 8px;">Subject:</td>
          <td style="font-size: 13px; color: #111827; font-weight: 700; text-align: right; padding-bottom: 8px;">${subj}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #667085; padding-bottom: 8px;">Tutor:</td>
          <td style="font-size: 13px; color: #111827; font-weight: 700; text-align: right; padding-bottom: 8px;">${tName}</td>
        </tr>
        ${bookingTime ? `
        <tr>
          <td style="font-size: 13px; color: #667085;">Scheduled Time:</td>
          <td style="font-size: 13px; color: #176B4D; font-weight: 700; text-align: right;">${escapeHtml(bookingTime)}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${url}" class="btn-academic">
        Join Chat &amp; Session Room →
      </a>
    </div>
  `;

  return {
    subject: `Booking Confirmed: ${subj} with ${tName}`,
    html: renderEmailLayout({
      title: 'Booking Confirmed',
      preheader: `Your session with ${tName} for ${subj} is verified and confirmed.`,
      contentHtml
    }),
    text: `Your session with ${tName} for ${subj} is confirmed!\n\nOpen your session room: ${sessionUrl}\n\nTeam Studora`
  };
}

export function templateBookingReceivedTutor({
  tutorName,
  studentName,
  subject,
  bookingTime = null,
  dashboardUrl = 'https://studora.app/tutor-dashboard'
}) {
  const tName = tutorName ? escapeHtml(tutorName) : 'Tutor';
  const sName = studentName ? escapeHtml(studentName) : 'a student';
  const subj = escapeHtml(subject || 'Academic Session');
  const url = escapeHtml(dashboardUrl);

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="background-color: #FAF0DB; color: #7E5B21;">New Session Booked</span>
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #111827;">
      New booking from ${sName}! 📅
    </h1>
    <p style="font-size: 15px; color: #374151; line-height: 24px; margin: 0 0 20px 0;">
      Hello ${tName}, a student has reserved and paid for a tutoring session with you.
    </p>
    <div style="background-color: #F6F7F3; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #667085; padding-bottom: 8px;">Subject:</td>
          <td style="font-size: 13px; color: #111827; font-weight: 700; text-align: right; padding-bottom: 8px;">${subj}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #667085; padding-bottom: 8px;">Student:</td>
          <td style="font-size: 13px; color: #111827; font-weight: 700; text-align: right; padding-bottom: 8px;">${sName}</td>
        </tr>
        ${bookingTime ? `
        <tr>
          <td style="font-size: 13px; color: #667085;">Scheduled Time:</td>
          <td style="font-size: 13px; color: #176B4D; font-weight: 700; text-align: right;">${escapeHtml(bookingTime)}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${url}" class="btn-academic">
        View Booking Details →
      </a>
    </div>
  `;

  return {
    subject: `New Tutoring Booking: ${subj} with ${sName}`,
    html: renderEmailLayout({
      title: 'New Booking Received',
      preheader: `You have a new paid tutoring booking for ${subj}.`,
      contentHtml
    }),
    text: `Hello ${tName},\n\nYou have a new booking from ${sName} for ${subj}.\n\nView details: ${dashboardUrl}\n\nTeam Studora`
  };
}

// -----------------------------------------------------------------------------
// 4. CAMPAIGN ANNOUNCEMENT TEMPLATES
// -----------------------------------------------------------------------------

export function templateCampaignAnnouncement({
  title,
  bodyHtml,
  campaignType = 'promotional',
  unsubscribeUrl = null,
  recipientEmail = ''
}) {
  const isUrgent = campaignType === 'operational_urgent';
  const isPromotional = campaignType === 'promotional';

  const badgeColor = isUrgent
    ? 'background-color: #FEF2F2; color: #C24141;'
    : isPromotional
    ? 'background-color: #FAF0DB; color: #7E5B21;'
    : 'background-color: #DDEFE5; color: #176B4D;';

  const badgeLabel = isUrgent
    ? 'Urgent Operational Notice'
    : isPromotional
    ? 'Special Announcement'
    : 'Platform Update';

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge-pill" style="${badgeColor}">${badgeLabel}</span>
    </div>
    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em;">
      ${escapeHtml(title)}
    </h1>
    <div style="font-size: 15px; color: #374151; line-height: 24px;">
      ${bodyHtml}
    </div>
  `;

  return {
    subject: title,
    html: renderEmailLayout({
      title,
      preheader: title,
      contentHtml,
      unsubscribeUrl,
      recipientEmail,
      isPromotional
    })
  };
}
