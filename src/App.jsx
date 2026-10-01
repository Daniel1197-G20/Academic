import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sidebar, 
  BottomNav, 
  TopHeader 
} from './components/navigation';
import { 
  ToastProvider, 
  useToast, 
  LoadingSpinner, 
  Card, 
  Badge,
  Button 
} from './components/ui';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CgpaPage } from './pages/cgpa/CgpaPage';
import { StudyPlannerPage } from './pages/study/StudyPlannerPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsPage } from './pages/legal/TermsPage';
import { CookieSettingsPage } from './pages/legal/CookieSettingsPage';
import { PrivacySettingsPage } from './pages/legal/PrivacySettingsPage';
import { CookieSettingsModal } from './components/legal/CookieSettingsModal';
import { ConsentBanner } from './components/legal/ConsentBanner';
import { Footer } from './components/common/Footer';
import { api } from './services/api/client';
import { Users, Compass, Sparkles, FileCheck2, ArrowLeft } from 'lucide-react';

function AppContent() {
  const { addToast } = useToast();

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Platform Data State
  const [semesters, setSemesters] = useState([]);
  const [selectedScale, setSelectedScale] = useState('5.0');
  const [availableScales, setAvailableScales] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [streakData, setStreakData] = useState({ streak: 0, totalHours: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  // Shell State & Modals
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);

  // Handle URL Path / Hash routing for legal pages
  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, '');
    const hash = window.location.hash.replace(/^#\/?/, '');
    const route = path || hash;
    if (['privacy', 'terms', 'cookie-settings', 'privacy-settings'].includes(route)) {
      setActiveTab(route);
    }

    const handlePopState = () => {
      const p = window.location.pathname.replace(/^\//, '');
      const h = window.location.hash.replace(/^#\/?/, '');
      const r = p || h;
      if (['privacy', 'terms', 'cookie-settings', 'privacy-settings', 'dashboard', 'overview', 'cgpa', 'study', 'profile'].includes(r)) {
        setActiveTab(r);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateRoute = (target) => {
    setActiveTab(target);
    if (['privacy', 'terms', 'cookie-settings', 'privacy-settings'].includes(target)) {
      window.history.pushState({}, '', `/${target}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Check initial session
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = api.getToken();
        if (!token) {
          setAuthChecking(false);
          return;
        }
        const me = await api.getMe();
        setCurrentUser(me.user);
        setUserProfile(me.profile);
        setSelectedScale(me.selectedScale || '5.0');
      } catch (err) {
        console.warn('Session expired or invalid, logging out', err);
        api.logout();
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch student data when logged in
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    setDataLoading(true);
    try {
      const [recordsRes, scalesRes, plansRes, streakRes] = await Promise.all([
        api.getAcademicRecords(),
        api.getScales(),
        api.getStudyPlans(),
        api.getStreak()
      ]);

      setSemesters(recordsRes.semesters || []);
      setSelectedScale(recordsRes.selectedScale || '5.0');
      setAvailableScales(scalesRes.scales || []);
      setStudyPlans(plansRes.plans || []);
      setStreakData(streakRes || { streak: 0, totalHours: 0 });
    } catch (err) {
      addToast({ type: 'error', title: 'Data Sync Error', message: err.message });
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, addToast]);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // Handle Login Success
  const handleLoginSuccess = (authData) => {
    setCurrentUser(authData.user);
    setUserProfile(authData.profile);
    if (authData.selectedScale) setSelectedScale(authData.selectedScale);
    addToast({
      type: 'success',
      title: 'Welcome Back',
      message: `Signed in as ${authData.profile?.full_name || authData.user.email}`
    });
  };

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setActiveTab('dashboard');
    addToast({ type: 'info', title: 'Signed Out', message: 'You have safely signed out of your workspace.' });
  };

  // Handle Permanent Account Deletion
  const handleAccountDeleted = () => {
    api.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setActiveTab('dashboard');
    addToast({
      type: 'info',
      title: 'Account Permanently Deleted',
      message: 'All your academic, study, and consent records have been purged from the platform.'
    });
  };

  // Quick toggle topic from dashboard or study planner
  const handleToggleTopic = async (topicId) => {
    try {
      await api.toggleTopic(topicId);
      fetchAllData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-muted">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-medium mt-3 text-muted">Loading Academic Workspace...</p>
      </div>
    );
  }

  // --- Logged-Out Views (Auth & Public Legal Pages) ---
  if (!currentUser) {
    if (activeTab === 'privacy') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <PrivacyPolicyPage onBack={() => navigateRoute('auth')} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    if (activeTab === 'terms') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <TermsPage onBack={() => navigateRoute('auth')} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    if (activeTab === 'cookie-settings') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <CookieSettingsPage onBack={() => navigateRoute('auth')} showToast={addToast} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    if (activeTab === 'privacy-settings') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <PrivacySettingsPage 
            currentUser={currentUser}
            onBack={() => navigateRoute('auth')} 
            onOpenCookieSettings={() => setShowCookieModal(true)}
            onNavigate={navigateRoute}
            onAccountDeleted={handleAccountDeleted}
            showToast={addToast} 
          />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    return (
      <>
        <AuthPage 
          onLoginSuccess={handleLoginSuccess}
          onNavigateLegal={navigateRoute}
          onOpenCookieSettings={() => setShowCookieModal(true)}
        />
        <CookieSettingsModal
          isOpen={showCookieModal}
          onClose={() => setShowCookieModal(false)}
          showToast={addToast}
        />
        <ConsentBanner
          onOpenSettings={() => setShowCookieModal(true)}
        />
      </>
    );
  }

  // --- Logged-In Views ---
  const tabTitles = {
    dashboard: 'Overview',
    overview: 'Overview',
    cgpa: 'CGPA & Academic Records',
    study: 'Study Planner',
    prep: 'Test Preparation',
    community: 'Messages & Study Groups',
    tutors: 'Tutor Directory',
    ai: 'AI Academic Assistant',
    profile: 'Student Profile & Settings',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    'cookie-settings': 'Cookie Settings',
    'privacy-settings': 'Privacy & Data Rights Settings'
  };

  return (
    <div className="min-h-screen bg-canvas flex text-ink antialiased selection:bg-academic-100 selection:text-academic">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={navigateRoute}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <TopHeader
          userProfile={userProfile}
          cgpaMetrics={null}
          streakDays={streakData.streak}
          onOpenProfile={() => navigateRoute('profile')}
          activeTabTitle={tabTitles[activeTab] || 'Overview'}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {(activeTab === 'dashboard' || activeTab === 'overview') && (
            <DashboardPage
              userProfile={userProfile}
              semesters={semesters}
              studyPlans={studyPlans}
              streakData={streakData}
              selectedScale={selectedScale}
              onNavigateTab={navigateRoute}
              onToggleTopic={handleToggleTopic}
              showToast={addToast}
            />
          )}

          {activeTab === 'cgpa' && (
            <CgpaPage
              semesters={semesters}
              selectedScale={selectedScale}
              availableScales={availableScales}
              onRefreshData={fetchAllData}
              showToast={addToast}
            />
          )}

          {activeTab === 'study' && (
            <StudyPlannerPage
              studyPlans={studyPlans}
              streakData={streakData}
              onRefreshData={fetchAllData}
              showToast={addToast}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePage
              userProfile={userProfile}
              onProfileUpdated={(updated) => setUserProfile(updated)}
              onAccountDeleted={handleAccountDeleted}
              onOpenCookieSettings={() => setShowCookieModal(true)}
              onNavigateLegal={navigateRoute}
              showToast={addToast}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacyPolicyPage onBack={() => navigateRoute('profile')} />
          )}

          {activeTab === 'terms' && (
            <TermsPage onBack={() => navigateRoute('profile')} />
          )}

          {activeTab === 'cookie-settings' && (
            <CookieSettingsPage onBack={() => navigateRoute('profile')} showToast={addToast} />
          )}

          {activeTab === 'privacy-settings' && (
            <PrivacySettingsPage
              currentUser={currentUser}
              onBack={() => navigateRoute('profile')}
              onOpenCookieSettings={() => setShowCookieModal(true)}
              onNavigate={navigateRoute}
              onAccountDeleted={handleAccountDeleted}
              showToast={addToast}
            />
          )}

          {/* Placeholders for Future Modules */}
          {activeTab === 'prep' && (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="bg-white border border-border rounded-card p-8 shadow-subtle space-y-4">
                <div className="w-12 h-12 rounded-xl bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto mb-2">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <Badge variant="academic" size="sm">Upcoming Module</Badge>
                <h2 className="text-lg font-bold text-ink">Test Preparation & Exam Simulation</h2>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                  Diagnostic question banks, timed test drills, and real-time weak topic breakdowns will be activated in the next release cycle.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigateRoute('dashboard')}
                  >
                    Return to Overview
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="bg-white border border-border rounded-card p-8 shadow-subtle space-y-4">
                <div className="w-12 h-12 rounded-xl bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <Badge variant="academic" size="sm">Upcoming Module</Badge>
                <h2 className="text-lg font-bold text-ink">Study Groups & Peer Collaboration</h2>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                  Real-time peer study groups, channel discussions, and audio study halls are slated for Phase 4.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigateRoute('study')}
                  >
                    Return to Study Planner
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tutors' && (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="bg-white border border-border rounded-card p-8 shadow-subtle space-y-4">
                <div className="w-12 h-12 rounded-xl bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto mb-2">
                  <Compass className="w-6 h-6" />
                </div>
                <Badge variant="academic" size="sm">Upcoming Module</Badge>
                <h2 className="text-lg font-bold text-ink">Tutor Marketplace & Booking Engine</h2>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                  The verified tutor directory, slot availability calendar, and escrow booking workflow are slated for Phase 3.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigateRoute('dashboard')}
                  >
                    Return to Overview
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="bg-white border border-border rounded-card p-8 shadow-subtle space-y-4">
                <div className="w-12 h-12 rounded-xl bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <Badge variant="academic" size="sm">Upcoming Module</Badge>
                <h2 className="text-lg font-bold text-ink">AI Academic Assistant</h2>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                  Contextual AI tutoring across 6 learning modes with real-time SSE streaming is slated for Phase 6.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigateRoute('dashboard')}
                  >
                    Return to Overview
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Universal Footer */}
        <Footer
          onNavigate={navigateRoute}
          onOpenCookieSettings={() => setShowCookieModal(true)}
        />
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={navigateRoute}
      />

      {/* Universal Cookie Settings Modal */}
      <CookieSettingsModal
        isOpen={showCookieModal}
        onClose={() => setShowCookieModal(false)}
        showToast={addToast}
      />

      {/* First-Visit Consent Banner */}
      <ConsentBanner
        onOpenSettings={() => setShowCookieModal(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
