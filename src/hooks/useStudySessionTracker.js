/**
 * useStudySessionTracker.js
 *
 * Custom React Hook for active study session tracking.
 *
 * Features:
 *  - Dispatches 30-second heartbeats to /api/study/sessions/:id/heartbeat
 *  - Integrates Page Visibility API (`visibilitychange`) to pause active counter on tab blur
 *  - Tracks idle user state (no mouse/keyboard input for 60s)
 *  - Computes display elapsed active time locally while synchronizing with authoritative server duration
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api/client';

export function useStudySessionTracker({ showToast, onSessionCompleted } = {}) {
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle'); // 'idle' | 'active' | 'paused' | 'completed'
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isUserActive, setIsUserActive] = useState(true);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const heartbeatTimerRef = useRef(null);
  const displayTimerRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  // Fetch recent study history
  const fetchSessionHistory = useCallback(async () => {
    try {
      const data = await api.request('/api/study/sessions/history');
      if (data && data.sessions) {
        setRecentSessions(data.sessions);
      }
    } catch (err) {
      console.warn('Failed to fetch session history:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchSessionHistory();
  }, [fetchSessionHistory]);

  // Tab visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);

      if (activeSession && sessionStatus === 'active') {
        api.request(`/api/study/sessions/${activeSession.sessionId || activeSession.id}/visibility`, {
          method: 'POST',
          body: JSON.stringify({ isVisible: visible })
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSession, sessionStatus]);

  // User activity tracker (mouse/keyboard activity resets idle state)
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsUserActive(true);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setIsUserActive(false);
      }, 60000); // 60s without interaction marks user as idle
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  // Local seconds ticker (increments only when active, tab is visible, and user is active)
  useEffect(() => {
    if (sessionStatus === 'active' && isTabVisible && isUserActive) {
      displayTimerRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (displayTimerRef.current) clearInterval(displayTimerRef.current);
    }

    return () => {
      if (displayTimerRef.current) clearInterval(displayTimerRef.current);
    };
  }, [sessionStatus, isTabVisible, isUserActive]);

  // 30-Second Server Heartbeat
  useEffect(() => {
    if (sessionStatus === 'active' && activeSession) {
      const sessionId = activeSession.sessionId || activeSession.id;

      heartbeatTimerRef.current = setInterval(async () => {
        try {
          const res = await api.request(`/api/study/sessions/${sessionId}/heartbeat`, {
            method: 'POST',
            body: JSON.stringify({
              isTabVisible: document.visibilityState === 'visible',
              isUserActive
            })
          });
          if (res && typeof res.activeDurationSeconds === 'number') {
            // Re-sync display timer with authoritative server duration
            setActiveSeconds(res.activeDurationSeconds);
          }
        } catch (err) {
          console.warn('Heartbeat error:', err.message);
        }
      }, 30000);
    } else {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    }

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [sessionStatus, activeSession, isUserActive]);

  // ── Actions ──

  const startSession = async ({ subjectId = null, topicId = null, studyPlanId = null } = {}) => {
    setLoading(true);
    try {
      const data = await api.request('/api/study/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          topicId,
          studyPlanId,
          source: 'study_timer',
          deviceInfo: {
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth
          }
        })
      });

      if (data && data.session) {
        setActiveSession(data.session);
        setSessionStatus('active');
        setActiveSeconds(0);
        showToast?.({
          type: 'success',
          title: 'Study Session Started',
          message: 'Active focus tracking initialized.'
        });
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const pauseSession = async () => {
    if (!activeSession) return;
    const sessionId = activeSession.sessionId || activeSession.id;
    try {
      await api.request(`/api/study/sessions/${sessionId}/pause`, { method: 'POST' });
      setSessionStatus('paused');
      showToast?.({ type: 'info', title: 'Paused', message: 'Study session timer paused.' });
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const resumeSession = async () => {
    if (!activeSession) return;
    const sessionId = activeSession.sessionId || activeSession.id;
    try {
      await api.request(`/api/study/sessions/${sessionId}/resume`, { method: 'POST' });
      setSessionStatus('active');
      showToast?.({ type: 'success', title: 'Resumed', message: 'Study session resumed.' });
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const completeSession = async () => {
    if (!activeSession) return;
    const sessionId = activeSession.sessionId || activeSession.id;
    setLoading(true);
    try {
      const res = await api.request(`/api/study/sessions/${sessionId}/complete`, { method: 'POST' });
      setSessionStatus('completed');
      setActiveSession(null);
      showToast?.({
        type: 'success',
        title: 'Study Session Completed',
        message: `Saved ${Math.round((res.activeDurationSeconds || activeSeconds) / 60)} minutes of active study.`
      });
      fetchSessionHistory();
      onSessionCompleted?.(res);
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return {
    activeSession,
    sessionStatus,
    activeSeconds,
    isTabVisible,
    isUserActive,
    recentSessions,
    loading,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    refreshHistory: fetchSessionHistory
  };
}
