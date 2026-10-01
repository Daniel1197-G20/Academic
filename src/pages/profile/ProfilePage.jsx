import React, { useState } from 'react';
import { 
  User, 
  School, 
  BookMarked, 
  ShieldCheck, 
  Save, 
  Tag, 
  Shield, 
  Download, 
  Trash2, 
  Lock, 
  FileText, 
  Cookie, 
  Mail, 
  AlertTriangle 
} from 'lucide-react';
import { Button, Input, Badge, Modal, Avatar, PageHeader } from '../../components/ui';
import { api } from '../../services/api/client';

export function ProfilePage({ 
  userProfile, 
  onProfileUpdated, 
  onAccountDeleted, 
  onOpenCookieSettings, 
  onNavigateLegal,
  showToast 
}) {
  const [activeSubTab, setActiveSubTab] = useState('academic'); // 'academic' | 'privacy'

  // Academic Form States
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '');
  const [institution, setInstitution] = useState(userProfile?.institution || '');
  const [department, setDepartment] = useState(userProfile?.department || '');
  const [academicLevel, setAcademicLevel] = useState(userProfile?.academic_level || 'Year 3 (Junior)');
  const [matricNumber, setMatricNumber] = useState(userProfile?.matric_number || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [interests, setInterests] = useState(
    Array.isArray(userProfile?.academic_interests) 
      ? userProfile.academic_interests.join(', ')
      : typeof userProfile?.academic_interests === 'string'
        ? (JSON.parse(userProfile.academic_interests || '[]')).join(', ')
        : 'Algorithms, Distributed Systems, Applied ML'
  );
  const [preferences, setPreferences] = useState(
    Array.isArray(userProfile?.study_preferences)
      ? userProfile.study_preferences.join(', ')
      : typeof userProfile?.study_preferences === 'string'
        ? (JSON.parse(userProfile.study_preferences || '[]')).join(', ')
        : 'Night Focus, Interactive Quizzes'
  );

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Account Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const interestsArray = interests.split(',').map(s => s.trim()).filter(Boolean);
      const preferencesArray = preferences.split(',').map(s => s.trim()).filter(Boolean);

      const res = await api.updateProfile({
        fullName,
        avatarUrl,
        institution,
        department,
        academicLevel,
        matricNumber,
        bio,
        academicInterests: interestsArray,
        studyPreferences: preferencesArray
      });

      showToast({ type: 'success', title: 'Profile Updated', message: 'Your student information has been saved.' });
      if (onProfileUpdated) onProfileUpdated(res.profile);
    } catch (err) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await api.exportUserData();
      showToast({
        type: 'success',
        title: 'Export Complete',
        message: 'Your personal academic records have been downloaded as a JSON file.'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not export user data.'
      });
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

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm identity.');
      return;
    }

    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
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
    <div className="max-w-4xl space-y-8 pb-20 md:pb-8">
      {/* 1. Header */}
      <PageHeader
        title="Student Profile & Settings"
        description="Manage your institutional affiliations, student identity, and privacy rights."
      />

      {/* 2. Profile Identity Banner */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <Avatar
            name={fullName || 'Student'}
            src={avatarUrl}
            size="xl"
          />
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-ink truncate">{fullName}</h2>
              <Badge variant="academic">Verified Student</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              {institution || 'University Member'} • {department || 'Department Member'}
            </p>
            <p className="text-xs text-muted">
              ID / Matric: <strong className="text-ink font-medium">{matricNumber || 'Not Specified'}</strong> • {academicLevel}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Section Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          type="button"
          onClick={() => setActiveSubTab('academic')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'academic'
              ? 'border-academic text-academic'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <User className="w-4 h-4" />
          Academic Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('privacy')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'privacy'
              ? 'border-academic text-academic'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Shield className="w-4 h-4" />
          Privacy & Data Rights
        </button>
      </div>

      {/* 4. Tab 1: Academic Form */}
      {activeSubTab === 'academic' && (
        <div className="bg-white border border-border rounded-card p-6 shadow-subtle">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Avatar Image URL (Optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Leave blank to use initials avatar"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Institution / University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
              <Input
                label="Department / Major"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <Input
                label="Academic Level"
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                placeholder="e.g. Year 3 (Senior)"
              />
            </div>

            <Input
              label="Student Matriculation ID"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. AIT/2023/CS/084"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Academic Bio & Research Focus
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Academic interests, research areas, or study focus..."
                className="w-full bg-white text-ink text-sm rounded-[10px] p-3 border border-border focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Academic Interests (Comma-separated)"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Algorithms, Machine Learning, Systems"
              />
              <Input
                label="Study Preferences (Comma-separated)"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Night Focus, Interactive Quizzes"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-academic" />
                <span>All changes synchronized to your secure database profile</span>
              </div>
              <Button
                type="submit"
                variant="academic"
                loading={saving}
                icon={Save}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Tab 2: Privacy & Data Rights */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-6">
          {/* Transparency & Legal Docs */}
          <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Shield className="w-4 h-4 text-academic" />
              Legal Policies & Information Architecture
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Review our operational legal documents, data retention specifications, and academic standards.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigateLegal?.('privacy')}
                className="p-4 rounded-xl border border-border hover:border-gray-300 text-left transition-colors bg-surface-muted/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-ink">Privacy Policy</span>
                  <Badge variant="academic" size="sm">v1.0</Badge>
                </div>
                <p className="text-[11px] text-muted">How academic records are stored and protected</p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateLegal?.('terms')}
                className="p-4 rounded-xl border border-border hover:border-gray-300 text-left transition-colors bg-surface-muted/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-ink">Terms of Service</span>
                  <Badge variant="neutral" size="sm">v1.0</Badge>
                </div>
                <p className="text-[11px] text-muted">Academic integrity and conduct regulations</p>
              </button>

              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="p-4 rounded-xl border border-border hover:border-gray-300 text-left transition-colors bg-surface-muted/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-ink">Cookie Settings</span>
                  <Cookie className="w-3.5 h-3.5 text-muted" />
                </div>
                <p className="text-[11px] text-muted">Manage diagnostic and functional cookies</p>
              </button>
            </div>
          </div>

          {/* Data Portability (Export) */}
          <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Download className="w-4 h-4 text-academic" />
              Data Portability & Full Account Export
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              You have the right to download a complete copy of all your coursework, grades, semester GPAs, study plans, and consent audit logs in open JSON format.
            </p>
            <div className="p-4 rounded-xl bg-canvas border border-border/80 space-y-1.5 text-xs text-muted">
              <span className="font-semibold text-ink">Included in the export file:</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted">
                <li>Student identity, institution, and affiliation records</li>
                <li>All semesters, enrolled courses, units, and letter grades</li>
                <li>Cumulative CGPA progression metrics and quality points</li>
                <li>Study planner objectives and completed session hours</li>
                <li>Timestamped consent preferences and audit logs</li>
              </ul>
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportData}
                loading={exporting}
                icon={Download}
              >
                Download Account Archive (JSON)
              </Button>
            </div>
          </div>

          {/* Privacy Inquiries */}
          <div className="bg-white border border-border rounded-card p-5 shadow-subtle space-y-2">
            <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-academic" />
              Privacy Officer & Data Protection
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              To submit a formal access or rectification request, contact our student privacy desk:
            </p>
            <div className="font-mono text-xs text-academic select-all">
              privacy@academicplatform.edu
            </div>
          </div>

          {/* Danger Zone: Permanent Account Deletion */}
          <div className="bg-white border border-danger-100 rounded-card p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-danger">
                Danger Zone: Permanent Account Deletion
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Deleting your account permanently deletes all your personal info, courses, semester grades, CGPA calculation history, and study schedules.
            </p>
            <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-100 text-xs text-danger font-medium leading-relaxed">
              This action is permanent and immediate. Once deleted, your academic data cannot be restored.
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
        </div>
      )}

      {/* Confirmation Modal for Permanent Account Deletion */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Confirm Permanent Account Deletion"
        description="Verify your identity to proceed with permanent deletion."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs text-ink">
          <div className="p-3.5 rounded-xl bg-danger-50 border border-danger-100 text-danger leading-relaxed space-y-1.5">
            <p className="font-bold">
              Are you sure you want to proceed?
            </p>
            <p className="text-xs opacity-90">
              Your profile, courses, grades, study plans, and progress will be erased completely.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-100 text-xs text-danger font-medium">
              {deleteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Type <strong className="text-danger font-mono">DELETE</strong> to confirm:
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
              Confirm Deletion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
