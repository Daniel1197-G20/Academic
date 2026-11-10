import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
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
import { CookieSettingsModal } from './components/legal/CookieSettingsModal';
import { ConsentBanner } from './components/legal/ConsentBanner';
import { Footer } from './components/common/Footer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotFoundPage } from './components/common/NotFoundPage';
import { PageLoader } from './components/common/PageLoader';
import { api } from './services/api/client';
import { supabase } from './lib/supabase/client';
import { syncEngine, SYNC_EVENTS } from './lib/sync/syncEngine';
import { disconnectStreamUser } from './lib/stream/client';
import { onAuthStateChangedListener, notifyAuthStateChange } from './services/firebase/firebaseConfig';
import { Users, Compass, Sparkles, FileCheck2, ArrowLeft, BookOpen, Copy, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { BillingProvider } from './context/BillingContext';
import { CampusBackground } from './components/ui/CampusBackground';

// Lazy-loaded routes & heavy pages to code-split bundles
const AuthPage = React.lazy(() => import('./pages/auth/AuthPage').then(m => ({ default: m.AuthPage })));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MyCoursesPage = React.lazy(() => import('./pages/courses/MyCoursesPage').then(m => ({ default: m.MyCoursesPage })));
const CgpaPage = React.lazy(() => import('./pages/cgpa/CgpaPage').then(m => ({ default: m.CgpaPage })));
const StudyPlannerPage = React.lazy(() => import('./pages/study/StudyPlannerPage').then(m => ({ default: m.StudyPlannerPage })));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const CookieSettingsPage = React.lazy(() => import('./pages/legal/CookieSettingsPage').then(m => ({ default: m.CookieSettingsPage })));
const PrivacySettingsPage = React.lazy(() => import('./pages/legal/PrivacySettingsPage').then(m => ({ default: m.PrivacySettingsPage })));
const PricingPage = React.lazy(() => import('./pages/billing/PricingPage').then(m => ({ default: m.PricingPage })));
const BillingCallbackPage = React.lazy(() => import('./pages/billing/BillingCallbackPage').then(m => ({ default: m.BillingCallbackPage })));
const SubscriptionPage = React.lazy(() => import('./pages/billing/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const LandingPage = React.lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const BecomeTutorPage = React.lazy(() => import('./pages/tutor/BecomeTutorPage').then(m => ({ default: m.BecomeTutorPage })));
const TutorDashboardPage = React.lazy(() => import('./pages/tutor/TutorDashboardPage').then(m => ({ default: m.TutorDashboardPage })));
const TutorMarketplacePage = React.lazy(() => import('./pages/tutor/TutorMarketplacePage').then(m => ({ default: m.TutorMarketplacePage })));
const AiTutorPage = React.lazy(() => import('./pages/study/AiTutorPage').then(m => ({ default: m.AiTutorPage })));
const PracticeDrillRunner = React.lazy(() => import('./components/study/PracticeDrillRunner').then(m => ({ default: m.PracticeDrillRunner })));

// Lazy-load heavy chat widget / GetStream SDK to load strictly after initial page render
const StudoraChat = React.lazy(() =>
  import('./components/chat/StudoraChat').then(m => ({ default: m.StudoraChat }))
);

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
  'ai',
  'become-tutor',
  'tutor-dashboard',
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
  if (clean === 'become-tutor') return 'become-tutor';
  if (clean === 'tutor-dashboard') return 'tutor-dashboard';
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
  const [activePracticeDrill, setActivePracticeDrill] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    // Respect OS preference or stored preference
    const stored = localStorage.getItem('studora-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark class to document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('studora-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleToggleDark = useCallback(() => setIsDark(d => !d), []);



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

    let subscription = null;

    // 1. Authoritative Supabase Auth State Change Listener
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setUserProfile(null);
            api.logout();
            syncEngine.teardown();
            disconnectStreamUser();
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

          if (isMounted) {
            const resolvedRole = profile?.role || 'student';

            const userObj = {
              id: session.user.id,
              email: session.user.email,
              role: resolvedRole
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
        }
      });
      subscription = data?.subscription;
    } catch (listenerErr) {
      console.warn('Supabase onAuthStateChange initialization notice:', listenerErr);
    }

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
            const resolvedRole = profile?.role || 'student';

            const userObj = {
              id: session.user.id,
              email: session.user.email,
              role: resolvedRole
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
          }
          return;
        }

        // Fallback: Legacy Session Token check (for sandbox demo account)
        const token = api.getToken();
        if (!token) {
          if (isMounted) {
            setCurrentUser(null);
            setUserProfile(null);
          }
          return;
        }

        const me = await api.getMe();
        if (isMounted) {
          setCurrentUser(me.user);
          setUserProfile(me.profile);
          if (me.selectedScale) setSelectedScale(me.selectedScale);
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing session', err);
        api.logout();
        if (isMounted) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      } finally {
        if (isMounted) {
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

    // Role-based protection: tutor-dashboard requires tutor role
    if (normalized === 'tutor-dashboard' && currentUser && currentUser.role !== 'tutor') {
      setActiveTab('become-tutor');
      if (window.location.pathname !== '/become-tutor') {
        window.history.replaceState({}, '', '/become-tutor');
      }
      return;
    }


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

      // Initialize Universal Cross-Device Synchronization Hub
      syncEngine.initialize(currentUser.id, {
        role: currentUser.role,
        email: currentUser.email
      });

      // Listen for updates from other authenticated devices or database changes
      const unsub = syncEngine.subscribe('*', async (eventData) => {
        // Quietly refresh data in background without resetting active UI state
        try {
          if (eventData.eventType === SYNC_EVENTS.PROFILE_UPDATED) {
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
            if (prof) setUserProfile(prof);
          } else if (eventData.eventType === SYNC_EVENTS.NOTIFICATION_UPDATED) {
            if (eventData.data?.unreadCount !== undefined) {
              setUnreadNotifications(eventData.data.unreadCount);
            }
          } else {
            // Refetch academic records, study plans, etc.
            const [recordsRes, plansRes, streakRes] = await Promise.all([
              api.getAcademicRecords().catch(() => null),
              api.getStudyPlans().catch(() => null),
              api.getStreak().catch(() => null)
            ]);
            if (recordsRes) {
              setSemesters(recordsRes.semesters || []);
              if (recordsRes.selectedScale) setSelectedScale(recordsRes.selectedScale);
            }
            if (plansRes) setStudyPlans(plansRes.plans || []);
            if (streakRes) setStreakData(streakRes);
          }
        } catch (syncErr) {
          console.warn('[Sync] Background sync refresh notice:', syncErr);
        }
      });

      return () => {
        unsub();
      };
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
    syncEngine.teardown();
    disconnectStreamUser();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setSelectedPlanForAuth(null);
    setUnreadMessages(0);
    setUnreadNotifications(0);
    notifyAuthStateChange(null, null);
    navigateRoute('landing');
    addToast({ type: 'info', title: 'Signed Out', message: 'You have safely signed out of your workspace.' });
  };

  // Handle Permanent Account Deletion
  const handleAccountDeleted = () => {
    api.logout();
    syncEngine.teardown();
    disconnectStreamUser();
    setCurrentUser(null);
    setUserProfile(null);
    setSemesters([]);
    setStudyPlans([]);
    setSelectedPlanForAuth(null);
    setUnreadMessages(0);
    setUnreadNotifications(0);
    notifyAuthStateChange(null, null);
    navigateRoute('landing');
    addToast({
      type: 'info',
      title: 'Account Permanently Deleted',
      message: 'All your academic, study, and consent records have been purged from the platform.'
    });
  };

  // Quick toggle topic from dashboard or study planner with optimistic UI
  const handleToggleTopic = async (topicId) => {
    // 1. Optimistically toggle the topic state immediately in local state
    const previousPlans = studyPlans;
    setStudyPlans(prev =>
      prev.map(p => {
        if (!p.topics) return p;
        const topicExists = p.topics.some(t => t.id === topicId);
        if (!topicExists) return p;
        return {
          ...p,
          topics: p.topics.map(t =>
            t.id === topicId ? { ...t, is_completed: !t.is_completed } : t
          )
        };
      })
    );

    // 2. Perform background server update
    try {
      await api.toggleTopic(topicId);
      // Broadcast to other authenticated devices immediately
      syncEngine.broadcastUpdate(SYNC_EVENTS.STUDY_PLAN_UPDATED, { topicId, action: 'toggle' });
      // Re-sync quietly in background to ensure source of truth
      fetchAllData();
    } catch (err) {
      // Revert optimistic update on failure
      setStudyPlans(previousPlans);
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
    return (
      <React.Suspense fallback={<PageLoader message="Loading Studora..." />}>
        {(() => {
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
        })()}
      </React.Suspense>
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
    'become-tutor': currentUser?.role === 'tutor' ? 'Tutor Workspace' : 'Become a Tutor',
    'tutor-dashboard': 'Tutor Dashboard',
    404: 'Page Not Found'
  };

  return (
    <BillingProvider currentUser={currentUser} showToast={addToast}>
      <div className={`min-h-screen flex text-ink antialiased selection:bg-academic-100 selection:text-academic relative ${isDark ? 'dark' : ''}`}>
        {/* Campus background — visible through glass surfaces */}
        {(activeTab === 'dashboard' || activeTab === 'overview' || activeTab === 'messages' || activeTab === 'community') && (
          <CampusBackground />
        )}
        {/* Background color — used on non-dashboard pages and as fallback */}
        <div
          className={`fixed inset-0 -z-10 transition-colors duration-500 ${
            (activeTab === 'dashboard' || activeTab === 'overview')
              ? 'bg-transparent'
              : isDark ? 'bg-navy-900' : 'bg-canvas'
          }`}
        />

        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={navigateRoute}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userProfile={userProfile}
          onLogout={handleLogout}
          unreadMessages={unreadMessages}
        />

        {/* Main Content Workspace */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-x-clip ${
          (activeTab === 'messages' || activeTab === 'community')
            ? 'h-dvh max-h-dvh pb-[calc(62px+env(safe-area-inset-bottom,0px))] md:pb-0'
            : 'min-h-screen'
        }`}>
          {/* Top Header - hidden on desktop Messages route to match reference 1:1 */}
          {activeTab !== 'messages' && activeTab !== 'community' && (
            <TopHeader
              userProfile={userProfile}
              cgpaMetrics={null}
              streakDays={streakData.streak}
              unreadNotifications={unreadNotifications}
              onOpenProfile={() => navigateRoute('profile')}
              onOpenPricing={() => navigateRoute('pricing')}
              onOpenSubscription={() => navigateRoute('settings/subscription')}
              onOpenNotifications={() => {
                if (unreadNotifications > 0) {
                  setUnreadNotifications(0);
                  syncEngine.broadcastUpdate(SYNC_EVENTS.NOTIFICATION_UPDATED, { unreadCount: 0 });
                }
                addToast({
                  type: 'info',
                  title: 'Notifications',
                  message: 'All notifications are caught up.'
                });
              }}
              activeTabTitle={tabTitles[activeTab] || 'Overview'}
              isDark={isDark}
              onToggleDark={handleToggleDark}
            />
          )}

          {/* Page Container */}
          <main className={`flex-1 w-full mx-auto ${(activeTab === 'messages' || activeTab === 'community')
              ? 'p-0 sm:p-3 md:p-5 lg:p-6 max-w-[1520px] flex flex-col min-h-0 h-full'
              : 'p-4 sm:p-6 lg:p-8 max-w-7xl'
            }`}>
            <ErrorBoundary onGoHome={() => navigateRoute('dashboard')}>
              <Suspense fallback={<PageLoader message="Loading Studora..." />}>
                {(activeTab === 'dashboard' || activeTab === 'overview') && (
                  <DashboardPage
                    userProfile={userProfile}
                    semesters={semesters}
                    studyPlans={studyPlans}
                    streakData={streakData}
                    selectedScale={selectedScale}
                    dataLoading={dataLoading}
                    unreadMessages={unreadMessages}
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
                  <MyCoursesPage
                    semesters={semesters}
                    studyPlans={studyPlans}
                    selectedScale={selectedScale}
                    availableScales={availableScales}
                    onRefreshData={fetchAllData}
                    onNavigateTab={navigateRoute}
                    showToast={addToast}
                  />
                )}

                {activeTab === 'study' && (
                  <StudyPlannerPage
                    studyPlans={studyPlans}
                    streakData={streakData}
                    onRefreshData={fetchAllData}
                    onToggleTopic={handleToggleTopic}
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
                    onLogout={handleLogout}
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

                {activeTab === 'become-tutor' && (
                  currentUser?.role === 'tutor' ? (
                    <TutorDashboardPage
                      userProfile={userProfile}
                      onNavigate={navigateRoute}
                      showToast={addToast}
                    />
                  ) : (
                    <BecomeTutorPage
                      userProfile={userProfile}
                      onNavigateDashboard={() => navigateRoute('dashboard')}
                      showToast={addToast}
                    />
                  )
                )}

                {activeTab === 'tutor-dashboard' && (
                  currentUser?.role === 'tutor' ? (
                    <TutorDashboardPage
                      userProfile={userProfile}
                      onNavigate={navigateRoute}
                      showToast={addToast}
                    />
                  ) : (
                    <BecomeTutorPage
                      userProfile={userProfile}
                      onNavigateDashboard={() => navigateRoute('dashboard')}
                      showToast={addToast}
                    />
                  )
                )}


                {/* Test Prep Drills */}
                {(activeTab === 'test-prep' || activeTab === 'prep') && (
                  <div className="max-w-5xl mx-auto space-y-6">
                    {/* Active Practice Drill Runner Modal / Area */}
                    {activePracticeDrill ? (
                      <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading Drill Questions…</div>}>
                        <PracticeDrillRunner
                          drillData={activePracticeDrill}
                          onComplete={() => {
                            refreshData();
                          }}
                          onCancel={() => setActivePracticeDrill(null)}
                          showToast={addToast}
                        />
                      </React.Suspense>
                    ) : (
                      <>
                        {/* Header matching official reference Section 3_0 */}
                        <div className="pt-1">
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
                            Assessments
                          </h1>
                          <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
                            Take verified diagnostic assessments and track your empirical topic mastery
                          </p>
                        </div>

                        {/* Tabs matching reference: Available Tests / Completed */}
                        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                          <button
                            type="button"
                            className="px-4 py-1.5 rounded-full bg-[#DDEFE5] dark:bg-[#176B4D]/30 text-[#176B4D] dark:text-[#A7F3D0] text-xs font-bold shadow-sm"
                          >
                            Available Tests
                          </button>
                        </div>

                        {/* Assessments Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          {/* Left: Test Cards (span 8 on lg) */}
                          <div className="lg:col-span-8 space-y-4">
                            <FeatureGate
                              feature="TEST_PREP_BASIC"
                              featureTitle="Practice Test Drills"
                              description="Simulate exam scenarios with timed test drills and diagnostic topic breakdowns."
                              showRemaining={true}
                              onUpgrade={() => navigateRoute('pricing')}
                            >
                              <div className="space-y-3.5">
                                {/* Card 1: Mathematics Theory & Limits Drill */}
                                <div className="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0">
                                      <FileCheck2 className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white truncate">
                                        Mathematics: Limits & Calculus Diagnostic
                                      </h3>
                                      <p className="text-xs text-[#667085] dark:text-white/60 mt-0.5">
                                        5 Verified Standardized Questions • Topic: Limits & Calculus
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] shadow-sm transition-all shrink-0"
                                    onClick={async () => {
                                      try {
                                        const res = await api.request('/api/practice/start', {
                                          method: 'POST',
                                          body: JSON.stringify({ subjectId: 'subj_math', topicId: 'top_calc_limits', limit: 5 })
                                        });
                                        if (res && res.drill) {
                                          setActivePracticeDrill(res.drill);
                                          addToast({ type: 'success', title: 'Drill Started', message: 'Diagnostic questions loaded.' });
                                        }
                                      } catch (err) {
                                        addToast({ type: 'error', title: 'Notice', message: err.message });
                                      }
                                    }}
                                  >
                                    Start Assessment
                                  </button>
                                </div>

                                {/* Card 2: Algorithms & Sorting Drill */}
                                <div className="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                                      <FileCheck2 className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white truncate">
                                        Computer Science: Sorting & Complexity Drill
                                      </h3>
                                      <p className="text-xs text-[#667085] dark:text-white/60 mt-0.5">
                                        5 Verified Standardized Questions • Topic: Sorting Algorithms
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] shadow-sm transition-all shrink-0"
                                    onClick={async () => {
                                      try {
                                        const res = await api.request('/api/practice/start', {
                                          method: 'POST',
                                          body: JSON.stringify({ subjectId: 'subj_cs', topicId: 'top_algo_sort', limit: 5 })
                                        });
                                        if (res && res.drill) {
                                          setActivePracticeDrill(res.drill);
                                          addToast({ type: 'success', title: 'Drill Started', message: 'Diagnostic questions loaded.' });
                                        }
                                      } catch (err) {
                                        addToast({ type: 'error', title: 'Notice', message: err.message });
                                      }
                                    }}
                                  >
                                    Start Assessment
                                  </button>
                                </div>
                              </div>
                            </FeatureGate>
                          </div>

                          {/* Right: Decorative Academic Artwork Card (span 4 on lg) */}
                          <div className="lg:col-span-4 glass-panel rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-2xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center mb-3 shadow-inner">
                              <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h4 className="text-sm font-bold text-[#111827] dark:text-white">
                              Verified Diagnostics
                            </h4>
                            <p className="text-xs text-[#667085] dark:text-white/60 mt-1 max-w-xs leading-relaxed">
                              Assessments are timed and automatically evaluated against our question bank standards.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}


                {/* Tutor Marketplace — sourced from approved Supabase tutor_profiles */}
                {activeTab === 'tutors' && (
                  <TutorMarketplacePage
                    currentUser={currentUser}
                    onNavigate={navigateRoute}
                    showToast={addToast}
                  />
                )}


                {/* Messages & Tutor-Student Chat (GetStream) */}
                {(activeTab === 'messages' || activeTab === 'community') && (
                  <div className="flex-1 min-h-0 flex flex-col w-full h-full">
                    <React.Suspense
                      fallback={
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                          <Loader2 className="w-8 h-8 text-academic animate-spin" />
                          <p className="text-sm text-muted">Loading Studora Chat…</p>
                        </div>
                      }
                    >
                      <StudoraChat
                        currentUser={currentUser}
                        userProfile={userProfile}
                        showToast={addToast}
                        onNavigate={navigateRoute}
                        onToggleDark={handleToggleDark}
                        isDark={isDark}
                      />
                    </React.Suspense>
                  </div>
                )}

                {/* AI Academic Tutor */}
                {activeTab === 'ai' && (
                  <AiTutorPage
                    onNavigate={navigateRoute}
                    showToast={addToast}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          </main>

          {/* Universal Footer - Conditionally excluded on Messages route to give full responsive height */}
          {activeTab !== 'messages' && activeTab !== 'community' && (
            <Footer
              onNavigate={navigateRoute}
              onOpenCookieSettings={() => setShowCookieModal(true)}
            />
          )}
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

