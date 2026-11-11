/**
 * PracticeDrillRunner.jsx
 *
 * Interactive student practice drill and diagnostic question runner.
 * Fetches standardized test questions from /api/practice/start and submits
 * answers for server-side evaluation and topic mastery updates.
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Loader2,
  Award
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { api } from '../../services/api/client';

export function PracticeDrillRunner({
  drillData,
  onComplete,
  onCancel,
  showToast
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: 'A' }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const questions = drillData?.questions || [];
  const currentQ = questions[currentIndex];

  // Safely parse options whether stringified JSON or native Array
  const currentOptions = useMemo(() => {
    if (!currentQ || !currentQ.options) return [];
    if (Array.isArray(currentQ.options)) return currentQ.options;
    if (typeof currentQ.options === 'string') {
      try {
        const parsed = JSON.parse(currentQ.options);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [currentQ]);

  const handleSelectOption = (optId) => {
    if (result) return; // Locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optId
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payloadAnswers = Object.entries(selectedAnswers).map(([qId, opt]) => ({
        questionId: qId,
        selectedOption: opt
      }));

      const res = await api.request('/api/practice/submit', {
        method: 'POST',
        body: JSON.stringify({
          attemptId: drillData.attemptId,
          answers: payloadAnswers,
          timeSpentSeconds: 60
        })
      });

      setResult(res);
      showToast?.({
        type: 'success',
        title: 'Drill Evaluated',
        message: `Score: ${res.score}% (${res.correctCount}/${res.totalQuestions} correct)`
      });
      onComplete?.(res);
    } catch (err) {
      showToast?.({ type: 'error', title: 'Submission Error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentQ && !result) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-2xl shadow-sm">
        <p className="text-sm text-muted dark:text-white/60">No questions found in this practice drill.</p>
        <Button variant="secondary" size="sm" onClick={onCancel} className="mt-3 cursor-pointer">Back to Assessments</Button>
      </div>
    );
  }

  // ── Result Summary View ──
  if (result) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-2xl p-6 shadow-tactile-raised space-y-6">
        <div className="flex items-center justify-between border-b border-border dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
              result.passed 
                ? 'bg-[#DDEFE5] text-[#176B4D] dark:bg-[#176B4D]/30 dark:text-[#A7F3D0]' 
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            }`}>
              {result.score}%
            </div>
            <div>
              <h3 className="text-base font-bold text-ink dark:text-white">
                {result.passed ? 'Drill Completed Successfully' : 'Drill Completed — Review Recommended'}
              </h3>
              <p className="text-xs text-muted dark:text-white/60 mt-0.5">
                Answered {result.correctCount} of {result.totalQuestions} correctly. Topic mastery has been updated.
              </p>
            </div>
          </div>
          <Badge variant={result.passed ? 'academic' : 'default'}>
            {result.passed ? 'Passed' : 'Needs Practice'}
          </Badge>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {result.gradedResults?.map((gr, idx) => (
            <div key={gr.questionId} className="p-4 rounded-xl border border-border dark:border-gray-800 bg-[#F6F7F3] dark:bg-white/5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink dark:text-white">Question {idx + 1}</span>
                {gr.isCorrect ? (
                  <span className="flex items-center gap-1 text-[#176B4D] dark:text-[#A7F3D0] font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-danger font-bold">
                    <XCircle className="w-4 h-4" /> Incorrect (Your answer: {gr.selectedOption || 'None'})
                  </span>
                )}
              </div>
              <p className="text-muted dark:text-white/60 text-[11px] font-mono">Correct Answer: {gr.correctAnswer}</p>
              {gr.explanation && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1c232d] border border-border dark:border-gray-800 text-[11px] text-ink dark:text-white leading-relaxed">
                  <span className="font-bold block text-muted dark:text-white/60 mb-0.5">Explanation:</span>
                  {gr.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border dark:border-gray-800">
          <Button variant="academic" size="sm" onClick={onCancel} className="cursor-pointer">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ── Question Runner View ──
  return (
    <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-2xl p-6 shadow-tactile-raised space-y-5">
      {/* Header with progress */}
      <div className="flex items-center justify-between border-b border-border dark:border-gray-800 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="academic">Question {currentIndex + 1} of {questions.length}</Badge>
          <span className="text-muted dark:text-white/60 capitalize">{currentQ.difficulty}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted dark:text-white/60 hover:text-ink dark:hover:text-white cursor-pointer"
        >
          Exit Drill
        </button>
      </div>

      {/* Question Prompt */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-ink dark:text-white leading-relaxed">
          {currentQ.question}
        </h3>
      </div>

      {/* Answer Options */}
      <div className="space-y-2">
        {currentOptions.map((opt) => {
          const isSelected = selectedAnswers[currentQ.id] === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(opt.id)}
              className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#DDEFE5] dark:bg-[#176B4D]/30 border-[#176B4D] text-[#176B4D] dark:text-[#A7F3D0] font-bold shadow-sm'
                  : 'bg-white dark:bg-[#1c232d] border-border dark:border-gray-800 text-ink dark:text-white hover:border-gray-400 dark:hover:border-gray-700'
              }`}
            >
              <span><span className="font-mono mr-2">{opt.id}.</span> {opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation & Submit Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border dark:border-gray-800">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="cursor-pointer"
        >
          Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="academic"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="cursor-pointer"
          >
            Next Question
          </Button>
        ) : (
          <Button
            variant="academic"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || Object.keys(selectedAnswers).length === 0}
            icon={submitting ? Loader2 : CheckCircle2}
            className="bg-[#176B4D] hover:bg-[#12543C] text-white cursor-pointer"
          >
            Submit for Evaluation
          </Button>
        )}
      </div>
    </div>
  );
}
