/**
 * SubjectPerformanceChart.jsx
 *
 * Pure CSS horizontal bar chart for subject performance visualization.
 * No external chart library.
 * Props:
 *   subjects: Array<{subjectId, subjectName, code, accuracyPercentage, totalQuestionsAttempted, topicCoveragePercentage, hasSufficientData}>
 */

import React from 'react';

function getBarColor(accuracy) {
  if (accuracy === null || accuracy === undefined) return '#94A3B8';
  if (accuracy >= 80) return '#176B4D';
  if (accuracy >= 60) return '#D97706';
  return '#DC2626';
}

function getTextColor(accuracy) {
  if (accuracy === null || accuracy === undefined) return 'text-muted';
  if (accuracy >= 80) return 'text-emerald-700';
  if (accuracy >= 60) return 'text-amber-700';
  return 'text-red-700';
}

export function SubjectPerformanceChart({ subjects = [] }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted">
        No subject data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.map((s) => {
        const acc = s.accuracyPercentage;
        const barWidth = acc !== null && acc !== undefined ? Math.max(2, acc) : 0;
        const barColor = getBarColor(acc);
        const textColor = getTextColor(acc);
        const isUnassessed =
          acc === null || acc === undefined || s.totalQuestionsAttempted === 0;

        return (
          <div key={s.subjectId || s.code || s.subjectName} className="space-y-1.5">
            {/* Subject label row */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-ink truncate block">
                  {s.subjectName}
                </span>
                <span className="text-[11px] text-muted font-mono">{s.code}</span>
              </div>
              {isUnassessed ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-canvas text-muted font-medium shrink-0">
                  Unassessed
                </span>
              ) : (
                <span className={`text-xs font-mono font-bold shrink-0 ${textColor}`}>
                  {acc}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              {!isUnassessed && (
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                />
              )}
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>
                {s.totalQuestionsAttempted > 0
                  ? `${s.totalQuestionsAttempted} questions evaluated`
                  : 'No questions attempted yet'}
              </span>
              {s.topicCoveragePercentage !== undefined && (
                <span>{s.topicCoveragePercentage}% topic coverage</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
