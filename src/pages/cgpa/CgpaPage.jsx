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
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Badge 
} from '../../components/ui';
import { 
  calculateCumulativeMetrics, 
  calculateRequiredGpaForTarget, 
  generateAcademicRecordCSV, 
  DEFAULT_GRADING_SCALES 
} from '../../services/academic/cgpaEngine';
import { api } from '../../services/api/client';

export function CgpaPage({
  semesters = [],
  selectedScale = '5.0',
  availableScales = [],
  onRefreshData,
  showToast
}) {
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
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Banner: Academic Summary */}
      <div className="neu-card p-6 border-ghost-200/15 relative overflow-hidden bg-gradient-to-br from-[#0A0D10] to-[#060708]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="ghost" size="sm">
                ACTIVE GRADING: {activeScale.name}
              </Badge>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(true)}
                className="text-xs text-zinc-400 hover:text-ghost-200 flex items-center gap-1 font-mono transition-colors"
              >
                <Sliders className="w-3 h-3" />
                Change Scale
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-baseline gap-3">
              <span className="font-mono text-ghost-200">{cumulative.cgpa.toFixed(2)}</span>
              <span className="text-sm font-normal text-zinc-400">/ {activeScale.maxScale.toFixed(2)} CGPA</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-ghost-200 bg-ghost-200/10 px-2.5 py-0.5 rounded-full border border-ghost-200/25">
                {cumulative.classificationName}
              </span>
              <span className="text-xs text-zinc-500">• {cumulative.classificationDesc}</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 bg-[#07090C] p-3 rounded-2xl border border-white/[0.04] neu-inset w-full lg:w-auto">
            <div className="text-center px-3">
              <p className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">Total Units</p>
              <p className="text-lg sm:text-xl font-bold text-zinc-100 font-mono mt-0.5">{cumulative.totalCreditUnits}</p>
            </div>
            <div className="text-center px-3 border-x border-white/[0.06]">
              <p className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">Quality Points</p>
              <p className="text-lg sm:text-xl font-bold text-ghost-200 font-mono mt-0.5">{cumulative.totalQualityPoints.toFixed(1)}</p>
            </div>
            <div className="text-center px-3">
              <p className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">Courses</p>
              <p className="text-lg sm:text-xl font-bold text-zinc-100 font-mono mt-0.5">{cumulative.totalCourses}</p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 pt-4 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="primary" 
              size="sm" 
              icon={Plus} 
              onClick={() => setIsAddSemesterOpen(true)}
            >
              Add Semester
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Target} 
              onClick={() => {
                setTargetCgpa(String(activeScale.maxScale >= 5.0 ? '4.50' : '3.80'));
                setIsProjectionModalOpen(true);
              }}
            >
              What-If Projection
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            icon={Download} 
            onClick={handleExportCSV}
          >
            Export Academic Record (CSV)
          </Button>
        </div>
      </div>

      {/* CGPA Trend Visualizer */}
      {cumulative.trend.length > 0 && (
        <Card variant="flat" className="p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ghost-200" />
              Academic Progression & GPA Trajectory
            </CardTitle>
            <CardDescription>
              Progression curve per semester showing individual semester performance versus cumulative CGPA.
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {cumulative.trend.map((t) => (
              <div 
                key={t.index} 
                className="bg-[#08090C] border border-white/[0.04] p-3 rounded-xl neu-inset flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{t.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-zinc-200 font-mono">{t.semesterGpa.toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">GPA</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-mono">{t.creditUnits} Units</span>
                  <span className="text-ghost-200 font-mono font-semibold">{t.cumulativeCgpa.toFixed(2)} CGPA</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Multi-Semester List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ghost-200" />
            Semester Course Records
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            {cumulative.semesterBreakdown.length} Semesters Recorded
          </span>
        </div>

        {cumulative.semesterBreakdown.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/[0.08] rounded-2xl bg-[#07080A]">
            <GraduationCap className="w-10 h-10 text-ghost-200/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-200">No semesters recorded yet.</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
              Add your first academic semester to start computing your GPA and tracking degree progression.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsAddSemesterOpen(true)}>
              Add First Semester
            </Button>
          </div>
        ) : (
          cumulative.semesterBreakdown.map((sem) => (
            <Card key={sem.id} variant="neu" className="overflow-visible">
              {/* Semester Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/[0.05] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ghost-200/10 border border-ghost-200/20 flex items-center justify-center text-ghost-200 font-mono font-bold text-xs">
                    {sem.academicYear.replace(/\D/g, '') || '1'}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-zinc-100">
                      {sem.academicYear} — {sem.semesterName}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono">
                      {sem.courses.length} Courses • {sem.totalCreditUnits} Credit Units • {sem.totalQualityPoints.toFixed(1)} Points
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="px-3 py-1 bg-[#08090C] rounded-lg border border-white/[0.05] font-mono text-xs">
                    <span className="text-zinc-500">GPA: </span>
                    <span className="font-bold text-ghost-200 text-sm">{sem.gpa.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDuplicateSemester(sem.id)}
                      title="Duplicate this semester"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteSemester(sem.id, `${sem.academicYear} ${sem.semesterName}`)}
                      title="Delete semester"
                    >
                      <Trash2 className="w-4 h-4 text-red-400/80 hover:text-red-400" />
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

              {/* Courses Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[11px] text-zinc-500 uppercase font-mono">
                      <th className="pb-2 font-medium">Course Code</th>
                      <th className="pb-2 font-medium">Course Title</th>
                      <th className="pb-2 font-medium text-center">Units</th>
                      <th className="pb-2 font-medium text-center">Grade</th>
                      <th className="pb-2 font-medium text-center">Grade Point</th>
                      <th className="pb-2 font-medium text-right">Points</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {sem.courses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-xs text-zinc-500">
                          No courses in this semester yet. Click "Add Course" above.
                        </td>
                      </tr>
                    ) : (
                      sem.courses.map((c, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="py-2.5 font-mono font-semibold text-ghost-200">
                            {c.courseCode}
                          </td>
                          <td className="py-2.5 text-zinc-300 max-w-xs truncate">
                            {c.courseTitle || 'Untitled Course'}
                          </td>
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {c.creditUnits}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-6 py-0.5 rounded text-xs font-mono font-bold ${
                              c.letterGrade === 'A' ? 'bg-ghost-200/20 text-ghost-200' :
                              c.letterGrade === 'B' ? 'bg-blue-950/40 text-blue-300' :
                              c.letterGrade === 'C' ? 'bg-amber-950/40 text-amber-300' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {c.letterGrade}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-mono text-zinc-400">
                            {c.gradePoint.toFixed(1)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-zinc-200">
                            {c.qualityPoints.toFixed(1)}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openCourseModal(sem.id, semesters.find(s => s.id === sem.id)?.courses[idx])}
                                className="p-1 text-zinc-500 hover:text-ghost-200 transition-colors"
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
                                className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
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
            </Card>
          ))
        )}
      </div>

      {/* --- MODAL 1: ADD SEMESTER --- */}
      <Modal
        isOpen={isAddSemesterOpen}
        onClose={() => setIsAddSemesterOpen(false)}
        title="Add Academic Semester"
        description="Create a new academic term to record coursework and credit units."
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
            <Button variant="ghost" onClick={() => setIsAddSemesterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
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
        description="Enter course code, title, credit units, and letter grade."
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
            <Button variant="ghost" onClick={() => setIsAddCourseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
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
        description="Configure your academic calculation rules. Changes recompute all semesters automatically."
      >
        <div className="space-y-3">
          {Object.values(DEFAULT_GRADING_SCALES).map((scale) => {
            const isCurrent = scale.id === selectedScale;
            return (
              <div
                key={scale.id}
                onClick={() => handleScaleSelect(scale.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex items-start justify-between
                  ${isCurrent 
                    ? 'bg-ghost-200/10 border-ghost-200/40 shadow-ghost-glow' 
                    : 'bg-[#090B0D] border-white/[0.04] hover:border-ghost-200/20'}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-100">{scale.name}</span>
                    {isCurrent && <Badge variant="ghost" size="sm">Active</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {scale.grades.map(g => (
                      <span key={g.letter} className="text-[11px] font-mono text-zinc-400 bg-white/[0.03] px-1.5 py-0.5 rounded">
                        {g.letter}={g.points}
                      </span>
                    ))}
                  </div>
                </div>
                {isCurrent && <CheckCircle2 className="w-5 h-5 text-ghost-200 shrink-0" />}
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
        description="Determine the exact GPA required across your remaining credit units to achieve your target graduation honors."
      >
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
              label="Anticipated Remaining Units"
              type="number"
              min="1"
              max="150"
              value={remainingUnits}
              onChange={(e) => setRemainingUnits(e.target.value)}
            />
          </div>

          <Button variant="primary" size="md" className="w-full" onClick={handleRunProjection}>
            Calculate Required GPA
          </Button>

          {projectionResult && (
            <div className={`p-4 rounded-xl border mt-3 ${
              projectionResult.achievable 
                ? 'bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-red-950/20 border-red-500/30'
            }`}>
              <div className="flex items-start gap-2">
                {projectionResult.achievable ? (
                  <CheckCircle2 className="w-5 h-5 text-ghost-200 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {projectionResult.achievable 
                      ? `Required GPA: ${projectionResult.requiredGpa.toFixed(2)}` 
                      : 'Target Impossible'}
                  </p>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {projectionResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
