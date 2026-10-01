import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Clock, 
  Calendar, 
  Trash2, 
  Timer, 
  Sparkles,
  Award
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Badge, 
  ProgressBar 
} from '../../components/ui';
import { api } from '../../services/api/client';

export function StudyPlannerPage({
  studyPlans = [],
  streakData = { streak: 0, totalHours: 0 },
  onRefreshData,
  showToast
}) {
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
        .split('\n')
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
      // Reset form
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
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Banner: Streak & Habit Velocity */}
      <div className="neu-card p-6 border-ghost-200/15 bg-gradient-to-br from-[#090C0F] to-[#050607]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-950/30 border border-orange-500/25 text-orange-300 text-xs font-mono">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                ACTIVE STREAK
              </span>
              <span className="text-xs text-zinc-500 font-mono">Timezone Synced</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-baseline gap-2">
              <span className="font-mono text-ghost-200">{streakData.streak}</span>
              <span className="text-base font-normal text-zinc-400">Consecutive Days</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Consistent focused study maintains optimal topic retention for examinations and coursework deadlines.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto">
            <div className="bg-[#07080A] p-4 rounded-xl border border-white/[0.04] neu-inset text-center min-w-[120px]">
              <p className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">Total Studied</p>
              <p className="text-xl font-bold text-ghost-200 font-mono mt-0.5">{streakData.totalHours}h</p>
            </div>
            <div className="bg-[#07080A] p-4 rounded-xl border border-white/[0.04] neu-inset text-center min-w-[120px]">
              <p className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">Active Plans</p>
              <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{studyPlans.length}</p>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsNewPlanOpen(true)}
          >
            Create Study Plan
          </Button>
          <span className="text-xs text-zinc-500 font-mono">
            {studyPlans.reduce((acc, p) => acc + (p.topics ? p.topics.filter(t => t.is_completed).length : 0), 0)} Topics Mastered
          </span>
        </div>
      </div>

      {/* Active Study Plans Grid */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-ghost-200" />
          Active Course Study Schedules
        </h3>

        {studyPlans.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/[0.08] rounded-2xl bg-[#07080A]">
            <BookOpen className="w-10 h-10 text-ghost-200/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-200">No study plans created yet.</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
              Break down challenging topics into structured checklists with deadlines and target study hours.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsNewPlanOpen(true)}>
              Create First Study Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {studyPlans.map((plan) => {
              const topics = plan.topics || [];
              const completedCount = topics.filter(t => t.is_completed).length;
              const progressPct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;
              const isOverdue = new Date(plan.deadline) < new Date();

              return (
                <Card key={plan.id} variant="neu" className="flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-ghost-200">
                            {plan.subject}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            plan.difficulty === 'Hard' ? 'bg-red-950/40 text-red-300 border border-red-500/20' :
                            plan.difficulty === 'Medium' ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20' :
                            'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {plan.difficulty}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-zinc-100 mt-1 tracking-tight">
                          {plan.goal}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.subject)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete study plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        Due: {plan.deadline}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {plan.logged_hours}h / {plan.estimated_hours}h
                      </span>
                      <span className="text-zinc-500">• {plan.study_frequency}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <ProgressBar
                        value={completedCount}
                        max={topics.length || 1}
                        label={`${completedCount} of ${topics.length} Topics Completed`}
                        size="sm"
                      />
                    </div>

                    {/* Topics Checklist */}
                    <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {topics.map((topic) => (
                        <div
                          key={topic.id}
                          onClick={() => handleToggleTopic(topic.id, plan.subject)}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all duration-150
                            ${topic.is_completed 
                              ? 'bg-ghost-200/[0.03] border-ghost-200/15 text-zinc-400 line-through' 
                              : 'bg-[#080A0C] border-white/[0.04] text-zinc-200 hover:border-ghost-200/20'}`}
                        >
                          {topic.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-ghost-200 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                          )}
                          <span className="text-xs leading-snug break-words">
                            {topic.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {topics.length - completedCount} pending
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Timer}
                      onClick={() => openLogHoursModal(plan)}
                    >
                      Log Study Session
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL 1: CREATE STUDY PLAN --- */}
      <Modal
        isOpen={isNewPlanOpen}
        onClose={() => setIsNewPlanOpen(false)}
        title="Create Structured Study Plan"
        description="Set academic objectives, target milestones, and study schedule."
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Input
            label="Subject / Course"
            placeholder="e.g. CSC301: Advanced Algorithms"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Input
            label="Study Goal / Objective"
            placeholder="e.g. Master Dynamic Programming & Trees for Midterm"
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
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estimated Total Hours"
              type="number"
              min="1"
              max="200"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
            <Input
              label="Study Frequency"
              placeholder="e.g. Daily (2 hours)"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 tracking-wide mb-1.5">
              Subtopics / Chapters (One per line)
            </label>
            <textarea
              rows={4}
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="Asymptotic Analysis & Recurrences&#10;Greedy Algorithms&#10;Dynamic Programming Table Design&#10;Flow Networks"
              className="w-full bg-[#080A0C] text-zinc-100 text-sm rounded-xl p-3 border border-white/[0.06] neu-inset focus:outline-none focus:border-ghost-200/50 focus:ring-1 focus:ring-ghost-200/40 placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsNewPlanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: LOG STUDY HOURS --- */}
      <Modal
        isOpen={isLogHoursOpen}
        onClose={() => setIsLogHoursOpen(false)}
        title="Log Completed Study Session"
        description={selectedPlanForLog ? `Record study duration towards ${selectedPlanForLog.subject}.` : ''}
      >
        <form onSubmit={handleSubmitLogHours} className="space-y-4">
          <Input
            label="Duration in Minutes"
            type="number"
            min="15"
            step="15"
            max="480"
            value={logMinutes}
            onChange={(e) => setLogMinutes(e.target.value)}
            required
          />
          <Input
            label="Session Notes / Reflection (Optional)"
            placeholder="e.g. Solved 4 knapsack DP recurrences and reviewed Bellman-Ford"
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsLogHoursOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Session & Update Streak
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
