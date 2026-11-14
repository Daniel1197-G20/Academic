/**
 * LearningWorkspacePage.jsx
 *
 * Dedicated Studora Learning Workspace (/learning).
 * Consolidates the complete NEXA academic learning architecture into one
 * coherent, cohesive student experience:
 *
 *  A. Learning Overview — Personalized greeting, course of study, level, registered subjects, priorities.
 *  B. NEXA Academic Assistant — Context-aware multi-turn AI chat grounded in student data, documents, and videos.
 *  C. Daily Practice & Drills — Personalized daily questions, instant diagnostic drill runner, evidence-based feedback.
 *  D. Recommended Videos — Curated lectures & tutorials from verified universities/educators with watch tracking.
 *  E. My Learning Materials — Uploaded syllabus PDFs/notes, extracted summaries, and conceptual flashcards.
 *  F. Academic Progress — Empirical topic mastery breakdown, strengths, weaknesses, and telemetry metrics.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  FileCheck2,
  Video,
  FileText,
  BarChart2,
  Calendar,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Eye,
  Plus
} from 'lucide-react';
import { Button, Badge, ProgressBar } from '../../components/ui';
import { api } from '../../services/api/client';
import { syncEngine, SYNC_EVENTS } from '../../lib/sync/syncEngine';

// Reuse existing proven components
import { DailyStudyCoachSection } from '../../components/study/DailyStudyCoachSection';
import { EducationalVideoRecommendationsSection } from '../../components/study/EducationalVideoRecommendationsSection';
import { AcademicAnalysisSection } from '../../components/study/AcademicAnalysisSection';
import { DocumentLearningSection } from '../../components/study/DocumentLearningSection';
import { PracticeDrillRunner } from '../../components/study/PracticeDrillRunner';

export function LearningWorkspacePage({
  userProfile,
  onNavigateTab,
  showToast
}) {
  // Navigation sub-views within /learning
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'nexa' | 'practice' | 'videos' | 'materials' | 'progress'

  // Workspace data states
  const [analysis, setAnalysis] = useState(null);
  const [dailyQuestions, setDailyQuestions] = useState(null);
  const [activeDrill, setActiveDrill] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // NEXA Chat direct prompt transfer
  const [nexaInitialPrompt, setNexaInitialPrompt] = useState('');

  // Fetch student academic intelligence & daily questions
  const fetchWorkspaceData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, questionsRes] = await Promise.all([
        api.request('/api/academic/analysis').catch(() => null),
        api.request('/api/study/daily-questions').catch(() => null)
      ]);

      if (analysisRes && analysisRes.success) {
        setAnalysis(analysisRes);
      }
      if (questionsRes && questionsRes.success) {
        setDailyQuestions(questionsRes);
      }
    } catch (err) {
      console.warn('Failed to load learning workspace data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();

    const unsub = syncEngine.subscribe(SYNC_EVENTS.ACADEMIC_UPDATED, () => {
      fetchWorkspaceData();
    });
    return () => unsub();
  }, [fetchWorkspaceData]);

  // Handle Launching a Practice Drill
  const handleStartDrill = async (options = {}) => {
    setDrillLoading(true);
    try {
      const res = await api.request('/api/practice/start', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: options.subjectId || 'subj_cs',
          topicId: options.topicId || 'top_algo_sort',
          limit: options.limit || 5
        })
      });

      if (res && res.drill) {
        setActiveDrill(res.drill);
        setActiveSection('practice');
        showToast?.({
          type: 'success',
          title: 'Diagnostic Drill Started',
          message: 'Questions loaded from authoritative curriculum bank.'
        });
      }
    } catch (err) {
      showToast?.({
        type: 'error',
        title: 'Notice',
        message: err.message || 'Failed to start diagnostic drill.'
      });
    } finally {
      setDrillLoading(false);
    }
  };

  // Discuss a specific topic or video with NEXA
  const handleDiscussWithNexa = (promptText) => {
    setNexaInitialPrompt(promptText);
    setActiveSection('nexa');
  };

  // Student profile display details
  const studentName = userProfile?.fullName || analysis?.studentName || 'Student';
  const courseOfStudy = userProfile?.courseOfStudy || analysis?.courseOfStudy || null;
  const department = userProfile?.department || analysis?.department || null;
  const institution = userProfile?.institution || analysis?.institution || null;
  const academicLevel = userProfile?.academicLevel || analysis?.academicLevel || null;
  const registeredSubjects = Array.isArray(userProfile?.registeredSubjects)
    ? userProfile.registeredSubjects
    : (Array.isArray(analysis?.registeredSubjects) ? analysis.registeredSubjects : []);

  // Empirical learning metrics
  const totalHours = analysis?.learningBehavior?.totalActiveHours || '0.0';
  const streakDays = analysis?.learningBehavior?.studyStreakDays || 0;
  const questionsAnswered = analysis?.summary?.totalQuestionsAnswered || 0;
  const weaknesses = analysis?.topicMastery?.weaknesses || [];
  const strengths = analysis?.topicMastery?.strengths || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ── 1. LEARNING WORKSPACE HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#176B4D] dark:text-[#A7F3D0] flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              NEXA Academic Learning Workspace
            </span>
            <Badge variant="academic">Central Intelligence</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight">
            Welcome back, {studentName}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
            {courseOfStudy ? `${courseOfStudy} • ` : ''}
            {department ? `${department} • ` : ''}
            {institution || 'Studora Academic Platform'}
            {academicLevel ? ` (${academicLevel})` : ''}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="academic"
            size="sm"
            onClick={() => handleStartDrill()}
            disabled={drillLoading}
            icon={Play}
            className="shadow-tactile-btn text-xs bg-[#176B4D] hover:bg-[#12543C] text-white cursor-pointer"
          >
            {drillLoading ? 'Loading…' : 'Quick Diagnostic Drill'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveSection('nexa')}
            icon={BrainCircuit}
            className="text-xs cursor-pointer"
          >
            Ask NEXA
          </Button>
        </div>
      </div>

      {/* ── 2. WORKSPACE NAVIGATION TABS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/70 dark:border-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'nexa', label: 'NEXA Tutor', icon: BrainCircuit },
          { id: 'practice', label: 'Daily Practice', icon: FileCheck2 },
          { id: 'videos', label: 'Recommended Videos', icon: Video },
          { id: 'materials', label: 'My Materials', icon: FileText },
          { id: 'progress', label: 'Academic Progress', icon: BarChart2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#176B4D] text-white shadow-sm'
                  : 'text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 3. WORKSPACE SECTIONS ── */}

      {/* ── SECTION A: LEARNING OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Study Streak</span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{streakDays}</span>
                <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">days active</span>
              </div>
              <span className="text-[10px] text-[#667085] dark:text-white/50">Verified daily cadence</span>
            </div>

            <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Verified Hours</span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{totalHours}</span>
                <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">active hours</span>
              </div>
              <span className="text-[10px] text-[#667085] dark:text-white/50">Telemetry tracked</span>
            </div>

            <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Questions Answered</span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{questionsAnswered}</span>
                <span className="text-xs text-[#667085] dark:text-white/60 font-mono">attempts</span>
              </div>
              <span className="text-[10px] text-[#667085] dark:text-white/50">Diagnostic evaluation</span>
            </div>

            <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Enrolled Subjects</span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">
                  {registeredSubjects.length}
                </span>
                <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">registered</span>
              </div>
              <span className="text-[10px] text-[#667085] dark:text-white/50">Curriculum alignment</span>
            </div>
          </div>

          {/* Academic Profile & Priorities Brief */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#176B4D] dark:text-[#A7F3D0]" />
                <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                  Current Academic Learning Priorities
                </h3>
              </div>
              <span className="text-xs font-mono text-[#667085] dark:text-white/60">
                Calibrated to your records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Diagnosed Weakness / Remediation */}
              <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-border dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Priority Remediation
                  </span>
                  <span className="text-[10px] font-mono text-muted">Tier 1</span>
                </div>
                {weaknesses.length > 0 ? (
                  <>
                    <p className="text-xs font-bold text-ink dark:text-white">{weaknesses[0].topicName}</p>
                    <p className="text-[11px] text-muted">
                      Score: {weaknesses[0].accuracyPercentage}% across {weaknesses[0].questionsAttempted} attempts.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartDrill({ subjectId: weaknesses[0].subjectId, topicId: weaknesses[0].topicId })}
                      className="text-[11px] font-bold text-[#176B4D] dark:text-[#A7F3D0] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      Practice Weak Topic <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    No empirical weaknesses diagnosed. Complete drills in the Assessments tab to identify areas for growth.
                  </p>
                )}
              </div>

              {/* Card 2: Daily Questions Summary */}
              <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-border dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#176B4D] dark:text-[#A7F3D0] flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Today's Practice
                  </span>
                  <span className="text-[10px] font-mono text-muted">5 Questions</span>
                </div>
                <p className="text-xs font-bold text-ink dark:text-white">Curriculum Calibrated Drill</p>
                <p className="text-[11px] text-muted line-clamp-2">
                  {dailyQuestions?.rationale || 'Questions targeted to your registered subjects and active coursework.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('practice')}
                  className="text-[11px] font-bold text-[#176B4D] dark:text-[#A7F3D0] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  View Daily Questions <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Card 3: Educational Videos */}
              <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-border dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    Video Recommendations
                  </span>
                  <span className="text-[10px] font-mono text-muted">Verified</span>
                </div>
                <p className="text-xs font-bold text-ink dark:text-white">Authoritative Lectures</p>
                <p className="text-[11px] text-muted">
                  Curated video recommendations from MIT, Stanford, 3Blue1Brown, and verified educators.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('videos')}
                  className="text-[11px] font-bold text-[#176B4D] dark:text-[#A7F3D0] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  Browse Videos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Integrated Daily Study Coach Tasks */}
          <DailyStudyCoachSection
            onOpenDrill={(drillOptions) => handleStartDrill(drillOptions)}
            onDiscussVideo={(vid) => handleDiscussWithNexa(`Can you explain the key concepts taught in ${vid.title}?`)}
            showToast={showToast}
          />
        </div>
      )}

      {/* ── SECTION B: NEXA LEARNING ASSISTANT ── */}
      {activeSection === 'nexa' && (
        <NexaChatContainer
          initialPrompt={nexaInitialPrompt}
          userProfile={userProfile}
          showToast={showToast}
        />
      )}

      {/* ── SECTION C: DAILY PRACTICE ── */}
      {activeSection === 'practice' && (
        <div className="space-y-6">
          {activeDrill ? (
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-border dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-[#176B4D]" />
                    Active Practice Drill
                  </h3>
                  <p className="text-xs text-muted">
                    Submit answers to update your empirical mastery records
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveDrill(null)}
                  className="text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Exit Drill
                </Button>
              </div>

              <PracticeDrillRunner
                drillData={activeDrill}
                onComplete={() => {
                  fetchWorkspaceData();
                  showToast?.({
                    type: 'success',
                    title: 'Drill Completed',
                    message: 'Topic mastery and performance records updated!'
                  });
                }}
                onCancel={() => setActiveDrill(null)}
                showToast={showToast}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-ink dark:text-white">
                    Personalized Daily Questions
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {dailyQuestions?.rationale || 'Targeted practice calibrated to your academic records.'}
                  </p>
                </div>
                <Button
                  variant="academic"
                  size="sm"
                  onClick={() => handleStartDrill()}
                  disabled={drillLoading}
                  icon={Play}
                  className="shadow-tactile-btn text-xs bg-[#176B4D] text-white shrink-0 cursor-pointer"
                >
                  {drillLoading ? 'Loading…' : 'Launch Daily Drill'}
                </Button>
              </div>

              {/* Questions List */}
              {dailyQuestions && Array.isArray(dailyQuestions.questions) && (
                <div className="space-y-3">
                  {dailyQuestions.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-ink dark:text-white flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted">
                            Q{idx + 1}
                          </span>
                          {q.topicName || q.subjectName}
                        </span>
                        <span className="text-[10px] uppercase font-mono text-muted">{q.difficulty}</span>
                      </div>
                      <p className="text-xs text-ink dark:text-white/90 leading-relaxed font-sans">{q.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION D: RECOMMENDED VIDEOS ── */}
      {activeSection === 'videos' && (
        <div className="space-y-4">
          <EducationalVideoRecommendationsSection
            onDiscussVideoWithNexa={(vid) => handleDiscussWithNexa(`Can you explain the key concepts in ${vid.title}?`)}
            showToast={showToast}
          />
        </div>
      )}

      {/* ── SECTION E: MY LEARNING MATERIALS ── */}
      {activeSection === 'materials' && (
        <div className="space-y-4">
          <DocumentLearningSection
            onAskAiAboutDocument={(promptText) => handleDiscussWithNexa(promptText)}
            showToast={showToast}
          />
        </div>
      )}

      {/* ── SECTION F: ACADEMIC PROGRESS ── */}
      {activeSection === 'progress' && (
        <div className="space-y-4">
          <AcademicAnalysisSection
            onAskCoach={(promptText) => handleDiscussWithNexa(promptText)}
            showToast={showToast}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Embedded NEXA Academic Assistant Sub-Workspace.
 * Reuses the existing multi-turn chat protocol and conversation persistence.
 */
function NexaChatContainer({ initialPrompt = '', userProfile, showToast }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.request('/api/ai/conversations');
      if (data && data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    }
  }, [activeConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    setFetchingMsgs(true);
    try {
      const data = await api.request(`/api/ai/conversations/${convId}/messages`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: 'Failed to load messages.' });
    } finally {
      setFetchingMsgs(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (initialPrompt && initialPrompt !== inputPrompt) {
      setInputPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textOverride) => {
    const text = (textOverride || inputPrompt).trim();
    if (!text || loading) return;

    setInputPrompt('');
    setError(null);

    const tempUserMsg = {
      id: 'temp_' + Date.now(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeConvId,
          prompt: text,
          stream: false
        })
      });

      if (res && res.message) {
        setMessages(prev => [...prev, res.message]);
        if (!activeConvId && res.conversationId) {
          setActiveConvId(res.conversationId);
          fetchConversations();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to get answer from NEXA.');
    } finally {
      setLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInputPrompt('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-5 min-h-[520px]">
      {/* Conversations History Sidebar */}
      <div className="md:w-64 shrink-0 bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-[#176B4D]" />
              Discussions
            </span>
            <button
              type="button"
              onClick={handleNewChat}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#176B4D] cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[360px]">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No previous chats.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConvId(c.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-semibold truncate transition-all cursor-pointer ${
                    activeConvId === c.id
                      ? 'bg-[#176B4D] text-white'
                      : 'text-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {c.title || 'Academic Discussion'}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border/70 dark:border-gray-800 text-[11px] text-muted">
          Grounded in student records & course syllabi.
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card flex flex-col shadow-sm min-h-[500px]">
        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[500px]">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ink dark:text-white">
                How can NEXA help with your coursework today?
              </h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                Ask questions about your enrolled subjects, request step-by-step concept explanations, or discuss recommended educational videos.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#176B4D] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
                      N
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#176B4D] text-white rounded-tr-none'
                        : 'bg-black/5 dark:bg-white/5 text-ink dark:text-white border border-border dark:border-gray-800 rounded-tl-none font-sans'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex gap-2 items-center text-xs text-muted">
              <Sparkles className="w-4 h-4 animate-spin text-[#176B4D]" />
              NEXA is formulating grounded response…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-border dark:border-gray-800 bg-white/50 dark:bg-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask NEXA about your course of study, weak topics, or video recommendations…"
              disabled={loading}
              className="flex-1 p-2.5 rounded-xl border border-border dark:border-gray-800 text-xs bg-white dark:bg-[#0E1318] text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
            />
            <Button
              variant="academic"
              size="sm"
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="bg-[#176B4D] text-white text-xs px-4"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
