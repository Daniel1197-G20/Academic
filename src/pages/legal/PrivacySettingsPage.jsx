import React, { useState } from 'react';
import { 
  Shield, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Cookie, 
  Lock, 
  FileText, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck 
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input } from '../../components/ui';
import { api } from '../../services/api/client';

export function PrivacySettingsPage({ 
  currentUser, 
  onBack, 
  onOpenCookieSettings, 
  onNavigate, 
  onAccountDeleted, 
  showToast 
}) {
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleExportData = async () => {
    if (!currentUser) {
      if (showToast) {
        showToast({
          type: 'info',
          title: 'Sign In Required',
          message: 'Please sign in to your student account to export your personal academic archive.'
        });
      }
      return;
    }

    setExporting(true);
    try {
      await api.exportUserData();
      if (showToast) {
        showToast({
          type: 'success',
          title: 'Export Complete',
          message: 'Your personal academic JSON archive has downloaded successfully.'
        });
      }
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Export Failed',
          message: err.message || 'Could not export user data.'
        });
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE in capital letters to confirm.');
      return;
    }

    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword || 'DELETE');
      setShowDeleteModal(false);
      if (onAccountDeleted) {
        onAccountDeleted();
      }
    } catch (err) {
      setDeleteError(err.message || 'Incorrect password or deletion error.');
    } finally {
      setDeleting(false);
    }
  };

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
            <Badge variant="ghost" size="sm">Privacy Dashboard</Badge>
            <span className="text-[11px] font-mono text-zinc-400">Policy Version 1.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Shield className="w-7 h-7 text-ghost-200" />
            Privacy & Data Rights Settings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Manage your personal data sovereignty, export your complete academic and study records, configure consent choices, or exercise account erasure rights.
          </p>
        </div>
      </div>

      {/* Authenticated Status Banner */}
      {!currentUser && (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/25 text-blue-200 text-xs leading-relaxed flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-blue-300">Unauthenticated Session</div>
            <p className="text-blue-200/80">
              You are currently viewing public privacy settings. You can manage local cookie and telemetry consent preferences below. To export your academic transcripts, CGPA history, or delete an account, please sign in.
            </p>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.('privacy')}
          className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Privacy Policy</span>
            <Badge variant="ghost" size="sm">v1.0</Badge>
          </div>
          <p className="text-[11px] text-zinc-500">Read our formal data processing and retention policy</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('terms')}
          className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Terms of Service</span>
            <Badge variant="neutral" size="sm">v1.0</Badge>
          </div>
          <p className="text-[11px] text-zinc-500">Student academic conduct, AI limits, and platform terms</p>
        </button>

        <button
          type="button"
          onClick={onOpenCookieSettings}
          className="p-4 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Cookie Preferences</span>
            <Cookie className="w-3.5 h-3.5 text-zinc-500 group-hover:text-ghost-200" />
          </div>
          <p className="text-[11px] text-zinc-500">Customize analytics & functional local storage tokens</p>
        </button>
      </div>

      {/* Section 1: Data Portability & Archive Export */}
      <Card variant="neu" className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-ghost-200" />
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
            Right to Data Portability (Personal Archive Export)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          You have the right to request a complete, machine-readable export of all data stored in our PostgreSQL database associated with your identity.
        </p>
        <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-2 text-xs text-zinc-400">
          <div className="font-semibold text-zinc-300">The downloadable JSON archive contains:</div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
            <li>User account identity, role, and registration timestamp</li>
            <li>Student profile, university, department, level, and matric number</li>
            <li>All recorded academic semesters, courses, units, and grades</li>
            <li>Personal study plans, topics, checklist states, and study session logs</li>
            <li>Complete timestamped consent audit trail records</li>
          </ul>
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            loading={exporting}
            icon={Download}
            className="text-xs border-ghost-200/25 text-ghost-200 hover:bg-ghost-200/10"
          >
            Download Academic & Personal Data (JSON)
          </Button>
        </div>
      </Card>

      {/* Section 2: Contact Data Protection Officer */}
      <Card variant="neu" className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-ghost-200" />
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
            Privacy Desk & Data Inquiries
          </h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          To submit formal data access or rectification requests, ask questions about our data retention practices, or report concerns:
        </p>
        <div className="p-3 rounded-xl bg-[#080A0C] border border-white/[0.04] font-mono text-xs text-zinc-300 space-y-1">
          <div>Privacy Desk: <span className="text-ghost-200 select-all">privacy@academicplatform.example</span></div>
          <div className="text-[10px] text-zinc-500">Contact addresses are configuration placeholders pending official institutional deployment.</div>
        </div>
      </Card>

      {/* Section 3: Permanent Account Deletion */}
      {currentUser && (
        <Card variant="neu" className="p-6 border-red-500/20 bg-red-950/5 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-semibold text-red-200">
              Danger Zone: Right to Erasure (Permanent Account Deletion)
            </h2>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Deleting your account permanently purges your user record, profile, semester grades, courses, study plans, study history, and consent audit logs from the database via cascading deletion.
          </p>
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-200/90 leading-relaxed font-mono">
            ⚠️ Warning: Account deletion is permanent and cannot be undone. We do not retain shadow backups of deleted student data.
          </div>
          <div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteError('');
                setDeletePassword('');
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
              icon={Trash2}
              className="text-xs"
            >
              Permanently Delete My Account
            </Button>
          </div>
        </Card>
      )}

      {/* Deletion Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Confirm Permanent Account Deletion"
        description="Verify your identity to proceed with cascading database deletion."
        size="md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs text-zinc-300">
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200 leading-relaxed space-y-2">
            <p className="font-semibold text-red-300">
              Are you absolutely sure you want to proceed?
            </p>
            <p className="text-xs text-red-200/80">
              Your profile, courses, grades, study plans, and diagnostic progress will be completely removed.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 font-mono">
              {deleteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Type <strong className="text-red-400 font-mono">DELETE</strong> in capital letters to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Enter your current account password:
            </label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={deleting}
              icon={Trash2}
            >
              Confirm & Purge Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
