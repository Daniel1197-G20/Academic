import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Target, 
  Sliders, 
  BookOpen, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Badge,
  PageHeader,
  AnimatedNumber 
} from '../../components/ui';
import { 
  calculateCumulativeMetrics, 
  calculateRequiredGpaForTarget, 
  generateAcademicRecordCSV, 
  DEFAULT_GRADING_SCALES 
} from '../../services/academic/cgpaEngine';
import { api } from '../../services/api/client';
import { useBilling } from '../../context/BillingContext';
import { UpgradePrompt } from '../../components/billing/UpgradePrompt';

export function CgpaPage({
  semesters = [],
  selectedScale = '5.0',
  availableScales = [],
  onRefreshData,
  showToast
}) {
  const { canAccess } = useBilling();
  const hasAdvancedCgpa = canAccess('CGPA_ADVANCED');

  // Modal states
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  // Form states
  const [newYear, setNewYear] = useState('Year 3');
  const [newSemesterName, setNewSemesterName] = useState('Second Semester');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCreditUnits, setNewCreditUnits] = useState('3');
  const [newGrade, setNewGrade] = useState('A');
  const [editingCourseId, setEditingCourseId] = useState(null);

  // Projection states
  const [targetCgpa, setTargetCgpa] = useState('4.50');
  const [remainingUnits, setRemainingUnits] = useState('30');
  const [projectionResult, setProjectionResult] = useState(null);

  // Active scale object
  const activeScale = useMemo(() => {
    return DEFAULT_GRADING_SCALES[selectedScale] || DEFAULT_GRADING_SCALES['5.0'];
  }, [selectedScale]);

  // Compute metrics
  const cumulative = useMemo(() => {
    return calculateCumulativeMetrics(semesters, activeScale);
  }, [semesters, activeScale]);

  // Handle Scale Change
  const handleScaleSelect = async (scaleKey) => {
    try {
      await api.updateSelectedScale(scaleKey);
      showToast({ type: 'success', title: 'Grading Scale Updated', message: `Applied ${scaleKey} scale calculation rules.` });
      setIsScaleModalOpen(false);
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Add Semester
  const handleAddSemester = async (e) => {
    e.preventDefault();
    try {
      await api.createSemester(newYear, newSemesterName);
      showToast({ type: 'success', title: 'Semester Created', message: `${newYear} - ${newSemesterName} added.` });
      setIsAddSemesterOpen(false);
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to add semester', message: err.message });
    }
  };

  // Delete Semester
  const handleDeleteSemester = async (semId, label) => {
    if (!window.confirm(`Delete ${label} and all its recorded courses? This action cannot be undone.`)) return;
    try {
      await api.deleteSemester(semId);
      showToast({ type: 'info', title: 'Semester Deleted', message: `${label} removed.` });
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  // Duplicate Semester
  const handleDuplicateSemester = async (semId) => {
    try {
      await api.duplicateSemester(semId);
      showToast({ type: 'success', title: 'Semester Duplicated', message: 'Created duplicate copy with all courses.' });
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Duplicate Failed', message: err.message });
    }
  };

  // Open Add/Edit Course Modal
  const openCourseModal = (semesterId, existingCourse = null) => {
    setActiveSemesterId(semesterId);
    if (existingCourse) {
      setEditingCourseId(existingCourse.id);
      setNewCourseCode(existingCourse.course_code || existingCourse.code || '');
      setNewCourseTitle(existingCourse.course_title || existingCourse.title || '');
      setNewCreditUnits(String(existingCourse.credit_units || existingCourse.units || 3));
      setNewGrade(existingCourse.letter_grade || existingCourse.grade || 'A');
    } else {
      setEditingCourseId(null);
      setNewCourseCode('');
      setNewCourseTitle('');
      setNewCreditUnits('3');
      setNewGrade('A');
    }
    setIsAddCourseOpen(true);
  };

  // Save Course
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!newCourseCode || !newCreditUnits) return;

    try {
      if (editingCourseId) {
        await api.updateCourse(editingCourseId, {
          courseCode: newCourseCode,
          courseTitle: newCourseTitle,
          creditUnits: Number(newCreditUnits),
          letterGrade: newGrade
        });
        showToast({ type: 'success', title: 'Course Updated', message: `${newCourseCode.toUpperCase()} saved.` });
      } else {
        await api.addCourse({
          semesterId: activeSemesterId,
          courseCode: newCourseCode,
          courseTitle: newCourseTitle,
          creditUnits: Number(newCreditUnits),
          letterGrade: newGrade
        });
        showToast({ type: 'success', title: 'Course Added', message: `${newCourseCode.toUpperCase()} added to semester.` });
      }
      setIsAddCourseOpen(false);
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId, code) => {
    try {
      await api.deleteCourse(courseId);
      showToast({ type: 'info', title: 'Course Removed', message: `${code} deleted.` });
      onRefreshData();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to delete course', message: err.message });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = generateAcademicRecordCSV(semesters, activeScale);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Academic_Transcript_${selectedScale}Scale_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Generated', message: 'Downloaded transcript CSV.' });
  };

  // Calculate Projection
  const handleRunProjection = () => {
    const res = calculateRequiredGpaForTarget(
      cumulative.totalCreditUnits,
      cumulative.totalQualityPoints,
      Number(remainingUnits) || 20,
      Number(targetCgpa) || 4.5,
      activeScale.maxScale
    );
    setProjectionResult(res);
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* 1. Header */}
      <PageHeader
        title="CGPA Calculator"
        description="Track your academic performance across semesters with precise grade point calculation."
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsScaleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-ink hover:bg-gray-50 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-muted" />
              Scale: {activeScale.scaleName}
            </button>
            <Button
              variant="secondary"
              size="sm"
              icon={Target}
              onClick={() => {
                setTargetCgpa(String(activeScale.maxScale >= 5.0 ? '4.50' : '3.80'));
                setIsProjectionModalOpen(true);
              }}
            >
              <span>What-If Projection</span>
              {!hasAdvancedCgpa && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-academic-100 text-academic border border-academic-200">
                  PRO
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="academic"
              size="sm"
              icon={Plus}
              onClick={() => setIsAddSemesterOpen(true)}
            >
              Add Semester
            </Button>
          </>
        }
      />

      {/* 2. Primary CGPA Hero Banner — Signature Precision Instrument */}
      <div className="bg-white border border-border rounded-hero p-6 sm:p-7 shadow-tactile-hero">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold text-muted tracking-wider uppercase">
              Current Cumulative CGPA
            </span>
            <div className="flex items-baseline gap-3">
              <AnimatedNumber
                value={cumulative.cgpa}
                decimals={2}
                duration={850}
                className="text-5xl sm:text-6xl font-extrabold text-ink font-mono tracking-tight"
              />
              <span className="text-xl sm:text-2xl font-medium text-muted font-mono">
                / {activeScale.maxScale.toFixed(2)}
              </span>
              <Badge variant="academic" className="ml-2">
                {cumulative.classificationName}
              </Badge>
            </div>
            <p className="text-xs text-muted">
              {cumulative.classificationDesc} • Calculated using official <strong className="text-ink font-mono">{activeScale.scaleName}</strong> parameters.
            </p>
          </div>

          {/* Quick Metrics Columns */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 bg-canvas p-4 rounded-card border border-border shadow-tactile-inset-sm">
            <div>
              <p className="text-[11px] text-muted font-medium uppercase tracking-tight">Total Units</p>
              <p className="text-xl sm:text-2xl font-bold text-ink mt-0.5 font-mono">{cumulative.totalCreditUnits}</p>
            </div>
            <div className="border-x border-border px-4 sm:px-6">
              <p className="text-[11px] text-muted font-medium uppercase tracking-tight">Quality Points</p>
              <p className="text-xl sm:text-2xl font-bold text-academic mt-0.5 font-mono">{cumulative.totalQualityPoints.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted font-medium uppercase tracking-tight">Courses</p>
              <p className="text-xl sm:text-2xl font-bold text-ink mt-0.5 font-mono">{cumulative.totalCourses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Semester Progression Timeline */}
      {cumulative.trend.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-ink flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-academic" />
              Semester Progression Timeline
            </h2>
            <span className="text-xs text-muted font-mono">
              {cumulative.trend.length} terms evaluated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cumulative.trend.map((t) => (
              <div 
                key={t.index} 
                className="bg-white border border-border p-3.5 rounded-card shadow-tactile-raised flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-tight">{t.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold text-ink font-mono">{t.semesterGpa.toFixed(2)}</span>
                    <span className="text-[11px] text-muted font-medium">Term GPA</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs font-mono">
                  <span className="text-muted">{t.creditUnits} Units</span>
                  <span className="text-academic font-bold">{t.cumulativeCgpa.toFixed(2)} CGPA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Semester Course Records Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-ink flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-academic" />
            Course Records by Semester
          </h2>
          <span className="text-xs text-muted font-medium font-mono">
            {cumulative.semesterBreakdown.length} Semesters Recorded
          </span>
        </div>

        {cumulative.semesterBreakdown.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-card bg-white shadow-tactile-surface">
            <GraduationCap className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-ink">No semesters recorded yet</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto mb-4">
              Add your first academic term to calculate your GPA and track degree progress.
            </p>
            <Button variant="academic" size="sm" onClick={() => setIsAddSemesterOpen(true)}>
              Add First Semester
            </Button>
          </div>
        ) : (
          cumulative.semesterBreakdown.map((sem) => (
            <div key={sem.id} className="bg-white border border-border rounded-card shadow-tactile-raised overflow-hidden">
              {/* Semester Header Bar */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border gap-3 bg-canvas/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-btn bg-academic-100 text-academic font-bold text-xs flex items-center justify-center border border-academic-200 shadow-tactile-surface">
                    {sem.academicYear.replace(/\D/g, '') || '1'}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-ink">
                      {sem.academicYear} — {sem.semesterName}
                    </h3>
                    <p className="text-xs text-muted">
                      {sem.courses.length} Courses • {sem.totalCreditUnits} Credit Units • {sem.totalQualityPoints.toFixed(1)} Quality Points
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="px-3 py-1 bg-white rounded-lg border border-border text-xs flex items-center gap-1.5 shadow-subtle">
                    <span className="text-muted font-medium">Semester GPA:</span>
                    <span className="font-bold text-academic text-sm">{sem.gpa.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDuplicateSemester(sem.id)}
                      title="Duplicate semester"
                    >
                      <Copy className="w-4 h-4 text-muted" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteSemester(sem.id, `${sem.academicYear} ${sem.semesterName}`)}
                      title="Delete semester"
                    >
                      <Trash2 className="w-4 h-4 text-danger/80 hover:text-danger" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      icon={Plus}
                      onClick={() => openCourseModal(sem.id)}
                    >
                      Add Course
                    </Button>
                  </div>
                </div>
              </div>

              {/* Course Table (Responsive) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50 text-[11px] text-muted uppercase tracking-tight">
                      <th className="py-2.5 px-4 font-semibold">Course</th>
                      <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Title</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Unit</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Grade</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Point</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Quality Points</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sem.courses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-muted">
                          No courses recorded in this semester yet. Click "Add Course" above.
                        </td>
                      </tr>
                    ) : (
                      sem.courses.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-ink">
                            {c.courseCode}
                            {/* Mobile title fallback */}
                            <span className="block sm:hidden text-xs text-muted font-normal mt-0.5 truncate max-w-[160px]">
                              {c.courseTitle}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted hidden sm:table-cell max-w-xs truncate">
                            {c.courseTitle || 'Untitled Course'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-ink">
                            {c.creditUnits}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block min-w-6 py-0.5 px-2 rounded-md text-xs font-mono font-bold shadow-tactile-surface ${
                              c.letterGrade === 'A' ? 'bg-academic-100 text-academic border border-academic-200' :
                              c.letterGrade === 'B' ? 'bg-navy-50 text-navy border border-navy-200' :
                              c.letterGrade === 'C' ? 'bg-warning-50 text-warning border border-warning-100' :
                              'bg-canvas text-ink border border-border'
                            }`}>
                              {c.letterGrade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-muted font-mono">
                            {c.gradePoint.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-ink font-mono">
                            {c.qualityPoints.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openCourseModal(sem.id, semesters.find(s => s.id === sem.id)?.courses[idx])}
                                className="p-1 text-muted hover:text-ink transition-colors"
                                title="Edit course"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const originalCourse = semesters.find(s => s.id === sem.id)?.courses[idx];
                                  if (originalCourse) handleDeleteCourse(originalCourse.id, c.courseCode);
                                }}
                                className="p-1 text-muted hover:text-danger transition-colors"
                                title="Delete course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL 1: ADD SEMESTER --- */}
      <Modal
        isOpen={isAddSemesterOpen}
        onClose={() => setIsAddSemesterOpen(false)}
        title="Add Academic Semester"
        description="Create an academic term to record coursework and compute your GPA."
      >
        <form onSubmit={handleAddSemester} className="space-y-4">
          <Input
            label="Academic Year"
            placeholder="e.g. Year 3, 2025/2026"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            required
          />
          <Input
            label="Semester Name"
            placeholder="e.g. First Semester, Fall Term"
            value={newSemesterName}
            onChange={(e) => setNewSemesterName(e.target.value)}
            required
          />
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddSemesterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="academic">
              Create Semester
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: ADD/EDIT COURSE --- */}
      <Modal
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        title={editingCourseId ? 'Edit Course Record' : 'Add Course Entry'}
        description="Specify course code, optional title, credit units, and letter grade."
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <Input
            label="Course Code"
            placeholder="e.g. CSC301"
            value={newCourseCode}
            onChange={(e) => setNewCourseCode(e.target.value)}
            required
          />
          <Input
            label="Course Title (Optional)"
            placeholder="e.g. Design & Analysis of Algorithms"
            value={newCourseTitle}
            onChange={(e) => setNewCourseTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Credit Units"
              type="number"
              min="1"
              max="20"
              value={newCreditUnits}
              onChange={(e) => setNewCreditUnits(e.target.value)}
              required
            />
            <Select
              label="Letter Grade"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              options={activeScale.grades.map(g => ({
                value: g.letter,
                label: `${g.letter} (${g.points.toFixed(1)} pts)`
              }))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddCourseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="academic">
              {editingCourseId ? 'Update Course' : 'Save Course'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: SELECT GRADING SCALE --- */}
      <Modal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        title="Select Institution Grading Scale"
        description="Choose your institution's grading standard. Calculations update automatically."
      >
        <div className="space-y-3">
          {Object.values(DEFAULT_GRADING_SCALES).map((scale) => {
            const isCurrent = scale.id === selectedScale;
            return (
              <div
                key={scale.id}
                onClick={() => handleScaleSelect(scale.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start justify-between
                  ${isCurrent 
                    ? 'bg-academic-50 border-academic-300' 
                    : 'bg-white border-border hover:border-gray-300'}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink">{scale.name}</span>
                    {isCurrent && <Badge variant="academic" size="sm">Active</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {scale.grades.map(g => (
                      <span key={g.letter} className="text-[11px] font-mono text-muted bg-gray-100 px-1.5 py-0.5 rounded">
                        {g.letter}={g.points}
                      </span>
                    ))}
                  </div>
                </div>
                {isCurrent && <CheckCircle2 className="w-5 h-5 text-academic shrink-0" />}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* --- MODAL 4: WHAT-IF PROJECTION --- */}
      <Modal
        isOpen={isProjectionModalOpen}
        onClose={() => setIsProjectionModalOpen(false)}
        title="What-If Graduation Target Projection"
        description="Determine the exact GPA required across remaining credit units to achieve target graduation honors."
      >
        {!hasAdvancedCgpa ? (
          <UpgradePrompt
            feature="CGPA_ADVANCED"
            featureTitle="What-If Graduation Target Projection"
            description="Project the exact term GPA required across all remaining credits to reach your graduation honors target."
            requiredPlan="Student"
            requiredPlanCode="student"
            onUpgrade={() => {
              setIsProjectionModalOpen(false);
              window.location.hash = '#/pricing';
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Target CGPA"
                type="number"
                step="0.01"
                min="1.0"
                max={activeScale.maxScale}
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
              />
              <Input
                label="Remaining Units"
                type="number"
                min="1"
                max="150"
                value={remainingUnits}
                onChange={(e) => setRemainingUnits(e.target.value)}
              />
            </div>

            <Button variant="academic" size="md" className="w-full" onClick={handleRunProjection}>
              Calculate Required GPA
            </Button>

            {projectionResult && (
              <div className={`p-4 rounded-xl border mt-3 ${
                projectionResult.achievable 
                  ? 'bg-academic-50 border-academic-200' 
                  : 'bg-danger-50 border-danger-100'
              }`}>
                <div className="flex items-start gap-2.5">
                  {projectionResult.achievable ? (
                    <CheckCircle2 className="w-5 h-5 text-academic shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {projectionResult.achievable 
                        ? `Required GPA: ${projectionResult.requiredGpa.toFixed(2)}` 
                        : 'Target Not Achievable'}
                    </p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {projectionResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
