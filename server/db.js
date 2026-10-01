import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || (process.env.NODE_ENV === 'test' ? undefined : path.join(DATA_DIR, 'academic-platform.db'));
export const db = new PGlite(DB_PATH);

// Helper for hashing passwords securely
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

// Initialize tables and default seed data
export async function initializeDatabase() {
  await db.exec(`
    -- USERS (PostgreSQL Identity Model with Firebase UID Mapping)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      firebase_uid TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      salt TEXT,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Incremental schema migrations for existing tables
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN
        ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
      END IF;
    END $$;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN salt DROP NOT NULL;

    -- PROFILES
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      institution TEXT,
      department TEXT,
      academic_level TEXT,
      matric_number TEXT,
      bio TEXT,
      academic_interests TEXT,
      study_preferences TEXT,
      is_public BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- GRADING SCALES
    CREATE TABLE IF NOT EXISTS grading_scales (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_scale NUMERIC(3, 2) NOT NULL,
      rules TEXT NOT NULL,
      classifications TEXT NOT NULL
    );

    -- USER SETTINGS
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      selected_scale TEXT NOT NULL DEFAULT '5.0',
      custom_scale_rules TEXT
    );

    -- SEMESTERS
    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      academic_year TEXT NOT NULL,
      semester_name TEXT NOT NULL,
      display_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- STUDENT COURSES
    CREATE TABLE IF NOT EXISTS student_courses (
      id TEXT PRIMARY KEY,
      semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_code TEXT NOT NULL,
      course_title TEXT NOT NULL,
      credit_units INT NOT NULL CHECK (credit_units > 0),
      letter_grade TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- STUDY PLANS
    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      goal TEXT NOT NULL,
      deadline DATE NOT NULL,
      study_frequency TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      estimated_hours NUMERIC(5, 1) NOT NULL DEFAULT 10.0,
      logged_hours NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- STUDY TOPICS
    CREATE TABLE IF NOT EXISTS study_topics (
      id TEXT PRIMARY KEY,
      study_plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      display_order INT NOT NULL DEFAULT 1
    );

    -- STUDY LOGS
    CREATE TABLE IF NOT EXISTS study_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      study_plan_id TEXT REFERENCES study_plans(id) ON DELETE SET NULL,
      duration_minutes INT NOT NULL,
      notes TEXT,
      logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- CONSENT RECORDS (PRIVACY & COMPLIANCE)
    CREATE TABLE IF NOT EXISTS consent_records (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      consent_status TEXT NOT NULL,
      policy_version TEXT NOT NULL DEFAULT '1.0',
      context TEXT NOT NULL DEFAULT 'web',
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default grading scales
  await db.query(`
    INSERT INTO grading_scales (id, name, max_scale, rules, classifications)
    VALUES 
    ('5.0', '5.0 Scale (Nigerian/British Commonwealth Standard)', 5.0, 
      '${JSON.stringify([
        { letter: 'A', points: 5, minScore: 70 },
        { letter: 'B', points: 4, minScore: 60 },
        { letter: 'C', points: 3, minScore: 50 },
        { letter: 'D', points: 2, minScore: 45 },
        { letter: 'E', points: 1, minScore: 40 },
        { letter: 'F', points: 0, minScore: 0 }
      ])}',
      '${JSON.stringify([
        { name: 'First Class Honours', minCgpa: 4.50 },
        { name: 'Second Class Upper (2:1)', minCgpa: 3.50 },
        { name: 'Second Class Lower (2:2)', minCgpa: 2.40 },
        { name: 'Third Class', minCgpa: 1.50 },
        { name: 'Pass', minCgpa: 1.00 }
      ])}'
    ),
    ('4.0', '4.0 Scale (US / Global Standard)', 4.0,
      '${JSON.stringify([
        { letter: 'A', points: 4.0, minScore: 90 },
        { letter: 'B', points: 3.0, minScore: 80 },
        { letter: 'C', points: 2.0, minScore: 70 },
        { letter: 'D', points: 1.0, minScore: 60 },
        { letter: 'F', points: 0.0, minScore: 0 }
      ])}',
      '${JSON.stringify([
        { name: 'Summa Cum Laude (Distinction)', minCgpa: 3.80 },
        { name: 'Magna Cum Laude (High Honors)', minCgpa: 3.50 },
        { name: 'Cum Laude (Honors)', minCgpa: 3.20 },
        { name: 'Satisfactory / Good Standing', minCgpa: 2.00 }
      ])}'
    ),
    ('7.0', '7.0 Scale (UI / Canadian Standard)', 7.0,
      '${JSON.stringify([
        { letter: 'A', points: 7, minScore: 75 },
        { letter: 'B', points: 6, minScore: 70 },
        { letter: 'C', points: 5, minScore: 60 },
        { letter: 'D', points: 4, minScore: 50 },
        { letter: 'E', points: 3, minScore: 45 },
        { letter: 'F', points: 0, minScore: 0 }
      ])}',
      '${JSON.stringify([
        { name: 'First Class Honours', minCgpa: 6.00 },
        { name: 'Second Class Upper', minCgpa: 4.60 },
        { name: 'Second Class Lower', minCgpa: 3.20 },
        { name: 'Third Class', minCgpa: 2.00 }
      ])}'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      max_scale = EXCLUDED.max_scale,
      rules = EXCLUDED.rules,
      classifications = EXCLUDED.classifications;
  `);

  // Seed default demonstration user if none exists
  const userCheck = await db.query(`SELECT id FROM users WHERE email = 'alexander.vance@tech-academy.edu';`);
  if (userCheck.rows.length === 0) {
    const userId = 'usr_alexander_vance';
    const firebaseUid = 'fb_uid_alexander_vance';
    const { hash, salt } = hashPassword('Password123!');
    
    await db.query(`
      INSERT INTO users (id, firebase_uid, email, password_hash, salt, role)
      VALUES ($1, $2, $3, $4, $5, 'STUDENT');
    `, [userId, firebaseUid, 'alexander.vance@tech-academy.edu', hash, salt]);

    await db.query(`
      INSERT INTO profiles (user_id, full_name, avatar_url, institution, department, academic_level, matric_number, bio, academic_interests, study_preferences, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true);
    `, [
      userId,
      'Alexander Vance',
      null,
      'Apex Institute of Technology',
      'Computer Science & Software Engineering',
      'Year 3 (Junior)',
      'AIT/2023/CS/084',
      'CS Junior pursuing first-class honors. Building high-performance software and hosting peer study sessions.',
      JSON.stringify(['Algorithms', 'Distributed Systems', 'Applied ML', 'Compilers']),
      JSON.stringify(['Night Owl (20:00 - 02:00)', 'Visual Flowcharts', 'Interactive Quizzes'])
    ]);

    await db.query(`
      INSERT INTO user_settings (user_id, selected_scale)
      VALUES ($1, '5.0');
    `, [userId]);

    // Seed initial consent records for demo user
    await db.query(`
      INSERT INTO consent_records (id, user_id, consent_type, consent_status, policy_version, context)
      VALUES 
      ('c_demo_terms', $1, 'terms_and_conditions', 'granted', '1.0', 'registration'),
      ('c_demo_privacy', $1, 'privacy_policy', 'granted', '1.0', 'registration'),
      ('c_demo_analytics', $1, 'analytics_cookies', 'granted', '1.0', 'cookie_banner'),
      ('c_demo_functional', $1, 'functional_cookies', 'granted', '1.0', 'cookie_banner');
    `, [userId]);

    // Seed Semesters and courses
    const seedSemesters = [
      {
        id: 'sem_1',
        year: 'Year 1',
        name: 'First Semester',
        order: 1,
        courses: [
          { code: 'CSC101', title: 'Intro to Computer Programming', units: 3, grade: 'A' },
          { code: 'MTH101', title: 'Elementary Mathematics I', units: 4, grade: 'A' },
          { code: 'PHY101', title: 'General Physics I', units: 3, grade: 'B' },
          { code: 'GST101', title: 'Communication Skills in English', units: 2, grade: 'A' },
          { code: 'CSC103', title: 'Computer Hardware Foundations', units: 3, grade: 'A' }
        ]
      },
      {
        id: 'sem_2',
        year: 'Year 1',
        name: 'Second Semester',
        order: 2,
        courses: [
          { code: 'CSC102', title: 'Object-Oriented Programming (Java)', units: 3, grade: 'A' },
          { code: 'MTH102', title: 'Elementary Calculus II', units: 4, grade: 'B' },
          { code: 'PHY102', title: 'General Physics II', units: 3, grade: 'B' },
          { code: 'STA111', title: 'Introduction to Statistics', units: 3, grade: 'A' },
          { code: 'GST102', title: 'Philosophy and Logic', units: 2, grade: 'A' }
        ]
      },
      {
        id: 'sem_3',
        year: 'Year 2',
        name: 'First Semester',
        order: 3,
        courses: [
          { code: 'CSC201', title: 'Data Structures & Algorithms', units: 3, grade: 'A' },
          { code: 'CSC205', title: 'Operating Systems Concepts', units: 3, grade: 'B' },
          { code: 'MTH201', title: 'Linear Algebra I', units: 3, grade: 'A' },
          { code: 'CSC207', title: 'Computer Organization & Arch.', units: 3, grade: 'A' },
          { code: 'EET201', title: 'Basic Electronics & Circuits', units: 2, grade: 'B' }
        ]
      },
      {
        id: 'sem_4',
        year: 'Year 2',
        name: 'Second Semester',
        order: 4,
        courses: [
          { code: 'CSC202', title: 'Database Management Systems', units: 3, grade: 'A' },
          { code: 'CSC204', title: 'Software Engineering Principles', units: 3, grade: 'A' },
          { code: 'CSC208', title: 'Web Application Technologies', units: 3, grade: 'A' },
          { code: 'MTH202', title: 'Numerical Analysis', units: 3, grade: 'B' },
          { code: 'ENT202', title: 'Technology Entrepreneurship', units: 2, grade: 'A' }
        ]
      },
      {
        id: 'sem_5',
        year: 'Year 3',
        name: 'First Semester (Current)',
        order: 5,
        courses: [
          { code: 'CSC301', title: 'Design & Analysis of Algorithms', units: 3, grade: 'A' },
          { code: 'CSC303', title: 'Theory of Computation', units: 3, grade: 'B' },
          { code: 'CSC305', title: 'Artificial Intelligence & Search', units: 3, grade: 'A' },
          { code: 'CSC307', title: 'Computer Networks & Protocols', units: 3, grade: 'A' },
          { code: 'CSC309', title: 'Compiler Construction', units: 3, grade: 'B' }
        ]
      }
    ];

    for (const sem of seedSemesters) {
      await db.query(`
        INSERT INTO semesters (id, user_id, academic_year, semester_name, display_order)
        VALUES ($1, $2, $3, $4, $5);
      `, [sem.id, userId, sem.year, sem.name, sem.order]);

      for (let i = 0; i < sem.courses.length; i++) {
        const c = sem.courses[i];
        await db.query(`
          INSERT INTO student_courses (id, semester_id, user_id, course_code, course_title, credit_units, letter_grade)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [`crs_${sem.id}_${i}`, sem.id, userId, c.code, c.title, c.units, c.grade]);
      }
    }

    // Seed Study Plans & Topics
    const seedPlans = [
      {
        id: 'plan_1',
        subject: 'CSC301: Advanced Algorithms',
        goal: 'Master Dynamic Programming & Graph Theory for Mid-term Exam',
        deadline: '2026-10-25',
        frequency: 'Daily (2 hours)',
        difficulty: 'Hard',
        estimated: 24,
        logged: 16.5,
        topics: [
          { title: 'Asymptotic Analysis & Master Theorem', done: true },
          { title: 'Divide & Conquer Recurrences', done: true },
          { title: 'Greedy Algorithms (Huffman, Prim, Kruskal)', done: true },
          { title: 'Dynamic Programming: 0/1 Knapsack & Bellman-Ford', done: false },
          { title: 'Flow Networks & Ford-Fulkerson Cut Theorem', done: false },
          { title: 'NP-Completeness and Reduction proofs', done: false }
        ]
      },
      {
        id: 'plan_2',
        subject: 'CSC307: Computer Networks',
        goal: 'Prepare for CCNA-aligned Layer 3/4 Protocol Simulation Test',
        deadline: '2026-11-04',
        frequency: '3x per week',
        difficulty: 'Medium',
        estimated: 18,
        logged: 12.0,
        topics: [
          { title: 'OSI vs TCP/IP Protocol Stack', done: true },
          { title: 'IPv4 Subnetting & CIDR Calculation', done: true },
          { title: 'BGP and OSPF Routing Protocols', done: false },
          { title: 'TCP Flow Control & Congestion Window', done: false }
        ]
      },
      {
        id: 'plan_3',
        subject: 'CSC309: Compiler Construction',
        goal: 'Implement LALR(1) Syntax Tree & Semantic Analyzer',
        deadline: '2026-11-15',
        frequency: 'Weekends',
        difficulty: 'Hard',
        estimated: 30,
        logged: 9.0,
        topics: [
          { title: 'Lexical Analysis & DFA Generation', done: true },
          { title: 'Context-Free Grammars & Ambiguity Removal', done: true },
          { title: 'Shift-Reduce Parsing Table Generation', done: false },
          { title: 'Intermediate Code Representation (Three-Address)', done: false }
        ]
      }
    ];

    for (const plan of seedPlans) {
      await db.query(`
        INSERT INTO study_plans (id, user_id, subject, goal, deadline, study_frequency, difficulty, estimated_hours, logged_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [plan.id, userId, plan.subject, plan.goal, plan.deadline, plan.frequency, plan.difficulty, plan.estimated, plan.logged]);

      for (let i = 0; i < plan.topics.length; i++) {
        const t = plan.topics[i];
        await db.query(`
          INSERT INTO study_topics (id, study_plan_id, user_id, title, is_completed, display_order)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [`top_${plan.id}_${i}`, plan.id, userId, t.title, t.done, i + 1]);
      }
    }

    // Seed study logs for streak calculation
    const today = new Date();
    for (let d = 0; d < 8; d++) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - d);
      const dateStr = logDate.toISOString().split('T')[0];
      await db.query(`
        INSERT INTO study_logs (id, user_id, study_plan_id, duration_minutes, notes, logged_at)
        VALUES ($1, $2, 'plan_1', 120, 'Focused study session on algorithmic proofs', $3);
      `, [`log_seed_${d}`, userId, dateStr]);
    }
  } else {
    await db.query(`
      UPDATE users SET firebase_uid = 'fb_uid_alexander_vance'
      WHERE email = 'alexander.vance@tech-academy.edu' AND firebase_uid IS NULL;
    `);
  }
}

export async function closeDatabase() {
  if (db && typeof db.close === 'function') {
    await db.close();
  }
}
