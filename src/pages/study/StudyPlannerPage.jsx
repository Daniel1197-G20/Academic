import React, { useState, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  Badge, 
  ProgressBar,
  PageHeader 
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

  // Computed summary metrics
  const totalTopics = useMemo(() => {
    return studyPlans.reduce((sum, p) => sum + (p.topics ? p.topics.length : 0), 0);
  }, [studyPlans]);

  const completedTopics = useMemo(() => {
    return studyPlans.reduce((sum, p) => sum + (p.topics ? p.topics.filter(t => t.is_completed).length : 0), 0);
  }, [studyPlans]);

  // Today's timeline schedule generated from plans
  const todaySchedule = useMemo(() => {
    const times = ['09:00', '11:30', '14:00', '16:30', '19:00'];
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
    <div className="space-y-8 pb-20 md:pb-8">
      {/* 1. Page Header */}
      <PageHeader
        title="Study Planner"
        description="Structured study habits, topic checklists, and session logging for your courses."
        actions={
          <>
            {studyPlans.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={Timer}
                onClick={() => openLogHoursModal(studyPlans[0])}
              >
                Log Study Session
              </Button>
            )}
            <Button
              variant="academic"
              size="sm"
              icon={Plus}
              onClick={() => setIsNewPlanOpen(true)}
            >
              New Study Plan
            </Button>
          </>
        }
      />

      {/* 2. Overview Strip (Velocity & Habit Consistency) */}
      <div className="bg-white border border-border rounded-card p-6 shadow-subtle">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Consistency Streak */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Flame className="w-4 h-4 text-gold-600 fill-gold-600" />
              <span>Study Streak</span>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl font-extrabold text-ink font-sans">{streakData.streak}</span>
              <span className="text-xs text-muted font-medium">days active</span>
            </div>
            <p className="text-[11px] text-muted">Daily review cadence</p>
          </div>

          {/* Total Time Logged */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Clock className="w-4 h-4 text-academic" />
              <span>Hours Logged</span>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl font-extrabold text-ink font-sans">{streakData.totalHours}</span>
              <span className="text-xs text-muted font-medium">hours total</span>
            </div>
            <p className="text-[11px] text-muted">Tracked study sessions</p>
          </div>

          {/* Topics Completed */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <CheckCircle2 className="w-4 h-4 text-academic" />
              <span>Topics Mastered</span>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl font-extrabold text-ink font-sans">{completedTopics}</span>
              <span className="text-xs text-muted font-medium">of {totalTopics}</span>
            </div>
            <p className="text-[11px] text-muted">{totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0}% syllabus covered</p>
          </div>

          {/* Active Plans */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <BookOpen className="w-4 h-4 text-navy" />
              <span>Active Plans</span>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl font-extrabold text-ink font-sans">{studyPlans.length}</span>
              <span className="text-xs text-muted font-medium">courses</span>
            </div>
            <p className="text-[11px] text-muted">Current semester load</p>
          </div>
        </div>
      </div>

      {/* 3. Today's Timeline Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Today's Timeline
            </h2>
            <p className="text-xs text-muted">
              Chronological study objectives and focus blocks
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">
            {todaySchedule.filter(s => !s.isCompleted).length} pending
          </span>
        </div>

        <div className="bg-white border border-border rounded-card p-5 shadow-subtle">
          {todaySchedule.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No study tasks scheduled for today. Create a plan below to set up your schedule.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {todaySchedule.map((item) => (
                <div key={item.id} className="flex items-start gap-4 relative">
                  {/* Timeline dot / checkmark */}
                  <button
                    type="button"
                    onClick={() => handleToggleTopic(item.id, item.subject)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                      item.isCompleted 
                        ? 'bg-academic text-white' 
                        : 'bg-white border border-border text-muted hover:border-academic hover:text-academic'
                    }`}
                    title={item.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {item.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>

                  {/* Task details */}
                  <div className={`flex-1 p-3.5 rounded-xl border transition-colors ${
                    item.isCompleted 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'bg-white border-border hover:border-gray-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-academic uppercase tracking-wider">
                            {item.subject}
                          </span>
                          <span className="text-muted text-xs">•</span>
                          <span className="text-xs font-mono font-semibold text-ink bg-gray-100 px-1.5 py-0.2 rounded">
                            {item.time}
                          </span>
                          <span className="text-xs text-muted">
                            ({item.duration})
                          </span>
                        </div>
                        <p className={`text-sm font-semibold truncate ${item.isCompleted ? 'line-through text-muted' : 'text-ink'}`}>
                          {item.topicTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTopic(item.id, item.subject)}
                          className="text-xs py-1"
                        >
                          {item.isCompleted ? 'Completed' : 'Mark Done'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Course Study Schedules (Grouped Plans) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Course Study Plans
            </h2>
            <p className="text-xs text-muted">
              Structured topics, milestones, and tracked study duration
            </p>
          </div>
          <span className="text-xs text-muted font-medium">
            {studyPlans.length} Active Plans
          </span>
        </div>

        {studyPlans.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-card bg-surface-muted/40">
            <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-ink">No course study plans yet</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto mb-4">
              Add your current courses and target topics to build a disciplined daily review schedule.
            </p>
            <Button variant="academic" size="sm" onClick={() => setIsNewPlanOpen(true)}>
              Create First Study Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {studyPlans.map((plan) => {
              const topics = plan.topics || [];
              const doneCount = topics.filter(t => t.is_completed).length;
              const percent = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

              return (
                <div key={plan.id} className="bg-white border border-border rounded-card p-5 sm:p-6 shadow-subtle space-y-4">
                  {/* Plan Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">
                          {plan.subject}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {plan.difficulty || 'Medium'}
                        </Badge>
                        <span className="text-xs text-muted font-medium">
                          Due {plan.deadline}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        Goal: {plan.goal}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Timer}
                        onClick={() => openLogHoursModal(plan)}
                      >
                        Log Hours
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan.id, plan.subject)}
                        title="Delete plan"
                      >
                        <Trash2 className="w-4 h-4 text-danger/80 hover:text-danger" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Overview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">
                        {doneCount} of {topics.length} topics cleared
                      </span>
                      <span className="font-semibold text-academic">{percent}% Complete</span>
                    </div>
                    <ProgressBar value={doneCount} max={Math.max(1, topics.length)} showPercentage={false} size="sm" />
                  </div>

                  {/* Topic Checklist */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-tight mb-2">
                      Syllabus Topics
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {topics.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTopic(t.id, plan.subject)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                            t.is_completed
                              ? 'bg-gray-50 border-gray-200 text-muted line-through'
                              : 'bg-white border-border text-ink hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {t.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted shrink-0" />
                            )}
                            <span className="truncate font-medium">{t.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL 1: CREATE STUDY PLAN --- */}
      <Modal
        isOpen={isNewPlanOpen}
        onClose={() => setIsNewPlanOpen(false)}
        title="Create Study Plan"
        description="Establish goals, schedule study cadence, and list topics to cover."
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Input
            label="Course / Subject"
            placeholder="e.g. Database Systems, Linear Algebra"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Input
            label="Target Goal"
            placeholder="e.g. Master SQL queries and schema normalization"
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
              label="Review Cadence"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              options={[
                { value: 'Daily (2 hours)', label: 'Daily (2 hours)' },
                { value: '3x Weekly (1.5 hours)', label: '3x Weekly (1.5 hours)' },
                { value: 'Weekend Marathon (4 hours)', label: 'Weekend Marathon (4 hours)' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Difficulty Level"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' }
              ]}
            />
            <Input
              label="Estimated Total Hours"
              type="number"
              min="1"
              max="200"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Topic Checklist (One topic per line)
            </label>
            <textarea
              rows={4}
              placeholder="Introduction to Relational Models&#10;ER Diagrams & Entities&#10;SQL Joins & Aggregations&#10;Normal Forms (1NF, 2NF, 3NF)"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              className="w-full bg-white text-ink text-sm rounded-[10px] p-3 border border-border focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsNewPlanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="academic">
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: LOG STUDY HOURS --- */}
      <Modal
        isOpen={isLogHoursOpen}
        onClose={() => setIsLogHoursOpen(false)}
        title={`Log Study Session: ${selectedPlanForLog?.subject || ''}`}
        description="Record focused study minutes to keep your streak and habit velocity updated."
      >
        <form onSubmit={handleSubmitLogHours} className="space-y-4">
          <Input
            label="Duration in Minutes"
            type="number"
            min="10"
            max="600"
            step="5"
            value={logMinutes}
            onChange={(e) => setLogMinutes(e.target.value)}
            required
          />
          <Input
            label="Session Notes (Optional)"
            placeholder="e.g. Covered Chapter 4 exercises and sample exam questions."
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsLogHoursOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="academic">
              Save Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
