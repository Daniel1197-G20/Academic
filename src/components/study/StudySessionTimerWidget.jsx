/**
 * StudySessionTimerWidget.jsx
 *
 * Integrated active study session control widget for Studora.
 * Displays live formatted active time, pause/resume, and finish controls,
 * with real-time idle/tab-blur visual indicators.
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  Timer,
  Clock,
  Sparkles,
  BookOpen,
  EyeOff,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { Button, Badge } from '../ui';

export function StudySessionTimerWidget({
  tracker,
  subjects = [],
  studyPlans = [],
  onFinish
}) {
  const {
    activeSession,
    sessionStatus,
    activeSeconds,
    isTabVisible,
    isUserActive,
    loading,
    startSession,
    pauseSession,
    resumeSession,
    completeSession
  } = tracker;

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  // Format seconds into HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSession({
      subjectId: selectedSubject || null,
      studyPlanId: selectedPlan || null
    });
  };

  const handleComplete = async () => {
    await completeSession();
    onFinish?.();
  };

  return (
    <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-academic-100 dark:bg-academic-900/40 text-academic flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink dark:text-white">Active Focus Session</h3>
              <Badge variant={sessionStatus === 'active' ? 'academic' : 'default'} size="sm">
                {sessionStatus === 'active' ? 'Tracking' : sessionStatus === 'paused' ? 'Paused' : 'Ready'}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Verified heartbeat tracking. Inactive tabs and idle minutes are automatically deducted.
            </p>
          </div>
        </div>

        {/* Live Active Clock */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[11px] font-mono text-muted uppercase block">Active Duration</span>
            <span className="text-2xl font-mono font-extrabold text-academic tracking-tight">
              {formatTime(activeSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Status Warnings */}
      {sessionStatus === 'active' && (!isTabVisible || !isUserActive) && (
        <div className="mt-3 p-2.5 rounded-btn bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          {!isTabVisible ? (
            <>
              <EyeOff className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Tab is currently backgrounded. Active focus time is paused until you return.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No user interaction detected for over 60 seconds. Idle time is flagged.</span>
            </>
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {sessionStatus === 'idle' || sessionStatus === 'completed' ? (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {subjects && subjects.length > 0 && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs p-2 rounded-btn bg-canvas border border-border dark:border-gray-700 text-ink dark:text-white focus:outline-none"
              >
                <option value="">Select Course / Subject (Optional)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            )}

            {studyPlans && studyPlans.length > 0 && (
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="text-xs p-2 rounded-btn bg-canvas border border-border dark:border-gray-700 text-ink dark:text-white focus:outline-none"
              >
                <option value="">Link Study Plan (Optional)</option>
                {studyPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.subject}</option>
                ))}
              </select>
            )}

            <Button
              variant="academic"
              size="sm"
              icon={Play}
              onClick={handleStart}
              disabled={loading}
              className="shadow-tactile-btn"
            >
              Start Focus Session
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {sessionStatus === 'active' ? (
              <Button
                variant="secondary"
                size="sm"
                icon={Pause}
                onClick={pauseSession}
                disabled={loading}
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="academic"
                size="sm"
                icon={Play}
                onClick={resumeSession}
                disabled={loading}
              >
                Resume
              </Button>
            )}

            <Button
              variant="academic"
              size="sm"
              icon={CheckCircle}
              onClick={handleComplete}
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Finish & Save Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
