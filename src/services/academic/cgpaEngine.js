/**
 * Independent CGPA Calculation Engine
 * Pure math functions supporting 5.0, 4.0, 7.0, and arbitrary custom grading scales.
 * Zero UI dependencies.
 */

// Default built-in grading scales
export const DEFAULT_GRADING_SCALES = {
  '5.0': {
    id: '5.0',
    name: '5.0 Scale (Commonwealth / West African Standard)',
    maxScale: 5.0,
    grades: [
      { letter: 'A', points: 5.0, minScore: 70, maxScore: 100 },
      { letter: 'B', points: 4.0, minScore: 60, maxScore: 69 },
      { letter: 'C', points: 3.0, minScore: 50, maxScore: 59 },
      { letter: 'D', points: 2.0, minScore: 45, maxScore: 49 },
      { letter: 'E', points: 1.0, minScore: 40, maxScore: 44 },
      { letter: 'F', points: 0.0, minScore: 0, maxScore: 39 }
    ],
    classifications: [
      { name: 'First Class Honours', minCgpa: 4.50, description: 'Highest Academic Distinction' },
      { name: 'Second Class Upper (2:1)', minCgpa: 3.50, description: 'Upper Second Class Standing' },
      { name: 'Second Class Lower (2:2)', minCgpa: 2.40, description: 'Lower Second Class Standing' },
      { name: 'Third Class', minCgpa: 1.50, description: 'Satisfactory Academic Completion' },
      { name: 'Pass', minCgpa: 1.00, description: 'Minimum Passing Classification' },
      { name: 'Fail', minCgpa: 0.00, description: 'Below Graduation Threshold' }
    ]
  },
  '4.0': {
    id: '4.0',
    name: '4.0 Scale (US / Global Standard)',
    maxScale: 4.0,
    grades: [
      { letter: 'A', points: 4.0, minScore: 90, maxScore: 100 },
      { letter: 'B', points: 3.0, minScore: 80, maxScore: 89 },
      { letter: 'C', points: 2.0, minScore: 70, maxScore: 79 },
      { letter: 'D', points: 1.0, minScore: 60, maxScore: 69 },
      { letter: 'F', points: 0.0, minScore: 0, maxScore: 59 }
    ],
    classifications: [
      { name: 'Summa Cum Laude', minCgpa: 3.80, description: 'Highest Honors' },
      { name: 'Magna Cum Laude', minCgpa: 3.50, description: 'High Honors' },
      { name: 'Cum Laude', minCgpa: 3.20, description: 'Honors' },
      { name: 'Good Standing', minCgpa: 2.00, description: 'Satisfactory Academic Progress' },
      { name: 'Academic Probation', minCgpa: 0.00, description: 'Below Minimum GPA Requirement' }
    ]
  },
  '7.0': {
    id: '7.0',
    name: '7.0 Scale (University of Ibadan / Canadian Standard)',
    maxScale: 7.0,
    grades: [
      { letter: 'A', points: 7.0, minScore: 75, maxScore: 100 },
      { letter: 'B', points: 6.0, minScore: 70, maxScore: 74 },
      { letter: 'C', points: 5.0, minScore: 60, maxScore: 69 },
      { letter: 'D', points: 4.0, minScore: 50, maxScore: 59 },
      { letter: 'E', points: 3.0, minScore: 45, maxScore: 49 },
      { letter: 'F', points: 0.0, minScore: 0, maxScore: 44 }
    ],
    classifications: [
      { name: 'First Class', minCgpa: 6.00, description: 'First Class Standing' },
      { name: 'Second Class Upper', minCgpa: 4.60, description: 'Upper Second Class Standing' },
      { name: 'Second Class Lower', minCgpa: 3.20, description: 'Lower Second Class Standing' },
      { name: 'Third Class', minCgpa: 2.00, description: 'Third Class Standing' },
      { name: 'Pass', minCgpa: 1.60, description: 'Pass' },
      { name: 'Fail', minCgpa: 0.00, description: 'Fail' }
    ]
  }
};

/**
 * Resolve grade points for a letter grade within an active scale
 */
