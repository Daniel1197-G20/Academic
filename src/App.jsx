import React, { useState, useEffect, useCallback, Suspense } from 'react';
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
  Button, 
  AppSplashScreen 
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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotFoundPage } from './components/common/NotFoundPage';
import { PageLoader } from './components/common/PageLoader';
import { api } from './services/api/client';
import { supabase } from './lib/supabase/client';
import { onAuthStateChangedListener, notifyAuthStateChange } from './services/firebase/firebaseConfig';
import { Users, Compass, Sparkles, FileCheck2, ArrowLeft, Video, BookOpen, Copy, Check, Loader2 } from 'lucide-react';
import { BillingProvider } from './context/BillingContext';
import { PricingPage } from './pages/billing/PricingPage';
import { BillingCallbackPage } from './pages/billing/BillingCallbackPage';
import { SubscriptionPage } from './pages/billing/SubscriptionPage';
import { LandingPage } from './pages/landing/LandingPage';
import { FeatureGate } from './components/billing/FeatureGate';

// Canonical route sets
const PUBLIC_ROUTES = new Set([
  'landing',
  'pricing',
  'privacy',
  'terms',
  'cookie-settings',
  'privacy-settings'
]);

const AUTH_ROUTES = new Set([
  'login',
  'register',
  'auth'
]);

const PROTECTED_ROUTES = new Set([
  'dashboard',
  'overview',
  'cgpa',
  'study',
  'test-prep',
  'prep',
  'tutors',
  'messages',
  'community',
  'profile',
  'settings',
  'settings/subscription',
  'settings-subscription',
  'billing-callback',
  'billing/callback',
  'ai'
]);

export function normalizeRoute(path) {
  const clean = (path || '').replace(/^\/+|\/+$/g, '').trim();
  if (!clean || clean === 'landing') return 'landing';
  if (clean === 'dashboard' || clean === 'overview') return 'dashboard';
  if (clean === 'test-prep' || clean === 'prep') return 'test-prep';
  if (clean === 'messages' || clean === 'community') return 'messages';
  if (clean === 'settings' || clean === 'settings/subscription' || clean === 'settings-subscription') return 'settings/subscription';
  if (clean === 'billing-callback' || clean === 'billing/callback' || clean === 'billing/success' || clean === 'billing/failed') return 'billing-callback';
  if (clean === 'login') return 'login';
  if (clean === 'register') return 'register';
  if (clean === 'auth') return 'login';
  if (clean === 'pricing') return 'pricing';
  if (clean === 'cgpa') return 'cgpa';
  if (clean === 'study') return 'study';
  if (clean === 'tutors') return 'tutors';
  if (clean === 'profile') return 'profile';
  if (clean === 'ai') return 'ai';
  if (clean === 'privacy') return 'privacy';
  if (clean === 'terms') return 'terms';
  if (clean === 'cookie-settings') return 'cookie-settings';
  if (clean === 'privacy-settings') return 'privacy-settings';
  return '404';
}

export function routeToUrl(route) {
  if (route === 'landing') return '/';
  if (route === 'settings/subscription') return '/settings/subscription';
  if (route === 'billing-callback') return '/billing/callback';
  return `/${route}`;
}

