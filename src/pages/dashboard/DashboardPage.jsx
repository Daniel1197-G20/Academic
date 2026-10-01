import React, { useMemo } from 'react';
import { 
  GraduationCap, 
  Flame, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  CheckSquare,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Badge, ProgressBar } from '../../components/ui';
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

  // All pending study tasks for today's plan
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
    <div className="space-y-8 pb-20 md:pb-8">
      {/* 1. Header Greeting & Academic Context */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
            {greeting}, {studentFirstName}.
          </h1>
          <p className="text-sm text-muted mt-1">
            Your academic progress at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

      {/* 2. Primary Academic Hero Block: Current CGPA & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main CGPA Result Card */}
        <div className="md:col-span-2 bg-white border border-border rounded-card p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted tracking-wider uppercase">
                Current Cumulative CGPA
              </span>
              <Badge variant="academic">
                {cumulative.classificationName}
              </Badge>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight font-sans">
                {cumulative.cgpa.toFixed(2)}
              </span>
              <span className="text-lg sm:text-xl font-medium text-muted">
                / {activeScale.maxScale.toFixed(2)}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs">
              {semesterDelta !== null ? (
                <span className={`inline-flex items-center font-semibold ${semesterDelta >= 0 ? 'text-academic' : 'text-danger'}`}>
                  {semesterDelta >= 0 ? `+${semesterDelta.toFixed(2)}` : semesterDelta.toFixed(2)} this semester
                </span>
              ) : (
                <span className="text-muted">First recorded semester</span>
              )}
              <span className="text-muted">•</span>
              <span className="text-muted">{cumulative.totalCreditUnits} total units earned</span>
              <span className="text-muted">•</span>
              <span className="text-muted">{semesters.length} semesters</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">
              Scale: <strong className="text-ink">{activeScale.scaleName}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('cgpa')}
              className="text-xs font-semibold text-academic hover:underline inline-flex items-center gap-1"
            >
              Open CGPA Calculator <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Semester GPA Spotlight Card */}
        <div className="bg-white border border-border rounded-card p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-muted tracking-wider uppercase">
              Current Semester GPA
            </span>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-ink tracking-tight font-sans">
                {currentSemester ? currentSemester.gpa.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs text-muted">
                {currentSemester ? `${currentSemester.academicYear}` : 'No active term'}
              </span>
            </div>

            <p className="text-xs text-muted mt-2 leading-relaxed">
              {currentSemester 
                ? `${currentSemester.courses.length} courses enrolled (${currentSemester.totalCreditUnits} credit units).`
                : 'No course grades recorded yet for this term.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">
              Term: {currentSemester ? currentSemester.semesterName : 'Semester 1'}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('cgpa')}
              className="text-xs font-semibold text-ink hover:text-academic inline-flex items-center gap-1"
            >
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Continue Studying Section */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Continue Studying
            </h2>
            <p className="text-xs text-muted">
              Resume your next pending objective
            </p>
          </div>
          {activeStudyItem && (
            <Badge variant="neutral">
              {activeStudyItem.subject}
            </Badge>
          )}
        </div>

        {activeStudyItem ? (
          <div className="p-4 rounded-xl bg-canvas border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-academic uppercase tracking-wider">
                  {activeStudyItem.subject}
                </span>
                <span className="text-muted text-xs">•</span>
                <span className="text-xs text-muted">
                  Topic {activeStudyItem.completedCount + 1} of {activeStudyItem.totalTopics}
                </span>
              </div>
              <h3 className="text-base font-semibold text-ink truncate">
                {activeStudyItem.topic.title}
              </h3>
              <div className="w-full max-w-md pt-1">
                <ProgressBar
                  value={activeStudyItem.progress}
                  max={100}
                  showPercentage={true}
                  label="Course Syllabus Completion"
                  size="sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="academic"
                size="sm"
                onClick={() => onToggleTopic(activeStudyItem.topic.id)}
                icon={CheckSquare}
              >
                Mark Complete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateTab('study')}
              >
                View Plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-canvas border border-dashed border-border">
            <CheckCircle2 className="w-8 h-8 text-academic mx-auto mb-2 opacity-90" />
            <h3 className="text-sm font-semibold text-ink">All planned study topics are completed!</h3>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              Create a new study goal or add more chapters to maintain your daily study routine.
            </p>
            <Button
              variant="academic"
              size="sm"
              className="mt-3.5"
              onClick={() => onNavigateTab('study')}
            >
              Add New Study Plan
            </Button>
          </div>
        )}
      </div>

      {/* 4. Two-Column Layout: Today's Plan & Academic Progress Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Plan (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Today's Plan
              </h2>
              <p className="text-xs text-muted">
                {pendingTasks.length} objectives due for review
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

          <div className="bg-white border border-border rounded-card divide-y divide-border shadow-subtle overflow-hidden">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No pending tasks scheduled for today.
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-surface-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTopic(task.id)}
                      className="text-muted hover:text-academic transition-colors shrink-0"
                      title="Mark as completed"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {task.subject}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[11px] font-mono text-muted bg-gray-100 px-2 py-0.5 rounded">
                      {task.timeSlot}
                    </span>
                    <span className="text-[11px] text-muted hidden sm:inline">
                      Due {task.deadline}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Academic Progress (1 span) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Academic Progress
            </h2>
            <p className="text-xs text-muted">
              Consistency and completion metrics
            </p>
          </div>

          <div className="bg-white border border-border rounded-card p-5 shadow-subtle space-y-5">
            {/* Consistency / Study Streak */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Study Consistency</span>
                <Flame className="w-4 h-4 text-gold-600 fill-gold-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">
                  {streakData.streak} days
                </span>
                <span className="text-xs text-muted">
                  streak
                </span>
              </div>
              <p className="text-xs text-muted">
                {streakData.totalHours} total hours logged this term.
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Completed Topics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Completed Topics</span>
                <span className="text-xs font-semibold text-academic">{completionRate}%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">
                  {completedTasksCount}
                </span>
                <span className="text-xs text-muted">
                  of {totalTasksCount} topics cleared
                </span>
              </div>
              <ProgressBar
                value={completedTasksCount}
                max={Math.max(1, totalTasksCount)}
                showPercentage={false}
                size="sm"
              />
            </div>

            <div className="h-px bg-border" />

            {/* Credit Units Summary */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Degree Credit Units</span>
                <GraduationCap className="w-4 h-4 text-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">
                  {cumulative.totalCreditUnits}
                </span>
                <span className="text-xs text-muted">
                  of 120 target units
                </span>
              </div>
              <p className="text-xs text-muted">
                {Math.round((cumulative.totalCreditUnits / 120) * 100)}% of standard graduation threshold.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
