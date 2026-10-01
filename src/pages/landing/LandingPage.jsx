import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Video, 
  Users, 
  FileCheck2, 
  TrendingUp, 
  ShieldCheck, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  Menu, 
  X, 
  Search, 
  Layers, 
  BarChart3, 
  Compass, 
  ArrowUpRight, 
  Flame, 
  Zap, 
  Lock,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Button, Badge, Card, TactileCheckbox, ProgressBar, AnimatedNumber } from '../../components/ui';
import { useBilling } from '../../context/BillingContext';
import { api } from '../../services/api/client';

export function LandingPage({ onNavigate, onSelectPlan, onOpenCookieSettings }) {
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Billing plans from context/backend
  const { plans: contextPlans, loading: plansLoading } = useBilling();
  const [dbPlans, setDbPlans] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  // Fallback initial plans (conforms strictly to database structure)
  const fallbackPlans = useMemo(() => [
    {
      id: 'plan_basic',
      code: 'basic',
      name: 'Basic',
      description: 'For students getting started.',
      amount: 0,
      amountKobo: 0,
      interval: 'monthly',
      features: [
        'CGPA calculator',
        'Basic study planner (up to 2 plans)',
        'Basic test preparation (3 tests/month)',
        'Tutor marketplace browsing',
        'Limited AI Tutor access (10 queries/month)',
        'Basic academic profile'
      ]
    },
    {
      id: 'plan_student',
      code: 'student',
      name: 'Student',
      description: 'For students who want more structure and support.',
      amount: 2500,
      amountKobo: 250000,
      interval: 'monthly',
      isPopular: true,
      features: [
        'Everything in Basic',
        'Advanced CGPA tracking & forecasting',
        'Advanced study planning (unlimited)',
        'More test preparation (15 tests/month)',
        'AI Tutor access (100 queries/month)',
        'Tutor booking (up to 5/month)',
        'Private groups',
        'Academic progress tracking'
      ]
    },
    {
      id: 'plan_pro',
      code: 'pro',
      name: 'Pro',
      description: 'For students who want advanced academic tools.',
      amount: 5000,
      amountKobo: 500000,
      interval: 'monthly',
      features: [
        'Everything in Student',
        'Higher AI Tutor allowance (300 queries/month)',
        'Advanced test preparation (unlimited)',
        'Video tutoring (10 hrs/month ZEGOCLOUD)',
        'Advanced analytics & grade curves',
        'More premium resources',
        'Increased usage limits'
      ]
    },
    {
      id: 'plan_premium',
      code: 'premium',
      name: 'Premium',
      description: 'For students who want the complete experience.',
      amount: 10000,
      amountKobo: 1000000,
      interval: 'monthly',
      features: [
        'Everything in Pro',
        'Highest AI Tutor allowance (1,000 queries/month)',
        'Unlimited test preparation',
        'Full advanced analytics',
        'Premium resources vault',
        'Priority tutor matching',
        'Priority support'
      ]
    }
  ], []);

  // Fetch dynamic plans from backend
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicPlans() {
      setPricingLoading(true);
      try {
        const res = await api.getBillingPlans();
        if (isMounted && res.plans && res.plans.length > 0) {
          setDbPlans(res.plans);
        }
      } catch (err) {
        if (isMounted) setPricingError(err.message);
      } finally {
        if (isMounted) setPricingLoading(false);
      }
    }
    loadDynamicPlans();
    return () => { isMounted = false; };
  }, []);

  const displayPlans = useMemo(() => {
    const rawList = dbPlans.length > 0 ? dbPlans : (contextPlans.length > 0 ? contextPlans : fallbackPlans);
    return fallbackPlans.map(fb => {
      const match = rawList.find(p => p.code === fb.code);
      return {
        ...fb,
        name: match?.name || fb.name,
        amount: match?.amount !== undefined ? match.amount : fb.amount,
        amountKobo: match?.amountKobo || fb.amountKobo,
        description: match?.description || fb.description,
        interval: match?.interval || fb.interval
      };
    });
  }, [dbPlans, contextPlans, fallbackPlans]);

  // Interactive Demo State: CGPA Scale switcher
  const [selectedDemoScale, setSelectedDemoScale] = useState('5.0');
  const demoCgpaValues = {
    '5.0': { cgpa: '3.82', max: '5.00', delta: '+0.18', classification: 'Second Class Upper (2:1)' },
    '4.0': { cgpa: '3.52', max: '4.00', delta: '+0.14', classification: 'Magna Cum Laude' },
    '7.0': { cgpa: '5.35', max: '7.00', delta: '+0.25', classification: 'Second Class Upper' }
  };

  // Interactive Demo State: Study Tasks toggle
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, time: '09:00', title: 'Data Structures & Algorithms', duration: '1h 30m', completed: true },
    { id: 2, time: '10:30', title: 'Operating Systems (Memory Management)', duration: '1h 30m', completed: true },
    { id: 3, time: '14:00', title: 'Test Preparation: Complexity Drills', duration: '1h 00m', completed: false },
    { id: 4, time: '17:00', title: 'AI Tutor Session: Recursion & Trees', duration: '45m', completed: false },
  ]);

  const completedDemoCount = demoTasks.filter(t => t.completed).length;
  const demoProgressPercent = Math.round((completedDemoCount / demoTasks.length) * 100);

  const toggleDemoTask = (id) => {
    setDemoTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Interactive Demo State: Academic Journey step
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const journeySteps = [
    {
      label: 'Measure',
      tagline: 'Know where you stand.',
      description: 'Continuous multi-scale CGPA modeling, semester credit units, and classification tracking.',
      icon: GraduationCap,
      accent: 'border-academic text-academic bg-academic-50'
    },
    {
      label: 'Plan',
      tagline: 'Build a realistic study routine.',
      description: 'Convert heavy semester syllabi into daily schedules, topic checklists, and study streaks.',
      icon: Calendar,
      accent: 'border-gold text-gold-700 bg-gold-50'
    },
    {
      label: 'Learn',
      tagline: 'Use AI and learning resources.',
      description: 'Academic AI assistance tailored specifically to your university syllabus and tricky course concepts.',
      icon: Sparkles,
      accent: 'border-navy text-navy-800 bg-navy-50'
    },
    {
      label: 'Practice',
      tagline: 'Prepare with tests and questions.',
      description: 'Timed exam drills, question banks, and instant diagnostic feedback on weak topics.',
      icon: FileCheck2,
      accent: 'border-academic text-academic bg-academic-50'
    },
    {
      label: 'Connect',
      tagline: 'Find tutors and study with others.',
      description: 'Verified 1-on-1 tutoring sessions, private peer study halls, and encrypted video rooms.',
      icon: Users,
      accent: 'border-navy text-navy-800 bg-navy-50'
    },
    {
      label: 'Improve',
      tagline: 'Track your progress.',
      description: 'Clear trend graphs, revision velocity, and confidence meters that build real semester momentum.',
      icon: TrendingUp,
      accent: 'border-academic text-academic bg-academic-50'
    }
  ];

  // Interactive Demo State: AI Tutor dialog prompt
  const [aiDemoTopic, setAiDemoTopic] = useState('recursion');
  const aiDemoConversations = {
    recursion: {
      question: "Explain recursion like I'm preparing for my exam.",
      answer: "Let's break recursion down into three clear exam requirements:\n\n1. The Base Case: The terminating condition that prevents infinite execution and stack overflow.\n2. The Inductive Step: The recursive call that strictly reduces the input size toward the base case.\n3. The Call Stack: Each invocation pushes a local stack frame holding arguments and return addresses.\n\nKey exam rule: Always state the recurrence relation T(n) = aT(n/b) + f(n) and verify termination proofs."
    },
    concurrency: {
      question: "What is the difference between a mutex and a binary semaphore?",
      answer: "A mutex has ownership: only the thread that locks the mutex may unlock it (mutual exclusion). A binary semaphore is a signaling mechanism without ownership: thread A can wait on it while thread B signals it to release."
    },
    calculus: {
      question: "When should I use L'Hôpital's Rule vs algebraic simplification?",
      answer: "Apply L'Hôpital's Rule only when the limit evaluates to an indeterminate form (0/0 or ±∞/±∞). If rational terms can be factored out directly, algebraic simplification is faster and less prone to differentiation errors."
    }
  };

  // Interactive Demo State: Test Prep Question
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  // Interactive Demo State: Tutor filters
  const [tutorSubjectFilter, setTutorSubjectFilter] = useState('All');
  const demoTutors = [
    {
      id: 'tut_1',
      name: 'Dr. Elena Rostova',
      title: 'Senior Fellow • Algorithms & Distributed Systems',
      department: 'Computer Science',
      subject: 'Algorithms',
      level: 'Advanced / Honours',
      availability: 'Today 16:30',
      rating: '4.9',
      verified: true
    },
    {
      id: 'tut_2',
      name: 'Marcus Chen',
      title: 'Teaching Fellow • Computer Systems & OS',
      department: 'Computer Science',
      subject: 'Operating Systems',
      level: 'Intermediate',
      availability: 'Thursday 18:00',
      rating: '4.8',
      verified: true
    },
    {
      id: 'tut_3',
      name: 'Amara Okafor',
      title: 'Graduate Researcher • Statistics & Linear Algebra',
      department: 'Mathematics',
      subject: 'Mathematics',
      level: 'All Levels',
      availability: 'Tomorrow 14:00',
      rating: '4.9',
      verified: true
    },
    {
      id: 'tut_4',
      name: 'David Kim',
      title: 'Senior Tutor • Data Communication & Protocols',
      department: 'Electrical Engineering',
      subject: 'Networks',
      level: 'Undergraduate',
      availability: 'Friday 15:00',
      rating: '4.7',
      verified: true
    }
  ];

  const filteredTutors = tutorSubjectFilter === 'All' 
    ? demoTutors 
    : demoTutors.filter(t => t.subject.toLowerCase() === tutorSubjectFilter.toLowerCase());

  // Interactive FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const faqs = [
    {
      q: 'What is the Basic plan?',
      a: 'The Basic plan is our free forever academic tier. It provides core CGPA calculation across multiple grading scales, study planning for up to two active courses, 3 practice test drills per month, directory browsing of accredited campus tutors, and 10 monthly AI Tutor queries.'
    },
    {
      q: 'Can I use the platform without paying?',
      a: 'Yes. University students can use the Basic plan at no cost. There are no mandatory trials, no required credit cards, and your academic records are never locked behind a paywall.'
    },
    {
      q: 'What happens when I upgrade?',
      a: 'When you upgrade to Student, Pro, or Premium, your new feature entitlements, expanded AI allowances, and study limits unlock instantly through our Paystack integration. Your existing grades, courses, and schedules are seamlessly preserved.'
    },
    {
      q: 'How does monthly billing work?',
      a: 'Billing is handled on a 30-day recurring cycle through Paystack in Nigerian Naira (NGN). You will receive an official transaction reference for every payment, which is automatically cataloged in your billing history.'
    },
    {
      q: 'Can I cancel my subscription?',
      a: 'Yes, you can cancel your subscription at any time directly from /settings/subscription. There are no cancellation penalties or hidden procedures.'
    },
    {
      q: 'What happens after cancellation?',
      a: 'When you cancel, your account remains on its active paid tier until the end of your current 30-day billing period. After that date, your account gently transitions back to the Basic plan. We never delete your historical grades, courses, study notes, or transcripts.'
    },
    {
      q: 'Can I upgrade from Student to Pro?',
      a: 'Yes. You can switch between tiers whenever your academic needs expand, such as during midterm revision or final examination preparations.'
    },
    {
      q: 'What happens to my academic data if I downgrade?',
      a: 'All your academic data—including past semester courses, CGPA projections, completed topics, and test scores—remains completely intact and accessible. Only active usage caps (like monthly AI queries) adjust to the Basic plan allowance.'
    },
    {
      q: 'How are Paystack payments handled?',
      a: 'All payment processing is executed via Paystack’s PCI-DSS Level 1 compliant secure infrastructure. The Academic Platform server never touches, stores, or transmits your sensitive credit/debit card numbers or CVV codes.'
    },
    {
      q: 'Does the platform support video tutoring?',
      a: 'Yes. Live 1-on-1 and cohort tutoring is powered by our high-performance WebRTC and ZEGOCLOUD integration, offering low-latency encrypted video, voice, screen sharing, and an interactive whiteboard for mathematical derivations.'
    },
    {
      q: 'Can I use the AI Tutor on the Basic plan?',
      a: 'Yes. Basic plan members receive 10 complimentary AI Tutor queries each month to help debug complex coursework and explain difficult university topics.'
    }
  ];

  // Mobile Comparison active tab
  const [mobileComparisonPlan, setMobileComparisonPlan] = useState('student');

  const comparisonRows = [
    { name: 'CGPA Tracking & Units', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Target GPA Modeling', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Study Planner Plans', basic: '2 Active Plans', student: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'Study Streaks & Timelines', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Test Prep Simulation', basic: '3 Tests / mo', student: '15 Tests / mo', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'AI Tutor Queries', basic: '10 / mo', student: '100 / mo', pro: '300 / mo', premium: '1,000 / mo' },
    { name: 'Multi-Mode AI Problem Solver', basic: '—', student: '—', pro: 'Included', premium: 'Included' },
    { name: 'Tutor Directory Browsing', basic: 'Included', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Verified Tutor Booking', basic: '—', student: '5 Bookings / mo', pro: 'Unlimited', premium: 'Unlimited' },
    { name: 'Private Cohort Study Groups', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Live Video Tutoring (ZEGOCLOUD)', basic: '—', student: '—', pro: '10 hrs / mo', premium: 'Unlimited' },
    { name: 'Advanced Predictive Analytics', basic: '—', student: '—', pro: 'Included', premium: 'Included' },
    { name: 'Curated Academic Vault', basic: '—', student: 'Included', pro: 'Included', premium: 'Included' },
    { name: 'Priority Tutor Matching & Support', basic: '—', student: '—', pro: '—', premium: 'Included' }
  ];

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-academic-100 selection:text-academic">
      
      {/* ========================================================================= */}
      {/* SECTION 1 — NAVIGATION                                                    */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Product Name */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-academic-100 border border-academic-200 flex items-center justify-center text-academic shadow-tactile-surface">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-ink">Studora</span>
              <span className="hidden sm:inline-block text-[11px] text-muted ml-1.5 font-normal tracking-normal border-l border-border pl-1.5">
                Student Platform
              </span>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-muted">
            <button onClick={() => scrollToSection('features')} className="hover:text-ink transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-ink transition-colors">How It Works</button>
            <button onClick={() => scrollToSection('tutors')} className="hover:text-ink transition-colors">Tutors</button>
            <button onClick={() => scrollToSection('ai-tutor')} className="hover:text-ink transition-colors">AI Tutor</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-ink transition-colors">Pricing</button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs font-semibold text-ink px-3 py-1.5 rounded-btn hover:bg-canvas transition-colors"
            >
              Log in
            </button>
            <Button
              variant="academic"
              size="sm"
              onClick={() => onNavigate('register')}
              className="shadow-tactile-btn hidden sm:inline-flex"
            >
              Get Started
            </Button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-btn text-muted hover:text-ink hover:bg-canvas border border-border"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-border px-4 py-6 space-y-4 shadow-tactile-raised animate-fade-in">
            <div className="flex flex-col space-y-3 text-sm font-medium text-ink">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-left py-1.5 text-muted hover:text-ink"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-1.5 text-muted hover:text-ink"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('tutors')}
                className="text-left py-1.5 text-muted hover:text-ink"
              >
                Tutors
              </button>
              <button 
                onClick={() => scrollToSection('ai-tutor')}
                className="text-left py-1.5 text-muted hover:text-ink"
              >
                AI Tutor
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-left py-1.5 text-muted hover:text-ink"
              >
                Pricing
              </button>
            </div>

            <div className="pt-4 border-t border-border flex flex-col gap-2.5">
              <Button
                variant="academic"
                size="md"
                onClick={() => { setMobileMenuOpen(false); onNavigate('register'); }}
                className="w-full shadow-tactile-btn"
              >
                Get Started Free
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => { setMobileMenuOpen(false); onNavigate('login'); }}
                className="w-full"
              >
                Log In to Workspace
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* SECTION 2 — HERO                                                          */}
      {/* ========================================================================= */}
      <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-academic-50 border border-academic-200 text-academic text-xs font-semibold select-none shadow-tactile-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-academic" />
            <span>The Academic Operating Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-ink tracking-tight leading-[1.15]">
            Your academic life, organized.
          </h1>

          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Plan your semester, track your CGPA, prepare for tests, learn with AI, and connect with tutors — all in one academic platform.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              variant="academic"
              size="lg"
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto shadow-tactile-btn text-sm font-semibold px-7"
            >
              Get Started Free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto text-sm font-semibold px-6 border-border hover:bg-white"
            >
              Explore the Platform
            </Button>
          </div>

          <p className="text-[11px] text-muted/80 font-mono tracking-tight">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* ======================================================================= */}
        {/* HERO VISUAL — REALISTIC PRODUCT INTERFACE COMPOSITION                   */}
        {/* ======================================================================= */}
        <div className="mt-12 sm:mt-16 bg-white border border-border rounded-hero p-4 sm:p-7 shadow-tactile-hero relative select-none">
          
          {/* Interface Window Chrome */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-border text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="ml-2 font-mono text-[11px] text-ink/70 hidden sm:inline">
                academic.workspace / student-dashboard
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-academic-100 text-academic border border-academic-200 font-semibold">
                ● Live Demo Workspace
              </span>
              <span className="text-[11px] text-muted hidden md:inline">Apex Institute of Technology</span>
            </div>
          </div>

          {/* Dashboard Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* 1. CGPA Instrument (Left) */}
            <div className="lg:col-span-4 bg-canvas/40 border border-border rounded-card p-5 space-y-4 shadow-tactile-surface">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted tracking-wider uppercase font-mono">
                  CURRENT CGPA
                </span>
                <Badge variant="academic">First Class Honours</Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-ink font-mono tracking-tight">
                  3.82
                </span>
                <span className="text-base text-muted font-mono font-medium">/ 5.00</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-academic">↑ +0.18</span>
                <span className="text-muted">Current Semester</span>
                <span className="text-muted">•</span>
                <span className="font-mono text-muted">102 Units</span>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted">
                <span>Standard 5.0 Scale</span>
                <span className="text-academic font-medium">5 Semesters Tracked</span>
              </div>
            </div>

            {/* 2. Today's Plan & Study Progress (Center) */}
            <div className="lg:col-span-5 bg-canvas/40 border border-border rounded-card p-5 space-y-4 shadow-tactile-surface">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-muted tracking-wider uppercase font-mono">
                    TODAY'S SCHEDULE
                  </span>
                  <p className="text-xs font-bold text-ink mt-0.5">Monday Study Agenda</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gold-50 border border-gold-200 text-gold-700 text-xs font-mono">
                  <Flame className="w-3.5 h-3.5 text-gold-600 fill-gold-600" />
                  <span>8d Streak</span>
                </div>
              </div>

              {/* Interactive Task Rail */}
              <div className="space-y-2">
                {demoTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleDemoTask(task.id)}
                    className={`p-2.5 rounded-btn border flex items-center justify-between gap-3 cursor-pointer transition-all duration-150
                      ${task.completed 
                        ? 'bg-white/80 border-border/80 text-muted' 
                        : 'bg-white border-border text-ink shadow-tactile-surface hover:border-academic/40'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors
                        ${task.completed ? 'bg-academic text-white' : 'border border-border bg-canvas'}`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs truncate ${task.completed ? 'line-through text-muted' : 'font-medium text-ink'}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-muted">{task.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                  <span>Daily Progress ({completedDemoCount}/{demoTasks.length} tasks)</span>
                  <span className="text-academic font-semibold">{demoProgressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                  <div 
                    className="h-full bg-academic transition-all duration-300"
                    style={{ width: `${demoProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. AI Tutor & Upcoming Exam (Right) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Mini Upcoming Test card */}
              <div className="bg-canvas/40 border border-border rounded-card p-4 space-y-2 shadow-tactile-surface">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-gold-100 text-gold-800">
                    DIAGNOSTIC DRILL
                  </span>
                  <span className="text-[11px] text-muted font-mono">In 2 Days</span>
                </div>
                <p className="text-xs font-bold text-ink">Algorithms & Complexity</p>
                <p className="text-[11px] text-muted">25 questions • Master theorem, dynamic programming</p>
              </div>

              {/* AI Tutor Context Peek */}
              <div className="bg-navy text-white rounded-card p-4 space-y-2.5 shadow-tactile-surface">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-academic-300" />
                  <span className="text-[11px] font-bold text-academic-300 uppercase tracking-wider font-mono">
                    AI Academic Tutor
                  </span>
                </div>
                <p className="text-xs text-navy-100 italic leading-snug">
                  "Explain recursion like I'm preparing for my exam..."
                </p>
                <div className="p-2 rounded-btn bg-white/10 text-[11px] text-navy-200 leading-relaxed font-sans">
                  "Let's break it down into 3 parts: base case, inductive step, and call stack frames."
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3 — TRUST / VALUE STRIP                                           */}
      {/* ========================================================================= */}
      <section className="border-y border-border bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-center text-xs font-semibold text-muted tracking-wider uppercase">
            Everything you need to stay on top of your academics.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: 'CGPA', desc: 'Track your academic performance.', icon: GraduationCap },
              { title: 'Study Plans', desc: 'Know what to study and when.', icon: Calendar },
              { title: 'Test Prep', desc: 'Practice before exam day.', icon: FileCheck2 },
              { title: 'AI Tutor', desc: "Get help when you're stuck.", icon: Sparkles },
              { title: 'Tutors', desc: 'Connect with real academic support.', icon: Compass },
              { title: 'Groups', desc: 'Learn together.', icon: Users },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="bg-canvas border border-border/80 rounded-card p-4 flex flex-col justify-between hover:shadow-tactile-surface transition-all select-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-academic mb-3 shadow-tactile-surface">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink">{item.title}</h3>
                    <p className="text-[11px] text-muted mt-1 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 — THE ACADEMIC JOURNEY                                          */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <Badge variant="academic" size="md">The Academic Journey</Badge>
          <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight">
            How serious students build mastery.
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            From measuring your current standing to continuous improvement, every capability is wired together as one coherent loop.
          </p>
        </div>

        {/* Tactile Timeline Rail */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {journeySteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeJourneyStep === idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveJourneyStep(idx)}
                className={`bg-white border rounded-card p-5 cursor-pointer flex flex-col justify-between transition-all duration-200 select-none relative
                  ${isActive 
                    ? 'border-academic ring-2 ring-academic/10 shadow-tactile-raised' 
                    : 'border-border shadow-tactile-surface hover:shadow-tactile-raised'}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-muted">0{idx + 1}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                      ${isActive ? 'bg-academic-100 text-academic' : 'bg-canvas text-muted'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-ink">{step.label}</h3>
                  <p className="text-xs text-academic font-medium mt-0.5">{step.tagline}</p>
                </div>

                <p className="text-[11px] text-muted mt-3 leading-relaxed">
                  {step.description}
                </p>

                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-academic rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 — CGPA                                                          */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Editorial Copy */}
          <div className="lg:col-span-5 space-y-5">
            <Badge variant="academic">Academic Measurement</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Know exactly where you stand.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Track courses, grades, semesters, units and CGPA in one place. Switch between standard 5.0, 4.0, and 7.0 scales instantly, and model what grades you need in future semesters to hit your graduation honors.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-ink">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Multi-scale support (5.0 Nigerian/Commonwealth, 4.0 US/Global, 7.0 Standard)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Semester-by-semester credit unit aggregation and quality point accounting</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Target GPA modeling to calculate exact scores required for First Class</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button
                variant="academic"
                size="md"
                onClick={() => onNavigate('register')}
                className="shadow-tactile-btn flex items-center gap-2"
              >
                <span>Calculate Your CGPA</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Tactile Instrument Visual */}
          <div className="lg:col-span-7 bg-canvas/40 border border-border rounded-hero p-6 sm:p-8 shadow-tactile-raised space-y-6">
            
            {/* Multi-Scale Interactive Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-xs font-semibold text-muted font-mono">PREVIEW SCALING SYSTEM</span>
              <div className="flex p-0.5 rounded-btn bg-white border border-border shadow-tactile-surface">
                {['5.0', '4.0', '7.0'].map(scale => (
                  <button
                    key={scale}
                    onClick={() => setSelectedDemoScale(scale)}
                    className={`px-3 py-1 rounded-[8px] text-xs font-mono font-semibold transition-all
                      ${selectedDemoScale === scale ? 'bg-academic text-white shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    {scale} Scale
                  </button>
                ))}
              </div>
            </div>

            {/* Instrument Readout */}
            <div className="bg-white border border-border rounded-card p-6 shadow-tactile-surface space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted tracking-wider uppercase font-mono">
                  ACADEMIC RECORD
                </span>
                <span className="px-2.5 py-0.5 rounded bg-academic-100 text-academic text-xs font-semibold">
                  {demoCgpaValues[selectedDemoScale].classification}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold text-ink font-mono tracking-tight">
                  {demoCgpaValues[selectedDemoScale].cgpa}
                </span>
                <span className="text-xl sm:text-2xl text-muted font-mono">
                  / {demoCgpaValues[selectedDemoScale].max}
                </span>
                <span className="ml-3 text-xs font-semibold text-academic font-mono">
                  {demoCgpaValues[selectedDemoScale].delta} this semester
                </span>
              </div>

              <p className="text-xs text-muted">
                Based on 5 completed semesters • 102 total credit units accumulated • 0 course carryovers
              </p>
            </div>

            {/* Semester History Peek Table */}
            <div className="bg-white border border-border rounded-card overflow-hidden shadow-tactile-surface">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas/30 text-muted uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-2.5 px-4 font-semibold">Semester</th>
                    <th className="py-2.5 px-4 font-semibold">Units</th>
                    <th className="py-2.5 px-4 font-semibold">Semester GPA</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { sem: 'Year 3, 1st Semester', units: '21 Units', gpa: '4.71', status: 'Current' },
                    { sem: 'Year 2, 2nd Semester', units: '20 Units', gpa: '4.60', status: 'Completed' },
                    { sem: 'Year 2, 1st Semester', units: '22 Units', gpa: '4.52', status: 'Completed' },
                  ].map((row, i) => (
                    <tr key={i} className="text-ink">
                      <td className="py-2.5 px-4 font-medium">{row.sem}</td>
                      <td className="py-2.5 px-4 font-mono text-muted">{row.units}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">{row.gpa}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas border border-border text-muted">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6 — STUDY PLANNER                                                 */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Interactive Task Planner */}
          <div className="lg:col-span-7 bg-white border border-border rounded-hero p-6 sm:p-8 shadow-tactile-raised space-y-6 order-2 lg:order-1">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-ink">Monday Academic Schedule</h3>
                <p className="text-xs text-muted">Click any task to simulate interactive completion</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-btn bg-gold-50 border border-gold-200 text-gold-700 text-xs font-mono font-semibold">
                <Flame className="w-3.5 h-3.5 text-gold-600 fill-gold-600" />
                <span>8 Day Study Streak</span>
              </div>
            </div>

            {/* Task list with tactile feel */}
            <div className="space-y-3">
              {demoTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleDemoTask(task.id)}
                  className={`p-3.5 rounded-card border flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 select-none
                    ${task.completed 
                      ? 'bg-canvas/50 border-border/70 text-muted shadow-sm' 
                      : 'bg-white border-border text-ink shadow-tactile-surface hover:shadow-tactile-raised hover:border-academic/40'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200
                      ${task.completed ? 'bg-academic text-white shadow-tactile-btn' : 'border border-border bg-canvas hover:border-academic'}`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${task.completed ? 'line-through text-muted' : 'text-ink'}`}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Duration: {task.duration} • Scheduled time: {task.time}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-semibold text-muted shrink-0">
                    {task.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Settle Bar */}
            <div className="p-4 rounded-btn bg-canvas border border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-ink">Daily Completion Rate</p>
                <p className="text-[11px] text-muted">{completedDemoCount} of {demoTasks.length} sessions completed today</p>
              </div>
              <div className="w-32">
                <ProgressBar progress={demoProgressPercent} variant="academic" />
              </div>
            </div>
          </div>

          {/* Right Editorial Copy */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <Badge variant="academic">Tactile Productivity</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Turn your workload into a plan.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Don't let endless course syllabi become overwhelming. Break down complex semesters into weekly milestones, daily time blocks, and checkable topics that build verifiable study momentum.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-ink">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Intelligent topic scheduling based on exam deadlines</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Tactile task completion with automatic streak calculation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Accurate study hour logging for comprehensive academic review</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('register')}
                className="border-border hover:bg-white"
              >
                Create Your Study Routine
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7 — AI TUTOR                                                      */}
      {/* ========================================================================= */}
      <section id="ai-tutor" className="py-16 sm:py-24 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Copy */}
          <div className="lg:col-span-5 space-y-5">
            <Badge variant="academic">Coursework Assistance</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Stuck? Learn through it.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              The AI Tutor is not a replacement for your university lecturers. It is an intelligent academic assistant built to help you deconstruct difficult concepts, generate revision questions, and bridge the gap between lecture slides and exam day.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Understand difficult textbook concepts step-by-step',
                'Explain complex theories with alternate metaphors',
                'Create self-test practice questions on demand',
                'Revise lecture notes before midterms and finals'
              ].map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-ink">
                  <div className="w-4 h-4 rounded-full bg-academic-100 text-academic flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <Button
                variant="academic"
                size="md"
                onClick={() => onNavigate('register')}
                className="shadow-tactile-btn"
              >
                Try the AI Tutor Free
              </Button>
            </div>
          </div>

          {/* Right Conversation UI Visual */}
          <div className="lg:col-span-7 bg-canvas/40 border border-border rounded-hero p-6 sm:p-8 shadow-tactile-raised space-y-5">
            
            {/* Conversation Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-academic-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">AI Academic Assistant</h4>
                  <p className="text-[11px] text-muted">Specialized in Computer Science & Applied Mathematics</p>
                </div>
              </div>
              <Badge variant="academic">Exam Mode</Badge>
            </div>

            {/* Prompt Selector Chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-muted py-1 font-mono">Example Topics:</span>
              <button
                onClick={() => setAiDemoTopic('recursion')}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium transition-colors
                  ${aiDemoTopic === 'recursion' ? 'bg-academic text-white' : 'bg-white border border-border text-ink hover:border-academic'}`}
              >
                Recursion & Call Stack
              </button>
              <button
                onClick={() => setAiDemoTopic('concurrency')}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium transition-colors
                  ${aiDemoTopic === 'concurrency' ? 'bg-academic text-white' : 'bg-white border border-border text-ink hover:border-academic'}`}
              >
                Mutex vs Semaphore
              </button>
              <button
                onClick={() => setAiDemoTopic('calculus')}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium transition-colors
                  ${aiDemoTopic === 'calculus' ? 'bg-academic text-white' : 'bg-white border border-border text-ink hover:border-academic'}`}
              >
                L'Hôpital's Rule
              </button>
            </div>

            {/* Chat Bubble Interface */}
            <div className="space-y-4">
              {/* Student Query Bubble */}
              <div className="flex justify-end">
                <div className="max-w-md bg-white border border-border rounded-card p-3.5 shadow-tactile-surface text-xs text-ink">
                  <p className="text-[10px] font-mono text-muted mb-1 font-semibold uppercase">Student Query</p>
                  <p className="font-medium">{aiDemoConversations[aiDemoTopic].question}</p>
                </div>
              </div>

              {/* AI Response Bubble */}
              <div className="flex justify-start">
                <div className="max-w-lg bg-navy text-white rounded-card p-4 shadow-tactile-raised text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-academic-300 font-mono text-[10px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Tutor Explanation</span>
                  </div>
                  <div className="text-navy-100 whitespace-pre-line leading-relaxed font-sans text-xs">
                    {aiDemoConversations[aiDemoTopic].answer}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 8 — TEST PREP                                                     */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Test Prep Preview Visual */}
          <div className="lg:col-span-7 bg-white border border-border rounded-hero p-6 sm:p-8 shadow-tactile-raised space-y-5 order-2 lg:order-1">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs font-mono font-bold text-academic">CSC301: ALGORITHMS DRILL</span>
                <p className="text-sm font-bold text-ink mt-0.5">Question 12 of 20</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas border border-border text-xs font-mono text-ink">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>18:42 Remaining</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-ink leading-snug">
                What is the tight-bound asymptotic time complexity of building a binary min-heap from an unsorted array of n elements?
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {[
                  { id: 'A', text: 'O(n log n) by repeatedly inserting each element' },
                  { id: 'B', text: 'O(n) via bottom-up linear build-heap (sifting down)', isCorrect: true },
                  { id: 'C', text: 'O(log n) using divide-and-conquer recurrences' },
                  { id: 'D', text: 'O(n²) in the worst case with reverse-ordered input' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSelectedAnswer(opt.id); setAnswerSubmitted(true); }}
                    className={`w-full p-3 rounded-btn border text-left text-xs transition-all flex items-center justify-between gap-3 select-none
                      ${selectedAnswer === opt.id
                        ? opt.isCorrect 
                          ? 'bg-academic-50 border-academic text-academic font-medium' 
                          : 'bg-danger-50 border-danger text-danger'
                        : 'bg-canvas/50 border-border text-ink hover:bg-white hover:border-academic/40'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>

                    {answerSubmitted && selectedAnswer === opt.id && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white shrink-0">
                        {opt.isCorrect ? '✓ Correct Answer' : '✗ Incorrect'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Weak Topics Diagnostic Breakdown */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted">
                <span>Identified Weak Topic:</span>
                <span className="px-2 py-0.5 rounded bg-danger-50 text-danger border border-danger-100 font-mono text-[10px] font-semibold">
                  Heapify Sifting Proofs
                </span>
              </div>
              <span className="text-academic font-mono font-semibold">Diagnostic Score: 85%</span>
            </div>
          </div>

          {/* Right Editorial Copy */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <Badge variant="academic">Exam Simulation</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Practice before it counts.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Don't wait until exam day to discover what you don't know. Simulate timed tests, analyze question-level diagnostics, and pinpoint exact weak syllabus topics before they impact your CGPA.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-ink">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Timed exam simulation matching university formats</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Instant diagnostic topic breakdowns after every drill</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Curated question banks for engineering, science, and math</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button
                variant="academic"
                size="md"
                onClick={() => onNavigate('register')}
                className="shadow-tactile-btn"
              >
                Explore Test Prep
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 9 — TUTOR MARKETPLACE                                             */}
      {/* ========================================================================= */}
      <section id="tutors" className="py-16 sm:py-24 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="academic">Verified University Directory</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight">
              When you need a human perspective.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Find tutors, book academic sessions, and learn directly from people who can help you understand the subject.
            </p>

            {/* Subject Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              {['All', 'Algorithms', 'Operating Systems', 'Mathematics', 'Networks'].map(subj => (
                <button
                  key={subj}
                  onClick={() => setTutorSubjectFilter(subj)}
                  className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all
                    ${tutorSubjectFilter === subj 
                      ? 'bg-academic text-white shadow-tactile-btn' 
                      : 'bg-canvas border border-border text-muted hover:text-ink'}`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Tutor Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTutors.map(tutor => (
              <div 
                key={tutor.id}
                className="bg-canvas/40 border border-border rounded-card p-6 flex flex-col justify-between shadow-tactile-surface hover:shadow-tactile-raised transition-all select-none"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-academic-100 border border-academic-200 text-academic font-bold text-sm flex items-center justify-center">
                      {tutor.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white border border-border text-academic">
                      ★ {tutor.rating}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-ink">{tutor.name}</h3>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{tutor.title}</p>

                  <div className="mt-4 pt-3 border-t border-border/80 space-y-1.5 text-[11px] text-muted font-mono">
                    <p>Dept: <span className="text-ink">{tutor.department}</span></p>
                    <p>Level: <span className="text-ink">{tutor.level}</span></p>
                    <p>Next: <span className="text-academic font-medium">{tutor.availability}</span></p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('register')}
                    className="w-full text-xs shadow-tactile-btn"
                  >
                    Book Session
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button
              variant="academic"
              size="md"
              onClick={() => onNavigate('register')}
              className="shadow-tactile-btn"
            >
              Find a Tutor
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 10 — GROUPS / COMMUNITY                                           */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Copy */}
          <div className="lg:col-span-5 space-y-5">
            <Badge variant="academic">Collaborative Learning</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Don't study alone.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              University courses are conquered together. Form private study groups with department course-mates, share past question solutions, and host scheduled review sessions.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-ink">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Private, invite-only study cohorts for each course</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Group discussion threads and pinned lecture resources</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Structured weekend study session scheduling</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('register')}
                className="border-border hover:bg-white"
              >
                Join Study Groups
              </Button>
            </div>
          </div>

          {/* Right Group Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-academic-100 text-academic flex items-center justify-center font-mono font-bold text-xs">
                    400L
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Computer Science 400L</h3>
                    <p className="text-xs text-muted">12 members • Apex Institute of Technology</p>
                  </div>
                </div>
                <Badge variant="academic">Active Session</Badge>
              </div>

              <div className="p-3.5 rounded-btn bg-canvas border border-border text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-academic" />
                  <span>Next session: <strong className="text-ink">Saturday · 4:00 PM</strong></span>
                </div>
                <span className="font-mono text-muted text-[11px]">Topic: Compiler Syntax Trees</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-mono font-bold text-xs">
                    NET
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Networks & Security Hall</h3>
                    <p className="text-xs text-muted">8 members • Layer 3 Routing & CIDR</p>
                  </div>
                </div>
                <Badge variant="neutral">Upcoming</Badge>
              </div>

              <div className="p-3.5 rounded-btn bg-canvas border border-border text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-academic" />
                  <span>Next session: <strong className="text-ink">Wednesday · 7:00 PM</strong></span>
                </div>
                <span className="font-mono text-muted text-[11px]">Topic: BGP & Packet Tracing</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 11 — VIDEO TUTORING                                               */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Visual Room Window */}
          <div className="lg:col-span-7 bg-navy text-white rounded-hero p-6 sm:p-8 shadow-tactile-hero space-y-6 order-2 lg:order-1">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger animate-pulse" />
                <span className="font-mono text-xs text-academic-300 font-semibold uppercase tracking-wider">
                  Live Video Tutoring Room
                </span>
              </div>
              <span className="text-xs font-mono text-navy-200">Room: ZEGO-STUDY-MAIN</span>
            </div>

            {/* Video preview feed simulation */}
            <div className="aspect-video bg-navy-800 rounded-card border border-white/10 flex flex-col justify-between p-5 relative overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-xs font-medium text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-academic-400" />
                  Dr. Elena Rostova (Tutor)
                </span>
                <span className="text-[11px] font-mono text-navy-300 bg-black/60 px-2 py-0.5 rounded">
                  HD 1080p • 24ms Latency
                </span>
              </div>

              {/* Center Whiteboard diagram graphic */}
              <div className="my-auto text-center space-y-2 z-10">
                <p className="font-mono text-xs text-academic-300">
                  Dynamic Programming Recurrence:
                </p>
                <p className="font-mono text-sm sm:text-base font-bold text-white bg-black/40 py-2 px-4 rounded-btn inline-block border border-white/10">
                  dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-navy-200 z-10">
                <span>Interactive Whiteboard & Screen Sharing Active</span>
                <span className="text-academic-400 font-medium">Encrypted Real-Time Media</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-navy-200 pt-1">
              <span>Low-bandwidth optimized for African campus networks</span>
              <Button
                variant="academic"
                size="sm"
                onClick={() => onNavigate('register')}
                className="shadow-tactile-btn"
              >
                Book a Session
              </Button>
            </div>
          </div>

          {/* Right Copy */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <Badge variant="academic">Live Collaboration</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              Learn face-to-face.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              When textbooks aren't enough, connect with accredited tutors through crystal-clear live video and voice tutoring. Work through mathematical derivations, debug code lines, and share screens without lag.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-ink">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>High-definition audio and video tutoring sessions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>Interactive whiteboards for formulas and code tracing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                <span>One-on-one reviews or small peer cohort tutorials</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button
                variant="academic"
                size="md"
                onClick={() => onNavigate('register')}
                className="shadow-tactile-btn"
              >
                Book a Session
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 12 — ACADEMIC ANALYTICS                                           */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Copy */}
          <div className="lg:col-span-5 space-y-5">
            <Badge variant="academic">Performance Intelligence</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight leading-tight">
              See your progress, not just your grades.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Move beyond looking backward at end-of-term results. Understand your study consistency, identify weak course modules early, and watch your cumulative trajectory head in the right direction.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-card bg-white border border-border shadow-tactile-surface">
                <p className="text-[10px] font-mono text-muted uppercase">Study Consistency</p>
                <p className="text-lg font-bold text-ink mt-0.5 font-mono">94.2%</p>
                <p className="text-[10px] text-academic">Weekly cadence kept</p>
              </div>
              <div className="p-3 rounded-card bg-white border border-border shadow-tactile-surface">
                <p className="text-[10px] font-mono text-muted uppercase">Logged Hours</p>
                <p className="text-lg font-bold text-ink mt-0.5 font-mono">16.5 hrs</p>
                <p className="text-[10px] text-academic">This semester week</p>
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('register')}
                className="border-border hover:bg-white"
              >
                View Analytics Preview
              </Button>
            </div>
          </div>

          {/* Right Visual Charts Preview */}
          <div className="lg:col-span-7 bg-white border border-border rounded-hero p-6 sm:p-8 shadow-tactile-raised space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-xs font-semibold text-ink font-mono uppercase">
                CGPA PROGRESSION CURVE
              </span>
              <span className="text-xs text-academic font-mono font-semibold">+0.32 Projected Next Term</span>
            </div>

            {/* Sparkline & Bars representation */}
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
                {[
                  { sem: 'Y1S1', val: 3.50, height: '65%' },
                  { sem: 'Y1S2', val: 3.58, height: '70%' },
                  { sem: 'Y2S1', val: 3.65, height: '76%' },
                  { sem: 'Y2S2', val: 3.74, height: '84%' },
                  { sem: 'Y3S1', val: 3.82, height: '92%', active: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-mono font-semibold text-ink">{item.val.toFixed(2)}</span>
                    <div 
                      className={`w-full rounded-t-btn transition-all duration-300
                        ${item.active ? 'bg-academic shadow-tactile-btn' : 'bg-canvas border border-border'}`}
                      style={{ height: item.height }}
                    />
                    <span className="text-[10px] font-mono text-muted">{item.sem}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-btn bg-canvas border border-border flex items-center justify-between text-xs text-muted">
                <span>Strongest Subject: <strong className="text-ink">Algorithms (A)</strong></span>
                <span>Focus Area: <strong className="text-gold-700">Compiler Optimization</strong></span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 13 — PRICING                                                      */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 sm:py-28 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="academic" size="md">Transparent Academic Pricing</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight">
              Start free. Upgrade when you need more.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Use the essentials at no cost, then unlock more powerful academic tools as your needs grow.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
            {displayPlans.map(plan => {
              const isPopular = plan.isPopular || plan.code === 'student';

              return (
                <div
                  key={plan.code}
                  className={`bg-white border rounded-hero p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative select-none
                    ${isPopular 
                      ? 'border-academic ring-2 ring-academic/15 shadow-tactile-raised' 
                      : 'border-border shadow-tactile-surface hover:shadow-tactile-raised'}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-academic text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                        Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                      {plan.amount === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-canvas border border-border text-muted">
                          Free Tier
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Price Lockup */}
                    <div className="my-6 pb-6 border-b border-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold font-mono text-ink tracking-tight">
                          ₦{plan.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted font-sans">
                          /{plan.interval || 'month'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted/80 mt-1 font-mono">
                        {plan.amount === 0 ? 'No credit card required' : 'Processed securely via Paystack'}
                      </p>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-ink uppercase tracking-wider font-mono">
                        What's Included:
                      </p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-ink leading-snug">
                            <div className="w-4 h-4 rounded-full bg-academic-50 border border-academic-200 text-academic flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </div>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Button */}
                  <div className="pt-6 mt-6 border-t border-border">
                    <Button
                      variant={isPopular ? 'academic' : 'secondary'}
                      size="md"
                      onClick={() => {
                        if (onSelectPlan) {
                          onSelectPlan(plan.code);
                        } else {
                          onNavigate('register');
                        }
                      }}
                      className="w-full shadow-tactile-btn flex items-center justify-center gap-1.5"
                    >
                      <span>
                        {plan.amount === 0 ? 'Start Free' : `Get ${plan.name}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 14 — FEATURE COMPARISON                                           */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h3 className="text-xl sm:text-3xl font-serif text-ink tracking-tight">
              Compare Platform Capabilities
            </h3>
            <p className="text-xs sm:text-sm text-muted">
              Every detail engineered for rigorous academic focus.
            </p>
          </div>

          {/* Desktop Matrix View */}
          <div className="hidden md:block bg-white border border-border rounded-hero overflow-hidden shadow-tactile-raised">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-canvas/40 text-ink">
                  <th className="py-4 px-6 font-bold text-sm">Feature</th>
                  <th className="py-4 px-6 font-bold text-center">Basic (₦0)</th>
                  <th className="py-4 px-6 font-bold text-center bg-academic-50/50 text-academic">Student (₦2,500)</th>
                  <th className="py-4 px-6 font-bold text-center">Pro (₦5,000)</th>
                  <th className="py-4 px-6 font-bold text-center">Premium (₦10,000)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-canvas/20 transition-colors">
                    <td className="py-3 px-6 font-medium text-ink">{row.name}</td>
                    <td className="py-3 px-6 text-center font-mono text-muted">{row.basic}</td>
                    <td className="py-3 px-6 text-center font-mono font-medium text-academic bg-academic-50/20">{row.student}</td>
                    <td className="py-3 px-6 text-center font-mono text-muted">{row.pro}</td>
                    <td className="py-3 px-6 text-center font-mono text-muted">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion / Tab View */}
          <div className="md:hidden space-y-4">
            <div className="flex p-1 rounded-btn bg-white border border-border">
              {['basic', 'student', 'pro', 'premium'].map(p => (
                <button
                  key={p}
                  onClick={() => setMobileComparisonPlan(p)}
                  className={`flex-1 py-1.5 rounded-[8px] text-xs font-semibold capitalize transition-all
                    ${mobileComparisonPlan === p ? 'bg-academic text-white shadow-sm' : 'text-muted'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="bg-white border border-border rounded-card p-4 space-y-3 shadow-tactile-surface">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                {mobileComparisonPlan} Plan Features
              </h4>
              <div className="divide-y divide-border text-xs">
                {comparisonRows.map((row, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-muted font-medium">{row.name}</span>
                    <span className="font-mono text-ink font-semibold text-right">
                      {row[mobileComparisonPlan]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 15 — FAQ                                                          */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <Badge variant="academic">Answers & Policies</Badge>
            <h2 className="text-2xl sm:text-4xl font-serif text-ink tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Everything you need to know about accounts, subscriptions, and academic data.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;

              return (
                <div 
                  key={idx}
                  className="border border-border rounded-card overflow-hidden bg-canvas/30 shadow-tactile-surface transition-all select-none"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left font-bold text-xs sm:text-sm text-ink hover:text-academic transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-academic' : 'text-muted'}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-muted leading-relaxed border-t border-border/60 pt-3 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 16 — FINAL CTA                                                    */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-white border border-border rounded-hero p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-tactile-hero space-y-5 select-none relative overflow-hidden">
          
          <div className="w-12 h-12 rounded-xl bg-academic-100 border border-academic-200 text-academic flex items-center justify-center mx-auto shadow-tactile-surface">
            <GraduationCap className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif text-ink tracking-tight">
            Build a better academic routine.
          </h2>

          <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed">
            Start with the essentials. Upgrade when you need more. Join students organizing their university journey in one focused platform.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="academic"
              size="lg"
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto shadow-tactile-btn text-sm font-semibold px-8"
            >
              Get Started Free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('pricing')}
              className="w-full sm:w-auto text-sm font-semibold px-7 border-border hover:bg-white"
            >
              View Plans
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 17 — FOOTER                                                       */}
      {/* ========================================================================= */}
      <footer className="border-t border-border bg-white pt-14 pb-12 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Brand info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-academic-100 border border-academic-200 flex items-center justify-center text-academic">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-ink tracking-tight">Academic Platform</span>
            </div>
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              A serious, tactile academic operating environment for university students. Measure CGPA, plan study weeks, prepare for exams, and collaborate face-to-face.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <p className="font-bold text-ink uppercase tracking-wider text-[11px] font-mono">Product</p>
            <ul className="space-y-2 text-muted">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-ink">Features</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-ink">Pricing</button></li>
              <li><button onClick={() => scrollToSection('tutors')} className="hover:text-ink">Tutors</button></li>
              <li><button onClick={() => scrollToSection('ai-tutor')} className="hover:text-ink">AI Tutor</button></li>
              <li><button onClick={() => scrollToSection('features')} className="hover:text-ink">Test Prep</button></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <p className="font-bold text-ink uppercase tracking-wider text-[11px] font-mono">Legal</p>
            <ul className="space-y-2 text-muted">
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-ink">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-ink">Terms of Service</button></li>
              <li><button onClick={onOpenCookieSettings} className="hover:text-ink">Cookie Settings</button></li>
            </ul>
          </div>

          {/* Account Links */}
          <div className="space-y-3">
            <p className="font-bold text-ink uppercase tracking-wider text-[11px] font-mono">Account</p>
            <ul className="space-y-2 text-muted">
              <li><button onClick={() => onNavigate('login')} className="hover:text-ink">Log In</button></li>
              <li><button onClick={() => onNavigate('register')} className="hover:text-ink">Create Account</button></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted">
          <p>© {new Date().getFullYear()} Academic Platform. All rights reserved.</p>
          <p className="font-mono">Engineered for academic productivity.</p>
        </div>
      </footer>

    </div>
  );
}
