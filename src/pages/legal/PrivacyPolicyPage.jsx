import React from 'react';
import { Shield, ArrowLeft, Lock, FileText, Database, Eye, Trash2, Cpu, Video, Users, HelpCircle } from 'lucide-react';
import { Badge, PageHeader } from '../../components/ui';

export function PrivacyPolicyPage({ onBack }) {
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
        title="Privacy Policy"
        description="How the Academic Platform collects, protects, and retains student coursework and account data."
        badge={<Badge variant="academic" size="sm">Version 1.0 • Architectural Draft</Badge>}
      />

      {/* Important Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
        <div className="font-semibold flex items-center gap-1.5 text-amber-800">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
          Product & Legal Framework Disclaimer
        </div>
        <p className="text-amber-800/90">
          This Privacy Policy is a product draft detailing the operational and technical data architecture of this platform. It is subject to formal legal review by qualified counsel prior to commercial release in applicable jurisdictions.
        </p>
      </div>

      {/* Section 1: Overview & Principles */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Lock className="w-4 h-4 text-academic" />
          1. Core Privacy Commitments
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          The Academic Platform is built on three core data commitments:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-muted pl-2">
          <li><strong className="text-ink">Student Ownership:</strong> Your academic records, grades, study plans, and diagnostics belong strictly to you.</li>
          <li><strong className="text-ink">Zero Ad Trackers:</strong> We do not sell personal or academic records to third-party advertisers or data brokers.</li>
          <li><strong className="text-ink">Granular Sovereignty:</strong> You retain the capability to review, export, and permanently delete your data at any time directly through your account dashboard.</li>
        </ul>
      </div>

      {/* Section 2: What Information We Collect */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Database className="w-4 h-4 text-academic" />
          2. Information We Collect
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-muted">
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">A. Account & Profile Data</h3>
            <p className="text-muted leading-relaxed text-xs">
              When creating an account, you provide an email address, full name, secure password (stored via salted cryptographic scrypt hash; plain text passwords are never stored), institution name, academic level, and department.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">B. Academic & CGPA Records</h3>
            <p className="text-muted leading-relaxed text-xs">
              Course codes, titles, credit units, letter grades, grading scales (e.g. 5.0, 4.0, or 7.0), semester associations, and computed GPA/CGPA calculations. This data is processed to provide grade tracking, graduation projections, and academic standing insights.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">C. Study Activity & Progress Logs</h3>
            <p className="text-muted leading-relaxed text-xs">
              Study plans, topic completion statuses, study session logs (duration and notes), and study streaks. This data is used solely to generate your personal study schedule and progress charts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1">
            <h3 className="font-semibold text-ink">D. Payment & Billing Data</h3>
            <p className="text-muted leading-relaxed text-xs">
              Payment transactions are processed directly through certified PCI-DSS compliant third-party payment gateways. <strong className="text-ink">The platform database never stores raw credit/debit card numbers or security codes.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: How We Use Information */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Eye className="w-4 h-4 text-academic" />
          3. How We Use Information
        </h2>
        <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-muted pl-2">
          <li>To compute and visualize your semester GPA and cumulative CGPA across configurable grading scales.</li>
          <li>To generate daily study timelines, track streaks, and support consistent revision habits.</li>
          <li>To facilitate tutor matching and confirmed video sessions when scheduled.</li>
          <li>To maintain platform security, audit logs, and compliance records.</li>
        </ul>
      </div>

      {/* Section 4: Cookies & Tracking Technologies */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <FileText className="w-4 h-4 text-academic" />
          4. Cookies & Local Storage Technologies
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          We categorize browser technologies into three distinct tiers:
        </p>
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-surface-muted border border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">1. Strictly Necessary Technologies</span>
              <span className="text-academic font-semibold text-[10px]">Always Active / Required</span>
            </div>
            <p className="text-muted mt-1 leading-relaxed">
              Essential for authentication, HMAC session tokens, and route protection.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">2. Analytics Technologies</span>
              <span className="text-muted font-semibold text-[10px]">Optional / Consent-Based</span>
            </div>
            <p className="text-muted mt-1 leading-relaxed">
              Used to measure platform performance, load times, and diagnostic error reports. Disabled by default unless explicit consent is provided.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">3. Functional Preferences</span>
              <span className="text-muted font-semibold text-[10px]">Optional / Consent-Based</span>
            </div>
            <p className="text-muted mt-1 leading-relaxed">
              Preserves UI states, such as collapsed sidebar preferences and selected grading scale views.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: Data Retention & Erasure */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-3">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-academic" />
          5. Data Retention, Portability & Permanent Erasure
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
          <p>
            You possess full sovereignty over your academic and account records. You can download a complete, machine-readable JSON archive of all your data directly from your Profile settings at any time.
          </p>
          <p>
            When you request account deletion, all personal data, courses, grades, study plans, and audit trails are immediately and permanently removed from our active database via cascading delete routines.
          </p>
        </div>
      </div>

      {/* Section 6: Policy Versioning & Contact */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-2 text-xs sm:text-sm text-muted">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <FileText className="w-4 h-4 text-academic" />
          6. Policy Versioning & Contact Inquiries
        </h2>
        <p>
          Current Document Version: <strong className="text-ink font-mono">1.0</strong> • Effective Date: <span className="font-medium text-ink">October 2026</span>
        </p>
        <div className="font-mono text-xs text-academic select-all pt-1">
          privacy@academicplatform.edu
        </div>
      </div>
    </div>
  );
}
