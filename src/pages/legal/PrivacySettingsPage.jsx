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
import { Button, Badge, Modal, Input, PageHeader } from '../../components/ui';
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-4 px-4 sm:px-6">
      {/* Top Back Navigation */}
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
        title="Privacy & Data Rights Settings"
        description="Manage your student data sovereignty, download your academic history, and control consent choices."
        badge={<Badge variant="academic" size="sm">Policy Version 1.0</Badge>}
      />

      {/* Unauthenticated Session Notice */}
      {!currentUser && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-ink text-xs leading-relaxed flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-navy shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-ink">Public Guest Mode</p>
            <p className="text-muted leading-relaxed">
              You are currently viewing public privacy settings. You can manage local cookie and telemetry preferences below. Sign in to export your academic transcripts or delete an existing account.
            </p>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.('privacy')}
          className="p-4 rounded-xl bg-white border border-border hover:border-gray-300 text-left transition-colors shadow-subtle"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-ink">Privacy Policy</span>
            <Badge variant="academic" size="sm">v1.0</Badge>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">Read our formal data processing and retention policy</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('terms')}
          className="p-4 rounded-xl bg-white border border-border hover:border-gray-300 text-left transition-colors shadow-subtle"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-ink">Terms of Service</span>
            <Badge variant="neutral" size="sm">v1.0</Badge>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">Student academic conduct, integrity rules, and terms</p>
        </button>

        <button
          type="button"
          onClick={onOpenCookieSettings}
          className="p-4 rounded-xl bg-white border border-border hover:border-gray-300 text-left transition-colors shadow-subtle"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-xs text-ink">Cookie Preferences</span>
            <Cookie className="w-3.5 h-3.5 text-muted" />
          </div>
          <p className="text-[11px] text-muted leading-relaxed">Customize diagnostic and functional technologies</p>
        </button>
      </div>

      {/* Section 1: Data Portability & Archive Export */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-academic" />
          <h2 className="text-base sm:text-lg font-semibold text-ink">
            Right to Data Portability (Personal Archive Export)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          You have the right to request a complete, machine-readable export of all records stored in our database associated with your student identity.
        </p>
        <div className="p-4 rounded-xl bg-canvas border border-border/80 space-y-1.5 text-xs text-muted">
          <p className="font-semibold text-ink">The downloadable JSON archive contains:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-muted">
            <li>User account identity, role, and registration date</li>
            <li>Student profile, institution, department, and matric ID</li>
            <li>All recorded academic terms, courses, credit units, and letter grades</li>
            <li>Personal study plans, checklists, and logged study hours</li>
            <li>Complete timestamped consent audit logs</li>
          </ul>
        </div>
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={handleExportData}
            loading={exporting}
            icon={Download}
            size="sm"
          >
            Download Academic & Personal Data (JSON)
          </Button>
        </div>
      </div>

      {/* Section 2: Privacy Desk */}
      <div className="bg-white border border-border rounded-card p-5 shadow-subtle space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-academic" />
          <h2 className="text-sm font-semibold text-ink">
            Privacy Desk & Data Inquiries
          </h2>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          To submit formal access or rectification requests, ask questions about our data retention practices, or report concerns:
        </p>
        <div className="font-mono text-xs text-academic select-all pt-1">
          privacy@academicplatform.edu
        </div>
      </div>

      {/* Section 3: Permanent Account Deletion */}
      {currentUser && (
        <div className="bg-white border border-danger-100 rounded-card p-6 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-bold text-danger">
              Danger Zone: Right to Erasure (Permanent Account Deletion)
            </h2>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Deleting your account permanently purges your user profile, course entries, semester grades, CGPA calculation history, and study plans from the database via cascading deletion.
          </p>
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-100 text-xs text-danger font-medium leading-relaxed">
            This action is permanent and cannot be undone. All active sessions will be terminated immediately.
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
            >
              Permanently Delete My Account
            </Button>
          </div>
        </div>
      )}

      {/* Deletion Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Confirm Permanent Account Deletion"
        description="Verify your identity to proceed with permanent database deletion."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs text-ink">
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-100 text-danger leading-relaxed space-y-1">
            <p className="font-bold">
              Are you sure you want to proceed?
            </p>
            <p className="text-xs opacity-90">
              Your profile, courses, grades, study plans, and diagnostic progress will be completely removed.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-100 text-xs text-danger font-medium">
              {deleteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Type <strong className="text-danger font-mono">DELETE</strong> in capital letters to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
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

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
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