export function getGradePoint(letterGrade, scale = DEFAULT_GRADING_SCALES['5.0']) {
  if (!letterGrade) return 0.0;
  const normalized = letterGrade.trim().toUpperCase();
  const rule = scale.grades.find(g => g.letter.toUpperCase() === normalized);
  return rule ? Number(rule.points) : 0.0;
}

/**
 * Calculate metrics for a single course
 */
export function calculateCoursePoints(course, scale = DEFAULT_GRADING_SCALES['5.0']) {
  const units = Math.max(0, Number(course.credit_units ?? course.units ?? 0));
  const grade = course.letter_grade ?? course.grade ?? 'F';
  const gradePoint = getGradePoint(grade, scale);
  const qualityPoints = Number((units * gradePoint).toFixed(2));

  return {
    courseCode: course.course_code ?? course.code ?? '',
    courseTitle: course.course_title ?? course.title ?? '',
    creditUnits: units,
    letterGrade: grade,
    gradePoint,
    qualityPoints
  };
}

/**
 * Calculate metrics for an individual semester
 */
export function calculateSemesterMetrics(semester, scale = DEFAULT_GRADING_SCALES['5.0']) {
  const courses = semester.courses || [];
  let totalUnits = 0;
  let totalQualityPoints = 0;
  const courseResults = [];

  for (const c of courses) {
    const courseRes = calculateCoursePoints(c, scale);
    totalUnits += courseRes.creditUnits;
    totalQualityPoints += courseRes.qualityPoints;
    courseResults.push(courseRes);
  }

  const gpa = totalUnits > 0 
    ? Number((totalQualityPoints / totalUnits).toFixed(2)) 
    : 0.00;

  return {
    id: semester.id,
    academicYear: semester.academic_year ?? semester.academicYear ?? 'Year 1',
    semesterName: semester.semester_name ?? semester.semester ?? 'First Semester',
    totalCreditUnits: totalUnits,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    gpa,
    courses: courseResults
  };
}

/**
 * Calculate cumulative academic metrics across all semesters
 */
export function calculateCumulativeMetrics(semesters = [], scale = DEFAULT_GRADING_SCALES['5.0']) {
  let cumulativeUnits = 0;
  let cumulativeQualityPoints = 0;
  let totalCourses = 0;
  const semesterBreakdown = [];
  const trend = [];

  for (let i = 0; i < semesters.length; i++) {
    const semMetrics = calculateSemesterMetrics(semesters[i], scale);
    cumulativeUnits += semMetrics.totalCreditUnits;
    cumulativeQualityPoints += semMetrics.totalQualityPoints;
    totalCourses += semMetrics.courses.length;

    const runningCgpa = cumulativeUnits > 0 
      ? Number((cumulativeQualityPoints / cumulativeUnits).toFixed(2)) 
      : 0.00;

    semesterBreakdown.push(semMetrics);
    trend.push({
      index: i + 1,
      year: semMetrics.academicYear,
      semester: semMetrics.semesterName,
      label: `${semMetrics.academicYear} ${semMetrics.semesterName.split(' ')[0]}`,
      semesterGpa: semMetrics.gpa,
      cumulativeCgpa: runningCgpa,
      creditUnits: semMetrics.totalCreditUnits,
      qualityPoints: semMetrics.totalQualityPoints
    });
  }

  const cgpa = cumulativeUnits > 0 
    ? Number((cumulativeQualityPoints / cumulativeUnits).toFixed(2)) 
    : 0.00;

  // Determine Academic Classification
  if (cumulativeUnits === 0) {
    return {
      totalCreditUnits: cumulativeUnits,
      totalQualityPoints: Number(cumulativeQualityPoints.toFixed(2)),
      cgpa,
      totalCourses,
      classificationName: 'Not Started',
      classificationDesc: 'No coursework recorded yet',
      semesterBreakdown,
      trend,
      scaleId: scale.id,
      maxScale: scale.maxScale
    };
  }

  let classification = { name: 'Pass', description: 'Passing' };
  if (scale.classifications && scale.classifications.length > 0) {
    // Sort descending by minCgpa
    const sorted = [...scale.classifications].sort((a, b) => b.minCgpa - a.minCgpa);
    for (const cls of sorted) {
      if (cgpa >= cls.minCgpa) {
        classification = cls;
        break;
      }
    }
  }

  return {
    totalCreditUnits: cumulativeUnits,
    totalQualityPoints: Number(cumulativeQualityPoints.toFixed(2)),
    cgpa,
    totalCourses,
    classificationName: classification.name,
    classificationDesc: classification.description || '',
    semesterBreakdown,
    trend,
    scaleId: scale.id,
    maxScale: scale.maxScale
  };
}

