import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { CgpaPage } from '../cgpa/CgpaPage';

/**
 * MyCoursesPage — Matching Section 2_0 of the official visual specification.
 *
 * Header:
 * - "My Courses"
 * - "Continue your learning journey"
 * - Right action button: "View Progress >"
 *
 * Navigation Tabs:
 * - All Courses (pill)
 * - In Progress
 * - Completed
 *
 * Course Cards:
 * - Architectural / topic thumbnail banner
 * - Course Title ("Advanced Mathematics", "Computer Science", "Physics Fundamentals")
 * - Progress bar with progress percentage
 * - Circular arrow forward button
 */
export function MyCoursesPage({
  semesters = [],
  studyPlans = [],
  selectedScale,
  availableScales,
  onRefreshData,
  onNavigateTab,
  showToast
}) {
  const [activeCourseTab, setActiveCourseTab] = useState('all'); // 'all' | 'in_progress' | 'completed'
  const [showAcademicGrades, setShowAcademicGrades] = useState(false);

  // Compute actual courses from registered study plans or semester records
  const coursesList = useMemo(() => {
    const list = [];

    // From study plans
    if (studyPlans && studyPlans.length > 0) {
      studyPlans.forEach((plan) => {
        const total = plan.topics?.length || 1;
        const completed = plan.topics?.filter(t => t.is_completed).length || 0;
        const progress = Math.round((completed / total) * 100);
        list.push({
          id: plan.id,
          title: plan.subject,
          description: plan.goal || 'Curriculum objectives & assignments',
          progress,
          isCompleted: progress >= 100,
          image: '/campus-background.png',
          topicsCount: total,
          completedCount: completed
        });
      });
    }

    // From semester courses if any
    semesters.forEach(sem => {
      (sem.courses || []).forEach((c, idx) => {
        if (!list.some(item => item.title === (c.courseTitle || c.courseCode))) {
          list.push({
            id: c.id || `sem-course-${idx}`,
            title: c.courseTitle || c.courseCode,
            description: `${c.creditUnits || 3} Credit Units • Semester Course`,
            progress: c.grade ? 100 : 60,
            isCompleted: !!c.grade,
            image: '/campus-background.png',
            topicsCount: 10,
            completedCount: c.grade ? 10 : 6
          });
        }
      });
    });

    return list;
  }, [studyPlans, semesters]);

  const filteredCourses = useMemo(() => {
    if (activeCourseTab === 'in_progress') {
      return coursesList.filter(c => !c.isCompleted);
    }
    if (activeCourseTab === 'completed') {
      return coursesList.filter(c => c.isCompleted);
    }
    return coursesList;
  }, [coursesList, activeCourseTab]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── 1. HEADER (Matches Section 2_0) ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
            My Courses
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
            Continue your learning journey
          </p>
        </div>

        {/* Right CTA Button: "View Progress >" */}
        <button
          type="button"
          onClick={() => setShowAcademicGrades(!showAcademicGrades)}
          className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] flex items-center gap-1.5 shadow-sm transition-all shrink-0 self-start sm:self-auto"
        >
          <span>{showAcademicGrades ? 'View Course Cards' : 'View Progress'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* When user clicks "View Progress", toggle the full CGPA & Grade performance engine */}
      {showAcademicGrades ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#DDEFE5]/70 dark:bg-[#176B4D]/30 border border-[#176B4D]/20 text-xs text-[#176B4D] dark:text-[#A7F3D0]">
            <span className="font-semibold">Showing Cumulative Grade Point Performance & Semester Breakdown</span>
            <button
              type="button"
              onClick={() => setShowAcademicGrades(false)}
              className="font-bold underline hover:no-underline"
            >
              Back to Courses
            </button>
          </div>
          <CgpaPage
            semesters={semesters}
            selectedScale={selectedScale}
            availableScales={availableScales}
            onRefreshData={onRefreshData}
            showToast={showToast}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── 2. FILTER TABS (Matches Section 2_0) ────────────────────── */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveCourseTab('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCourseTab === 'all'
                  ? 'bg-[#DDEFE5] text-[#176B4D] dark:bg-[#176B4D]/40 dark:text-[#A7F3D0] shadow-sm'
                  : 'text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              All Courses
            </button>
            <button
              type="button"
              onClick={() => setActiveCourseTab('in_progress')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCourseTab === 'in_progress'
                  ? 'bg-[#DDEFE5] text-[#176B4D] dark:bg-[#176B4D]/40 dark:text-[#A7F3D0] shadow-sm font-bold'
                  : 'text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveCourseTab('completed')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCourseTab === 'completed'
                  ? 'bg-[#DDEFE5] text-[#176B4D] dark:bg-[#176B4D]/40 dark:text-[#A7F3D0] shadow-sm font-bold'
                  : 'text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Completed
            </button>
          </div>

          {/* ── 3. COURSE CARDS GRID (Matches Section 2_0) ──────────────── */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="glass-panel rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* Architectural / topic banner image */}
                  <div className="h-36 w-full overflow-hidden relative bg-gray-100 dark:bg-navy-800">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute bottom-2.5 left-3 text-sm font-bold text-white drop-shadow-sm truncate max-w-[85%]">
                      {course.title}
                    </span>
                  </div>

                  {/* Course Details & Progress Bar */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667085] dark:text-white/60 font-medium">
                        Progress: {course.progress}%
                      </span>
                      <span className="text-[11px] font-mono text-[#667085] dark:text-white/50">
                        {course.completedCount}/{course.topicsCount} topics
                      </span>
                    </div>

                    {/* Emerald Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-navy-700 overflow-hidden">
                      <div
                        className="h-full bg-[#176B4D] rounded-full transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-[#667085] dark:text-white/50 truncate max-w-[180px]">
                        {course.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigateTab ? onNavigateTab('study') : null}
                        className="w-8 h-8 rounded-full bg-[#176B4D] text-white flex items-center justify-center hover:bg-[#12543C] transition-colors shadow-sm"
                        title="Continue Learning"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827] dark:text-white">No courses registered</h3>
              <p className="text-xs text-[#667085] dark:text-white/60 max-w-sm mx-auto">
                You have not registered any courses for this semester yet. Add your courses under CGPA records or create study plans to see them here.
              </p>
              <button
                type="button"
                onClick={() => setShowAcademicGrades(true)}
                className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C]"
              >
                Register Course
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
