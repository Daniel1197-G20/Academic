import React, { useState } from 'react';
import { Shield, FileText, Cookie, Mail } from 'lucide-react';
import { Modal, Button } from '../ui';

export function Footer({ onNavigate, onOpenCookieSettings, className = '' }) {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className={`w-full py-8 px-4 sm:px-6 mt-auto text-xs text-muted ${className || 'bg-white border-t border-border'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Legal Disclaimer */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink tracking-tight">
                Academic Platform
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-academic-50 text-academic border border-academic-100">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-muted max-w-md">
              © {new Date().getFullYear()} Academic Platform. Designed for serious academic study, grade tracking, and performance analytics.
            </p>
          </div>

          {/* Legal Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs">
            <button
              type="button"
              onClick={() => onNavigate?.('privacy')}
              className="text-muted hover:text-academic transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('terms')}
              className="text-muted hover:text-academic transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('privacy-settings')}
              className="text-muted hover:text-academic transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Settings
            </button>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="text-muted hover:text-academic transition-colors flex items-center gap-1.5"
            >
              <Cookie className="w-3.5 h-3.5" />
              Cookie Settings
            </button>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="text-muted hover:text-academic transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Contact & Inquiries Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact & Support"
        description="Official contact channels for academic inquiries, data protection requests, and platform support."
        size="md"
      >
        <div className="space-y-4 text-xs text-ink">
          <div className="p-4 rounded-card bg-canvas border border-border shadow-tactile-surface space-y-1.5">
            <h4 className="font-semibold text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-academic" />
              Privacy & Data Inquiries
            </h4>
            <p className="text-muted leading-relaxed">
              For student data export requests, account deletion verification, or questions regarding our data practices:
            </p>
            <div className="font-mono text-academic bg-white p-2.5 rounded-btn border border-border shadow-tactile-inset-sm text-[11px] select-all">
              privacy@academicplatform.edu
            </div>
          </div>

          <div className="p-4 rounded-card bg-canvas border border-border shadow-tactile-surface space-y-1.5">
            <h4 className="font-semibold text-ink flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-academic" />
              Academic Inquiries & Feedback
            </h4>
            <p className="text-muted leading-relaxed">
              For institution partnerships, grading scale adjustments, or bug reports:
            </p>
            <div className="font-mono text-academic bg-white p-2.5 rounded-btn border border-border shadow-tactile-inset-sm text-[11px] select-all">
              support@academicplatform.edu
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowContactModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
