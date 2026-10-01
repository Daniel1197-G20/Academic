import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, GraduationCap, Compass, Sparkles, MessageSquare, AlertCircle, Scale, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';

export function TermsPage({ onBack }) {
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
            <Badge variant="ghost" size="sm">Terms of Service</Badge>
            <span className="text-[11px] font-mono text-zinc-400">Version 1.0 • Architectural Draft</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <FileText className="w-7 h-7 text-ghost-200" />
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            These terms govern your access to and use of the Student Academic Platform, including the CGPA calculator, study planner, tutor marketplace, and AI learning assistant.
          </p>
        </div>
      </div>

      {/* Important Legal Draft Banner */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          Product & Legal Draft Disclaimer
        </div>
        <p className="text-amber-200/80">
          This document represents the functional operational terms of the Student Academic Platform. It is a product draft intended for formal legal review and adaptation by qualified counsel prior to commercial launch in target jurisdictions.
        </p>
      </div>

      {/* Section 1: Acceptance of Terms */}
      <Card variant="neu" className="p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-ghost-200" />
          1. Acceptance of Terms
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          By registering an account, accessing, or using any feature of the Student Academic Platform, you agree to be bound by these Terms & Conditions and acknowledge our Privacy Policy. If you do not agree to these terms, you must not access or use the platform.
        </p>
      </Card>

      {/* Section 2: Account Creation & Responsibilities */}
      <Card variant="neu" className="p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Scale className="w-5 h-5 text-ghost-200" />
          2. Account Creation & Security
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Users must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your credentials.
        </p>
      </Card>

      {/* Section 3: Academic Integrity & Student Conduct */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-ghost-200" />
          3. Strict Academic Integrity Policy
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <p>
            The Student Academic Platform is engineered to foster learning comprehension, structured revision, and ethical academic growth. We maintain a zero-tolerance policy toward academic dishonesty.
          </p>
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 text-xs space-y-1.5">
            <div className="font-semibold text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Prohibited Academic Misconduct
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-red-200/90">
              <li>Submitting live exam or quiz questions to tutors or the AI assistant during proctored or unproctored university examinations.</li>
              <li>Contract cheating, hiring tutors to complete assignments, write dissertations, or impersonate you in assessments.</li>
              <li>Circulating unauthorized, copyrighted exam test banks or stolen university assessment materials.</li>
              <li>Falsifying academic records, course units, or letter grades in public profiles.</li>
            </ul>
          </div>
          <p className="text-zinc-400 text-xs">
            Violation of academic integrity rules will result in immediate session cancellation without refund, suspension or termination of your account, and potential notification to the appropriate institutional authorities.
          </p>
        </div>
      </Card>

      {/* Section 4: AI Academic Tutor Disclaimers */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-ghost-200" />
          4. AI Academic Assistant Limitations & Disclaimers
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.06] space-y-2">
            <h3 className="font-semibold text-ghost-200">A. Educational Assistance Tool Only</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The AI Tutor is an artificial intelligence-driven supplementary learning tool designed to assist with concept explanations, flashcard generation, and study organization. <strong className="text-zinc-200">The AI Tutor is not an official university instructor, examiner, or certified academic authority.</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.06] space-y-2">
            <h3 className="font-semibold text-ghost-200">B. No Guarantee of Correctness</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              While engineered for academic rigor, machine learning models may occasionally produce inaccurate, incomplete, or mathematically flawed statements (hallucinations). You are solely responsible for cross-referencing AI outputs against official course textbooks, professor notes, and institutional syllabi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.06] space-y-2">
            <h3 className="font-semibold text-ghost-200">C. Usage Quotas & Subscription Tiers</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Free-tier accounts receive limited daily or monthly AI query credits. Premium subscription plans provide higher throughput and advanced learning modes. The platform reserves the right to apply fair-use rate limiting to safeguard system stability.
            </p>
          </div>
        </div>
      </Card>

      {/* Section 5: Tutor Marketplace & Bookings */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Compass className="w-5 h-5 text-ghost-200" />
          5. Tutor Marketplace, Bookings & Cancellations
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p>
            The platform provides a directory where independent academic tutors and students can connect:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
            <li><strong className="text-zinc-200">Independent Contractors:</strong> Tutors operate as independent service providers, not employees or direct agents of the platform.</li>
            <li><strong className="text-zinc-200">Verification Expectations:</strong> While tutors may undergo credential checks prior to receiving verification badges, students are encouraged to review qualifications and subject scopes before booking.</li>
            <li><strong className="text-zinc-200">Bookings & Cancellations:</strong> Sessions may be cancelled up to 12 hours prior to the scheduled start time for a full credit. Late cancellations or no-shows are subject to the applicable tutor cancellation policy.</li>
            <li><strong className="text-zinc-200">Escrow & Payouts:</strong> Session fees are held securely until the completion of the live video/voice session before release to the tutor.</li>
          </ul>
        </div>
      </Card>

      {/* Section 6: Study Groups & Communications */}
      <Card variant="neu" className="p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-ghost-200" />
          6. Study Groups, Messaging & Content Rules
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Users participating in peer study groups or direct messaging agree to uphold respectful, collegial standards. Prohibited conduct includes:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400 pl-2">
          <li>Harassment, bullying, hate speech, or threatening communications.</li>
          <li>Transmitting unsolicited promotional material, spam, or malicious software.</li>
          <li>Posting illegal content, piracy links, or unauthorized distribution of proprietary educational materials.</li>
        </ul>
      </Card>

      {/* Section 7: Third-Party Infrastructure */}
      <Card variant="neu" className="p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Scale className="w-5 h-5 text-ghost-200" />
          7. Third-Party Service Dependencies
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Certain features depend on external service providers, including ZEGOCLOUD for audio/video WebRTC streaming, AI model infrastructure providers for text generation, and payment gateways for billing. The platform is not liable for intermittent third-party service interruptions or upstream network outages.
        </p>
      </Card>

      {/* Section 8: Disclaimers & Limitation of Liability */}
      <Card variant="neu" className="p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-ghost-200" />
          8. Disclaimers & Limitation of Liability
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          THE PLATFORM, INCLUDING CGPA CALCULATION FORMULAS, STUDY SCHEDULES, PRACTICE TESTS, AND AI ASSISTANCE, IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, THE OPERATORS OF THIS PLATFORM DISCLAIM ALL LIABILITY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING BUT NOT LIMITED TO ACADEMIC OUTCOMES, GRADE DISPUTES, OR LOSS OF DATA.
        </p>
      </Card>

      {/* Section 9: Document Versioning & Contact */}
      <Card variant="neu" className="p-6 space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-ghost-200" />
          9. Governing Terms Version & Contact
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p>
            Terms Version: <strong className="text-zinc-200 font-mono">1.0</strong> • Effective Date: <span className="font-mono text-zinc-300">September 2026</span>
          </p>
          <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04] font-mono text-xs text-zinc-300 space-y-1">
            <div>Legal Representative: <span className="text-ghost-200">[Configurable Legal Entity Placeholder]</span></div>
            <div>Inquiries Desk: <span className="text-ghost-200">[contact@academicplatform.example]</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