/**
 * Calculate required GPA for a target CGPA (What-If Projection)
 * @param {number} currentUnits - Cumulative units earned so far
 * @param {number} currentQualityPoints - Cumulative quality points earned so far
 * @param {number} remainingUnits - Anticipated remaining credit units until graduation
 * @param {number} targetCgpa - Desired target graduation CGPA
 * @param {number} maxScale - Maximum scale limit (e.g. 5.0, 4.0, 7.0)
 */
export function calculateRequiredGpaForTarget(currentUnits, currentQualityPoints, remainingUnits, targetCgpa, maxScale = 5.0) {
  if (remainingUnits <= 0) {
    return {
      achievable: false,
      requiredGpa: 0,
      message: 'No remaining credit units specified.'
    };
  }

  const targetTotalUnits = currentUnits + remainingUnits;
  const targetTotalQualityPoints = targetCgpa * targetTotalUnits;
  const requiredPoints = targetTotalQualityPoints - currentQualityPoints;
  const requiredGpa = Number((requiredPoints / remainingUnits).toFixed(2));

  if (requiredGpa > maxScale) {
    const maxPossiblePoints = currentQualityPoints + (remainingUnits * maxScale);
    const maxAttainableCgpa = Number((maxPossiblePoints / targetTotalUnits).toFixed(2));
    return {
      achievable: false,
      requiredGpa,
      maxAttainableCgpa,
      message: `Mathematically unattainable. Even with straight A's (${maxScale.toFixed(1)} GPA), the maximum attainable CGPA is ${maxAttainableCgpa}.`
    };
  }

  if (requiredGpa <= 0) {
    return {
      achievable: true,
      requiredGpa: 0.00,
      message: 'Goal already mathematically secured even with minimum passing marks.'
    };
  }

  return {
    achievable: true,
    requiredGpa,
    message: `You need to maintain an average of ${requiredGpa} GPA across your remaining ${remainingUnits} credit units.`
  };
}

/**
 * Generate formatted CSV string of the complete academic record
 */
export function generateAcademicRecordCSV(semesters = [], scale = DEFAULT_GRADING_SCALES['5.0']) {
  const header = ['Academic Year', 'Semester', 'Course Code', 'Course Title', 'Credit Units', 'Letter Grade', 'Grade Point', 'Quality Points'];
  const rows = [header.join(',')];

  const cumulative = calculateCumulativeMetrics(semesters, scale);

  for (const sem of cumulative.semesterBreakdown) {
    for (const c of sem.courses) {
      const row = [
        `"${sem.academicYear}"`,
        `"${sem.semesterName}"`,
        `"${c.courseCode}"`,
        `"${c.courseTitle.replace(/"/g, '""')}"`,
        c.creditUnits,
        `"${c.letterGrade}"`,
        c.gradePoint.toFixed(1),
        c.qualityPoints.toFixed(2)
      ];
      rows.push(row.join(','));
    }
    // Subtotal row per semester
    rows.push(`"SUBTOTAL","${sem.semesterName} Summary","","TOTAL UNITS: ${sem.totalCreditUnits}",${sem.totalCreditUnits},"GPA: ${sem.gpa.toFixed(2)}","",${sem.totalQualityPoints.toFixed(2)}`);
  }

  rows.push('');
  rows.push(`"CUMULATIVE SUMMARY","ALL SEMESTERS","","TOTAL COURSES: ${cumulative.totalCourses}",${cumulative.totalCreditUnits},"CGPA: ${cumulative.cgpa.toFixed(2)}","${cumulative.classificationName}",${cumulative.totalQualityPoints.toFixed(2)}`);

  return rows.join('\r\n');
}
