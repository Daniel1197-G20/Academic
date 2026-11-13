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
  Award,
  Leaf,
  Zap
} from 'lucide-react';
import { AnimatedNumber, Skeleton, LoadingSpinner } from '../../components/ui';
import { calculateCumulativeMetrics, DEFAULT_GRADING_SCALES } from '../../services/academic/cgpaEngine';
import { useTutorMarketplace } from '../../hooks/useTutorMarketplace';
import { supabase } from '../../lib/supabase/client';
import { useBilling } from '../../context/BillingContext';

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
  const { tutors, loading: tutorsLoading, error: tutorsError } = useTutorMarketplace();
  const { isPremium, loading: billingLoading } = useBilling();

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
            tutor_id
          `)
          .eq('student_id', user.id)
          .in('status', ['confirmed', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const tutorIds = [...new Set((data || []).map((booking) => booking.tutor_id).filter(Boolean))];
        let profilesById = {};
        if (tutorIds.length > 0) {
          const { data: tutorProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', tutorIds);

          if (profilesError) throw profilesError;
          profilesById = Object.fromEntries((tutorProfiles || []).map((profile) => [profile.id, profile]));
        }

        if (isMounted) {
          const mapped = (data || []).map((b) => {
            const tutorProfile = profilesById[b.tutor_id];
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
            } catch (e) { }

            return {
              id: b.id,
              title: b.subject ? `${b.subject} Session` : 'Tutoring Session',
              time: formattedTime || 'Scheduled',
              rawDate: b.slot_time,
              mode: b.mode === 'physical' ? 'In-Person' : 'Online',
              avatar: tutorProfile?.avatar_url || null,
              tutorName: tutorProfile?.full_name || 'Tutor',
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
  const courseCount = cumulative.totalCourses;

  const hasAcademicRecord = cumulative.totalCourses > 0;
  const academicMetric = (value) => (hasAcademicRecord ? value : '—');
  const currency = (amount) => new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);
  const displayTutors = tutors.filter((tutor) => tutor.isVerified).slice(0, 3);
  const dashboardDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date());

  return (
    <div className="w-full space-y-5 pb-6 md:pb-12">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-academic dark:text-[#9FD0B5]">{dashboardDate}</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink dark:text-white sm:text-4xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-white/65">Your academic journey, all in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('study')}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-academic px-4 text-sm font-bold text-white shadow-sm transition hover:bg-academic-700 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Plan your study
        </button>
      </section>

      <section aria-label="Academic overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Current CGPA', value: academicMetric(cumulative.cgpa.toFixed(2)), detail: hasAcademicRecord ? `${cumulative.maxScale} point scale` : 'Add course results', icon: GraduationCap, action: 'cgpa' },
          { label: 'Courses', value: String(courseCount), detail: `${cumulative.totalCourses} graded course${cumulative.totalCourses === 1 ? '' : 's'}`, icon: BookOpen, action: 'cgpa' },
          { label: 'Study streak', value: String(studyStreakDays), detail: 'consecutive days', icon: Zap, action: 'study' },
          { label: 'Plan progress', value: studyPlans.length ? `${overallStudyProgress}%` : '—', detail: studyPlans.length ? `${studyPlans.length} active plan${studyPlans.length === 1 ? '' : 's'}` : 'Create your first plan', icon: TrendingUp, action: 'study' }
        ].map(({ label, value, detail, icon: Icon, action }) => (
          <button key={label} type="button" onClick={() => onNavigateTab(action)} className="glass-stat group min-h-[124px] rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-muted dark:text-white/65">
              {label}
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-academic-100 text-academic transition group-hover:bg-academic group-hover:text-white dark:bg-white/10 dark:text-[#B9E4CB]"><Icon className="h-4 w-4" /></span>
            </span>
            <span className="mt-3 block font-mono text-2xl font-bold tracking-tight text-ink dark:text-white sm:text-3xl">{value}</span>
            <span className="mt-1 block truncate text-[11px] text-muted dark:text-white/55">{detail}</span>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="glass-panel rounded-2xl p-4 sm:p-5 xl:col-span-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-academic dark:text-[#9FD0B5]">Your learning</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-ink dark:text-white sm:text-2xl">Learning overview</h2>
            </div>
            <button type="button" onClick={() => onNavigateTab('study')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-academic hover:bg-academic-50 dark:text-[#9FD0B5] dark:hover:bg-white/5">
              View plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(150px,0.75fr)_minmax(0,1.25fr)] sm:items-center">
            <div className="flex items-center gap-4 rounded-xl bg-white/55 p-4 dark:bg-white/5">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#176B4D ${overallStudyProgress}%, rgba(23,107,77,.12) 0)` }}>
                <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#F6F7F3] text-center dark:bg-[#14231B]">
                  <span><strong className="block font-mono text-xl text-ink dark:text-white">{studyPlans.length ? `${overallStudyProgress}%` : '—'}</strong><span className="text-[9px] text-muted dark:text-white/55">overall</span></span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink dark:text-white">Study plans</p>
                <p className="mt-1 text-xs leading-relaxed text-muted dark:text-white/60">
                  {studyPlans.length ? `${studyPlans.length} active plan${studyPlans.length === 1 ? '' : 's'} tracking your topics.` : 'Your completed topics will appear here once you create a study plan.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {studyPlans.length ? studyPlans.slice(0, 3).map((plan) => {
                const topics = plan.topics || [];
                const completed = topics.filter((topic) => topic.is_completed).length;
                const percent = topics.length ? Math.round(completed / topics.length * 100) : 0;
                return (
                  <div key={plan.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-semibold text-ink dark:text-white">{plan.subject || 'Study plan'}</span>
                      <span className="shrink-0 font-mono font-bold text-academic dark:text-[#9FD0B5]">{percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-academic to-[#5AAB87] transition-all" style={{ width: `${percent}%` }} /></div>
                    <p className="mt-1 text-[10px] text-muted dark:text-white/50">{completed} of {topics.length} topics complete</p>
                  </div>
                );
              }) : hasAcademicRecord && cumulative.semesterBreakdown.length ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-ink dark:text-white">Recorded academic performance</p>
                  {cumulative.semesterBreakdown.slice(-3).reverse().map((semester, index) => (
                    <div key={`${semester.academicYear}-${semester.semesterName}-${index}`} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted dark:text-white/65">{semester.academicYear} · {semester.semesterName}</span>
                      <span className="font-mono text-xs font-bold text-ink dark:text-white">{semester.gpa.toFixed(2)}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className="h-full rounded-full bg-academic" style={{ width: `${Math.max(0, Math.min(100, semester.gpa / (cumulative.maxScale || 5) * 100))}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-ink/15 p-4 dark:border-white/15">
                  <p className="text-xs font-semibold text-ink dark:text-white">Your course progress will appear here</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted dark:text-white/55">Add course results or create a study plan to see your real progress.</p>
                  <button type="button" onClick={() => onNavigateTab('cgpa')} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-academic-100 px-3 text-xs font-bold text-academic hover:bg-academic-200 dark:bg-white/10 dark:text-[#B9E4CB]">
                    Add courses <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </article>

        <article className="relative isolate overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#176B4D] via-[#12543F] to-[#0E392B] p-5 text-white shadow-[0_18px_42px_rgba(14,57,43,.2)] sm:p-6 xl:col-span-5">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-48 w-48 rounded-full border border-white/10 bg-white/5 blur-2xl" />
          <div className="flex h-full flex-col justify-between gap-7">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#DDEFE5]"> Studora learning tools</span>
              <h2 className="mt-4 max-w-sm font-serif text-2xl font-semibold leading-tight sm:text-3xl">A clearer path through your next study session.</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/75 sm:text-sm">Use your study plan to build a focused daily routine, or ask the AI Tutor to work through a topic with you.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => onNavigateTab('study')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#DDEFE5] px-4 text-xs font-bold text-[#104633] shadow-sm transition hover:bg-white">
                <Calendar className="h-4 w-4" /> Open Study Coach <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onNavigateTab('ai')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15">
                <MessageSquare className="h-4 w-4" /> Ask AI Tutor
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="glass-panel rounded-2xl p-4 sm:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-academic dark:text-[#9FD0B5]">On your calendar</p><h2 className="mt-1 font-serif text-xl font-semibold text-ink dark:text-white">Upcoming activities</h2></div>
            <button type="button" onClick={() => onNavigateTab('tutors')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-academic hover:bg-academic-50 dark:text-[#9FD0B5] dark:hover:bg-white/5">Bookings <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          {sessionsLoading ? (
            <div className="space-y-3" aria-label="Loading upcoming activities"><div className="h-14 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" /><div className="h-14 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" /></div>
          ) : sessionsError ? (
            <div className="rounded-xl border border-dashed border-ink/15 p-4 text-xs text-muted dark:border-white/15 dark:text-white/60">Your bookings could not be loaded right now.</div>
          ) : sessions.length ? (
            <div className="space-y-2.5">
              {sessions.slice(0, 3).map((session) => {
                const SessionIcon = session.icon || Calendar;
                return <div key={session.id} className="flex items-center gap-3 rounded-xl border border-white/75 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-academic-100 text-academic dark:bg-white/10 dark:text-[#B9E4CB]"><SessionIcon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink dark:text-white">{session.title}</p><p className="mt-0.5 truncate text-[11px] text-muted dark:text-white/55">{session.tutorName} · {session.time}</p></div>
                  <button type="button" onClick={() => onNavigateTab('messages')} className="min-h-10 shrink-0 rounded-lg px-2.5 text-[11px] font-bold text-academic hover:bg-academic-50 dark:text-[#9FD0B5] dark:hover:bg-white/10">Details</button>
                </div>;
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center dark:border-white/15">
              <Calendar className="mx-auto h-5 w-5 text-academic/70 dark:text-[#9FD0B5]" />
              <p className="mt-2 text-xs font-semibold text-ink dark:text-white">No upcoming sessions</p>
              <p className="mt-1 text-[11px] text-muted dark:text-white/55">Your confirmed and pending tutor bookings will show here.</p>
              <button type="button" onClick={() => onNavigateTab('tutors')} className="mt-3 min-h-10 rounded-lg bg-academic px-3 text-xs font-bold text-white hover:bg-academic-700">Find a tutor</button>
            </div>
          )}
        </article>

        <article className="glass-panel rounded-2xl p-4 sm:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-academic dark:text-[#9FD0B5]">Verified marketplace</p><h2 className="mt-1 font-serif text-xl font-semibold text-ink dark:text-white">Recommended tutors</h2></div>
            <button type="button" onClick={() => onNavigateTab('tutors')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-academic hover:bg-academic-50 dark:text-[#9FD0B5] dark:hover:bg-white/5">Browse all <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          {tutorsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading tutors">{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />)}</div>
          ) : tutorsError ? (
            <div className="rounded-xl border border-dashed border-ink/15 p-4 text-xs text-muted dark:border-white/15 dark:text-white/60">The tutor directory could not be loaded. Try browsing the marketplace.</div>
          ) : displayTutors.length ? (
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${displayTutors.length > 2 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
              {displayTutors.map((tutor) => (
                <article key={tutor.tutorId} className="flex min-w-0 flex-col rounded-xl border border-white/80 bg-white/55 p-3.5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    {tutor.avatarUrl ? <img src={tutor.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-academic-100 dark:ring-white/10" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-academic-100 text-xs font-bold text-academic dark:bg-white/10 dark:text-[#B9E4CB]">{tutor.fullName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>}
                    <div className="min-w-0"><p className="truncate text-xs font-bold text-ink dark:text-white">{tutor.fullName}</p><p className="truncate text-[10px] text-muted dark:text-white/55">{tutor.title}</p></div>
                  </div>
                  <div className="mt-3 flex min-h-6 items-center gap-1.5 text-[10px] text-muted dark:text-white/60">
                    {tutor.rating != null && <><span className="text-gold-600">★</span><span className="font-bold text-ink dark:text-white">{tutor.rating.toFixed(1)}</span><span>({tutor.reviewCount} reviews)</span></>}
                    {tutor.rating == null && <span>Verified tutor</span>}
                  </div>
                  <p className="mt-1 min-h-8 line-clamp-2 text-[10px] text-muted dark:text-white/55">{tutor.subjectNames.slice(0, 2).join(' · ') || tutor.department || 'Available for tutoring'}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/5 pt-3 dark:border-white/10">
                    <span className="truncate text-[11px] font-bold text-ink dark:text-white">{tutor.hourlyRate > 0 ? currency(tutor.hourlyRate) : 'Rate not listed'}{tutor.hourlyRate > 0 && <span className="font-normal text-muted dark:text-white/50"> / session</span>}</span>
                    <button type="button" onClick={() => onNavigateTab('tutors')} className="min-h-9 shrink-0 rounded-lg bg-academic px-2.5 text-[10px] font-bold text-white hover:bg-academic-700">View tutor</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center dark:border-white/15">
              <Users className="mx-auto h-5 w-5 text-academic/70 dark:text-[#9FD0B5]" />
              <p className="mt-2 text-xs font-semibold text-ink dark:text-white">No verified tutors to show yet</p>
              <p className="mt-1 text-[11px] text-muted dark:text-white/55">When eligible tutors are available, their current profiles and session rates will appear here.</p>
            </div>
          )}
        </article>
      </section>

      <section aria-label="Quick actions" className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-gold-600" /><h2 className="font-serif text-lg font-semibold text-ink dark:text-white">Quick actions</h2></div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Find a tutor', icon: Compass, route: 'tutors' },
            { label: 'My courses & CGPA', icon: GraduationCap, route: 'cgpa' },
            { label: 'Study plans', icon: Calendar, route: 'study' },
            { label: 'Assessments', icon: CheckSquare, route: 'test-prep' },
            { label: 'Messages', icon: MessageSquare, route: 'messages', badge: unreadMessages }
          ].map(({ label, icon: Icon, route, badge }) => (
            <button key={route} type="button" onClick={() => onNavigateTab(route)} className="group flex min-h-14 items-center gap-2.5 rounded-xl border border-white/75 bg-white/55 px-3 text-left transition hover:border-academic/25 hover:bg-white/80 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-academic-100 text-academic transition group-hover:bg-academic group-hover:text-white dark:bg-white/10 dark:text-[#B9E4CB]"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-ink dark:text-white">{label}</span>
              {badge > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{badge}</span>}
            </button>
          ))}
        </div>
      </section>

      {!billingLoading && !isPremium && (
        <section className="xl:hidden flex flex-col gap-4 rounded-2xl border border-gold-500/25 bg-gradient-to-r from-[#172033] to-[#104633] p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-300"><Award className="h-5 w-5" /></span>
            <div><h2 className="text-sm font-bold">Explore Studora Premium</h2><p className="mt-1 text-xs text-white/70">See the plans and features available for your account.</p></div>
          </div>
          <button type="button" onClick={() => onNavigateTab('pricing')} className="min-h-11 shrink-0 rounded-xl bg-gold-500 px-4 text-xs font-bold text-[#172033] transition hover:bg-gold-400">View plans <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
        </section>
      )}
    </div>
  );
}
