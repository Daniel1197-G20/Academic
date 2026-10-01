import React, { useState } from 'react';
import { Shield, FileText, Cookie, Mail, ExternalLink, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui';

export function Footer({ onNavigate, onOpenCookieSettings }) {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="w-full bg-[#050608] border-t border-white/[0.05] py-8 px-4 sm:px-6 mt-auto text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Legal Disclaimer */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-200 tracking-tight">
                ACADEMIC<span className="text-ghost-200 font-mono">OS</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-ghost-200/10 text-ghost-200 border border-ghost-200/20">
                v1.0 Draft
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono max-w-md">
              © {new Date().getFullYear()} Student Academic Platform. Product and architectural draft. Subject to formal legal review before production deployment.
            </p>
          </div>

          {/* Legal Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => onNavigate?.('privacy')}
              className="text-zinc-400 hover:text-ghost-200 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('terms')}
              className="text-zinc-400 hover:text-ghost-200 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms & Conditions
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('privacy-settings')}
              className="text-zinc-400 hover:text-ghost-200 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Settings
            </button>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="text-zinc-400 hover:text-ghost-200 transition-colors flex items-center gap-1"
            >
              <Cookie className="w-3.5 h-3.5" />
              Cookie Settings
            </button>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="text-zinc-400 hover:text-ghost-200 transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact
            </button>
          </div>
        </div>

        {/* Operating entity / legal notice */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-white/[0.03] text-center text-[10px] text-zinc-600 font-mono">
          Operated by: <span className="text-zinc-400">[Configurable Legal Entity / Institution Placeholder]</span> • For data privacy inquiries contact: <span className="text-zinc-400">[privacy@academicplatform.example]</span>
        </div>
      </footer>

      {/* Contact & Inquiries Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact & Legal Inquiries"
        description="Official contact channels for privacy requests, academic integrity reports, and general feedback."
        size="md"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <div className="p-3.5 rounded-xl bg-[#090C0F] border border-white/[0.06] space-y-2">
            <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-ghost-200" />
              Privacy & Data Protection Officer
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              To request personal data exports, submit account deletion notices, or exercise your privacy rights, please contact our privacy desk:
            </p>
            <div className="font-mono text-ghost-200 bg-black/40 p-2 rounded border border-ghost-200/20 text-[11px] select-all">
              privacy@academicplatform.example
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              Note: Contact addresses are configuration placeholders pending official production business entity registration.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090C0F] border border-white/[0.06] space-y-2">
            <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-ghost-200" />
              Academic Integrity & Content Moderation
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              To report academic dishonesty, prohibited study group materials, or conduct violations:
            </p>
            <div className="font-mono text-ghost-200 bg-black/40 p-2 rounded border border-ghost-200/20 text-[11px] select-all">
              integrity@academicplatform.example
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
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
