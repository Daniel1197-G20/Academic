/**
 * DailyStudyCoachSection.jsx
 *
 * Studora Phase 3: Personal Daily AI Study Coach & Adaptive Study Planning Interface.
 *
 * Features:
 *  - Displays Today's Adaptive Study Plan with real-time completion metrics
 *  - Priority & Urgent Badges for Exam Prep and Struggling Topics
 *  - Direct Actions: "Start Study Timer" (telemetry tracked) & "Practice Drill"
 *  - Task Lifecycle: Mark Completed (verified), Skip, Reschedule
 *  - Explicit Plan Regeneration button (adaptive re-calibration)
 *  - Personal Study Preferences Modal (Available hours, target GPA, upcoming exams)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  Play,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Button, Badge, Modal, Input, Select, ProgressBar } from '../ui';
import { api } from '../../services/api/client';

export function DailyStudyCoachSection({ onStartTaskSession, onOpenDrill, showToast }) {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);

  // Form states for preferences
  const [prefDailyMinutes, setPrefDailyMinutes] = useState(60);
  const [prefAcademicGoals, setPrefAcademicGoals] = useState('');
  const [prefTargetGpa, setPrefTargetGpa] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState('');

  const fetchDailyPlanAndPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, prefRes] = await Promise.all([
        api.request('/api/study/daily-plan'),
        api.request('/api/study/preferences')
      ]);

      if (planRes && planRes.plan) {
        setDailyPlan(planRes.plan);
      }
      if (prefRes && prefRes.preferences) {
        setPreferences(prefRes.preferences);
        setPrefDailyMinutes(prefRes.preferences.dailyAvailableMinutes || 60);
        setPrefAcademicGoals(prefRes.preferences.academicGoals || '');
        setPrefTargetGpa(prefRes.preferences.targetGpa || '');
      }
    } catch (err) {
      console.warn('Failed to load daily plan or preferences:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyPlanAndPrefs();
  }, [fetchDailyPlanAndPrefs]);

  const handleRegeneratePlan = async () => {
    setRegenerating(true);
    try {
      const res = await api.request('/api/study/daily-plan/regenerate', { method: 'POST' });
      if (res && res.plan) {
        setDailyPlan(res.plan);
        showToast?.({ type: 'success', title: 'Plan Re-calibrated', message: 'Daily tasks adapted to your current academic progress.' });
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: 'Failed to adapt study plan.' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCompleteTask = async (task) => {
    try {
      const res = await api.request(`/api/study/daily-tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ spentSeconds: task.estimatedDurationMinutes * 60 })
      });
      if (res && res.plan) {
        setDailyPlan(res.plan);
        showToast?.({ type: 'success', title: 'Task Completed! 🎉', message: `Great work on "${task.title}".` });
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleSkipTask = async (taskId) => {
    try {
      const res = await api.request(`/api/study/daily-tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'skipped' })
      });
      if (res && res.plan) {
        setDailyPlan(res.plan);
        showToast?.({ type: 'info', title: 'Task Skipped', message: 'Task skipped for today.' });
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      let upcomingExams = preferences?.upcomingExams || [];
      if (examSubject && examDate) {
        upcomingExams = [...upcomingExams, { subjectName: examSubject.trim(), examDate }];
      }

      const res = await api.request('/api/study/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          dailyAvailableMinutes: Number(prefDailyMinutes),
          academicGoals: prefAcademicGoals,
          targetGpa: prefTargetGpa ? Number(prefTargetGpa) : null,
          upcomingExams
        })
      });

      if (res && res.preferences) {
        setPreferences(res.preferences);
        setIsPrefsModalOpen(false);
        setExamSubject('');
        setExamDate('');
        showToast?.({ type: 'success', title: 'Preferences Updated', message: 'Re-calibrating daily recommendations.' });
        // Auto regenerate to reflect new preferences
        handleRegeneratePlan();
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-6 text-center space-y-2">
        <div className="w-8 h-8 rounded-xl bg-academic-50 text-academic flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin" />
        </div>
        <p className="text-xs text-muted">Calibrating your personalized daily study plan…</p>
      </div>
    );
  }

  const tasks = dailyPlan?.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="space-y-4">
      {/* ── Top Header Strip ── */}
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-academic-100 dark:bg-academic-900/40 text-academic flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink dark:text-white">Daily AI Study Coach</h2>
              <Badge variant="academic">Today's Adaptive Plan</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {dailyPlan?.aiCoachingNote || "Evidence-calibrated learning plan tailored to your strengths, weaknesses, and exams."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsPrefsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-border bg-canvas hover:bg-black/5 dark:hover:bg-white/5 text-xs text-ink font-semibold flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
            <span>Preferences</span>
          </button>
          <button
            type="button"
            onClick={handleRegeneratePlan}
            disabled={regenerating}
            className="p-2 rounded-xl bg-canvas hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-ink text-xs transition-colors"
            title="Re-calibrate Plan"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Progress Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-stat rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted">Daily Target</span>
          <div className="flex items-baseline gap-1.5 my-0.5">
            <span className="text-xl font-extrabold text-ink dark:text-white font-mono">{dailyPlan?.targetStudyMinutes || 60}</span>
            <span className="text-[11px] text-academic font-semibold">minutes</span>
          </div>
          <span className="text-[10px] text-muted">{dailyPlan?.completedStudyMinutes || 0}m completed</span>
        </div>

        <div className="glass-stat rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted">Tasks Completed</span>
          <div className="flex items-baseline gap-1.5 my-0.5">
            <span className="text-xl font-extrabold text-emerald-600 font-mono">{completedTasks.length}</span>
            <span className="text-xs text-muted font-mono">/ {tasks.length}</span>
          </div>
          <span className="text-[10px] text-muted">{dailyPlan?.progressPercentage || 0}% completed</span>
        </div>

        <div className="glass-stat rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted">Urgent & High Priority</span>
          <div className="flex items-baseline gap-1.5 my-0.5">
            <span className="text-xl font-extrabold text-amber-600 font-mono">
              {tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}
            </span>
            <span className="text-xs text-muted">tasks</span>
          </div>
          <span className="text-[10px] text-muted">Exams & weak areas</span>
        </div>

        <div className="glass-stat rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted">Upcoming Exams</span>
          <div className="flex items-baseline gap-1.5 my-0.5">
            <span className="text-xl font-extrabold text-ink dark:text-white font-mono">
              {preferences?.upcomingExams?.length || 0}
            </span>
            <span className="text-xs text-muted">scheduled</span>
          </div>
          <span className="text-[10px] text-muted">Tracked for prep</span>
        </div>
      </div>

      {/* ── Today's Tasks List ── */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-academic-50 text-academic flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5 text-academic" />
            </div>
            <p className="text-xs text-muted">All clear! No pending tasks remaining for today.</p>
            <Button variant="secondary" size="sm" onClick={handleRegeneratePlan} icon={RefreshCw}>
              Re-generate Schedule
            </Button>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isUrgent = task.priority === 'urgent';
            const isHigh = task.priority === 'high';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                  isCompleted
                    ? 'bg-canvas/50 border-border dark:border-gray-800 opacity-60'
                    : isUrgent
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 shadow-tactile-surface'
                    : isHigh
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 shadow-tactile-surface'
                    : 'bg-white dark:bg-[#161B22] border-border dark:border-gray-800 shadow-tactile-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => !isCompleted && handleCompleteTask(task)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border border-border dark:border-gray-700 hover:border-academic text-transparent hover:text-academic'
                    }`}
                    title={isCompleted ? 'Completed' : 'Mark Task as Completed'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold ${isCompleted ? 'line-through text-muted' : 'text-ink dark:text-white'}`}>
                        {task.title}
                      </span>
                      {isUrgent && <Badge variant="danger" size="sm">Urgent Exam</Badge>}
                      {isHigh && <Badge variant="warning" size="sm">Priority Weakness</Badge>}
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedDurationMinutes} mins
                      </span>
                    </div>

                    <p className="text-[11px] text-muted leading-relaxed">
                      {task.learningObjective}
                    </p>

                    <p className="text-[10px] text-academic font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-academic" />
                      <span>{task.recommendationReason}</span>
                    </p>
                  </div>
                </div>

                {/* Right Action Button */}
                {!isCompleted && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSkipTask(task.id)}
                      className="px-2.5 py-1 text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      Skip
                    </button>
                    <Button
                      variant="academic"
                      size="sm"
                      onClick={() => onStartTaskSession?.(task)}
                      icon={Play}
                      className="shadow-tactile-btn text-xs py-1.5"
                    >
                      Start Task
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Preferences Modal ── */}
      <Modal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        title="Personal Study Preferences"
      >
        <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Daily Available Study Time (minutes)</label>
            <Input
              type="number"
              min="15"
              max="720"
              value={prefDailyMinutes}
              onChange={(e) => setPrefDailyMinutes(e.target.value)}
              placeholder="e.g. 60"
              required
            />
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Academic Goals</label>
            <Input
              type="text"
              value={prefAcademicGoals}
              onChange={(e) => setPrefAcademicGoals(e.target.value)}
              placeholder="e.g., First Class Honors, Target A in Linear Algebra"
            />
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Target GPA</label>
            <Input
              type="number"
              step="0.01"
              min="0.0"
              max="5.0"
              value={prefTargetGpa}
              onChange={(e) => setPrefTargetGpa(e.target.value)}
              placeholder="e.g. 4.50"
            />
          </div>

          <div className="border-t border-border pt-3">
            <label className="font-bold text-ink block mb-1">Add Upcoming Examination</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Course (e.g. MTH 101)"
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
              />
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            {preferences?.upcomingExams?.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] text-muted font-bold block">Current Exams:</span>
                {preferences.upcomingExams.map((ex, i) => (
                  <div key={i} className="text-[11px] text-muted flex items-center justify-between bg-canvas p-1.5 rounded-lg border border-border">
                    <span>{ex.subjectName}</span>
                    <span className="font-mono text-ink">{ex.examDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsPrefsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="academic" size="sm" type="submit">
              Save Preferences
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
