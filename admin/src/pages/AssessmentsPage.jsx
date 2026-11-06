import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  HelpCircle,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  BookOpen,
  Filter,
  Layers,
  Award,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';
import { clsx } from 'clsx';

export function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'attempts' | 'subjects'
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Question Creator / Editor Modal State
  const [questionModal, setQuestionModal] = useState({ open: false, editingQuestion: null });
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('intermediate');
  const [formOptions, setFormOptions] = useState([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('A');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Selected question inspection modal
  const [inspectedQuestion, setInspectedQuestion] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [questionsRes, subjectsRes, attemptsRes] = await Promise.all([
        supabase
          .from('question_bank')
          .select(`
            id,
            question,
            question_type,
            difficulty,
            options,
            correct_answer,
            explanation,
            status,
            subject_id,
            created_at,
            subjects:subject_id (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('id, name, code, category').order('display_order'),
        supabase
          .from('assessment_attempts')
          .select(`
            id,
            status,
            score,
            passed,
            total_questions,
            correct_answers_count,
            time_spent_seconds,
            started_at,
            completed_at,
            application_id,
            tutor_applications:application_id (
              academic_level,
              user_id
            )
          `)
          .order('started_at', { ascending: false }),
      ]);

      if (questionsRes.error) throw new Error(questionsRes.error.message);
      setQuestions(questionsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAttempts(attemptsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal for new question
  const openNewQuestionModal = () => {
    setQuestionModal({ open: true, editingQuestion: null });
    setFormSubjectId(subjects[0]?.id || '');
    setFormQuestionText('');
    setFormDifficulty('intermediate');
    setFormOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ]);
    setFormCorrectAnswer('A');
    setFormExplanation('');
    setFormError(null);
  };

  // Open modal for editing question
  const openEditQuestionModal = (q) => {
    setQuestionModal({ open: true, editingQuestion: q });
    setFormSubjectId(q.subject_id || '');
    setFormQuestionText(q.question || '');
    setFormDifficulty(q.difficulty || 'intermediate');
    setFormOptions(Array.isArray(q.options) ? q.options : []);
    setFormCorrectAnswer(q.correct_answer || 'A');
    setFormExplanation(q.explanation || '');
    setFormError(null);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    // Validate inputs
    if (!formQuestionText.trim()) {
      setFormError('Question prompt is required.');
      setFormSaving(false);
      return;
    }
    if (formOptions.some((o) => !o.text.trim())) {
      setFormError('All 4 answer options (A, B, C, D) must have text.');
      setFormSaving(false);
      return;
    }

    try {
      const payload = {
        subject_id: formSubjectId || null,
        question: formQuestionText.trim(),
        difficulty: formDifficulty,
        question_type: 'multiple_choice',
        options: formOptions,
        correct_answer: formCorrectAnswer,
        explanation: formExplanation.trim() || null,
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      if (questionModal.editingQuestion) {
        const { error: updErr } = await supabase
          .from('question_bank')
          .update(payload)
          .eq('id', questionModal.editingQuestion.id);
        if (updErr) throw new Error(updErr.message);
        setSuccessMessage('Assessment question updated successfully.');
      } else {
        const { error: insErr } = await supabase.from('question_bank').insert(payload);
        if (insErr) throw new Error(insErr.message);
        setSuccessMessage('New question added to bank successfully.');
      }

      setQuestionModal({ open: false, editingQuestion: null });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleQuestionStatus = async (q) => {
    const nextStatus = q.status === 'active' ? 'inactive' : 'active';
    try {
      const { error: err } = await supabase
        .from('question_bank')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', q.id);
      if (err) throw new Error(err.message);
      setSuccessMessage(`Question ${q.id.substring(0, 8)} set to ${nextStatus}.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const text = q.question?.toLowerCase() || '';
      const matchesSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      const matchesSubject = subjectFilter === 'all' || q.subject_id === subjectFilter;
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [questions, searchTerm, subjectFilter, statusFilter]);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Assessment Administration</h1>
          <p className="text-sm text-muted mt-0.5">Maintain tutor qualification question banks and inspect assessment attempts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={openNewQuestionModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-academic text-white text-xs font-semibold hover:bg-academic/90 transition-colors cursor-pointer shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-card bg-academic-light/60 border border-academic/20 text-xs font-semibold text-academic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-academic hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-border/40 rounded-btn w-fit">
        <button
          onClick={() => setActiveTab('questions')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer',
            activeTab === 'questions' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Question Bank ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('attempts')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer',
            activeTab === 'attempts' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Assessment Attempts ({attempts.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={clsx(
            'px-3.5 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer',
            activeTab === 'subjects' ? 'bg-surface text-ink shadow-subtle' : 'text-muted hover:text-ink'
          )}
        >
          Subjects ({subjects.length})
        </button>
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border shadow-subtle">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search question text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Questions List */}
          <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-academic" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
                <HelpCircle className="w-10 h-10 text-muted" />
                <p className="text-base font-semibold text-ink">No questions found</p>
                <p className="text-xs text-muted">No assessment questions match the current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredQuestions.map((q) => {
                  const subjectName = q.subjects?.name || q.subject_id || 'General';
                  const isActive = q.status === 'active';
                  return (
                    <div
                      key={q.id}
                      className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-canvas/50 transition-colors"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-btn bg-academic-light text-academic font-bold text-[10px]">
                            {subjectName}
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                              isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-muted border-border'
                            )}
                          >
                            {q.status}
                          </span>
                          <span className="text-[10px] text-muted font-mono uppercase">
                            Difficulty: {q.difficulty}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-ink leading-relaxed">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-4 text-[11px] text-muted">
                          <span>
                            Answer: <strong className="text-academic font-mono">{q.correct_answer}</strong>
                          </span>
                          <span>Options: {Array.isArray(q.options) ? q.options.length : 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                        <button
                          onClick={() => setInspectedQuestion(q)}
                          className="p-2 rounded-btn border border-border text-muted hover:text-ink hover:border-ink transition-colors"
                          title="Preview full question"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditQuestionModal(q)}
                          className="px-2.5 py-1.5 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleQuestionStatus(q)}
                          className={clsx(
                            'px-2.5 py-1.5 rounded-btn text-xs font-semibold transition-colors',
                            isActive
                              ? 'bg-red-50 text-danger border border-red-200 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          )}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTEMPTS */}
      {activeTab === 'attempts' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {attempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <Award className="w-10 h-10 text-muted" />
              <p className="text-base font-semibold text-ink">No attempts recorded</p>
              <p className="text-xs text-muted">No tutor assessment attempts found in the platform.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                <span className="col-span-4">Attempt ID & Applicant</span>
                <span className="col-span-2">Outcome</span>
                <span className="col-span-2">Score</span>
                <span className="col-span-2">Time Spent</span>
                <span className="col-span-2 text-right">Date</span>
              </div>
              {attempts.map((att) => {
                const passed = att.passed === true;
                return (
                  <div
                    key={att.id}
                    className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 transition-colors text-xs"
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="font-mono text-ink font-bold truncate">{att.id}</p>
                      <p className="text-[10px] text-muted truncate">
                        App: {att.application_id} ({att.tutor_applications?.academic_level || 'Applicant'})
                      </p>
                    </div>

                    <div className="col-span-2 mt-1 sm:mt-0">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                          passed ? 'bg-academic-light text-academic border-academic/20' : 'bg-red-50 text-danger border-red-200'
                        )}
                      >
                        {passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="col-span-2 mt-1 sm:mt-0 font-bold font-mono">
                      {att.score !== null ? `${Number(att.score).toFixed(0)}%` : '—'}
                      <span className="text-[10px] text-muted font-normal ml-1">
                        ({att.correct_answers_count}/{att.total_questions})
                      </span>
                    </div>

                    <div className="col-span-2 text-muted mt-1 sm:mt-0">
                      {att.time_spent_seconds ? `${Math.round(att.time_spent_seconds / 60)} mins` : '—'}
                    </div>

                    <div className="col-span-2 text-right text-muted font-mono mt-1 sm:mt-0">
                      {new Date(att.started_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="bg-surface rounded-card border border-border shadow-subtle p-5">
          <h3 className="text-sm font-bold text-ink mb-4">Supported Subject Disciplines</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const qCount = questions.filter((q) => q.subject_id === s.id).length;
              return (
                <div key={s.id} className="p-4 rounded-btn border border-border bg-canvas/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink">{s.name}</p>
                    <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                      {s.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">Category: {s.category || 'General'}</p>
                  <p className="text-[11px] text-academic font-semibold pt-1">
                    {qCount} active question{qCount !== 1 ? 's' : ''} in pool
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Editor / Creator Modal */}
      {questionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <form
            onSubmit={handleSaveQuestion}
            className="bg-surface rounded-card border border-border shadow-modal w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-ink">
                {questionModal.editingQuestion ? 'Edit Assessment Question' : 'Create Question'}
              </h3>
              <button
                type="button"
                onClick={() => setQuestionModal({ open: false, editingQuestion: null })}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-btn bg-red-50 border border-red-200 text-xs text-danger font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Subject Category</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Question Prompt</label>
              <textarea
                rows={3}
                required
                value={formQuestionText}
                onChange={(e) => setFormQuestionText(e.target.value)}
                placeholder="Enter clear, rigorous academic question..."
                className="w-full px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas resize-none focus:outline-none focus:ring-2 focus:ring-academic/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Difficulty</label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Correct Answer</label>
                <select
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border text-xs font-semibold text-academic bg-canvas"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>

            {/* 4 Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink">Multiple Choice Options</label>
              {formOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0',
                      formCorrectAnswer === opt.id ? 'bg-academic text-white' : 'bg-border/60 text-muted'
                    )}
                  >
                    {opt.id}
                  </span>
                  <input
                    type="text"
                    required
                    value={opt.text}
                    onChange={(e) => {
                      const next = [...formOptions];
                      next[idx].text = e.target.value;
                      setFormOptions(next);
                    }}
                    placeholder={`Option ${opt.id} text...`}
                    className="flex-1 px-3 py-1.5 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Explanation (Server-side reference)</label>
              <textarea
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Pedagogical rationale for the correct answer..."
                className="w-full px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas resize-none focus:outline-none focus:ring-2 focus:ring-academic/20"
              />
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setQuestionModal({ open: false, editingQuestion: null })}
                disabled={formSaving}
                className="flex-1 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-btn bg-academic text-white text-xs font-semibold hover:bg-academic/90 transition-colors cursor-pointer"
              >
                {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {formSaving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Question Inspection Preview Modal */}
      {inspectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-btn bg-academic-light text-academic font-bold text-[10px]">
                  {inspectedQuestion.subjects?.name || inspectedQuestion.subject_id}
                </span>
                <span className="text-[10px] text-muted font-mono uppercase">
                  {inspectedQuestion.difficulty}
                </span>
              </div>
              <button
                onClick={() => setInspectedQuestion(null)}
                className="text-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Question Prompt</p>
                <p className="text-ink mt-0.5 font-semibold text-sm leading-relaxed">
                  {inspectedQuestion.question}
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Options</p>
                {Array.isArray(inspectedQuestion.options) &&
                  inspectedQuestion.options.map((opt) => {
                    const isCorrect = inspectedQuestion.correct_answer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={clsx(
                          'p-2.5 rounded-btn border text-xs flex items-center gap-3',
                          isCorrect
                            ? 'bg-academic-light/60 border-academic/40 text-ink font-semibold'
                            : 'bg-canvas border-border text-muted'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                            isCorrect ? 'bg-academic text-white' : 'bg-border text-muted'
                          )}
                        >
                          {opt.id}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isCorrect && (
                          <span className="text-[10px] text-academic font-bold uppercase tracking-wider">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {inspectedQuestion.explanation && (
                <div className="pt-2">
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Explanation</p>
                  <p className="text-muted text-[11px] mt-0.5 bg-canvas p-2.5 rounded border border-border leading-relaxed">
                    {inspectedQuestion.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setInspectedQuestion(null)}
                className="px-4 py-2 rounded-btn bg-navy text-white text-xs font-semibold hover:bg-ink transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
