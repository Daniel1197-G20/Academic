import React, { useMemo, useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Plus,
  CheckSquare,
  TrendingUp,
  MessageSquare,
  Compass,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Video,
  Monitor,
  Search,
  Sparkles,
  AlertCircle,
  FolderOpen,
  Award
} from 'lucide-react';
import { AnimatedNumber, Skeleton, LoadingSpinner } from '../../components/ui';
import { calculateCumulativeMetrics, DEFAULT_GRADING_SCALES } from '../../services/academic/cgpaEngine';
import { useTutorMarketplace } from '../../hooks/useTutorMarketplace';
import { supabase } from '../../lib/supabase/client';

// Mini smooth curvy wave line for stat cards
function StatWave({ color = '#176B4D', stroke = '#176B4D' }) {
  const paths = {
    green: "M 0,28 C 30,28 45,26 60,20 C 75,14 85,6 100,10",
    blue: "M 0,28 C 25,28 40,24 55,20 C 70,16 80,6 100,10",
    gold: "M 0,28 C 20,28 35,22 50,18 C 65,14 80,22 100,8",
    progress: "M 0,28 C 30,28 45,24 60,18 C 75,12 85,8 100,10"
  };

  const pathData = paths[color] || paths.green;
  const gradientId = `wave-grad-${color}`;

  return (
    <svg viewBox="0 0 100 32" className="w-full h-8 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L 100,32 L 0,32 Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={pathData}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Study Calendar Component (Driven by Current Date & Real Events) ──────────
function StudyCalendar({ onNavigateCalendar, sessions = [] }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Determine if a calendar day has scheduled sessions
  const hasEventOnDay = (day) => {
    if (!day || !sessions || sessions.length === 0) return false;
    return sessions.some(s => {
      if (!s.rawDate) return false;
      const d = new Date(s.rawDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#667085] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-[#111827] dark:text-white">
          {monthName} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#667085] transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-[11px] font-medium text-[#667085] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-8" />;
          const isSelected = day === selectedDay;
          const hasEvent = hasEventOnDay(day);
          return (
            <div key={day} className="flex items-center justify-center h-8 relative">
              <button
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-all relative
                  ${isSelected
                    ? 'cal-selected-day font-bold'
                    : 'text-[#111827] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
              >
                {day}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#176B4D]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Green Progress / Reminder Notification Card */}
      <div className="rounded-2xl bg-[#DDEFE5]/70 dark:bg-[#176B4D]/30 border border-[#176B4D]/20 p-3 flex items-center gap-3 mt-4">
        <div className="w-8 h-8 rounded-full bg-[#176B4D] text-white flex items-center justify-center shrink-0 shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
            Academic Schedule
          </p>
          <p className="text-[11px] text-[#176B4D] dark:text-[#8FC9AE] leading-tight mt-0.5 truncate">
            {sessions.length > 0
              ? `${sessions.length} upcoming study event${sessions.length > 1 ? 's' : ''} scheduled`
              : 'Select a day to view or schedule study sessions'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Page Component ─────────────────────────────────────────
export function DashboardPage({
  userProfile,
  semesters = [],
  studyPlans = [],
  streakData = { streak: 0, totalHours: 0 },
  selectedScale = '5.0',
  dataLoading = false,
  unreadMessages = 0,
  onNavigateTab,
  onToggleTopic,
  showToast
}) {
  const activeScale = useMemo(() => {
    return DEFAULT_GRADING_SCALES[selectedScale] || DEFAULT_GRADING_SCALES['5.0'];
  }, [selectedScale]);

  const cumulative = useMemo(() => {
    return calculateCumulativeMetrics(semesters, activeScale);
  }, [semesters, activeScale]);

  const semesterDelta = useMemo(() => {
    const list = cumulative.semesterBreakdown;
    if (list.length < 2) return null;
    return Number((list[list.length - 1].gpa - list[list.length - 2].gpa).toFixed(2));
  }, [cumulative]);

  // Authenticated user's real first name or fallback to "Student"
  const firstName = userProfile?.full_name?.trim()?.split(/\s+/)[0] || 'Student';

  // Live Tutor Marketplace count
  const { tutors, loading: tutorsLoading } = useTutorMarketplace();

  // Live Bookings & Sessions from Supabase
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchUpcomingBookings() {
      try {
        setSessionsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) {
            setSessions([]);
            setSessionsLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('tutor_bookings')
          .select(`
            id,
            subject,
            slot_time,
            status,
            mode,
            tutor_id,
            profiles:tutor_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('student_id', user.id)
          .in('status', ['confirmed', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (isMounted) {
          const mapped = (data || []).map((b) => {
            let formattedTime = b.slot_time;
            try {
              const d = new Date(b.slot_time);
              if (!isNaN(d.getTime())) {
                formattedTime = d.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                }) + ' • ' + d.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch (e) {}

            return {
              id: b.id,
              title: b.subject ? `${b.subject} Session` : 'Tutoring Session',
              time: formattedTime || 'Scheduled',
              rawDate: b.slot_time,
              mode: b.mode === 'physical' ? 'In-Person' : 'Online',
              avatar: b.profiles?.avatar_url || null,
              tutorName: b.profiles?.full_name || 'Tutor',
              icon: b.mode === 'physical' ? Monitor : Video
            };
          });
          setSessions(mapped);
          setSessionsError(null);
        }
      } catch (err) {
        if (isMounted) {
          setSessionsError(err.message || 'Unable to load scheduled sessions');
        }
      } finally {
        if (isMounted) setSessionsLoading(false);
      }
    }

    fetchUpcomingBookings();
    return () => { isMounted = false; };
  }, []);

  // Compute enrolled courses from actual study plans or registered semester courses
  const enrolledCourses = useMemo(() => {
    if (studyPlans && studyPlans.length > 0) {
      return studyPlans.map((plan, idx) => {
        const total = plan.topics?.length || 1;
        const completed = plan.topics?.filter(t => t.is_completed).length || 0;
        const progress = Math.round((completed / total) * 100);
        const nextTopic = plan.topics?.find(t => !t.is_completed)?.title || 'All topics completed';
        return {
          id: plan.id,
          name: plan.subject,
          next: nextTopic,
          progress,
          iconBg: idx % 3 === 0
            ? 'bg-[#DDEFE5] text-[#176B4D]'
            : idx % 3 === 1
            ? 'bg-[#E0E7FF] text-[#4F46E5]'
            : 'bg-[#EDE9FE] text-[#7C3AED]'
        };
      });
    }

    // Fallback to active semester courses if no study plans created yet
    const currentSem = semesters[semesters.length - 1];
    if (currentSem && currentSem.courses && currentSem.courses.length > 0) {
      return currentSem.courses.map((c, idx) => ({
        id: c.id || `crs-${idx}`,
        name: c.courseTitle || c.course_title || c.courseCode || c.course_code,
        next: `${c.creditUnits || c.credit_units || 3} Credit Units`,
        progress: 0,
        iconBg: idx % 3 === 0
          ? 'bg-[#DDEFE5] text-[#176B4D]'
          : idx % 3 === 1
          ? 'bg-[#E0E7FF] text-[#4F46E5]'
          : 'bg-[#EDE9FE] text-[#7C3AED]'
      }));
    }

    return [];
  }, [studyPlans, semesters]);

  // Overall study progress percentage computed from real study plans
  const overallStudyProgress = useMemo(() => {
    if (!studyPlans || studyPlans.length === 0) return 0;
    let totalTopics = 0;
    let completedTopics = 0;
    studyPlans.forEach(plan => {
      const topics = plan.topics || [];
      totalTopics += topics.length;
      completedTopics += topics.filter(t => t.is_completed).length;
    });
    if (totalTopics === 0) return 0;
    return Math.round((completedTopics / totalTopics) * 100);
  }, [studyPlans]);

  // 5 historical data points for the learning progress chart derived from real semester GPAs or study logs
  const progressNodes = useMemo(() => {
    const list = cumulative.semesterBreakdown || [];
    if (list.length >= 2) {
      // Map GPAs into 0-100 coordinate scale
      const maxGpa = activeScale?.maxGpa || 5.0;
      return list.slice(-5).map((sem, idx, arr) => {
        const x = arr.length === 1 ? 500 : 50 + Math.round((idx / (arr.length - 1)) * 900);
        const ratio = Math.max(0, Math.min(1, (sem.gpa || 0) / maxGpa));
        const y = Math.round(90 - (ratio * 70)); // SVG inverted y-axis
        return { cx: x, cy: y, label: sem.name, gpa: sem.gpa };
      });
    }
    return [];
  }, [cumulative, activeScale]);

  // Format student role label
  const isTutor = userProfile?.role === 'tutor';
  const roleLabel = isTutor ? 'Tutor' : userProfile?.role ? String(userProfile.role).charAt(0).toUpperCase() + String(userProfile.role).slice(1) : 'Student';
  const studyStreakDays = streakData?.streak || 0;
  const courseCount = enrolledCourses.length;

  return (
    <div className="w-full space-y-5 pb-12">
      {/* ── 1. WELCOME HEADER ────────────────────────────────────────── */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
          Welcome back, {firstName}!
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs sm:text-sm font-medium text-[#667085] dark:text-white/70">
            Keep learning, keep growing.
          </p>
          <span className="w-5 h-5 rounded-full bg-[#DDEFE5] dark:bg-[#176B4D]/40 text-[#176B4D] dark:text-[#A7F3D0] flex items-center justify-center text-xs">
            🍃
          </span>
        </div>
      </div>

      {/* ── 2. TOP METRICS & PROFILE ROW (Matches Reference Section 0_0) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Student Profile Card (span 4 on md/lg) */}
        <div className="md:col-span-5 lg:col-span-4 glass-panel rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-[#176B4D] flex items-center justify-center border-2 border-white/80 shadow-sm">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.full_name || 'Student avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl font-sans">
                  {(userProfile?.full_name || 'Student').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white truncate">
              {userProfile?.full_name || 'Studora Scholar'}
            </h3>
            <p className="text-xs text-[#667085] dark:text-white/60 mb-2.5">
              {roleLabel}
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="px-4 py-1.5 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] transition-all shadow-sm"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* 3 Metric Glass Cards: Your Progress, Enrolled Courses, Study Streak */}
        <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Metric 1: Your Progress (Donut Chart) */}
          <div
            onClick={() => onNavigateTab('study')}
            className="glass-stat rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">
                Your Progress
              </span>
              <span className="w-5 h-5 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-[10px]">
                ⚡
              </span>
            </div>
            <div className="flex items-center gap-3 my-2">
              {/* Circular SVG Donut */}
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#176B4D]"
                    strokeDasharray={`${overallStudyProgress}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
              <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">
                {overallStudyProgress}%
              </span>
            </div>
            <p className="text-[10px] text-[#667085] dark:text-white/50 truncate">
              {studyPlans.length > 0 ? `${studyPlans.length} active study plan${studyPlans.length > 1 ? 's' : ''}` : 'No active study plans'}
            </p>
          </div>

          {/* Metric 2: Enrolled Courses */}
          <div
            onClick={() => onNavigateTab('cgpa')}
            className="glass-stat rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">
                Enrolled Courses
              </span>
              <div className="w-5 h-5 rounded-md bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center text-[11px]">
                <BookOpen className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">
                {courseCount}
              </span>
            </div>
            <p className="text-[10px] text-[#667085] dark:text-white/50 truncate">
              {courseCount > 0 ? `${courseCount} registered courses` : 'Registered curriculum'}
            </p>
          </div>

          {/* Metric 3: Study Streak */}
          <div
            onClick={() => onNavigateTab('study')}
            className="glass-stat rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">
                Study Streak
              </span>
              <div className="w-5 h-5 rounded-md bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center text-[11px]">
                <Clock className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">
                {studyStreakDays}
              </span>
              <span className="text-sm font-bold text-[#111827] dark:text-white">Days</span>
            </div>
            <p className="text-[10px] text-[#667085] dark:text-white/50 truncate">
              Consecutive practice
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. QUICK ACTIONS ROW ─────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-[#111827] dark:text-white tracking-tight">
            Quick Actions
          </h2>
          <span className="text-xs text-[#176B4D]">⚡</span>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 ${isTutor ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
          {/* Action: Tutor Dashboard (For Approved Tutors) */}
          {isTutor && (
            <button
              type="button"
              onClick={() => onNavigateTab('tutor-dashboard')}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group relative"
            >
              <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                  Tutor Dashboard
                </p>
                <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                  Manage sessions
                </p>
              </div>
            </button>
          )}

          {/* Action 1: Messages & Chat */}
          <button
            type="button"
            onClick={() => onNavigateTab('messages')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group relative"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                Messages
              </p>
              <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                Chat with tutors
              </p>
            </div>
            {unreadMessages > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#176B4D]" />
            )}
          </button>

          {/* Action 2: Find a Tutor */}
          <button
            type="button"
            onClick={() => onNavigateTab('tutors')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                Find a Tutor
              </p>
              <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                Get expert help
              </p>
            </div>
          </button>

          {/* Action 3: My Courses */}
          <button
            type="button"
            onClick={() => onNavigateTab('cgpa')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                My Courses
              </p>
              <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                Continue learning
              </p>
            </div>
          </button>

          {/* Action 4: Study Plan */}
          <button
            type="button"
            onClick={() => onNavigateTab('study')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                Study Plan
              </p>
              <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                Plan your study
              </p>
            </div>
          </button>

          {/* Action 5: Take Assessment */}
          <button
            type="button"
            onClick={() => onNavigateTab('test-prep')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:border-[#176B4D]/40 transition-all text-left shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white leading-tight">
                Assessment
              </p>
              <p className="text-[11px] text-[#667085] dark:text-white/50 mt-0.5 truncate">
                Test knowledge
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: MY COURSES & UPCOMING SESSIONS ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: My Courses Preview Cards (span 7 on lg) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                My Courses
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('cgpa')}
                className="text-xs font-semibold text-[#176B4D] dark:text-[#8FC9AE] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Architectural Course Thumbnails matching the reference */}
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {enrolledCourses.slice(0, 3).map((c, i) => (
                  <div
                    key={c.id || i}
                    onClick={() => onNavigateTab('cgpa')}
                    className="rounded-xl overflow-hidden bg-white/80 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div className="h-20 w-full overflow-hidden bg-gray-100 dark:bg-navy-800 relative">
                      <picture>
                        <source srcSet="/campus-background-sm.webp" type="image/webp" />
                        <img
                          src="/campus-background.webp"
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </picture>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white truncate max-w-[90%]">
                        {c.name}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-[#667085] dark:text-white/60 mb-1">
                        <span>Progress</span>
                        <span className="font-bold text-[#176B4D]">{c.progress ?? 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-navy-700 overflow-hidden">
                        <div
                          className="h-full bg-[#176B4D] rounded-full transition-all"
                          style={{ width: `${c.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 text-center space-y-2">
                <p className="text-xs font-semibold text-[#111827] dark:text-white">No courses registered yet</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">
                  Add courses to your semester records or create a study plan to track progress here.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('cgpa')}
                  className="px-3 py-1.5 rounded-lg bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C]"
                >
                  Add Courses
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Upcoming Sessions (span 5 on lg) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                Upcoming Sessions
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('tutors')}
                className="text-xs font-semibold text-[#176B4D] dark:text-[#8FC9AE] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-2.5">
                {sessions.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111827] dark:text-white truncate">
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[#667085] dark:text-white/50 truncate">
                          {s.time}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('messages')}
                      className="px-2.5 py-1 rounded-lg bg-[#176B4D] text-white text-[11px] font-bold hover:bg-[#12543C] shrink-0"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 text-center space-y-2">
                <p className="text-xs font-semibold text-[#111827] dark:text-white">No upcoming sessions</p>
                <p className="text-[11px] text-[#667085] dark:text-white/60">
                  Book 1-on-1 sessions with verified tutors in the marketplace.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('tutors')}
                  className="px-3 py-1.5 rounded-lg bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C]"
                >
                  Find a Tutor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
