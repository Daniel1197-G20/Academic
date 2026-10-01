import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, GraduationCap, Compass, Sparkles, MessageSquare, AlertCircle, Scale, CheckCircle2 } from 'lucide-react';
import { Badge, PageHeader } from '../../components/ui';

export function TermsPage({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-4 px-4 sm:px-6">
      {/* Top Navigation */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      )}

      {/* Header */}
      <PageHeader
        title="Terms of Service"
        description="Conditions governing access to the Academic Platform, CGPA engine, study planner, and tutoring tools."
        badge={<Badge variant="academic" size="sm">Version 1.0 • Architectural Draft</Badge>}
      />

      {/* Legal Draft Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
        <div className="font-semibold flex items-center gap-1.5 text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          Product & Legal Framework Disclaimer
        </div>
        <p className="text-amber-800/90">
          This document represents the functional operational terms of the Academic Platform. It is a product draft intended for formal legal review and adaptation prior to commercial deployment.
        </p>
      </div>

      {/* Section 1: Acceptance */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-academic" />
          1. Acceptance of Terms
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          By registering an account or accessing any feature of the Academic Platform, you agree to be bound by these Terms of Service and acknowledge our Privacy Policy.
        </p>
      </div>

      {/* Section 2: Account Creation */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Scale className="w-4 h-4 text-academic" />
          2. Account Creation & Security
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Users must provide accurate and verifiable information during registration. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
        </p>
      </div>

      {/* Section 3: Academic Integrity */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-academic" />
          3. Strict Academic Integrity Policy
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
          <p>
            The Academic Platform is engineered to foster learning comprehension, structured revision, and ethical academic growth. We maintain a zero-tolerance policy toward academic dishonesty.
          </p>
          <div className="p-4 rounded-xl bg-danger-50 border border-danger-100 text-danger text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-danger" />
              Prohibited Academic Misconduct
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 opacity-90">
              <li>Submitting live exam or quiz questions during proctored or unproctored university examinations.</li>
              <li>Contract cheating or hiring third parties to complete assessments.</li>
              <li>Circulating unauthorized exam test banks or stolen university assessment materials.</li>
              <li>Falsifying academic records, course units, or letter grades.</li>
            </ul>
          </div>
          <p className="text-muted text-xs">
            Violation of academic integrity rules will result in immediate termination of your account and potential notification to the appropriate institutional authorities.
          </p>
        </div>
      </div>

      {/* Section 4: AI Academic Assistance */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-academic" />
          4. AI Academic Assistant Limitations & Disclaimers
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">A. Educational Assistance Tool Only</h3>
            <p className="text-xs text-muted leading-relaxed">
              The AI assistant is an artificial intelligence-driven supplementary learning tool. <strong className="text-ink">It does not constitute an official university instructor, examiner, or certified academic authority.</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">B. Verification Responsibility</h3>
            <p className="text-xs text-muted leading-relaxed">
              Machine learning models may occasionally produce mathematically flawed or inaccurate statements. You are solely responsible for cross-referencing AI outputs against official course textbooks and professor notes.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: Disclaimers & Liability */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-academic" />
          5. Disclaimers & Limitation of Liability
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed uppercase tracking-tight">
          THE PLATFORM, INCLUDING CGPA CALCULATION FORMULAS, STUDY SCHEDULES, AND AI ASSISTANCE, IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM DISCLAIMS ALL LIABILITY FOR ANY INDIRECT OR CONSEQUENTIAL DAMAGES ARISING FROM ACADEMIC OUTCOMES OR GRADE DISPUTES.
        </p>
      </div>

      {/* Section 6: Versioning & Contact */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-2 text-xs sm:text-sm text-muted">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <FileText className="w-4 h-4 text-academic" />
          6. Terms Version & Contact
        </h2>
        <p>
          Terms Version: <strong className="text-ink font-mono">1.0</strong> • Effective Date: <span className="font-medium text-ink">October 2026</span>
        </p>
        <div className="font-mono text-xs text-academic select-all pt-1">
          support@academicplatform.edu
        </div>
      </div>
    </div>
  );
}
