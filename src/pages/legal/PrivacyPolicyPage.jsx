import React from 'react';
import { Shield, ArrowLeft, Lock, FileText, Database, Eye, Trash2, Cpu, Video, CreditCard, Users, HelpCircle } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';

export function PrivacyPolicyPage({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-4 px-4 sm:px-6">
      {/* Top Navigation */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-ghost-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      )}

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0B0F13] to-[#050608] border border-ghost-200/20 shadow-neu-raised-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ghost" size="sm">Legal & Privacy Framework</Badge>
            <span className="text-[11px] font-mono text-zinc-400">Version 1.0 • Architectural Draft</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Shield className="w-7 h-7 text-ghost-200" />
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            This document outlines how the Student Academic Platform collects, processes, protects, and retains student and academic data.
          </p>
        </div>
      </div>

      {/* Important Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          Product & Legal Draft Disclaimer
        </div>
        <p className="text-amber-200/80">
          This Privacy Policy is a technical product draft representing the functional privacy architecture of this platform. It is subject to formal review and customization by qualified legal counsel prior to commercial release. This platform does not claim formal certification under regional regulations (such as GDPR, CCPA, or NDPR) until comprehensive legal and security audits are concluded.
        </p>
      </div>

      {/* Section 1: Overview & Principles */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-ghost-200" />
          1. Core Privacy Commitments
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          The Student Academic Platform is built upon three foundational tenets:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-400 pl-2">
          <li><strong className="text-zinc-200">Student Ownership:</strong> Your academic records, grades, study plans, and diagnostics belong strictly to you.</li>
          <li><strong className="text-zinc-200">No Unverified Data Sharing:</strong> We do not sell personal or academic records to third-party advertisers or data brokers.</li>
          <li><strong className="text-zinc-200">Granular Transparency:</strong> You retain the capability to review, export, and permanently delete your data at any time directly through your account dashboard.</li>
        </ul>
      </Card>

      {/* Section 2: What Information We Collect */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-ghost-200" />
          2. Information We Collect
        </h2>
        <div className="space-y-4 text-xs sm:text-sm text-zinc-300">
          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">A. Account & Profile Data</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              When creating an account, you provide an email address, full name, secure password (stored via salted cryptographic scrypt hash; we never store plain text passwords), institution name, academic level, and department.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">B. Academic & CGPA Records</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Course codes, titles, credit units, letter grades, grading scales (e.g. 5.0, 4.0, or 7.0), semester associations, and computed GPA/CGPA calculations. This data is processed to provide grade tracking, graduation projections, and academic standing insights.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">C. Study Activity & Progress Logs</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Study plans, topic completion statuses, study session logs (duration and notes), and study streaks. This data is used solely to generate your personal study schedule and progress charts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">D. Tutor Marketplace & Bookings Data</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              For tutors: subject areas, academic credentials, rates, and schedule availability. For students: tutor booking requests, session timestamps, and verified session reviews.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">E. Chat & Group Collaboration Data</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Direct messages between students and tutors, study group discussions, and shared study materials. Messages are stored on platform databases to provide conversation continuity.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">F. AI Academic Tutor Interactions</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Prompts submitted to the AI Tutor, selected learning modes, generated explanations, and academic context (such as course titles and weak test topics). See Section 6 for dedicated AI privacy provisions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1.5">
            <h3 className="font-semibold text-zinc-200">G. Payment & Billing Data</h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Payment transactions for tutor bookings or subscriptions are processed directly through certified PCI-DSS compliant third-party payment gateways. <strong className="text-zinc-200">The platform database never stores raw credit/debit card numbers, CVVs, or cardholder security codes.</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Section 3: How We Use Information */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Eye className="w-5 h-5 text-ghost-200" />
          3. How We Use Information
        </h2>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-400 pl-2">
          <li>To compute and visualize your semester GPA and cumulative CGPA across configurable grading scales.</li>
          <li>To generate daily study timelines, track streaks, and send study reminders.</li>
          <li>To facilitate tutor matching, schedule video/audio sessions, and confirm bookings.</li>
          <li>To enable contextual AI academic assistance based on your active curriculum.</li>
          <li>To detect and prevent academic dishonesty, fraudulent reviews, spam, or malicious platform use.</li>
          <li>To maintain platform security, audit logs, and compliance records.</li>
        </ul>
      </Card>

      {/* Section 4: Cookies & Tracking Technologies */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-ghost-200" />
          4. Cookies & Local Storage Technologies
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          We categorize browser technologies into three distinct tiers. You can manage non-essential technologies at any time via the Cookie Settings interface:
        </p>
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">1. Strictly Necessary Technologies</span>
              <span className="text-ghost-200 font-mono text-[10px]">Always Active / Required</span>
            </div>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              Essential for authentication, HMAC session tokens, database state synchronization, and route protection. Core services cannot function without these.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">2. Analytics Technologies</span>
              <span className="text-zinc-400 font-mono text-[10px]">Optional / Consent-Based</span>
            </div>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              Used to measure platform performance, load times, and diagnostic error reports to improve software reliability. Disabled by default unless explicit consent is provided.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">3. Functional Preferences</span>
              <span className="text-zinc-400 font-mono text-[10px]">Optional / Consent-Based</span>
            </div>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              Preserves UI states, such as collapsed sidebar preferences, theme settings, and selected grading scale views.
            </p>
          </div>
        </div>
      </Card>

      {/* Section 5: Third-Party Integrations */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Video className="w-5 h-5 text-ghost-200" />
          5. Third-Party Service Providers
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-400">
          <p>
            To deliver real-time tutoring and video collaboration, the platform utilizes specialized third-party services:
          </p>
          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1">
            <h4 className="font-semibold text-zinc-200">Real-Time Voice & Video (ZEGOCLOUD)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Audio, video, and screen-sharing data during live tutoring or group rooms are routed through ZEGOCLOUD communication servers via standard WebRTC transport. The platform does not make unverified claims of end-to-end encryption without formal cryptographic validation. Video session tokens are generated server-side and expire immediately upon call completion.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1">
            <h4 className="font-semibold text-zinc-200">Payment Processors</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Payment processing is executed via verified gateways (such as Stripe, Paystack, or Flutterwave). Customer billing credentials remain entirely within the payment provider’s secure environment.
            </p>
          </div>
        </div>
      </Card>

      {/* Section 6: AI Tutor Privacy */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-ghost-200" />
          6. AI Academic Assistant Privacy
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p>
            When utilizing the AI Tutor:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
            <li>Your prompt text, requested learning mode, and relevant course context (e.g. course title or weak diagnostic topic) are transmitted to third-party foundation model APIs to synthesize academic responses.</li>
            <li>AI conversations are stored in your private study log to allow you to review previous explanations.</li>
            <li>We do not claim that conversations are private or never stored unless a zero-retention enterprise agreement is technically established with the AI provider.</li>
            <li>Students retain the right to purge their AI conversation history at any time from their settings.</li>
            <li><strong className="text-zinc-200">Educational Assistance Notice:</strong> AI responses are synthesized by machine learning algorithms and are intended as study aids. They do not constitute official university grading or certified academic counsel.</li>
          </ul>
        </div>
      </Card>

      {/* Section 7: Data Retention & Security */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-ghost-200" />
          7. Data Storage, Security & Retention
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p>
            All persistent platform records are hosted in an isolated PostgreSQL database environment with strict referential integrity. Passwords are cryptographically salted and hashed using scrypt. Authentication tokens are digitally signed with HMAC-SHA256 and subject to automatic expiration.
          </p>
          <p>
            We retain your academic records as long as your account remains active. If your account is deleted, all courses, grades, study plans, logs, and consent records are immediately and permanently removed via database cascading deletes.
          </p>
        </div>
      </Card>

      {/* Section 8: User Rights, Data Portability & Account Deletion */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-ghost-200" />
          8. Your Rights: Data Export & Permanent Deletion
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-300">
          <p className="text-zinc-400 leading-relaxed">
            In accordance with core data protection principles, you possess full sovereignty over your personal information:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1">
              <h4 className="font-semibold text-zinc-100">Right to Portability (Data Export)</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You can download a complete, machine-readable JSON archive of all your courses, semesters, grades, study plans, logs, and consent audits directly from your Profile settings.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-1">
              <h4 className="font-semibold text-zinc-100">Right to Erasure (Account Deletion)</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You can permanently delete your account through your settings. This requires password confirmation and triggers a comprehensive cascade wipe of all your database records.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 9: Age & Minor Considerations */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-ghost-200" />
          9. Age Requirements & Minor Protections
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          The Student Academic Platform is intended for university, college, and secondary school students aged 13 and above (or the applicable age of digital consent in your jurisdiction). Users under the age of majority must have the consent and supervision of a parent, guardian, or sponsoring academic institution. We do not knowingly collect personal information from individuals below the minimum lawful age.
        </p>
      </Card>

      {/* Section 10: Legal Versioning & Contact */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-ghost-200" />
          10. Policy Versioning & Contact Inquiries
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p>
            Current Document Version: <strong className="text-zinc-200 font-mono">1.0</strong> • Effective Date: <span className="font-mono text-zinc-300">September 2026</span>
          </p>
          <p>
            Any material modifications to this policy will be announced via platform notification and recorded in the database consent audit log. Users will be prompted to acknowledge updated terms where legally required.
          </p>
          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04] font-mono text-xs text-zinc-300 space-y-1">
            <div>Data Controller: <span className="text-ghost-200">[Configurable Legal Entity Placeholder]</span></div>
            <div>Privacy Desk: <span className="text-ghost-200">[privacy@academicplatform.example]</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