function AppContent() {
  const { addToast } = useToast();

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Platform Data State
  const [semesters, setSemesters] = useState([]);
  const [selectedScale, setSelectedScale] = useState('5.0');
  const [availableScales, setAvailableScales] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [streakData, setStreakData] = useState({ streak: 0, totalHours: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  // Helper to determine initial tab from URL pathname or hash
  const resolveInitialRoute = () => {
    const p = window.location.pathname;
    const h = window.location.hash.replace(/^#\/?/, '');
    return normalizeRoute(p || h);
  };

  // Shell State & Modals
  const [activeTab, setActiveTab] = useState(resolveInitialRoute);
  const [selectedPlanForAuth, setSelectedPlanForAuth] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);

  // AI Academic Assistant State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [copiedAiResponse, setCopiedAiResponse] = useState(false);

  // Handle URL Path / Hash routing via popstate (browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash.replace(/^#\/?/, '');
      setActiveTab(normalizeRoute(p || h));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateRoute = useCallback((target, replace = false) => {
    const normalized = normalizeRoute(target);
    setActiveTab(normalized);

    const url = routeToUrl(normalized);
    if (window.location.pathname !== url) {
      if (replace) {
        window.history.replaceState({}, '', url);
      } else {
        window.history.pushState({}, '', url);
      }
    }
  }, []);

  const handleLandingSelectPlan = (planCode) => {
    setSelectedPlanForAuth(planCode);
    if (!currentUser) {
      navigateRoute('register');
    } else {
      navigateRoute('pricing');
    }
  };

  const handleAiQuerySubmit = async (overridePrompt) => {
    const promptToSubmit = (overridePrompt ?? aiQuery ?? '').trim();
    if (!promptToSubmit) {
      addToast({ type: 'warning', title: 'Empty Query', message: 'Please enter a coursework question or select a prompt.' });
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.request('/api/ai/query', { 
        method: 'POST', 
        body: JSON.stringify({ prompt: promptToSubmit }) 
      });
      if (res && res.answer) {
        setAiResponse({
          prompt: promptToSubmit,
          answer: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        throw new Error('No analytical response received from AI Tutor.');
      }
    } catch (err) {
      setAiError(err.message || 'AI query limit reached or server unavailable.');
      addToast({ type: 'error', title: 'AI Limit Reached', message: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  // Supabase Auth Authoritative Session Verification & Lifecycle Listener
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: loading state MUST resolve and never hang indefinitely
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setAuthChecking(false);
        setShowSplash(false);
      }
    }, 4000);

    // 1. Authoritative Supabase Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserProfile(null);
          api.logout();
          notifyAuthStateChange(null, null);
          setAuthChecking(false);
          setShowSplash(false);
        }
      } else if (session?.user) {
        api.setToken(session.access_token);

        let profile = null;
        let scale = '5.0';
        try {
          const [profRes, setRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            supabase.from('user_settings').select('selected_scale').eq('user_id', session.user.id).maybeSingle()
          ]);
          if (profRes.data) profile = profRes.data;
          if (setRes.data?.selected_scale) scale = setRes.data.selected_scale;
        } catch (fetchErr) {
          console.warn('Notice loading Supabase user profile:', fetchErr);
        }

        const userObj = {
          id: session.user.id,
          email: session.user.email,
          role: 'student'
        };

        const profObj = profile || {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
          institution: session.user.user_metadata?.institution || 'General Academy',
          department: session.user.user_metadata?.department || 'General Studies',
          academic_level: session.user.user_metadata?.academic_level || 'Year 1'
        };

        setCurrentUser(userObj);
        setUserProfile(profObj);
        setSelectedScale(scale);
        notifyAuthStateChange(userObj, profObj);
        setAuthChecking(false);
        setShowSplash(false);
      }
    });

    // 2. Initial Session Check (Supabase Auth first, then Legacy API fallback)
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          api.setToken(session.access_token);

          let profile = null;
          let scale = '5.0';
          try {
            const [profRes, setRes] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
              supabase.from('user_settings').select('selected_scale').eq('user_id', session.user.id).maybeSingle()
            ]);
            if (profRes.data) profile = profRes.data;
            if (setRes.data?.selected_scale) scale = setRes.data.selected_scale;
          } catch (fetchErr) {
            console.warn('Notice loading initial Supabase user details:', fetchErr);
          }

          if (isMounted) {
            const userObj = {
              id: session.user.id,
              email: session.user.email,
              role: 'student'
            };
            const profObj = profile || {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
              institution: session.user.user_metadata?.institution || 'General Academy',
              department: session.user.user_metadata?.department || 'General Studies',
              academic_level: session.user.user_metadata?.academic_level || 'Year 1'
            };

            setCurrentUser(userObj);
            setUserProfile(profObj);
            setSelectedScale(scale);
            notifyAuthStateChange(userObj, profObj);
            setAuthChecking(false);
            setShowSplash(false);
          }
          return;
        }

        // Fallback: Legacy Session Token check (for sandbox demo account)
        const token = api.getToken();
        if (!token) {
          if (isMounted) {
            setCurrentUser(null);
            setUserProfile(null);
            setAuthChecking(false);
            setShowSplash(false);
          }
          return;
        }

        const me = await api.getMe();
        if (isMounted) {
          setCurrentUser(me.user);
          setUserProfile(me.profile);
          if (me.selectedScale) setSelectedScale(me.selectedScale);
          setAuthChecking(false);
          setShowSplash(false);
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing session', err);
        api.logout();
        if (isMounted) {
          setCurrentUser(null);
          setUserProfile(null);
          setAuthChecking(false);
          setShowSplash(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  // Route guard effect: redirects unauthenticated users from protected routes,
  // and authenticated users from login/register routes
  useEffect(() => {
    if (authChecking) return; // Wait until authentication state is resolved

    const normalized = normalizeRoute(activeTab);

    // Scenario 1: Protected route accessed by unauthenticated visitor -> redirect to /login
    if (PROTECTED_ROUTES.has(normalized) && !currentUser) {
      setActiveTab('login');
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
      }
      return;
    }

    // Scenario 2: Auth route accessed while already authenticated -> redirect to /dashboard
    if (AUTH_ROUTES.has(normalized) && currentUser) {
      setActiveTab('dashboard');
      if (window.location.pathname !== '/dashboard') {
        window.history.replaceState({}, '', '/dashboard');
      }
      return;
    }

    // Scenario 3: Unknown route
    if (normalized === '404' && activeTab !== '404') {
      setActiveTab('404');
    }
  }, [activeTab, currentUser, authChecking]);

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
    if (authData.token) {
      api.setToken(authData.token);
    }
    setCurrentUser(authData.user);
    setUserProfile(authData.profile);
    if (authData.selectedScale) setSelectedScale(authData.selectedScale);
    notifyAuthStateChange(authData.user, authData.profile);
    addToast({
      type: 'success',
      title: 'Welcome to Studora',
      message: `Signed in as ${authData.profile?.full_name || authData.user.email}`
    });

    if (selectedPlanForAuth && selectedPlanForAuth !== 'basic') {
      navigateRoute('pricing');
    } else {
      navigateRoute('dashboard');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut notice:', e);
    }
    api.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setSelectedPlanForAuth(null);
    notifyAuthStateChange(null, null);
    navigateRoute('landing');
    addToast({ type: 'info', title: 'Signed Out', message: 'You have safely signed out of your workspace.' });
  };

  // Handle Permanent Account Deletion
  const handleAccountDeleted = () => {
    api.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setSelectedPlanForAuth(null);
    notifyAuthStateChange(null, null);
    navigateRoute('landing');
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

  if (showSplash) {
    return (
      <AppSplashScreen 
        isFading={splashFading} 
        message="Loading Studora..." 
        subMessage="Study smarter. Go further." 
      />
    );
  }

  // --- Logged-Out Views (Public Landing Page, Pricing, Auth, Legal & 404 Pages) ---
  if (!currentUser) {
    if (activeTab === 'privacy') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <PrivacyPolicyPage onBack={() => navigateRoute('landing')} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    if (activeTab === 'terms') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <TermsPage onBack={() => navigateRoute('landing')} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
          <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
        </div>
      );
    }

    if (activeTab === 'cookie-settings') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <CookieSettingsPage onBack={() => navigateRoute('landing')} showToast={addToast} />
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
            onBack={() => navigateRoute('landing')} 
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

    if (activeTab === 'pricing') {
      return (
        <BillingProvider currentUser={null} showToast={addToast}>
          <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              <PricingPage 
                onBack={() => navigateRoute('landing')} 
                onSelectPlan={handleLandingSelectPlan} 
                showToast={addToast} 
              />
            </div>
            <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
            <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
            <ConsentBanner onOpenSettings={() => setShowCookieModal(true)} />
          </div>
        </BillingProvider>
      );
    }

    if (activeTab === 'login' || activeTab === 'register' || activeTab === 'auth') {
      return (
        <>
          <AuthPage 
            initialMode={activeTab === 'register' ? 'register' : 'login'}
            onLoginSuccess={handleLoginSuccess}
            onNavigateLegal={navigateRoute}
            onBackToLanding={() => navigateRoute('landing')}
            selectedPlanCode={selectedPlanForAuth}
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

    if (activeTab === '404') {
      return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-academic-100 selection:text-academic">
          <NotFoundPage onBackToStudora={() => navigateRoute('landing')} />
          <Footer onNavigate={navigateRoute} onOpenCookieSettings={() => setShowCookieModal(true)} />
          <CookieSettingsModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} showToast={addToast} />
        </div>
      );
    }

    // Default for unauthenticated visitors is the Public Landing Page!
    return (
      <BillingProvider currentUser={null} showToast={addToast}>
        <LandingPage
          onNavigate={navigateRoute}
          onSelectPlan={handleLandingSelectPlan}
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
      </BillingProvider>
    );
  }

  // --- Logged-In Views ---
  const tabTitles = {
    dashboard: 'Overview',
    overview: 'Overview',
    cgpa: 'CGPA & Academic Records',
    study: 'Study Planner',
    'test-prep': 'Test Preparation & Drills',
    prep: 'Test Preparation & Drills',
    tutors: 'Tutor Marketplace & Sessions',
    messages: 'Messages & Peer Groups',
    community: 'Messages & Peer Groups',
    ai: 'AI Academic Assistant',
    profile: 'Student Profile & Settings',
    pricing: 'Plans & Feature Entitlements',
    'settings/subscription': 'Subscription & Entitlements',
    'billing-callback': 'Payment Confirmation',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    'cookie-settings': 'Cookie Settings',
    'privacy-settings': 'Privacy & Data Rights Settings',
    landing: 'Home',
    404: 'Page Not Found'
  };

  return (
    <BillingProvider currentUser={currentUser} showToast={addToast}>
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
            onOpenPricing={() => navigateRoute('pricing')}
            onOpenSubscription={() => navigateRoute('settings/subscription')}
            activeTabTitle={tabTitles[activeTab] || 'Overview'}
          />

          {/* Page Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary onGoHome={() => navigateRoute('dashboard')}>
              <Suspense fallback={<PageLoader message="Loading Studora..." />}>
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

                {activeTab === 'landing' && (
                  <LandingPage
                    onNavigate={navigateRoute}
                    onSelectPlan={handleLandingSelectPlan}
                    onOpenCookieSettings={() => setShowCookieModal(true)}
                  />
                )}

                {activeTab === '404' && (
                  <NotFoundPage
                    onBackToStudora={() => navigateRoute('dashboard')}
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
                    onNavigatePricing={() => navigateRoute('pricing')}
                    showToast={addToast}
                  />
                )}

                {activeTab === 'pricing' && (
                  <PricingPage
                    onBack={() => navigateRoute('dashboard')}
                    showToast={addToast}
                  />
                )}

                {(activeTab === 'settings/subscription' || activeTab === 'settings' || activeTab === 'settings-subscription') && (
                  <SubscriptionPage
                    onNavigateDashboard={() => navigateRoute('dashboard')}
                    onNavigatePricing={() => navigateRoute('pricing')}
                    showToast={addToast}
                  />
                )}

                {(activeTab === 'billing-callback' || activeTab === 'billing/callback') && (
                  <BillingCallbackPage
                    onNavigateDashboard={() => navigateRoute('dashboard')}
                    onNavigatePricing={() => navigateRoute('pricing')}
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

            {/* Test Prep Drills */}
            {(activeTab === 'test-prep' || activeTab === 'prep') && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-ink">Test Preparation & Exam Simulation</h2>
                    <p className="text-xs sm:text-sm text-muted">Diagnostic question drills and real-time algorithmic assessments.</p>
                  </div>
                  <Badge variant="academic">Active Simulator</Badge>
                </div>

                <FeatureGate
                  feature="TEST_PREP_BASIC"
                  featureTitle="Practice Test Drills"
                  description="Simulate exam scenarios with timed test drills and diagnostic topic breakdowns."
                  showRemaining={true}
                  onUpgrade={() => navigateRoute('pricing')}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-academic-100 text-academic">CSC301</span>
                        <span className="text-xs text-muted font-mono">25 Questions • 45 Mins</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-ink">Algorithms & Complexity Drill</h3>
                        <p className="text-xs text-muted mt-1">Master theorem, dynamic programming, recurrence relations, and NP proofs.</p>
                      </div>
                      <Button
                        variant="academic"
                        size="sm"
                        className="w-full shadow-tactile-btn"
                        onClick={async () => {
                          try {
                            const res = await api.request('/api/prep/start', { method: 'POST', body: JSON.stringify({ subject: 'CSC301: Algorithms' }) });
                            addToast({ type: 'success', title: 'Drill Session Initialized', message: `Exam drill session ${res.examSessionId} started (${res.usage.usageCount} tests recorded).` });
                          } catch (err) {
                            addToast({ type: 'error', title: 'Test Limit Notice', message: err.message });
                          }
                        }}
                      >
                        Start Algorithmic Drill
                      </Button>
                    </div>

                    <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gold-100 text-gold-800">CSC307</span>
                        <span className="text-xs text-muted font-mono">30 Questions • 50 Mins</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-ink">Computer Networks Simulation</h3>
                        <p className="text-xs text-muted mt-1">OSI model, TCP/IP flow control, CIDR subnetting, and BGP routing protocols.</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full shadow-tactile-btn"
                        onClick={async () => {
                          try {
                            const res = await api.request('/api/prep/start', { method: 'POST', body: JSON.stringify({ subject: 'CSC307: Networks' }) });
                            addToast({ type: 'success', title: 'Drill Session Initialized', message: `Exam drill session ${res.examSessionId} started (${res.usage.usageCount} tests recorded).` });
                          } catch (err) {
                            addToast({ type: 'error', title: 'Test Limit Notice', message: err.message });
                          }
                        }}
                      >
                        Start Networks Drill
                      </Button>
                    </div>
                  </div>
                </FeatureGate>
              </div>
            )}

            {/* Tutor Marketplace */}
            {activeTab === 'tutors' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-ink">Verified Tutor Marketplace</h2>
                    <p className="text-xs sm:text-sm text-muted">Browse accredited department tutors and book 1-on-1 tutoring sessions.</p>
                  </div>
                  <Badge variant="academic">Verified University Directory</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-ink">Dr. Elena Rostova</h3>
                        <p className="text-xs text-muted">Senior Fellow • Algorithms & Distributed Systems</p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-academic bg-academic-50 border border-academic-200 px-2 py-0.5 rounded">4.9 ★</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Personalized exam review on dynamic programming, graph algorithms, and formal proofs.
                    </p>
                    <FeatureGate
                      feature="TUTOR_BOOKING"
                      featureTitle="Verified Tutor Booking"
                      description="Book 1-on-1 sessions with Dr. Elena Rostova. Requires Student or Pro plan."
                      requiredPlan="Student"
                      requiredPlanCode="student"
                      onUpgrade={() => navigateRoute('pricing')}
                    >
                      <Button
                        variant="academic"
                        size="sm"
                        className="w-full shadow-tactile-btn"
                        onClick={async () => {
                          try {
                            const res = await api.request('/api/tutors/book', { method: 'POST', body: JSON.stringify({ tutorId: 'tut_elena', slotTime: 'Tomorrow 16:30' }) });
                            addToast({ type: 'success', title: 'Booking Confirmed', message: `1-on-1 session booked with Dr. Elena (Booking ID: ${res.bookingId}).` });
                          } catch (err) {
                            addToast({ type: 'error', title: 'Booking Error', message: err.message });
                          }
                        }}
                      >
                        Book 1-on-1 Session (Tomorrow 16:30)
                      </Button>
                    </FeatureGate>
                  </div>

                  <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-ink">Marcus Chen</h3>
                        <p className="text-xs text-muted">Teaching Assistant • Networks & Operating Systems</p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-academic bg-academic-50 border border-academic-200 px-2 py-0.5 rounded">4.8 ★</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Practical packet-level debugging, concurrency primitives, and kernel memory management.
                    </p>
                    <FeatureGate
                      feature="TUTOR_BOOKING"
                      featureTitle="Verified Tutor Booking"
                      description="Book 1-on-1 sessions with Marcus Chen. Requires Student or Pro plan."
                      requiredPlan="Student"
                      requiredPlanCode="student"
                      onUpgrade={() => navigateRoute('pricing')}
                    >
                      <Button
                        variant="academic"
                        size="sm"
                        className="w-full shadow-tactile-btn"
                        onClick={async () => {
                          try {
                            const res = await api.request('/api/tutors/book', { method: 'POST', body: JSON.stringify({ tutorId: 'tut_marcus', slotTime: 'Thursday 18:00' }) });
                            addToast({ type: 'success', title: 'Booking Confirmed', message: `1-on-1 session booked with Marcus Chen (Booking ID: ${res.bookingId}).` });
                          } catch (err) {
                            addToast({ type: 'error', title: 'Booking Error', message: err.message });
                          }
                        }}
                      >
                        Book 1-on-1 Session (Thursday 18:00)
                      </Button>
                    </FeatureGate>
                  </div>
                </div>
              </div>
            )}

            {/* Community & ZEGOCLOUD Video Tutoring */}
            {(activeTab === 'messages' || activeTab === 'community') && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-ink">Study Groups & Video Tutoring</h2>
                    <p className="text-xs sm:text-sm text-muted">Live HD video tutoring halls and private peer cohort study channels.</p>
                  </div>
                  <Badge variant="academic">ZEGOCLOUD Ready</Badge>
                </div>

                {/* ZEGOCLOUD Video Tutoring Session Gating */}
                <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-academic-100 text-academic flex items-center justify-center shrink-0 border border-academic-200">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">Live HD Video Tutoring Room</h3>
                      <p className="text-xs text-muted">Low-latency live video, interactive whiteboard, and screen sharing</p>
                    </div>
                  </div>

                  <FeatureGate
                    feature="VIDEO_TUTORING"
                    featureTitle="ZEGOCLOUD Live Video Tutoring"
                    description="Live 1-on-1 and cohort video tutoring is reserved for Pro and Premium plans."
                    requiredPlan="Pro"
                    requiredPlanCode="pro"
                    onUpgrade={() => navigateRoute('pricing')}
                  >
                    <div className="p-4 rounded-btn bg-canvas border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-ink">Room: ZEGO-ROOM-301-ALGORITHMS</p>
                        <p className="text-[11px] text-muted">Authenticated session with encrypted real-time audio/video</p>
                      </div>
                      <Button
                        variant="academic"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await api.request('/api/video/token', { method: 'POST', body: JSON.stringify({ roomCode: 'ZEGO-ROOM-301-ALGORITHMS' }) });
                            addToast({ type: 'success', title: 'Video Room Active', message: `Connected to ZEGOCLOUD room ${res.roomCode}. Token verified.` });
                          } catch (err) {
                            addToast({ type: 'error', title: 'Access Denied', message: err.message });
                          }
                        }}
                      >
                        Join Live Video Room
                      </Button>
                    </div>
                  </FeatureGate>
                </div>

                {/* Private Study Groups Gating */}
                <FeatureGate
                  feature="PRIVATE_GROUPS"
                  featureTitle="Private Study Groups"
                  description="Create and join private department and cohort study groups."
                  requiredPlan="Student"
                  requiredPlanCode="student"
                  onUpgrade={() => navigateRoute('pricing')}
                >
                  <div className="bg-white border border-border rounded-card p-6 shadow-tactile-surface space-y-4">
                    <h3 className="text-base font-bold text-ink">Active Cohort Study Groups</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-btn border border-border bg-canvas/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink">Junior CS Honours Cohort</span>
                          <span className="text-[10px] font-mono text-muted">18 Members</span>
                        </div>
                        <p className="text-[11px] text-muted">Daily review of algorithm proofs and compiler construction projects.</p>
                        <Badge variant="academic" size="sm">Active Discussion</Badge>
                      </div>

                      <div className="p-4 rounded-btn border border-border bg-canvas/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink">Networks & Security Study Hall</span>
                          <span className="text-[10px] font-mono text-muted">24 Members</span>
                        </div>
                        <p className="text-[11px] text-muted">Wireshark packet tracing and socket programming exercises.</p>
                        <Badge variant="academic" size="sm">Active Discussion</Badge>
                      </div>
                    </div>
                  </div>
                </FeatureGate>
              </div>
            )}

            {/* AI Academic Assistant */}
            {activeTab === 'ai' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-ink">AI Academic Assistant</h2>
                    <p className="text-xs sm:text-sm text-muted">Contextual coursework explanations and step-by-step problem solver.</p>
                  </div>
                  <Badge variant="academic">Academic Model</Badge>
                </div>

                <FeatureGate
                  feature="AI_TUTOR"
                  featureTitle="AI Academic Assistant"
                  description="Get step-by-step guidance on complex coursework and exam topics."
                  showRemaining={true}
                  onUpgrade={() => navigateRoute('pricing')}
                >
                  <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="aiQueryInput" className="text-xs font-semibold text-ink">
                        Ask AI Tutor a coursework question:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Prove why the 0/1 knapsack problem cannot be solved greedily..."
                          id="aiQueryInput"
                          value={aiQuery}
                          onChange={(e) => setAiQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !aiLoading) {
                              e.preventDefault();
                              handleAiQuerySubmit();
                            }
                          }}
                          className="flex-1 bg-canvas border border-border rounded-btn px-3 py-2 text-xs text-ink focus:outline-none focus:border-academic"
                        />
                        <Button
                          variant="academic"
                          size="sm"
                          disabled={aiLoading}
                          onClick={() => handleAiQuerySubmit()}
                        >
                          {aiLoading ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Analyzing...</span>
                            </span>
                          ) : (
                            'Submit Query'
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-btn bg-canvas/40 border border-border text-xs text-muted space-y-2">
                      <p className="font-semibold text-ink">Quick Academic Prompts:</p>
                      <div className="flex flex-wrap gap-2">
                        {['Derive Master Theorem Case 2', 'Explain TCP Congestion Window', 'Differentiate LALR(1) vs LR(1)', 'Calculate Subnet Masks for /27'].map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setAiQuery(prompt);
                              handleAiQuerySubmit(prompt);
                            }}
                            className="px-2.5 py-1 rounded-btn bg-white border border-border text-[11px] text-ink hover:border-academic shadow-tactile-surface transition-colors cursor-pointer"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* In-page Response Card rendering the full AI coursework answer */}
                    {aiLoading && (
                      <div className="p-5 rounded-card bg-canvas/40 border border-border/80 animate-pulse space-y-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-academic animate-spin" />
                          <span className="text-xs font-semibold text-ink">AI Academic Assistant is synthesizing coursework answer...</span>
                        </div>
                        <div className="h-3.5 bg-muted/20 rounded w-3/4" />
                        <div className="h-3.5 bg-muted/20 rounded w-5/6" />
                        <div className="h-3.5 bg-muted/20 rounded w-2/3" />
                      </div>
                    )}

                    {aiError && !aiLoading && (
                      <div className="p-4 rounded-btn bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">Query Notice</p>
                          <p className="mt-0.5">{aiError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiError(null)}
                          className="text-rose-600 hover:text-rose-900 text-xs font-semibold cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {aiResponse && !aiLoading && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <div className="bg-canvas/30 border border-border/80 rounded-card p-5 sm:p-6 space-y-4 shadow-tactile-surface">
                          {/* Response Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-academic-100 border border-academic-200 flex items-center justify-center text-academic">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                                  Coursework Analysis & Solution
                                </h4>
                                <span className="text-[10px] text-muted font-mono">
                                  Generated at {aiResponse.timestamp}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="academic" size="sm">
                                Full Explanation
                              </Badge>
                              <button
                                type="button"
                                onClick={() => {
                                  if (aiResponse?.answer) {
                                    navigator.clipboard?.writeText(aiResponse.answer);
                                    setCopiedAiResponse(true);
                                    setTimeout(() => setCopiedAiResponse(false), 2000);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-btn bg-white border border-border text-[11px] font-medium text-ink hover:border-academic transition-colors shadow-tactile-surface cursor-pointer"
                                title="Copy answer"
                              >
                                {copiedAiResponse ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-muted" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Query Prompt */}
                          <div className="px-3.5 py-2.5 rounded-btn bg-white border border-border text-xs">
                            <span className="font-semibold text-muted uppercase tracking-wide text-[10px] block mb-0.5">
                              Coursework Topic / Question
                            </span>
                            <span className="text-ink font-medium">"{aiResponse.prompt}"</span>
                          </div>

                          {/* Render Full AI Coursework Answer */}
                          <div className="space-y-2">
                            <span className="font-semibold text-muted uppercase tracking-wide text-[10px] block">
                              AI Academic Solution
                            </span>
                            <div className="p-4 rounded-btn bg-white border border-border text-ink text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                              {aiResponse.answer}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-1 text-xs text-muted">
                            <span className="text-[11px]">Academic Tutor Entitlement Active</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAiResponse(null);
                                setAiQuery('');
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-ink transition-colors cursor-pointer"
                            >
                              Clear Solution
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </FeatureGate>
              </div>
            )}
              </Suspense>
            </ErrorBoundary>
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
    </BillingProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary onGoHome={() => { window.location.href = '/'; }}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

