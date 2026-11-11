/**
 * AcademicAnalysisSection.jsx
 *
 * Grounded Academic Intelligence Profile & Analysis Dashboard.
 * Displays subject performance, empirical topic strengths/weaknesses,
 * verified study hours, and learning consistency without fabricated statistics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Clock,
  Flame,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  BarChart2
} from 'lucide-react';
import { Button, Badge, ProgressBar } from '../ui';
import { api } from '../../services/api/client';
import { SubjectPerformanceChart } from './SubjectPerformanceChart';

export function AcademicAnalysisSection({ onAskCoach, showToast }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request('/api/academic/analysis');
      if (data && data.success) {
        setAnalysis(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load academic intelligence analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-academic-50 dark:bg-academic-900/30 text-academic flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs text-muted">Analyzing verified academic records and topic mastery…</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-6 text-center space-y-3">
        <p className="text-xs text-danger">{error || 'Could not retrieve academic analysis.'}</p>
        <Button variant="secondary" size="sm" onClick={fetchAnalysis} icon={RefreshCw}>
          Retry
        </Button>
      </div>
    );
  }

  const { studentName, department, academicLevel, evidenceConfidence, summary, subjects, topicMastery, learningBehavior, trends } = analysis;

  return (
    <div className="space-y-6">
      {/* ── 1. Top Intelligence Status Banner ── */}
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-academic-100 dark:bg-academic-900/40 text-academic flex items-center justify-center shrink-0">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink dark:text-white">Personal Academic Intelligence</h2>
              <Badge variant={evidenceConfidence === 'high' ? 'academic' : evidenceConfidence === 'moderate' ? 'default' : 'warning'}>
                Evidence: {evidenceConfidence.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Derived strictly from {summary.totalQuestionsAnswered} verified question attempts and {learningBehavior.totalActiveHours} hours of active focus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={fetchAnalysis}
            className="p-2 rounded-xl bg-canvas hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-ink text-xs transition-colors"
            title="Refresh Analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Verified Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Verified Active Study</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{learningBehavior.totalActiveHours}</span>
            <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">hours</span>
          </div>
          <span className="text-[10px] text-muted">{learningBehavior.totalIdleMinutesDeducted}m idle deducted</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Questions Evaluated</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-[#111827] dark:text-white font-mono">{summary.totalQuestionsAnswered}</span>
            <span className="text-xs text-[#176B4D] dark:text-[#A7F3D0] font-semibold">total</span>
          </div>
          <span className="text-[10px] text-muted">Across verified drills</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Empirical Strengths</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-emerald-600 font-mono">{summary.masteredTopicsCount}</span>
            <span className="text-xs text-muted">topics</span>
          </div>
          <span className="text-[10px] text-muted">≥5 attempts & ≥80% accuracy</span>
        </div>

        <div className="glass-stat rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#667085] dark:text-white/60">Identified Weaknesses</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-extrabold text-amber-600 font-mono">{summary.strugglingTopicsCount}</span>
            <span className="text-xs text-muted">topics</span>
          </div>
          <span className="text-[10px] text-muted">≥5 attempts & &lt;60% accuracy</span>
        </div>
      </div>

      {/* ── 3. Diagnostic Mastery Matrices (Strengths vs Weaknesses) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Empirical Strengths */}
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface space-y-3.5">
          <div className="flex items-center justify-between border-b border-border dark:border-gray-800 pb-3">
            <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Strengths (Mastered Topics)
            </h3>
            <Badge variant="academic" size="sm">{topicMastery.strengths.length}</Badge>
          </div>

          {topicMastery.strengths.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted space-y-1">
              <p>No verified topic strengths diagnosed yet.</p>
              <p className="text-[11px]">Requires at least 5 standardized questions with ≥80% accuracy.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topicMastery.strengths.map((t) => (
                <div key={t.topicId} className="p-3 rounded-btn bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-ink dark:text-white block">{t.topicName}</span>
                    <span className="text-[11px] text-muted">{t.subjectName} • {t.questionsAttempted} questions evaluated</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {t.accuracyPercentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Areas for Attention (Weaknesses) */}
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface space-y-3.5">
          <div className="flex items-center justify-between border-b border-border dark:border-gray-800 pb-3">
            <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Areas Requiring Attention (Empirical Weaknesses)
            </h3>
            <Badge variant={topicMastery.weaknesses.length > 0 ? 'warning' : 'default'} size="sm">
              {topicMastery.weaknesses.length}
            </Badge>
          </div>

          {topicMastery.weaknesses.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted space-y-1">
              <p>No empirical weaknesses diagnosed.</p>
              <p className="text-[11px]">Topics are never marked weak without at least 5 attempted questions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topicMastery.weaknesses.map((t) => (
                <div key={t.topicId} className="p-3 rounded-btn bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-ink dark:text-white block">{t.topicName}</span>
                    <span className="text-[11px] text-muted">{t.subjectName} • {t.questionsAttempted} questions evaluated</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                    {t.accuracyPercentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Subject Performance Breakdown ── */}
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface space-y-4">
        <div className="flex items-center justify-between border-b border-border dark:border-gray-800 pb-3">
          <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-academic" />
            Subject Performance & Coverage
          </h3>
          <span className="text-[11px] text-muted font-mono">{subjects.length} Subjects Evaluated</span>
        </div>

        {/* Visual Horizontal Bar Chart */}
        <SubjectPerformanceChart subjects={subjects} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border dark:border-gray-800">
          {subjects.map((s) => (
            <div key={s.subjectId} className="p-3.5 rounded-card border border-border dark:border-gray-800 bg-canvas space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-ink dark:text-white">{s.subjectName}</span>
                  <span className="text-[11px] font-mono text-muted block">{s.code} • {s.category}</span>
                </div>
                {s.accuracyPercentage !== null ? (
                  <span className="text-xs font-mono font-bold text-ink dark:text-white">
                    {s.accuracyPercentage}%
                  </span>
                ) : (
                  <Badge variant="default" size="sm">Unassessed</Badge>
                )}
              </div>

              <div className="text-[11px] text-muted flex items-center justify-between pt-1">
                <span>{s.totalQuestionsAttempted} questions answered</span>
                <span>{s.topicCoveragePercentage}% topic coverage</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Quick Coaching Query Action ── */}
      <div className="p-4 rounded-card bg-academic-50/60 dark:bg-academic-950/20 border border-academic-200 dark:border-academic-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-academic shrink-0" />
          <span className="text-ink dark:text-white font-medium">
            Have questions about your academic progress or study recommendations?
          </span>
        </div>
        <Button
          variant="academic"
          size="sm"
          onClick={() => onAskCoach?.("Based on my verified academic performance, what should I focus on next?")}
          className="shadow-tactile-btn shrink-0"
        >
          Ask AI Coach
        </Button>
      </div>
    </div>
  );
}
