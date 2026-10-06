/**
 * BecomeTutorPage
 *
 * Student-facing Become a Tutor workflow:
 *   1. Status gate — shows current application state if one already exists.
 *   2. Onboarding wizard — collects profile/subject/experience info.
 *   3. Assessment — 10-question timed quiz from the Supabase question bank.
 *      correct_answer is NEVER sent to the browser; scoring is server-side.
 *   4. Result — shows pass/fail, pending-review state, or retry option.
 *
 * Security properties:
 *   - Students cannot set role, is_verified, is_active, or any admin field.
 *   - Assessment scoring is delegated to submit_tutor_assessment() RPC (SECURITY DEFINER).
 *   - Duplicate applications are blocked by the hook and by the DB trigger.
 *   - Passing does NOT grant the tutor role — that requires admin approval (Phase 4).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  Trophy,
  Star,
  Users,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { useTutorApplication } from '../../hooks/useTutorApplication';

// ── Status labels / badge variants ─────────────────────────────────────────
const STATUS_CONFIG = {
  draft:                  { label: 'Draft',               variant: 'default',  description: 'Your application is saved as a draft.' },
  submitted:              { label: 'Submitted',           variant: 'academic', description: 'Application submitted. Awaiting assessment.' },
  assessment_pending:     { label: 'Assessment Required', variant: 'academic', description: 'You are cleared to take the tutor assessment.' },
  assessment_in_progress: { label: 'Assessment Active',  variant: 'academic', description: 'Assessment is currently in progress.' },
  assessment_failed:      { label: 'Assessment Failed',  variant: 'danger',   description: 'You did not meet the pass threshold. You may retry.' },
  assessment_passed:      { label: 'Assessment Passed',  variant: 'success',  description: 'You passed! Awaiting admin review.' },
  pending_review:         { label: 'Pending Review',     variant: 'academic', description: 'Your application is under admin review.' },
  approved:               { label: 'Approved',           variant: 'success',  description: 'Congratulations! Your tutor account is approved.' },
  rejected:               { label: 'Not Approved',       variant: 'danger',   description: 'Your application was not approved at this time.' },
  suspended:              { label: 'Suspended',          variant: 'danger',   description: 'Your tutor account has been suspended.' },
};

const MAX_RETRIES = 3;

// ── Small reusable layout helpers ───────────────────────────────────────────
function SectionCard({ children, className = '' }) {
  return (
    <div className={`bg-white border border-border rounded-card p-5 sm:p-6 shadow-tactile-raised ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink mb-1.5">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

function TextInput({ id, value, onChange, placeholder, required, type = 'text', disabled, ...rest }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full bg-canvas border border-border rounded-btn px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-academic disabled:opacity-50 transition-colors"
      {...rest}
    />
  );
}

function TextArea({ id, value, onChange, placeholder, required, rows = 3, disabled }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={rows}
      disabled={disabled}
      className="w-full bg-canvas border border-border rounded-btn px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-academic disabled:opacity-50 transition-colors resize-none"
    />
  );
}

function Select({ id, value, onChange, required, disabled, children }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className="w-full bg-canvas border border-border rounded-btn px-3 py-2 text-sm text-ink focus:outline-none focus:border-academic disabled:opacity-50 transition-colors"
    >
      {children}
    </select>
  );
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-200 ${
            i < current ? 'bg-academic w-6' : i === current ? 'bg-academic w-4' : 'bg-border w-4'
          }`}
        />
      ))}
    </div>
  );
}

// ── Error alert ──────────────────────────────────────────────────────────────
function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-btn bg-danger-50 border border-danger-100 text-xs text-danger">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-danger/60 hover:text-danger font-semibold cursor-pointer">
          ×
        </button>
      )}
    </div>
  );
}

// ── Assessment timer ─────────────────────────────────────────────────────────
function AssessmentTimer({ limitMinutes, onTimeout }) {
  const [secondsLeft, setSecondsLeft] = useState(limitMinutes * 60);
  const timedOut = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!timedOut.current) { timedOut.current = true; onTimeout(); }
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, onTimeout]);

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');
  const isWarning = secondsLeft < 120;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-btn border ${
      isWarning ? 'text-danger bg-danger-50 border-danger-100' : 'text-muted bg-canvas border-border'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      {mins}:{secs}
    </div>
  );
}

// ── Status Gate View ─────────────────────────────────────────────────────────
function ApplicationStatusView({ application, onStartAssessment, onRetryAssessment, onNavigateDashboard, showToast }) {
  const status = application.status;
  const config = STATUS_CONFIG[status] || { label: status, variant: 'default', description: '' };
  const canTakeAssessment = ['submitted', 'assessment_pending', 'assessment_failed'].includes(status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-ink">Your Tutor Application</h2>
            <p className="text-xs text-muted">{config.description}</p>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {application.assessment_score !== null && application.assessment_score !== undefined && (
          <div className="mt-4 p-3 rounded-btn bg-canvas border border-border">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Last Assessment Score</p>
            <p className={`text-2xl font-bold ${application.assessment_passed ? 'text-academic' : 'text-danger'}`}>
              {Number(application.assessment_score).toFixed(1)}%
            </p>
          </div>
        )}

        {status === 'pending_review' && (
          <div className="mt-4 p-4 rounded-btn bg-academic-50 border border-academic-200 text-xs text-academic-700 space-y-1">
            <p className="font-semibold">Assessment Passed — Awaiting Admin Review</p>
            <p>
              You have successfully passed the Studora tutor accreditation assessment. Your application is now
              under review by the Studora admin team. This process typically takes 1–3 business days.
              Passing the assessment does <strong>not</strong> automatically make you a tutor — admin
              approval is required.
            </p>
          </div>
        )}

        {status === 'approved' && (
          <div className="mt-4 p-4 rounded-btn bg-academic-50 border border-academic-200 text-xs text-academic-700 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Approved Tutor</p>
            <p>Your application has been approved. Your tutor account is active.</p>
          </div>
        )}

        {status === 'assessment_failed' && (
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-800">
              You did not meet the 70% pass threshold. You may retry the assessment up to 3 times total.
            </div>
            <Button variant="academic" icon={RotateCcw} onClick={onRetryAssessment} className="w-full">
              Retry Assessment
            </Button>
          </div>
        )}

        {canTakeAssessment && status !== 'assessment_failed' && (
          <div className="mt-4">
            <Button variant="academic" icon={ClipboardList} onClick={onStartAssessment} className="w-full">
              Start Tutor Assessment
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onNavigateDashboard}>
            ← Back to Dashboard
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Onboarding Wizard ────────────────────────────────────────────────────────
const TOTAL_WIZARD_STEPS = 3;

const EXPERIENCE_TYPE_OPTIONS = [
  { id: 'peer_tutoring', label: 'Peer Tutoring' },
  { id: 'ta', label: 'Teaching Assistant' },
  { id: 'private_tutoring', label: 'Private Tutoring' },
  { id: 'online', label: 'Online Teaching' },
  { id: 'workshop', label: 'Workshop / Seminar Facilitation' },
  { id: 'other', label: 'Other' },
];

function OnboardingWizard({ subjects, onComplete, onCancel, showToast }) {
  const { loading, error, createApplication, updateApplication, submitApplication } = useTutorApplication();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(null);
  const [localError, setLocalError] = useState(null);

  const [form, setForm] = useState({
    institution: '',
    department: '',
    academic_level: '',
    programme: '',
    graduation_year: '',
    selected_subject_ids: [],
    has_teaching_experience: false,
    experience_types: [],
    experience_description: '',
    teaching_level: 'intermediate',
    bio: '',
    teaching_approach: '',
    areas_of_expertise: [],
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleSubject = (id) =>
    set('selected_subject_ids', form.selected_subject_ids.includes(id)
      ? form.selected_subject_ids.filter((s) => s !== id)
      : [...form.selected_subject_ids, id]);

  const toggleExpType = (id) =>
    set('experience_types', form.experience_types.includes(id)
      ? form.experience_types.filter((e) => e !== id)
      : [...form.experience_types, id]);

  const toggleExpertise = (id) =>
    set('areas_of_expertise', form.areas_of_expertise.includes(id)
      ? form.areas_of_expertise.filter((e) => e !== id)
      : [...form.areas_of_expertise, id]);

  const handleNext = async () => {
    setLocalError(null);

    // Step 0 validation
    if (step === 0) {
      if (!form.institution.trim() || !form.department.trim() || !form.academic_level.trim()) {
        setLocalError('Please fill in your institution, department, and academic level.');
        return;
      }
      if (form.selected_subject_ids.length === 0) {
        setLocalError('Please select at least one subject you can tutor.');
        return;
      }

      try {
        if (!appId) {
          const app = await createApplication({
            ...form,
            current_step: 1,
          });
          setAppId(app.id);
        } else {
          await updateApplication(appId, { ...form, current_step: 1 });
        }
        setStep(1);
      } catch (err) {
        setLocalError(err.message);
      }
      return;
    }

    // Step 1 validation
    if (step === 1) {
      if (!form.bio.trim()) {
        setLocalError('A short bio is required so students can learn about you.');
        return;
      }
      try {
        await updateApplication(appId, { ...form, current_step: 2 });
        setStep(2);
      } catch (err) {
        setLocalError(err.message);
      }
      return;
    }

    // Step 2 — final submission
    if (step === 2) {
      try {
        await updateApplication(appId, { ...form, current_step: 3 });
        await submitApplication(appId);
        showToast?.({ type: 'success', title: 'Application Submitted', message: 'Your tutor application has been submitted.' });
        onComplete(appId);
      } catch (err) {
        setLocalError(err.message);
      }
    }
  };

  const handleBack = () => {
    setLocalError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const err = localError || error;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <SectionCard>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Become a Tutor</h2>
            <p className="text-xs text-muted mt-0.5">
              {step === 0 && 'Step 1 of 3 — Academic Background & Subjects'}
              {step === 1 && 'Step 2 of 3 — Teaching Experience & Bio'}
              {step === 2 && 'Step 3 of 3 — Review & Submit'}
            </p>
          </div>
          <StepIndicator current={step} total={TOTAL_WIZARD_STEPS} />
        </div>

        <ErrorAlert message={err} onDismiss={() => setLocalError(null)} />
      </SectionCard>

      {/* Step 0 — Academic Background */}
      {step === 0 && (
        <SectionCard>
          <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-academic" />
            Academic Background
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="institution" required>Institution</FieldLabel>
                <TextInput id="institution" value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. University of Lagos" required />
              </div>
              <div>
                <FieldLabel htmlFor="department" required>Department / Faculty</FieldLabel>
                <TextInput id="department" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Computer Science" required />
              </div>
              <div>
                <FieldLabel htmlFor="academic_level" required>Academic Level</FieldLabel>
                <Select id="academic_level" value={form.academic_level} onChange={(e) => set('academic_level', e.target.value)} required>
                  <option value="">Select level</option>
                  <option value="Year 1">Year 1</option>
                  <option value="Year 2">Year 2</option>
                  <option value="Year 3">Year 3</option>
                  <option value="Year 4">Year 4</option>
                  <option value="Year 5+">Year 5+</option>
                  <option value="Postgraduate">Postgraduate (Masters / PhD)</option>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="programme">Programme</FieldLabel>
                <TextInput id="programme" value={form.programme} onChange={(e) => set('programme', e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
              </div>
              <div>
                <FieldLabel htmlFor="graduation_year">Expected Graduation Year</FieldLabel>
                <TextInput id="graduation_year" value={form.graduation_year} onChange={(e) => set('graduation_year', e.target.value)} placeholder="e.g. 2026" type="number" />
              </div>
            </div>

            <div>
              <FieldLabel required>Subjects You Can Tutor</FieldLabel>
              <p className="text-xs text-muted mb-2">Select all subjects you are confident to teach at a high standard.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subjects.map((s) => {
                  const selected = form.selected_subject_ids.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`text-left p-2.5 rounded-btn border text-xs transition-all ${
                        selected
                          ? 'bg-academic-50 border-academic-300 text-academic font-semibold shadow-[inset_1px_1px_3px_rgba(23,107,77,0.10)]'
                          : 'bg-canvas border-border text-muted hover:text-ink hover:border-academic/50'
                      }`}
                    >
                      <span className="block font-medium">{s.name}</span>
                      <span className="text-[10px] font-mono opacity-70">{s.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Step 1 — Teaching Experience & Bio */}
      {step === 1 && (
        <SectionCard>
          <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-academic" />
            Teaching Experience & Bio
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={form.has_teaching_experience}
                onClick={() => set('has_teaching_experience', !form.has_teaching_experience)}
                className={`relative w-9 h-5 rounded-full border transition-all ${
                  form.has_teaching_experience ? 'bg-academic border-academic' : 'bg-canvas border-border'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  form.has_teaching_experience ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
              <span className="text-sm text-ink">I have prior teaching experience</span>
            </div>

            {form.has_teaching_experience && (
              <>
                <div>
                  <FieldLabel>Experience Type(s)</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_TYPE_OPTIONS.map((opt) => {
                      const sel = form.experience_types.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleExpType(opt.id)}
                          className={`px-2.5 py-1 rounded-btn text-xs border transition-all ${
                            sel ? 'bg-academic-50 border-academic-200 text-academic font-semibold' : 'border-border text-muted hover:text-ink hover:border-academic/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="exp_desc">Describe Your Experience</FieldLabel>
                  <TextArea
                    id="exp_desc"
                    value={form.experience_description}
                    onChange={(e) => set('experience_description', e.target.value)}
                    placeholder="Briefly describe your teaching experience, including context and impact..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <div>
              <FieldLabel htmlFor="teaching_level">Teaching Proficiency Level</FieldLabel>
              <Select id="teaching_level" value={form.teaching_level} onChange={(e) => set('teaching_level', e.target.value)}>
                <option value="beginner">Beginner — Can assist with introductory material</option>
                <option value="intermediate">Intermediate — Comfortable across most course content</option>
                <option value="advanced">Advanced — Deep mastery, can tackle complex topics</option>
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="bio" required>Tutor Bio</FieldLabel>
              <TextArea
                id="bio"
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="Write a short bio for your public tutor profile. Describe your strengths, approach, and passion for teaching..."
                rows={4}
                required
              />
              <p className="text-[11px] text-muted mt-1">{form.bio.length}/500 characters</p>
            </div>

            <div>
              <FieldLabel htmlFor="approach">Teaching Approach</FieldLabel>
              <TextArea
                id="approach"
                value={form.teaching_approach}
                onChange={(e) => set('teaching_approach', e.target.value)}
                placeholder="Describe how you like to structure tutoring sessions, explain concepts, etc."
                rows={3}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <SectionCard>
          <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-academic" />
            Review Your Application
          </h3>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div><span className="text-muted">Institution:</span> <span className="font-medium text-ink ml-1">{form.institution || '—'}</span></div>
              <div><span className="text-muted">Department:</span> <span className="font-medium text-ink ml-1">{form.department || '—'}</span></div>
              <div><span className="text-muted">Level:</span> <span className="font-medium text-ink ml-1">{form.academic_level || '—'}</span></div>
              <div><span className="text-muted">Programme:</span> <span className="font-medium text-ink ml-1">{form.programme || '—'}</span></div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-muted mb-1">Selected Subjects:</p>
              <div className="flex flex-wrap gap-1.5">
                {form.selected_subject_ids.length > 0
                  ? subjects.filter((s) => form.selected_subject_ids.includes(s.id)).map((s) => (
                    <span key={s.id} className="px-2 py-0.5 rounded bg-academic-50 text-academic text-[11px] font-medium border border-academic-200">{s.name}</span>
                  ))
                  : <span className="text-muted italic">None selected</span>
                }
              </div>
            </div>

            {form.bio && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted mb-1">Bio:</p>
                <p className="text-ink leading-relaxed">{form.bio}</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <p className="font-semibold mb-0.5">What happens next?</p>
            <p>
              After submitting, you will be directed to take a short accreditation assessment (10 questions, 20 minutes).
              Scoring is automatic. If you pass, your application enters admin review.
              <strong> Passing does not automatically grant you the tutor role</strong> — admin approval is required.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {step === 0 ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          ) : (
            <Button variant="outline" size="sm" icon={ChevronLeft} onClick={handleBack} disabled={loading}>Back</Button>
          )}
        </div>
        <Button
          variant="academic"
          icon={step < TOTAL_WIZARD_STEPS - 1 ? ChevronRight : CheckCircle2}
          iconPosition="right"
          loading={loading}
          onClick={handleNext}
        >
          {step < TOTAL_WIZARD_STEPS - 1 ? 'Continue' : 'Submit Application'}
        </Button>
      </div>
    </div>
  );
}

// ── Assessment View ──────────────────────────────────────────────────────────
function AssessmentView({ applicationId, showToast, onComplete }) {
  const { loading, error, startAssessment, submitAssessment, fetchAttemptCount } = useTutorApplication();
  const [phase, setPhase] = useState('loading'); // loading | ready | answering | submitting | done
  const [sessionData, setSessionData] = useState(null);   // from start_tutor_assessment RPC
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [localError, setLocalError] = useState(null);
  const timedOut = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const cnt = await fetchAttemptCount(applicationId);
        if (!mounted) return;
        setAttemptCount(cnt);
        if (cnt >= MAX_RETRIES) {
          setLocalError(`Maximum attempts (${MAX_RETRIES}) reached. Please contact Studora support.`);
          setPhase('error');
          return;
        }
        setPhase('ready');
      } catch (err) {
        if (mounted) { setLocalError(err.message); setPhase('error'); }
      }
    }
    init();
    return () => { mounted = false; };
  }, [applicationId, fetchAttemptCount]);

  const handleStart = async () => {
    setLocalError(null);
    setPhase('loading');
    try {
      const data = await startAssessment(applicationId);
      // Security assertion: correct_answer must NOT be present in any question
      if (data?.questions?.some((q) => q.correct_answer !== undefined)) {
        throw new Error('Assessment data integrity error. Please contact support.');
      }
      setSessionData(data);
      setAnswers({});
      setCurrentQ(0);
      timedOut.current = false;
      setPhase('answering');
    } catch (err) {
      setLocalError(err.message);
      setPhase('ready');
    }
  };

  const handleTimeout = useCallback(() => {
    if (timedOut.current) return;
    timedOut.current = true;
    showToast?.({ type: 'warning', title: 'Time Expired', message: 'Assessment time limit reached. Submitting your answers now.' });
    handleSubmit(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, answers]);

  const handleSubmit = async (fromTimer = false) => {
    if (phase === 'submitting') return;
    setPhase('submitting');
    setLocalError(null);
    try {
      const result = await submitAssessment(sessionData.attempt_id, answers);
      setResult(result);
      setPhase('done');
      onComplete(result);
    } catch (err) {
      setLocalError(err.message);
      setPhase(fromTimer ? 'done' : 'answering');
    }
  };

  const questions = sessionData?.questions || [];
  const question = questions[currentQ];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto">
        <SectionCard className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-7 h-7 text-academic animate-spin" />
          <p className="text-sm text-muted">Preparing your assessment...</p>
        </SectionCard>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <SectionCard>
          <ErrorAlert message={localError || error} />
        </SectionCard>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <SectionCard>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-academic-100 flex items-center justify-center text-academic border border-academic-200">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">Studora Tutor Accreditation Assessment</h2>
                <p className="text-xs text-muted">Verify your knowledge before joining the tutor marketplace.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-btn bg-canvas border border-border">
                <p className="text-lg font-bold text-ink">10</p>
                <p className="text-muted">Questions</p>
              </div>
              <div className="p-3 rounded-btn bg-canvas border border-border">
                <p className="text-lg font-bold text-ink">20</p>
                <p className="text-muted">Minutes</p>
              </div>
              <div className="p-3 rounded-btn bg-canvas border border-border">
                <p className="text-lg font-bold text-ink">70%</p>
                <p className="text-muted">Pass Mark</p>
              </div>
            </div>

            {attemptCount > 0 && (
              <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Attempt {attemptCount + 1} of {MAX_RETRIES}. You have {MAX_RETRIES - attemptCount} attempt(s) remaining.
              </div>
            )}

            <div className="p-3 rounded-btn bg-canvas border border-border text-xs text-muted space-y-1">
              <p className="font-semibold text-ink">Before you begin:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>The timer starts immediately when you click Start.</li>
                <li>All answers are submitted automatically when time expires.</li>
                <li>You cannot pause the timer.</li>
                <li>Scoring is automatic — results are available instantly.</li>
              </ul>
            </div>

            <ErrorAlert message={localError || error} onDismiss={() => setLocalError(null)} />

            <Button variant="academic" size="lg" loading={loading} onClick={handleStart} className="w-full">
              Start Assessment
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="max-w-2xl mx-auto">
        <SectionCard className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-7 h-7 text-academic animate-spin" />
          <p className="text-sm font-semibold text-ink">Scoring your assessment...</p>
          <p className="text-xs text-muted">This is done securely on our servers.</p>
        </SectionCard>
      </div>
    );
  }

  if (phase === 'answering' && question) {
    const options = question.options || [];
    const selectedAnswer = answers[question.id];
    const isLast = currentQ === totalQ - 1;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header bar */}
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">
                Question {currentQ + 1} / {totalQ}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas border border-border font-mono text-muted capitalize">
                {question.difficulty}
              </span>
            </div>
            <AssessmentTimer limitMinutes={sessionData.time_limit_minutes} onTimeout={handleTimeout} />
          </div>
          <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-academic rounded-full transition-all"
              style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
            />
          </div>
        </SectionCard>

        {/* Question card */}
        <SectionCard>
          <p className="text-sm sm:text-base font-semibold text-ink leading-relaxed mb-5">
            {question.question}
          </p>

          <div className="space-y-2.5">
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-btn border transition-all ${
                    isSelected
                      ? 'bg-academic-50 border-academic-300 shadow-[inset_1px_1px_3px_rgba(23,107,77,0.08)]'
                      : 'bg-canvas border-border hover:border-academic/40 hover:bg-white'
                  }`}
                >
                  <span className={`shrink-0 w-5 h-5 rounded-full border text-[11px] font-bold flex items-center justify-center mt-0.5 ${
                    isSelected ? 'bg-academic border-academic text-white' : 'border-border text-muted bg-white'
                  }`}>
                    {opt.id}
                  </span>
                  <span className={`text-sm leading-relaxed ${isSelected ? 'text-academic font-medium' : 'text-ink'}`}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          <ErrorAlert message={localError} onDismiss={() => setLocalError(null)} />
        </SectionCard>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" icon={ChevronLeft} disabled={currentQ === 0}
            onClick={() => setCurrentQ((q) => q - 1)}>
            Previous
          </Button>

          <span className="text-xs text-muted">{answeredCount}/{totalQ} answered</span>

          {isLast ? (
            <Button
              variant="academic"
              size="sm"
              loading={phase === 'submitting'}
              onClick={() => handleSubmit(false)}
              disabled={answeredCount === 0}
            >
              Submit Assessment
            </Button>
          ) : (
            <Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right"
              onClick={() => setCurrentQ((q) => q + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Result View ──────────────────────────────────────────────────────────────
function ResultView({ result, onRetry, onNavigateDashboard, retryCount }) {
  const passed = result?.passed;
  const score = Number(result?.score ?? 0).toFixed(1);
  const passPercentage = result?.pass_percentage ?? 70;
  const canRetry = !passed && retryCount < MAX_RETRIES;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SectionCard>
        <div className="flex flex-col items-center text-center py-4 gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${
            passed
              ? 'bg-academic-50 border-academic-200 text-academic'
              : 'bg-danger-50 border-danger-200 text-danger'
          }`}>
            {passed ? <Trophy className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">
              {passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
            </h2>
            <p className="text-sm text-muted mt-1">
              {passed
                ? 'Excellent work. Your application is now pending admin review.'
                : `You scored ${score}%. The pass mark is ${passPercentage}%.`}
            </p>
          </div>

          <div className={`text-4xl font-bold font-mono ${passed ? 'text-academic' : 'text-danger'}`}>
            {score}%
          </div>

          <div className="flex gap-4 text-xs text-muted">
            <span>{result?.correct_count ?? 0} correct</span>
            <span>·</span>
            <span>{result?.total_questions ?? 0} total</span>
            <span>·</span>
            <span>Pass mark: {passPercentage}%</span>
          </div>
        </div>
      </SectionCard>

      {passed && (
        <SectionCard>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-academic shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-ink">Application Status: Pending Admin Review</p>
              <p className="text-muted leading-relaxed text-xs">
                Passing the assessment confirms your academic readiness but does{' '}
                <strong>not automatically grant you the tutor role</strong>. The Studora admin team
                will review your complete application (profile, subjects, experience, assessment score)
                and make the final approval decision within 1–3 business days.
              </p>
              <p className="text-xs text-muted">You will receive a notification once your application is reviewed.</p>
            </div>
          </div>
        </SectionCard>
      )}

      {!passed && (
        <SectionCard>
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-ink">Improvement Tips</p>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside leading-relaxed">
                <li>Review core concepts in your selected subjects thoroughly.</li>
                <li>Focus on algorithm complexity, data structures, and mathematical foundations.</li>
                <li>Use Studora's Study Planner to structure your revision.</li>
              </ul>
              {canRetry ? (
                <p className="text-xs text-muted">
                  You have <strong>{MAX_RETRIES - retryCount}</strong> attempt(s) remaining.
                </p>
              ) : (
                <p className="text-xs text-danger font-semibold">
                  You have used all {MAX_RETRIES} assessment attempts. Please contact Studora support.
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {!passed && canRetry && (
          <Button variant="academic" icon={RefreshCw} onClick={onRetry} className="w-full sm:w-auto">
            Retry Assessment
          </Button>
        )}
        <Button variant="outline" onClick={onNavigateDashboard} className="w-full sm:w-auto">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function BecomeTutorPage({ userProfile, onNavigateDashboard, showToast }) {
  const { fetchMyApplication, fetchSubjects } = useTutorApplication();

  // page-level state machine
  // 'loading' | 'new' | 'status' | 'onboarding' | 'assessment' | 'result'
  const [phase, setPhase] = useState('loading');
  const [application, setApplication] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pageError, setPageError] = useState(null);

  // Load existing application + subjects on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [app, subjs] = await Promise.all([fetchMyApplication(), fetchSubjects()]);
        if (!mounted) return;
        setSubjects(subjs || []);
        if (app) {
          setApplication(app);
          // If assessment was already in progress or a result exists, show status
          const showStatus = ['pending_review', 'approved', 'rejected', 'suspended'].includes(app.status);
          if (showStatus) {
            setPhase('status');
          } else if (app.status === 'assessment_failed') {
            setPhase('status');
          } else if (['submitted', 'assessment_pending'].includes(app.status)) {
            setPhase('status');
          } else {
            // draft or assessment_in_progress — resume from status
            setPhase('status');
          }
        } else {
          setPhase('new');
        }
      } catch (err) {
        if (mounted) { setPageError(err.message); setPhase('new'); }
      }
    }
    load();
    return () => { mounted = false; };
  }, [fetchMyApplication, fetchSubjects]);

  const handleOnboardingComplete = (appId) => {
    setApplication((prev) => ({ ...prev, id: appId, status: 'submitted' }));
    setPhase('assessment');
  };

  const handleAssessmentComplete = (result) => {
    setAssessmentResult(result);
    setRetryCount((c) => c + 1);
    setPhase('result');
  };

  const handleStartAssessment = () => setPhase('assessment');

  const handleRetryAssessment = () => {
    setAssessmentResult(null);
    setPhase('assessment');
  };

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto">
        <SectionCard className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 text-academic animate-spin" />
          <p className="text-sm text-muted">Loading your tutor application...</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
            <Star className="w-5 h-5 text-academic" />
            Become a Tutor
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Join the Studora tutor marketplace and earn while helping peers succeed.
          </p>
        </div>
        {application && (
          <Badge variant={STATUS_CONFIG[application.status]?.variant || 'default'}>
            {STATUS_CONFIG[application.status]?.label || application.status}
          </Badge>
        )}
      </div>

      {pageError && <ErrorAlert message={pageError} onDismiss={() => setPageError(null)} />}

      {/* New application entry point */}
      {phase === 'new' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <SectionCard>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-academic-100 flex items-center justify-center text-academic border border-academic-200">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Apply to Become a Studora Tutor</h2>
                  <p className="text-xs text-muted">Guide fellow students, build your profile, and earn on the platform.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-center">
                <div className="p-3 rounded-btn bg-canvas border border-border space-y-1">
                  <BookOpen className="w-5 h-5 text-academic mx-auto" />
                  <p className="font-semibold text-ink">1. Onboarding</p>
                  <p className="text-muted">Fill out your academic profile and select your subjects.</p>
                </div>
                <div className="p-3 rounded-btn bg-canvas border border-border space-y-1">
                  <ClipboardList className="w-5 h-5 text-academic mx-auto" />
                  <p className="font-semibold text-ink">2. Assessment</p>
                  <p className="text-muted">Pass a short 10-question accreditation quiz.</p>
                </div>
                <div className="p-3 rounded-btn bg-canvas border border-border space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-academic mx-auto" />
                  <p className="font-semibold text-ink">3. Admin Review</p>
                  <p className="text-muted">Studora admins review and approve your application.</p>
                </div>
              </div>

              <Button variant="academic" size="lg" icon={ChevronRight} iconPosition="right"
                className="w-full"
                onClick={() => setPhase('onboarding')}>
                Start Application
              </Button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Status view */}
      {phase === 'status' && application && (
        <ApplicationStatusView
          application={application}
          onStartAssessment={handleStartAssessment}
          onRetryAssessment={handleRetryAssessment}
          onNavigateDashboard={onNavigateDashboard}
          showToast={showToast}
        />
      )}

      {/* Onboarding wizard */}
      {phase === 'onboarding' && (
        <OnboardingWizard
          subjects={subjects}
          onComplete={handleOnboardingComplete}
          onCancel={() => setPhase('new')}
          showToast={showToast}
        />
      )}

      {/* Assessment */}
      {phase === 'assessment' && application?.id && (
        <AssessmentView
          applicationId={application.id}
          showToast={showToast}
          onComplete={handleAssessmentComplete}
        />
      )}

      {/* Result */}
      {phase === 'result' && assessmentResult && (
        <ResultView
          result={assessmentResult}
          onRetry={handleRetryAssessment}
          onNavigateDashboard={onNavigateDashboard}
          retryCount={retryCount}
        />
      )}
    </div>
  );
}
