import React, { useState } from 'react';
import { 
  User, 
  School, 
  BookMarked, 
  ShieldCheck, 
  Save, 
  Sparkles,
  Tag,
  CheckCircle2,
  Shield,
  Download,
  Trash2,
  Lock,
  FileText,
  Cookie,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Modal, Avatar } from '../../components/ui';
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
        title: 'Export Initiated',
        message: 'Your personal and academic archive is downloading as a JSON file.'
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
    <div className="max-w-4xl space-y-6 pb-20 md:pb-6">
      {/* Profile Header Hero */}
      <div className="neu-card p-6 border-ghost-200/15 relative overflow-hidden bg-gradient-to-br from-[#0A0D10] to-[#050608]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <Avatar
            name={fullName || 'Student'}
            src={avatarUrl}
            size="xl"
          />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">{fullName}</h2>
              <Badge variant="ghost" size="sm">Student Account</Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono">
              {institution || 'University Member'} • {department || 'Department Member'}
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              Matric / Student ID: {matricNumber || 'Not Specified'} • {academicLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Section Tabs */}
      <div className="flex border-b border-white/[0.06] gap-4">
        <button
          type="button"
          onClick={() => setActiveSubTab('academic')}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'academic'
              ? 'border-ghost-200 text-ghost-200'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-4 h-4" />
          Academic Identity & Info
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('privacy')}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'privacy'
              ? 'border-ghost-200 text-ghost-200'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Privacy & Data Rights
        </button>
      </div>

      {/* Tab 1: Academic Identity */}
      {activeSubTab === 'academic' && (
        <Card variant="neu" className="p-6">
          <CardHeader className="p-0 pb-4 border-b border-white/[0.04]">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-ghost-200" />
              Academic Identity & Settings
            </CardTitle>
            <CardDescription>
              Manage your personal student profile, university affiliations, and study preferences.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Custom Avatar Image URL (Optional)"
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
              label="Matriculation / Student ID"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. AIT/2023/CS/084"
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 tracking-wide mb-1.5">
                Academic Bio & Focus
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other students and tutors about your academic goals..."
                className="w-full bg-[#080A0C] text-zinc-100 text-sm rounded-xl p-3 border border-white/[0.06] neu-inset focus:outline-none focus:border-ghost-200/50 focus:ring-1 focus:ring-ghost-200/40"
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

            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-ghost-200" />
                <span>All records synced with PostgreSQL</span>
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                icon={Save}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Privacy, Consent & Data Rights */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-6">
          {/* Transparency & Legal Docs */}
          <Card variant="neu" className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-ghost-200" />
              Privacy Policy & Terms of Service
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Review our operational legal drafts, data retention criteria, and academic integrity policies.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigateLegal?.('privacy')}
                className="p-3.5 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Privacy Policy</span>
                  <Badge variant="ghost" size="sm">v1.0</Badge>
                </div>
                <p className="text-[11px] text-zinc-500">How your academic data is collected and protected</p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateLegal?.('terms')}
                className="p-3.5 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Terms of Service</span>
                  <Badge variant="neutral" size="sm">v1.0</Badge>
                </div>
                <p className="text-[11px] text-zinc-500">Academic integrity, AI limits & marketplace rules</p>
              </button>

              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="p-3.5 rounded-xl bg-[#090C0F] border border-white/[0.06] hover:border-ghost-200/30 text-left transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-200 group-hover:text-ghost-200">Cookie Settings</span>
                  <Cookie className="w-3.5 h-3.5 text-zinc-500 group-hover:text-ghost-200" />
                </div>
                <p className="text-[11px] text-zinc-500">Manage analytics & functional technologies</p>
              </button>
            </div>
          </Card>

          {/* Data Portability (Export) */}
          <Card variant="neu" className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-ghost-200" />
              Data Portability & Account Export
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Under applicable data protection standards, you have the right to obtain a copy of all information associated with your account in a structured, commonly used machine-readable format.
            </p>
            <div className="p-3.5 rounded-xl bg-[#080A0C] border border-white/[0.04] space-y-2 text-xs text-zinc-400">
              <div className="font-semibold text-zinc-300">The export package includes:</div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                <li>Account profile, institution, and affiliation data</li>
                <li>All recorded semesters, courses, credit units, and letter grades</li>
                <li>Cumulative CGPA and semester GPA metrics</li>
                <li>Study plans, roadmaps, topic checklists, and study log history</li>
                <li>Complete timestamped consent audit logs</li>
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
                Download Complete Personal Data (JSON)
              </Button>
            </div>
          </Card>

          {/* Privacy Inquiries */}
          <Card variant="flat" className="p-5 space-y-2">
            <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
              <Mail className="w-4 h-4 text-ghost-200" />
              Privacy Officer & Regulatory Contact
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If you have inquiries regarding data protection, wish to submit a formal rectification request, or have questions regarding educational consent for minors, contact our privacy desk:
            </p>
            <div className="font-mono text-xs text-ghost-200 select-all">
              privacy@academicplatform.example
            </div>
          </Card>

          {/* Danger Zone: Account Deletion */}
          <Card variant="neu" className="p-6 border-red-500/20 bg-red-950/5 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold text-red-200">
                Danger Zone: Permanent Account Deletion
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Deleting your account permanently purges your identity, academic course entries, semester grades, CGPA calculation history, study plans, study session logs, and consent audit records from our active PostgreSQL database.
            </p>
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-200/90 leading-relaxed font-mono">
              ⚠️ Warning: This action is permanent and cannot be undone. All active sessions will be invalidated immediately.
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
        </div>
      )}

      {/* Confirmation Modal for Permanent Account Deletion */}
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
              Your profile, courses, grades, study plans, and diagnostic progress will be completely removed. We do not maintain unverified shadow backups of deleted student data.
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
