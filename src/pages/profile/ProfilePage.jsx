import React, { useState, useRef } from 'react';
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
  AlertTriangle,
  CreditCard,
  LogOut,
  ChevronRight,
  Camera,
  Upload,
  Loader2,
  X,
  Moon,
  Sun,
  GraduationCap,
  Award,
  Settings
} from 'lucide-react';
import { Button, Input, Badge, Modal, Avatar, PageHeader, Tabs } from '../../components/ui';
import { api } from '../../services/api/client';
import { supabase } from '../../lib/supabase/client';
import { syncEngine, SYNC_EVENTS } from '../../lib/sync/syncEngine';
import { SubscriptionSettingsSection } from '../billing/SubscriptionSettingsSection';

export function ProfilePage({
  userProfile,
  onProfileUpdated,
  onAccountDeleted,
  onOpenCookieSettings,
  onNavigateLegal,
  onNavigatePricing,
  onLogout,
  showToast
}) {
  const [activeSubTab, setActiveSubTab] = useState('academic'); // 'academic' | 'subscription' | 'privacy' | 'account'

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

  // Appearance / Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studora_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const toggleTheme = (enableDark) => {
    setIsDarkMode(enableDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('studora_theme', enableDark ? 'dark' : 'light');
      if (enableDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    showToast?.({
      type: 'info',
      title: 'Appearance Updated',
      message: enableDark ? 'Dark appearance enabled.' : 'Light appearance enabled.'
    });
  };

  // Avatar Upload States
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Account Logout Modal States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Account Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Handle Avatar Image File Upload
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showToast({
        type: 'error',
        title: 'Invalid Image Format',
        message: 'Please select a JPEG, PNG, or WebP image file.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Client-side 5MB max size validation
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Profile picture must be under 5 MB in size.'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      // Get authoritative session user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || userProfile?.id;
      if (!userId) {
        throw new Error('Authentication required to upload profile avatar.');
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/profile.${fileExt}`;

      // Upload file directly to Supabase Storage `avatars` bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL for uploaded avatar
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // Update backend profile record
      const res = await api.updateProfile({ avatarUrl: publicUrl });

      setAvatarUrl(publicUrl);
      if (onProfileUpdated) onProfileUpdated(res.profile || { ...userProfile, avatar_url: publicUrl });

      // Notify peer devices of avatar change
      syncEngine.broadcastUpdate(SYNC_EVENTS.PROFILE_UPDATED, { avatar_url: publicUrl });

      showToast({
        type: 'success',
        title: 'Photo Updated',
        message: 'Your profile picture has been updated successfully.'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload profile picture.'
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await api.updateProfile({ avatarUrl: '' });
      setAvatarUrl('');
      if (onProfileUpdated) onProfileUpdated(res.profile || { ...userProfile, avatar_url: '' });

      syncEngine.broadcastUpdate(SYNC_EVENTS.PROFILE_UPDATED, { avatar_url: '' });

      showToast({
        type: 'info',
        title: 'Photo Removed',
        message: 'Your profile picture has been removed.'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not remove profile picture.'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      if (onLogout) {
        await onLogout();
      }
    } catch (err) {
      if (showToast) showToast({ type: 'error', title: 'Logout Notice', message: err.message });
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

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
      syncEngine.broadcastUpdate(SYNC_EVENTS.PROFILE_UPDATED, res.profile);
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
    <div className="max-w-5xl space-y-6 pb-20 md:pb-8">
      {/* Hidden Native File Input with Camera Support for Mobile */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        aria-label="Upload profile photo"
      />

      {/* 1. Header matching Dashboard visual tone */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
          Profile & Account
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
          Manage your personal details, academic information, and settings
        </p>
      </div>

      {/* 2. Profile Identity Banner matching Section 0_1 */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1 min-w-0">
            {/* Avatar Container with Camera Overlay */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/80 dark:border-white/10 shadow-sm bg-[#176B4D] flex items-center justify-center text-white font-bold text-2xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName || 'Student'} className="w-full h-full object-cover" />
                ) : (
                  <span>{(fullName || 'Student').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              {uploadingAvatar ? (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#176B4D] text-white shadow-md hover:bg-[#12543C] transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white truncate">{fullName || 'Student'}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#DDEFE5] dark:bg-[#176B4D]/40 text-[#176B4D] dark:text-[#A7F3D0] text-xs font-bold">
                  {userProfile?.role === 'tutor' ? 'Verified Tutor' : 'Verified Student'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70">
                {institution || 'University Member'} • {department || 'Department Member'}
              </p>
              <p className="text-xs text-[#667085] dark:text-white/60">
                ID / Matric: <strong className="text-[#111827] dark:text-white font-mono font-medium">{matricNumber || 'Not Specified'}</strong> • {academicLevel}
              </p>

              {/* Upload & Remove Picture Action Row */}
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] transition-all shadow-sm"
                >
                  Upload Picture
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1 rounded-xl bg-white/70 dark:bg-white/10 text-[#667085] dark:text-white/70 text-xs font-semibold hover:text-[#EF4444] transition-all border border-gray-200 dark:border-gray-800"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
          {onLogout && (
            <div className="pt-2 sm:pt-0 shrink-0">
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold hover:bg-[#EF4444]/10 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Section Tabs matching Section 0_1 */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'personal', label: 'Personal Info', icon: User },
          { id: 'academic', label: 'Academic Details', icon: GraduationCap },
          { id: 'achievements', label: 'Achievements', icon: Award },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#176B4D] text-white shadow-sm'
                  : 'text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab: Personal / Academic Form */}
      {(activeSubTab === 'academic' || activeSubTab === 'personal') && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Student Matriculation ID"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. AIT/2023/CS/084"
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111827] dark:text-white">
                Academic Bio & Research Focus
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Academic interests, research areas, or study focus..."
                className="w-full bg-white/70 dark:bg-white/5 text-[#111827] dark:text-white text-sm rounded-xl p-3 border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-[#176B4D] focus:ring-1 focus:ring-[#176B4D]"
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

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#667085] dark:text-white/60">
                <ShieldCheck className="w-4 h-4 text-[#176B4D]" />
                <span>All changes synchronized to your secure database profile</span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] transition-all shadow-sm flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Achievements */}
      {activeSubTab === 'achievements' && (
        <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827] dark:text-white">Academic Badges & Credentials</h3>
            <span className="text-xs font-mono text-[#176B4D] dark:text-[#8FC9AE]">3 Earned</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center font-bold text-lg">
                🏆
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] dark:text-white">Honor Roll</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">First Class Standing</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F6E6C2] text-[#78350F] flex items-center justify-center font-bold text-lg">
                🔥
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] dark:text-white">Focus Master</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">10+ Study Streak</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg">
                ⭐
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] dark:text-white">Verified Scholar</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">Identity Confirmed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#176B4D]" />
                Account & Appearance Settings
              </h3>
              <p className="text-xs text-[#667085] dark:text-white/60 mt-0.5">
                Manage your theme appearance, data privacy rights, and account security.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Appearance Option */}
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                  !isDarkMode
                    ? 'border-[#176B4D] bg-[#DDEFE5]/50 shadow-sm ring-2 ring-[#176B4D]/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-white/5 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white">Light Appearance</h4>
                      <p className="text-[11px] text-[#667085] dark:text-white/60">Soft off-white canvas with dark ink</p>
                    </div>
                  </div>
                  {!isDarkMode && (
                    <Badge variant="academic" size="sm">Active</Badge>
                  )}
                </div>
              </button>

              {/* Dark Appearance Option */}
              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                  isDarkMode
                    ? 'border-[#176B4D] bg-[#176B4D]/30 shadow-sm ring-2 ring-[#176B4D]/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-white/5 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-navy-950 border border-navy-800 flex items-center justify-center text-white">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white">Dark Appearance</h4>
                      <p className="text-[11px] text-[#667085] dark:text-white/60">Deep navy & ink surfaces for low light</p>
                    </div>
                  </div>
                  {isDarkMode && (
                    <Badge variant="academic" size="sm">Active</Badge>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Account Privacy & Security Controls */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-white/60">
              Data & Security
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <p className="text-xs font-bold text-[#111827] dark:text-white">Export Academic Archive</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">Download a JSON record of all course history and study logs.</p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 shrink-0 flex items-center gap-1.5"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download Archive</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-xs font-bold text-[#EF4444]">Permanent Account Deletion</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">Erase all academic records, messages, and profile data.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold hover:bg-[#EF4444]/10 shrink-0 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Privacy & Data Rights */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-6">
          {/* Transparency & Legal Docs */}
          <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
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
                className="p-4 rounded-btn border border-border hover:border-gray-300 text-left transition-all bg-canvas/40 shadow-tactile-surface hover:-translate-y-[1px]"
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
                className="p-4 rounded-btn border border-border hover:border-gray-300 text-left transition-all bg-canvas/40 shadow-tactile-surface hover:-translate-y-[1px]"
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
                className="p-4 rounded-btn border border-border hover:border-gray-300 text-left transition-all bg-canvas/40 shadow-tactile-surface hover:-translate-y-[1px]"
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

          {/* Active Session Management */}
          <div className="bg-white border border-border rounded-card p-5 shadow-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-academic" />
                  Active Student Session
                </h4>
                <p className="text-xs text-muted leading-relaxed mt-0.5">
                  Sign out of your active student session on this mobile device or browser.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLogoutModal(true)}
                icon={LogOut}
                className="text-danger hover:text-danger hover:bg-danger-50 hover:border-danger-200 shrink-0"
              >
                Sign Out
              </Button>
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

      {/* Confirmation Modal for Sign Out */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => !loggingOut && setShowLogoutModal(false)}
        title="Sign Out of Studora"
        description="Are you sure you want to end your current student session?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-ink pt-2">
          <p className="text-muted leading-relaxed">
            You will be signed out of your account on this device and returned to the home screen. Your academic records, CGPA metrics, and study plans will remain safely preserved.
          </p>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loggingOut}
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={loggingOut}
              onClick={handleConfirmLogout}
              icon={LogOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
