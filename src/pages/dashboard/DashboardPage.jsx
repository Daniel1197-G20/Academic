import React, { useMemo } from 'react';
import { 
  GraduationCap, 
  Flame, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  CheckSquare,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  Compass,
  Award
} from 'lucide-react';
import { 
  Card, 
  Button, 
  Badge, 
  ProgressBar, 
  AnimatedNumber, 
  TactileCheckbox 
} from '../../components/ui';
import { calculateCumulativeMetrics, DEFAULT_GRADING_SCALES } from '../../services/academic/cgpaEngine';

export function DashboardPage({
  userProfile,
  semesters = [],
  studyPlans = [],
  streakData = { streak: 0, totalHours: 0 },
  selectedScale = '5.0',
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

  // Current semester is the last one recorded
  const currentSemester = useMemo(() => {
    return cumulative.semesterBreakdown.length > 0 
      ? cumulative.semesterBreakdown[cumulative.semesterBreakdown.length - 1] 
      : null;
  }, [cumulative]);

  // Previous semester for delta calculation
  const semesterDelta = useMemo(() => {
    const list = cumulative.semesterBreakdown;
    if (list.length < 2) return null;
    const current = list[list.length - 1].gpa;
    const previous = list[list.length - 2].gpa;
    const diff = Number((current - previous).toFixed(2));
    return diff;
  }, [cumulative]);

  // Find active subject & topic to "Continue studying"
  const activeStudyItem = useMemo(() => {
    for (const plan of studyPlans) {
      if (plan.topics && plan.topics.length > 0) {
        const incomplete = plan.topics.find(t => !t.is_completed);
        if (incomplete) {
          const completedCount = plan.topics.filter(t => t.is_completed).length;
          const progress = Math.round((completedCount / plan.topics.length) * 100);
          return {
            planId: plan.id,
            subject: plan.subject,
            topic: incomplete,
            progress,
            totalTopics: plan.topics.length,
            completedCount
          };
        }
      }
    }
    return null;
  }, [studyPlans]);

  // All study tasks for today's plan
  const todayTasks = useMemo(() => {
    const times = ['09:00', '11:30', '14:00', '16:30', '19:00'];
    const tasks = [];
    let idx = 0;
    for (const plan of studyPlans) {
      if (plan.topics) {
        for (const topic of plan.topics) {
          tasks.push({
            id: topic.id,
            title: topic.title,
            subject: plan.subject,
            deadline: plan.deadline,
            isCompleted: !!topic.is_completed,
            planId: plan.id,
            timeSlot: times[idx % times.length]
          });
          idx++;
        }
      }
    }
    return tasks;
  }, [studyPlans]);

  const pendingTasks = useMemo(() => todayTasks.filter(t => !t.isCompleted).slice(0, 5), [todayTasks]);
  const completedTasksCount = useMemo(() => todayTasks.filter(t => t.isCompleted).length, [todayTasks]);
  const totalTasksCount = todayTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const studentFirstName = userProfile?.full_name?.split(' ')[0] || 'Daniel';

  return (
    <div className="space-y-6 sm:space-y-8 pb-4">
      {/* 1. Header Greeting & Academic Context (Stage 1) */}
      <div className="staged-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
            {greeting}, {studentFirstName}.
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5 sm:mt-1">
            Your academic progress at a glance.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('cgpa')}
            icon={Plus}
          >
            Record Course
          </Button>
          <Button
            variant="academic"
            size="sm"
            onClick={() => onNavigateTab('study')}
            icon={BookOpen}
          >
            New Study Plan
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE RECOMPOSED DASHBOARD HIERARCHY (< lg)                        */}
      {/* =================================================================== */}
      <div className="lg:hidden space-y-5">
        {/* Mobile Snapshot (Level 2 Raised Card) */}
        <div className="bg-white border border-border rounded-hero p-4 shadow-tactile-raised space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider font-mono">
              Academic Snapshot
            </span>
            <Badge variant="academic" size="sm">
              {cumulative.classificationName || 'Honors'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* CGPA */}
            <div 
              onClick={() => onNavigateTab('cgpa')}
              className="p-2.5 rounded-xl bg-canvas border border-border/80 shadow-tactile-surface flex flex-col justify-between cursor-pointer active:translate-y-[1px] transition-all"
            >
              <span className="text-[10px] font-semibold text-muted uppercase">CGPA</span>
              <div className="my-1">
                <span className="text-lg sm:text-xl font-extrabold text-ink font-mono tracking-tight">
                  {cumulative.cgpa.toFixed(2)}
                </span>
                <span className="text-[10px] text-muted font-mono block">/{activeScale.maxScale.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-academic font-medium truncate">
                {semesterDelta !== null ? (semesterDelta >= 0 ? `+${semesterDelta.toFixed(2)}` : `${semesterDelta.toFixed(2)}`) : 'Active'}
              </span>
            </div>

            {/* Current Semester */}
            <div 
              onClick={() => onNavigateTab('cgpa')}
              className="p-2.5 rounded-xl bg-canvas border border-border/80 shadow-tactile-surface flex flex-col justify-between cursor-pointer active:translate-y-[1px] transition-all"
            >
              <span className="text-[10px] font-semibold text-muted uppercase">Semester</span>
              <div className="my-1">
                <span className="text-xs font-bold text-ink truncate block">
                  {currentSemester ? currentSemester.semesterName : 'Semester 1'}
                </span>
                <span className="text-[10px] text-muted font-mono block">
                  {cumulative.totalCreditUnits} Units
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium truncate">
                {currentSemester ? currentSemester.academicYear : 'Year 1'}
              </span>
            </div>

            {/* Study Streak */}
            <div 
              onClick={() => onNavigateTab('study')}
              className="p-2.5 rounded-xl bg-canvas border border-border/80 shadow-tactile-surface flex flex-col justify-between cursor-pointer active:translate-y-[1px] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted uppercase">Streak</span>
                <Flame className="w-3 h-3 text-gold-600 fill-gold-600 shrink-0 streak-breathing" />
              </div>
              <div className="my-1">
                <span className="text-lg sm:text-xl font-extrabold text-gold-700 font-mono tracking-tight">
                  {streakData.streak}d
                </span>
                <span className="text-[10px] text-muted block">Active</span>
              </div>
              <span className="text-[10px] text-muted font-medium truncate">
                {streakData.totalHours}h study
              </span>
            </div>
          </div>
        </div>

        {/* Continue Studying (Level 2 Raised Card) */}
        <div className="bg-white border border-border rounded-hero p-4 shadow-tactile-raised space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider font-mono">
              Continue Studying
            </span>
            {activeStudyItem && (
              <Badge variant="neutral" size="sm">{activeStudyItem.subject}</Badge>
            )}
          </div>
          {activeStudyItem ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-ink truncate">
                  {activeStudyItem.subject}
                </h3>
                <p className="text-xs text-muted mt-0.5 truncate">
                  Topic {activeStudyItem.completedCount + 1} of {activeStudyItem.totalTopics}: <span className="text-ink font-medium">{activeStudyItem.topic.title}</span>
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Course Progress</span>
                  <span className="font-mono font-semibold text-ink">{activeStudyItem.progress}%</span>
                </div>
                <div className="w-full tactile-track h-2">
                  <div className="h-full bg-academic rounded-track transition-all duration-300" style={{ width: `${activeStudyItem.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateTab('study')}
                  className="flex-1 min-h-[40px]"
                >
                  View Plan
                </Button>
                <Button
                  variant="academic"
                  size="sm"
                  onClick={() => onToggleTopic(activeStudyItem.topic.id)}
                  icon={CheckSquare}
                  className="flex-1 min-h-[40px]"
                >
                  Mark Complete
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-academic mx-auto" />
              <p className="text-xs text-muted">All planned topics completed!</p>
              <Button variant="academic" size="sm" onClick={() => onNavigateTab('study')} icon={Plus} className="min-h-[40px]">
                Create Plan
              </Button>
            </div>
          )}
        </div>

        {/* Today's Progress (Level 2 Raised Card) */}
        <div className="bg-white border border-border rounded-hero p-4 shadow-tactile-raised space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider font-mono">
              Today's Progress
            </span>
            <span className="text-xs font-mono font-semibold text-academic">{completionRate}% Completed</span>
          </div>
          <div className="w-full tactile-track h-2">
            <div className="h-full bg-academic rounded-track transition-all duration-300" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="text-xs text-muted">
            <strong className="text-ink font-mono">{completedTasksCount}</strong> of <strong className="text-ink font-mono">{totalTasksCount}</strong> syllabus topics completed.
          </p>
        </div>

        {/* Upcoming Tasks */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider font-mono">
              Upcoming Schedule
            </span>
            <button 
              type="button" 
              onClick={() => onNavigateTab('study')} 
              className="text-xs font-semibold text-academic flex items-center gap-1"
            >
              All ({todayTasks.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-white border border-border rounded-card divide-y divide-border shadow-tactile-raised overflow-hidden">
            {todayTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">No scheduled tasks today.</div>
            ) : (
              todayTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TactileCheckbox
                      checked={task.isCompleted}
                      onChange={() => onToggleTopic(task.id)}
                      aria-label={`Mark ${task.title} as completed`}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${task.isCompleted ? 'line-through text-muted' : 'text-ink'}`}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {task.timeSlot} • {task.subject}
                      </p>
                    </div>
                  </div>
                  <Badge variant={task.isCompleted ? 'neutral' : 'academic'} size="sm">
                    {task.isCompleted ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions (Level 3 Tactile Controls) */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider font-mono">
            Quick Actions
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('cgpa')}
              className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-lg bg-academic-50 border border-academic-200 text-academic flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-ink block truncate">CGPA</span>
                <span className="text-[10px] text-muted block truncate">Calculate grades</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('study')}
              className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-200 text-navy flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-ink block truncate">Study Plan</span>
                <span className="text-[10px] text-muted block truncate">Daily syllabus</span>
              </div>
            </button>

            {/* Find a Tutor — primary marketplace CTA */}
            <button
              type="button"
              onClick={() => onNavigateTab('tutors')}
              className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-lg bg-academic-50 border border-academic-200 text-academic flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-ink block truncate">Find a Tutor</span>
                <span className="text-[10px] text-muted block truncate">Marketplace</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('test-prep')}
              className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-lg bg-warning-50 border border-warning-200 text-warning-700 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-ink block truncate">Test Prep</span>
                <span className="text-[10px] text-muted block truncate">Exam drills</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('ai')}
              className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-lg bg-gold-50 border border-gold-200 text-gold-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-ink block truncate">AI Tutor</span>
                <span className="text-[10px] text-muted block truncate">Course assistance</span>
              </div>
            </button>

            {/* Become a Tutor — only shown to students, distinct from Find a Tutor */}
            {(!userProfile?.role || userProfile.role === 'student') && (
              <button
                type="button"
                onClick={() => onNavigateTab('become-tutor')}
                className="p-3 rounded-xl bg-white border border-border shadow-tactile-surface hover:shadow-tactile-raised active:translate-y-[1px] transition-all text-left flex items-center gap-2.5 select-none min-h-[48px]"
              >
                <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-200 text-navy-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-ink block truncate">Become Tutor</span>
                  <span className="text-[10px] text-muted block truncate">Apply & earn</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DESKTOP SIGNATURE COMMAND CENTER (hidden on < lg)                   */}
      {/* =================================================================== */}
      <div className="hidden lg:block space-y-8">
      {/* 2. Command Center Hero: CURRENT CGPA | CONTINUE STUDYING (Stage 2) */}
      <div className="staged-2 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CURRENT CGPA — SIGNATURE ELEMENT (Level 2 Raised Hero) */}
        <div className="lg:col-span-6 bg-white border border-border rounded-hero p-6 sm:p-7 shadow-tactile-hero flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted tracking-wider uppercase">
                CURRENT CGPA
              </span>
              <Badge variant="academic">
                {cumulative.classificationName || 'Honors'}
              </Badge>
            </div>

            {/* Dominating Number */}
            <div className="mt-4 flex items-baseline gap-2.5">
              <AnimatedNumber 
                value={cumulative.cgpa} 
                decimals={2}
                duration={850}
                className="text-5xl sm:text-6xl font-extrabold text-ink tracking-tight font-mono"
              />
              <span className="text-xl sm:text-2xl font-medium text-muted font-mono">
                / {activeScale.maxScale.toFixed(2)}
              </span>
            </div>

            {/* Supporting Information (Quiet) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {semesterDelta !== null ? (
                <span className={`inline-flex items-center font-semibold ${semesterDelta >= 0 ? 'text-academic' : 'text-danger'}`}>
                  {semesterDelta >= 0 ? `↑ +${semesterDelta.toFixed(2)}` : `↓ ${semesterDelta.toFixed(2)}`} this semester
                </span>
              ) : (
                <span className="text-muted">First recorded semester</span>
              )}
              <span className="text-muted">•</span>
              <span className="text-muted font-mono">{cumulative.totalCreditUnits} total units</span>
              <span className="text-muted">•</span>
              <span className="text-muted">{semesters.length} semesters</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">
              Scale: <strong className="text-ink font-mono">{activeScale.scaleName}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('cgpa')}
              className="text-xs font-semibold text-academic hover:underline inline-flex items-center gap-1.5 transition-colors"
            >
              Open CGPA Calculator <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CONTINUE STUDYING (Level 2 Raised Card) */}
        <div className="lg:col-span-6 bg-white border border-border rounded-hero p-6 sm:p-7 shadow-tactile-raised flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted tracking-wider uppercase">
                CONTINUE STUDYING
              </span>
              {activeStudyItem && (
                <Badge variant="neutral">
                  {activeStudyItem.subject}
                </Badge>
              )}
            </div>

            {activeStudyItem ? (
              <div className="mt-4 space-y-3.5">
                <div>
                  <h3 className="text-xl font-bold text-ink truncate">
                    {activeStudyItem.subject}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    Topic {activeStudyItem.completedCount + 1} of {activeStudyItem.totalTopics}: <span className="text-ink font-medium">{activeStudyItem.topic.title}</span>
                  </p>
                </div>

                {/* Engraved Progress Track */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-medium text-ink">Course Completion</span>
                    <span className="font-mono text-ink font-semibold">{activeStudyItem.progress}%</span>
                  </div>
                  <div className="w-full tactile-track h-2.5">
                    <div 
                      className="h-full bg-academic rounded-track transition-all duration-400 ease-out"
                      style={{ width: `${activeStudyItem.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : studyPlans.length === 0 ? (
              <div className="mt-4 py-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-academic-100/70 border border-academic-200/80 flex items-center justify-center text-academic mx-auto mb-3 shadow-tactile-surface">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-ink">Start Your First Study Plan</h3>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                  Break your courses down into scheduled topics, log study hours, and build a consistent daily academic streak.
                </p>
              </div>
            ) : (
              <div className="mt-4 py-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-academic mx-auto mb-2 opacity-90" />
                <h3 className="text-sm font-semibold text-ink">All planned topics completed!</h3>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Create a new study goal or add more chapters to maintain your study streak.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            {activeStudyItem ? (
              <div className="flex items-center gap-2.5 w-full justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateTab('study')}
                >
                  View Full Plan
                </Button>
                <Button
                  variant="academic"
                  size="sm"
                  onClick={() => onToggleTopic(activeStudyItem.topic.id)}
                  icon={CheckSquare}
                >
                  Mark Complete
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted">
                  {studyPlans.length === 0 ? 'No study plans yet' : 'Study Cadence Active'}
                </span>
                <Button
                  variant="academic"
                  size="sm"
                  onClick={() => onNavigateTab('study')}
                  icon={Plus}
                >
                  {studyPlans.length === 0 ? 'Create First Plan' : 'Create Plan'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Today's Plan (Stage 3) — Physical Timeline Rail */}
      <div className="staged-3 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Today's Plan
            </h2>
            <p className="text-xs text-muted">
              {pendingTasks.length} pending objectives scheduled
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('study')}
            className="text-xs font-semibold text-academic hover:underline inline-flex items-center gap-1"
          >
            All Plans ({studyPlans.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Physical Timeline List with Inset/Raised Precision Hairlines */}
        <div className="bg-white border border-border rounded-card shadow-tactile-raised divide-y divide-border overflow-hidden">
          {todayTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No study tasks scheduled for today. Add a new study plan to begin.
            </div>
          ) : (
            todayTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-canvas/50 transition-colors"
              >
                {/* Time & Physical Checkbox Rail */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-muted min-w-[44px]">
                    {task.timeSlot}
                  </span>

                  {/* Tactile Checkbox with 5-phase feedback */}
                  <TactileCheckbox
                    checked={task.isCompleted}
                    onChange={() => onToggleTopic(task.id)}
                    aria-label={`Mark ${task.title} as completed`}
                    title={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  />

                  {/* Task Text with physical strike-through */}
                  <div className="min-w-0">
                    <p className={`text-xs sm:text-sm font-semibold truncate transition-all ${
                      task.isCompleted ? 'line-through text-muted' : 'text-ink'
                    }`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {task.subject}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-muted hidden sm:inline">
                    Due {task.deadline}
                  </span>
                  <Badge variant={task.isCompleted ? 'neutral' : 'academic'} size="sm">
                    {task.isCompleted ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Academic Progress (Stage 4) — Connected Command Center Row */}
      <div className="staged-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Academic Progress
          </h2>
          <p className="text-xs text-muted">
            Performance metrics across active terms
          </p>
        </div>

        <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* 1. Semester GPA */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted tracking-wider uppercase">
                Semester GPA
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <AnimatedNumber
                  value={currentSemester ? currentSemester.gpa : 0.00}
                  decimals={2}
                  className="text-3xl font-extrabold text-ink font-mono tracking-tight"
                />
                <span className="text-xs text-muted">
                  / {activeScale.maxScale.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted">
                {currentSemester ? `${currentSemester.semesterName} (${currentSemester.academicYear})` : 'No active semester'}
              </p>
            </div>

            {/* 2. Study Streak */}
            <div className="space-y-1.5 pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted tracking-wider uppercase">
                  Study Streak
                </span>
                <Flame className="w-4 h-4 text-gold-600 fill-gold-600 streak-breathing" />
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-ink font-mono tracking-tight">
                  {streakData.streak}
                </span>
                <span className="text-xs text-muted font-medium">days active</span>
              </div>
              <p className="text-xs text-muted">
                {streakData.totalHours} total study hours tracked this term.
              </p>
            </div>

            {/* 3. Topics */}
            <div className="space-y-1.5 pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted tracking-wider uppercase">
                  Topics Mastered
                </span>
                <span className="text-xs font-mono font-semibold text-academic">{completionRate}%</span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-ink font-mono tracking-tight">
                  {completedTasksCount}
                </span>
                <span className="text-xs text-muted font-medium">
                  of {totalTasksCount} topics
                </span>
              </div>
              <div className="w-full tactile-track h-2 pt-1">
                <div 
                  className="h-full bg-academic rounded-track transition-all duration-400 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tutor Marketplace CTAs — Find a Tutor vs Become a Tutor */}
      <div className="staged-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Tutoring</h2>
          <p className="text-xs text-muted">Two separate journeys — find help, or start teaching</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Find a Tutor */}
          <div className="bg-white border border-border rounded-card p-6 shadow-tactile-raised flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-academic-100 border border-academic-200 flex items-center justify-center text-academic shrink-0 shadow-tactile-surface">
              <Compass className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-ink">Find a Tutor</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Browse verified Studora tutors, filter by subject, and book a session to get the help you need.
              </p>
              <div className="mt-3">
                <Button
                  variant="academic"
                  size="sm"
                  onClick={() => onNavigateTab('tutors')}
                  icon={ArrowRight}
                  className="shadow-tactile-btn"
                >
                  Browse Tutors
                </Button>
              </div>
            </div>
          </div>

          {/* Become a Tutor — only for students */}
          {(!userProfile?.role || userProfile.role === 'student') && (
            <div className="bg-canvas border border-border rounded-card p-6 shadow-tactile-surface flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-700 shrink-0 shadow-tactile-surface">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-ink">Become a Tutor</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Apply to join the Studora tutor marketplace. Complete onboarding, pass the assessment, and start teaching.
                </p>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigateTab('become-tutor')}
                    icon={ArrowRight}
                  >
                    Apply to Teach
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tutor dashboard shortcut — only for approved tutors */}
          {userProfile?.role === 'tutor' && (
            <div className="bg-academic-50 border border-academic-200 rounded-card p-6 shadow-tactile-surface flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-academic-100 border border-academic-200 flex items-center justify-center text-academic shrink-0 shadow-tactile-surface">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-ink">Tutor Workspace</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  You are an approved Studora tutor. Manage your profile, subjects, availability, and bookings.
                </p>
                <div className="mt-3">
                  <Button
                    variant="academic"
                    size="sm"
                    onClick={() => onNavigateTab('become-tutor')}
                    icon={ArrowRight}
                  >
                    Open Tutor Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
