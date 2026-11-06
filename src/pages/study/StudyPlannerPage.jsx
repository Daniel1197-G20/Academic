import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Clock, 
  Calendar as CalendarIcon, 
  Trash2, 
  Timer, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  Badge, 
  ProgressBar, 
  AnimatedNumber,
  TactileCheckbox
} from '../../components/ui';
import { api } from '../../services/api/client';

export function StudyPlannerPage({
  studyPlans = [],
  streakData = { streak: 0, totalHours: 0 },
  onRefreshData,
  showToast
}) {
  // Calendar month state
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  // Modal states
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [selectedPlanForLog, setSelectedPlanForLog] = useState(null);

  // New Plan form states
  const [subject, setSubject] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [frequency, setFrequency] = useState('Daily (2 hours)');
  const [difficulty, setDifficulty] = useState('Medium');
  const [estimatedHours, setEstimatedHours] = useState('20');
  const [topicsInput, setTopicsInput] = useState('');

  // Log Hours form states
  const [logMinutes, setLogMinutes] = useState('60');
  const [logNotes, setLogNotes] = useState('');

  // Computed summary metrics
  const totalTopics = useMemo(() => {
    return studyPlans.reduce((sum, p) => sum + (p.topics ? p.topics.length : 0), 0);
  }, [studyPlans]);

  const completedTopics = useMemo(() => {
    return studyPlans.reduce((sum, p) => sum + (p.topics ? p.topics.filter(t => t.is_completed).length : 0), 0);
  }, [studyPlans]);

  // Today schedule generated from plans
  const todaySchedule = useMemo(() => {
    const times = ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '07:00 PM'];
    const schedule = [];
    let idx = 0;
    for (const plan of studyPlans) {
      if (plan.topics) {
        for (const topic of plan.topics) {
          schedule.push({
            id: topic.id,
            time: times[idx % times.length],
            duration: idx % 2 === 0 ? '90 min' : '60 min',
            subject: plan.subject,
            topicTitle: topic.title,
            isCompleted: !!topic.is_completed,
            planId: plan.id
          });
          idx++;
        }
      }
    }
    return schedule;
  }, [studyPlans]);

  // Calendar calculations
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

  // Handle Toggle Topic
  const handleToggleTopic = async (topicId, planSubject) => {
    try {
      await api.toggleTopic(topicId);
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  // Handle Create Plan
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!subject || !goal || !deadline) return;

    try {
      const topicList = topicsInput
        .split('\\n')
        .map(t => t.trim())
        .filter(Boolean);

      await api.createStudyPlan({
        subject,
        goal,
        deadline,
        studyFrequency: frequency,
        difficulty,
        estimatedHours: Number(estimatedHours),
        topics: topicList
      });

      showToast({ type: 'success', title: 'Study Plan Created', message: `${subject} plan ready.` });
      setIsNewPlanOpen(false);
      setSubject('');
      setGoal('');
      setDeadline('');
      setTopicsInput('');
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to create plan', message: err.message });
    }
  };

  // Handle Delete Plan
  const handleDeletePlan = async (planId, planSubject) => {
    if (!window.confirm(`Delete study plan for "${planSubject}"?`)) return;
    try {
      await api.deleteStudyPlan(planId);
      showToast({ type: 'info', title: 'Plan Deleted', message: `${planSubject} removed.` });
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  // Open Log Hours Modal
  const openLogHoursModal = (plan) => {
    setSelectedPlanForLog(plan);
    setLogMinutes('60');
    setLogNotes('');
    setIsLogHoursOpen(true);
  };

  // Submit Logged Hours
  const handleSubmitLogHours = async (e) => {
    e.preventDefault();
    if (!selectedPlanForLog) return;

    try {
      await api.logStudySession(
        selectedPlanForLog.id,
        Number(logMinutes),
        logNotes
      );
      showToast({ 
        type: 'success', 
        title: 'Study Session Logged', 
        message: `Logged ${logMinutes} minutes towards ${selectedPlanForLog.subject}.` 
      });
      setIsLogHoursOpen(false);
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to log hours', message: err.message });
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 md:pb-8">
      {/* ── 1. HEADER (Matching Section 2_1) ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
            Study Plans
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
            Organize your daily study schedule and track topic mastery
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {studyPlans.length > 0 && (
            <button
              type="button"
              onClick={() => openLogHoursModal(studyPlans[0])}
              className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-gray-200 dark:border-gray-800 text-[#111827] dark:text-white text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Timer className="w-4 h-4 text-[#176B4D]" />
              <span>Log Hours</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsNewPlanOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC STRIP (Matching Section 2_1) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Study Streak</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{streakData.streak}</span>
            <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">days active</span>
          </div>
          <span className="text-[10px] text-[#667085] dark:text-white/50">Daily review cadence</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Hours Logged</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{streakData.totalHours}</span>
            <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">hours total</span>
          </div>
          <span className="text-[10px] text-[#667085] dark:text-white/50">Tracked study sessions</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Topics Mastered</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{completedTopics}</span>
            <span className="text-xs text-[#667085] dark:text-white/60 font-mono">of {totalTopics}</span>
          </div>
          <span className="text-[10px] text-[#667085] dark:text-white/50">{totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0}% syllabus covered</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Active Plans</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{studyPlans.length}</span>
            <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">courses</span>
          </div>
          <span className="text-[10px] text-[#667085] dark:text-white/50">Current semester load</span>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE (2-COLUMN REFERENCE LAYOUT) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Monthly Study Calendar & Schedule (span 7) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm">
            {/* Calendar Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#667085] transition-colors"
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
                className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#667085] transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[11px] font-semibold text-[#667085] dark:text-white/50">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="h-9" />;
                const isSelected = d === selectedDay;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#176B4D] text-white font-bold shadow-sm'
                        : 'text-[#111827] dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course Study Plans List */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                Active Course Schedules
              </h3>
              <span className="text-xs font-mono text-[#667085] dark:text-white/60">
                {studyPlans.length} Plans
              </span>
            </div>

            {studyPlans.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085] dark:text-white/50">
                No active course plans yet. Click "Add Task" to create your first plan.
              </div>
            ) : (
              <div className="space-y-3">
                {studyPlans.map((plan) => {
                  const topics = plan.topics || [];
                  const doneCount = topics.filter(t => t.is_completed).length;
                  const percent = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

                  return (
                    <div
                      key={plan.id}
                      className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#111827] dark:text-white">{plan.subject}</p>
                          <p className="text-[11px] text-[#667085] dark:text-white/60">Due: {plan.deadline || 'This Term'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openLogHoursModal(plan)}
                            className="px-2.5 py-1 rounded-lg bg-[#DDEFE5] text-[#176B4D] text-[11px] font-bold hover:bg-[#176B4D] hover:text-white transition-colors"
                          >
                            Log
                          </button>
                          <span className="text-xs font-mono font-bold text-[#176B4D] dark:text-[#8FC9AE]">
                            {percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#176B4D] h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today Tasks Checklist (span 5) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-[#111827] dark:text-white">
                    Today's Tasks
                  </h2>
                  <p className="text-xs text-[#667085] dark:text-white/60">
                    {todaySchedule.filter(s => !s.isCompleted).length} pending focus objectives
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewPlanOpen(true)}
                  className="w-7 h-7 rounded-lg bg-[#DDEFE5] text-[#176B4D] hover:bg-[#176B4D] hover:text-white flex items-center justify-center transition-colors"
                  title="Add Task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {todaySchedule.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#667085] dark:text-white/50">
                  All tasks cleared for today! Create a new plan to add objectives.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todaySchedule.slice(0, 7).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleTopic(item.id, item.subject)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        item.isCompleted
                          ? 'bg-black/5 dark:bg-white/5 border-transparent text-[#667085] line-through'
                          : 'bg-white/70 dark:bg-white/5 border-white/80 dark:border-white/10 text-[#111827] dark:text-white hover:border-[#176B4D]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          item.isCompleted
                            ? 'bg-[#176B4D] border-[#176B4D] text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{item.topicTitle}</p>
                          <p className="text-[10px] text-[#667085] dark:text-white/50 font-mono truncate">
                            {item.subject} • {item.duration}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#667085] dark:text-white/50 shrink-0">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Reminder Pill */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-[#667085] dark:text-white/60">
              <span>{completedTopics} of {totalTopics} completed</span>
              <span className="font-bold text-[#176B4D] dark:text-[#A7F3D0]">
                {totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0}% Mastered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Create Study Plan ─────────────────────────────────── */}
      {isNewPlanOpen && (
        <Modal
          isOpen={isNewPlanOpen}
          onClose={() => setIsNewPlanOpen(false)}
          title="Create New Study Plan"
          description="Add a structured syllabus checklist to pace your academic preparation."
        >
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <Input
              label="Course / Subject Code"
              placeholder="e.g. CSC 301 or Engineering Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Input
              label="Learning Goal"
              placeholder="e.g. Master dynamic programming and graph traversals"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Target Deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
              <Input
                label="Estimated Hours"
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111827] dark:text-white">
                Topics (One per line)
              </label>
              <textarea
                rows={4}
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="Topic 1: Divide and Conquer&#10;Topic 2: Greedy Methods&#10;Topic 3: Shortest Paths"
                className="w-full bg-white/70 dark:bg-white/5 text-[#111827] dark:text-white text-xs rounded-xl p-3 border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-[#176B4D]"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewPlanOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C]"
              >
                Create Plan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Log Hours ─────────────────────────────────────────── */}
      {isLogHoursOpen && selectedPlanForLog && (
        <Modal
          isOpen={isLogHoursOpen}
          onClose={() => setIsLogHoursOpen(false)}
          title={`Log Study Session: ${selectedPlanForLog.subject}`}
          description="Record study duration and track your daily velocity."
        >
          <form onSubmit={handleSubmitLogHours} className="space-y-4">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={logMinutes}
              onChange={(e) => setLogMinutes(e.target.value)}
              min="15"
              step="15"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111827] dark:text-white">
                Session Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Key concepts reviewed, formulas practiced, questions resolved..."
                className="w-full bg-white/70 dark:bg-white/5 text-[#111827] dark:text-white text-xs rounded-xl p-3 border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-[#176B4D]"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogHoursOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C]"
              >
                Save Session
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
