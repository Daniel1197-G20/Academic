import React, { useMemo } from 'react';
import { 
  GraduationCap, 
  Flame, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp, 
  ArrowRight, 
  Plus, 
  Target, 
  Sparkles,
  Users,
  Compass,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Badge, ProgressBar, ProgressRing } from '../../components/ui';
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

  // Collect pending study tasks from active plans
  const todayTasks = useMemo(() => {
    const tasks = [];
    for (const plan of studyPlans) {
      if (plan.topics) {
        for (const topic of plan.topics) {
          if (!topic.is_completed) {
            tasks.push({
              id: topic.id,
              title: topic.title,
              subject: plan.subject,
              deadline: plan.deadline,
              planId: plan.id
            });
          }
        }
      }
    }
    return tasks.slice(0, 5); // Focus top 5 pending tasks
  }, [studyPlans]);

  // Degree completion progress estimation (assuming ~120 credit units standard)
  const degreeUnitsTarget = 120;
  const degreeProgressPercent = Math.min(100, Math.round((cumulative.totalCreditUnits / degreeUnitsTarget) * 100));

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Welcome & Academic Status */}
      <div className="neu-card p-6 border-ghost-200/15 relative overflow-hidden bg-gradient-to-br from-[#0B0E12] via-[#07090C] to-[#050505]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ghost-200 bg-ghost-200/10 px-2.5 py-0.5 rounded-full border border-ghost-200/25">
                {userProfile?.academic_level || 'Year 3 (Senior)'}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {userProfile?.institution || 'Apex Institute of Technology'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Alexander'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Your academic trajectory is on track for <strong className="text-ghost-200 font-medium">{cumulative.classificationName}</strong>. You have {todayTasks.length} study tasks due this week.
            </p>
          </div>

          {/* Quick Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => onNavigateTab('cgpa')}
            >
              Record Course
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={BookOpen}
              onClick={() => onNavigateTab('study')}
            >
              Add Study Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPI Command Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Cumulative CGPA */}
        <Card variant="neu" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Current CGPA</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-ghost-200 font-mono mt-1">
                {cumulative.cgpa.toFixed(2)}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                Scale: {activeScale.maxScale.toFixed(1)} • {cumulative.classificationName}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-ghost-200/10 border border-ghost-200/20 flex items-center justify-center text-ghost-200 shadow-ghost-glow">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono">{cumulative.totalCreditUnits} Units Earned</span>
            <button
              type="button"
              onClick={() => onNavigateTab('cgpa')}
              className="text-ghost-200 hover:underline flex items-center gap-1 font-mono text-[11px]"
            >
              View Record <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Metric 2: Current Semester GPA */}
        <Card variant="neu" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Semester GPA</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-mono mt-1">
                {currentSemester ? currentSemester.gpa.toFixed(2) : '0.00'}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 truncate max-w-[140px]">
                {currentSemester ? `${currentSemester.academicYear} ${currentSemester.semesterName}` : 'No active term'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono">
              {currentSemester ? `${currentSemester.courses.length} Active Courses` : '0 Courses'}
            </span>
            <span className="text-zinc-500 font-mono">
              {currentSemester ? `${currentSemester.totalCreditUnits} Units` : ''}
            </span>
          </div>
        </Card>

        {/* Metric 3: Study Streak */}
        <Card variant="neu" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Study Streak</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-orange-400 font-mono mt-1 flex items-center gap-1">
                {streakData.streak} <span className="text-sm font-normal text-zinc-400">days</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {streakData.totalHours} total study hours logged
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-950/30 border border-orange-500/25 flex items-center justify-center text-orange-400 shadow-ghost-glow">
              <Flame className="w-5 h-5 fill-orange-400 animate-pulse-subtle" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono">Daily Target: 2h</span>
            <button
              type="button"
              onClick={() => onNavigateTab('study')}
              className="text-orange-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
            >
              Study Planner <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        {/* Metric 4: Degree Progress */}
        <Card variant="neu" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Degree Completion</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-mono mt-1">
                {degreeProgressPercent}%
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                {cumulative.totalCreditUnits} of {degreeUnitsTarget} target units
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-300">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={cumulative.totalCreditUnits} max={degreeUnitsTarget} showPercentage={false} size="sm" />
          </div>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Today's Study Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-ghost-200" />
              Today's Priority Study Objectives
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('study')}
              className="text-xs font-mono text-ghost-200 hover:underline"
            >
              View All ({studyPlans.reduce((acc, p) => acc + (p.topics ? p.topics.length : 0), 0)})
            </button>
          </div>

          <Card variant="flat" className="p-5 space-y-3">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-ghost-200 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-zinc-200">All current study topics cleared!</p>
                <p className="text-xs text-zinc-500 mt-1">
                  You have no pending tasks. Add new objectives from your study planner.
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="mt-4" 
                  onClick={() => onNavigateTab('study')}
                >
                  Create New Plan
                </Button>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTopic(task.id, task.subject)}
                  className="flex items-start justify-between p-3 rounded-xl bg-[#080A0D] border border-white/[0.04] neu-inset hover:border-ghost-200/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Circle className="w-4 h-4 text-zinc-600 group-hover:text-ghost-200 shrink-0 mt-0.5 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                        {task.subject}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 shrink-0 ml-3 bg-white/[0.03] px-2 py-0.5 rounded">
                    Due {task.deadline}
                  </span>
                </div>
              ))
            )}
          </Card>

          {/* Current Semester Courses Quick Overview */}
          {currentSemester && (
            <Card variant="flat" className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ghost-200" />
                  Active Course Load ({currentSemester.courses.length} courses)
                </h4>
                <span className="text-xs font-mono text-ghost-200">
                  GPA: {currentSemester.gpa.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
                {currentSemester.courses.map((c, i) => (
                  <div 
                    key={i} 
                    className="p-2.5 rounded-xl bg-[#07090C] border border-white/[0.03] flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-ghost-200 truncate">
                        {c.courseCode}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                        {c.courseTitle || 'Course Title'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-zinc-200 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        Grade {c.letterGrade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (1 span): Ecosystem Readiness & Architecture Gateways */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ghost-200" />
            Learning Ecosystem
          </h3>

          {/* Milestone 2 Preview Gateway: AI Tutor */}
          <Card variant="glass" className="border-ghost-200/15">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-ghost-200/10 border border-ghost-200/20 flex items-center justify-center text-ghost-200 shadow-ghost-glow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">AI Academic Tutor</h4>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Milestone 2 Architecture</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diagnostic-driven AI tutor that contextualizes your courses, weak topics, and upcoming exam deadlines.
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <Badge variant="ghost" size="sm">Interface Ready</Badge>
              <span className="text-[11px] text-zinc-500 font-mono">Phase 6</span>
            </div>
          </Card>

          {/* Milestone 2 Preview Gateway: Tutor Marketplace */}
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Tutor Marketplace</h4>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Milestone 2 Architecture</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect with academic subject specialists for 1-on-1 video sessions and exam problem reviews.
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <Badge variant="neutral" size="sm">Interface Ready</Badge>
              <span className="text-[11px] text-zinc-500 font-mono">Phase 3</span>
            </div>
          </Card>

          {/* Milestone 2 Preview Gateway: Study Groups */}
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Study Groups & Peer Calls</h4>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Milestone 2 Architecture</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Public and private group study halls with shared notes and ZEGOCLOUD-ready audio rooms.
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <Badge variant="neutral" size="sm">Interface Ready</Badge>
              <span className="text-[11px] text-zinc-500 font-mono">Phase 4</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
