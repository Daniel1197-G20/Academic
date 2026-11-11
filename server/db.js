import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'academic-data')
  : path.resolve(process.cwd(), 'data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Warning: Could not create DATA_DIR:', e.message);
}

const DB_PATH = process.env.DB_PATH || (process.env.NODE_ENV === 'test' ? undefined : path.join(DATA_DIR, 'academic-platform.db'));

// Attempt to open the persistent DB. If the WASM runtime aborts (corrupt data
// directory), wipe the directory and fall back to an in-memory DB so the dev
// server never crashes. The next `npm run dev` will recreate a clean DB.
function createDB(dbPath) {
  try {
    return new PGlite(dbPath);
  } catch (e) {
    console.error('[DB] PGlite failed to open persistent DB, attempting recovery:', e.message);
    if (dbPath && fs.existsSync(dbPath)) {
      try {
        fs.rmSync(dbPath, { recursive: true, force: true });
        console.warn('[DB] Corrupt DB directory removed. Using in-memory DB for this session. Restart dev server to get a fresh persistent DB.');
      } catch (rmErr) {
        console.error('[DB] Could not remove corrupt DB directory:', rmErr.message);
      }
    }
    return new PGlite(); // in-memory fallback
  }
}

export const db = createDB(DB_PATH);

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
      display_name TEXT,
      password_hash TEXT,
      salt TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Incremental schema migrations for existing tables
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN
        ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='display_name') THEN
        ALTER TABLE users ADD COLUMN display_name TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
        ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
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

    -- AI CHAT CONVERSATIONS
    CREATE TABLE IF NOT EXISTS ai_chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- AI CHAT MESSAGES
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_chat_conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_msg_conv  ON ai_chat_messages(conversation_id, created_at ASC);

    -- SEMESTERS
    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      academic_year TEXT NOT NULL,
      semester_name TEXT NOT NULL,
      display_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_semesters_user_order ON semesters(user_id, display_order ASC);

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

    CREATE INDEX IF NOT EXISTS idx_student_courses_user ON student_courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_courses_sem ON student_courses(semester_id);

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

    CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id, is_archived, created_at DESC);

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

    CREATE INDEX IF NOT EXISTS idx_study_topics_plan ON study_topics(study_plan_id, display_order ASC);
    CREATE INDEX IF NOT EXISTS idx_study_topics_user ON study_topics(user_id);

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

    CREATE INDEX IF NOT EXISTS idx_study_logs_user_date ON study_logs(user_id, logged_at DESC);

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

    -- EMAIL PREFERENCES & UNSUBSCRIBE LEDGER
    CREATE TABLE IF NOT EXISTS user_email_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      promotional_opt_in BOOLEAN NOT NULL DEFAULT true,
      academic_digest_opt_in BOOLEAN NOT NULL DEFAULT true,
      booking_notifications_opt_in BOOLEAN NOT NULL DEFAULT true,
      security_alerts_opt_in BOOLEAN NOT NULL DEFAULT true,
      unsubscribe_token TEXT UNIQUE NOT NULL,
      unsubscribed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- EMAIL SUPPRESSIONS (Bounces, spam complaints, manual exclusions)
    CREATE TABLE IF NOT EXISTS email_suppressions (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- EMAIL CAMPAIGNS (Admin broadcast and targeted communication)
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      campaign_type TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      template_id TEXT NOT NULL DEFAULT 'standard_announcement',
      content_html TEXT NOT NULL,
      content_text TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      total_recipients INT NOT NULL DEFAULT 0,
      sent_count INT NOT NULL DEFAULT 0,
      delivered_count INT NOT NULL DEFAULT 0,
      bounced_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      complaint_count INT NOT NULL DEFAULT 0,
      opened_count INT NOT NULL DEFAULT 0,
      clicked_count INT NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- EMAIL LOGS (Audit trail for transactional and bulk emails)
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT REFERENCES email_campaigns(id) ON DELETE SET NULL,
      recipient_email TEXT NOT NULL,
      recipient_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      template_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      resend_message_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      events_timeline TEXT DEFAULT '[]',
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- SUBSCRIPTION PLANS (Database-driven pricing and intervals)
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      amount_kobo INT NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'NGN',
      interval TEXT NOT NULL DEFAULT 'monthly',
      paystack_plan_code TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      display_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- FEATURE DEFINITIONS (Centralized normalized features)
    CREATE TABLE IF NOT EXISTS feature_definitions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- PLAN ENTITLEMENTS (Feature and limit mapping per plan)
    CREATE TABLE IF NOT EXISTS plan_entitlements (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
      feature_code TEXT NOT NULL REFERENCES feature_definitions(code) ON DELETE CASCADE,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      limit_value INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(plan_id, feature_code)
    );

    -- USER SUBSCRIPTIONS (Authoritative subscription lifecycle)
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'non_renewing', 'cancelled', 'disabled', 'expired', 'pending')),
      paystack_customer_code TEXT,
      paystack_subscription_code TEXT,
      paystack_email_token TEXT,
      authorization_reference TEXT,
      current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      current_period_end TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

    -- PAYMENT TRANSACTIONS (Financial ledger for all Paystack transactions)
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      provider TEXT NOT NULL DEFAULT 'paystack',
      provider_transaction_id TEXT,
      reference TEXT UNIQUE NOT NULL,
      amount_kobo INT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'reversed')),
      metadata TEXT,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON payment_transactions(reference);

    -- PAYMENT WEBHOOK EVENTS (Mandatory idempotency journal)
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id TEXT PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed BOOLEAN NOT NULL DEFAULT false,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_events_eid ON payment_webhook_events(event_id);

    -- SUBSCRIPTION USAGE (Atomic monthly feature consumption counters)
    CREATE TABLE IF NOT EXISTS subscription_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_code TEXT NOT NULL REFERENCES feature_definitions(code) ON DELETE CASCADE,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      usage_count INT NOT NULL DEFAULT 0,
      limit_value INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, feature_code, period_start)
    );

    CREATE INDEX IF NOT EXISTS idx_subscription_usage_lookup ON subscription_usage(user_id, feature_code, period_start);

    -- =========================================================================
    -- ACADEMIC INTELLIGENCE FOUNDATION TABLES (PHASE 1)
    -- =========================================================================

    -- SUBJECTS (Taxonomy catalog mirror)
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      category TEXT DEFAULT 'General',
      display_order INT DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- TOPICS (Granular concept taxonomy mirror)
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      display_order INT DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- QUESTION BANK (Practice drills & evaluations mirror)
    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      question TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      difficulty TEXT NOT NULL DEFAULT 'intermediate',
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- STUDENT STUDY SESSIONS (Active heartbeat-validated study telemetry)
    CREATE TABLE IF NOT EXISTS student_study_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      study_plan_id TEXT,
      source TEXT NOT NULL DEFAULT 'study_timer',
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMPTZ,
      last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      active_duration_seconds INT NOT NULL DEFAULT 0,
      idle_duration_seconds INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      client_session_key TEXT,
      device_info TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_study_sessions_student ON student_study_sessions(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_student_study_sessions_created ON student_study_sessions(student_id, created_at DESC);

    -- STUDY SESSION EVENTS (Fine-grained telemetry lifecycle audit)
    CREATE TABLE IF NOT EXISTS study_session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES student_study_sessions(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_study_session_events_session ON study_session_events(session_id, event_timestamp ASC);
    CREATE INDEX IF NOT EXISTS idx_study_session_events_student ON study_session_events(student_id);

    -- STUDENT PRACTICE ATTEMPTS (Self-directed practice drills)
    CREATE TABLE IF NOT EXISTS student_practice_attempts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      session_id TEXT REFERENCES student_study_sessions(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      score NUMERIC(5, 2),
      passed BOOLEAN,
      total_questions INT NOT NULL DEFAULT 0,
      correct_answers_count INT NOT NULL DEFAULT 0,
      time_spent_seconds INT DEFAULT 0,
      question_ids TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'practice_drill',
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_practice_attempts_student ON student_practice_attempts(student_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_student_practice_attempts_topic ON student_practice_attempts(student_id, topic_id);

    -- STUDENT PRACTICE ANSWERS (Granular item responses)
    CREATE TABLE IF NOT EXISTS student_practice_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES student_practice_attempts(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
      selected_option TEXT,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_practice_answers_attempt ON student_practice_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_student_practice_answers_student ON student_practice_answers(student_id);

    -- STUDENT TOPIC MASTERY (Empirical mastery ledger)
    CREATE TABLE IF NOT EXISTS student_topic_mastery (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      total_questions_attempted INT NOT NULL DEFAULT 0,
      correct_answers_count INT NOT NULL DEFAULT 0,
      incorrect_answers_count INT NOT NULL DEFAULT 0,
      accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
      mastery_classification TEXT NOT NULL DEFAULT 'not_assessed',
      performance_trend TEXT NOT NULL DEFAULT 'stable',
      last_assessed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (student_id, topic_id)
    );

    CREATE INDEX IF NOT EXISTS idx_student_topic_mastery_student ON student_topic_mastery(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_topic_mastery_subject ON student_topic_mastery(student_id, subject_id);

    -- ─────────────────────────────────────────────────────────────
    -- PHASE 3: DAILY AI STUDY COACH & ADAPTIVE STUDY PLANNING
    -- ─────────────────────────────────────────────────────────────

    -- 1. Student Study Preferences
    CREATE TABLE IF NOT EXISTS student_study_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      academic_goals TEXT DEFAULT '',
      target_gpa NUMERIC(3, 2),
      daily_available_minutes INT NOT NULL DEFAULT 60,
      preferred_study_periods TEXT DEFAULT '["evening"]',
      preferred_study_days TEXT DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
      upcoming_exams TEXT DEFAULT '[]',
      prioritized_subject_ids TEXT DEFAULT '[]',
      prioritized_topic_ids TEXT DEFAULT '[]',
      reminder_enabled BOOLEAN NOT NULL DEFAULT true,
      reminder_time TEXT DEFAULT '09:00',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_study_prefs_user ON student_study_preferences(user_id);

    -- 2. Daily Study Plans (Proactive Daily Container)
    CREATE TABLE IF NOT EXISTS daily_study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'active',
      target_study_minutes INT NOT NULL DEFAULT 60,
      completed_study_minutes INT NOT NULL DEFAULT 0,
      ai_coaching_note TEXT,
      generation_context TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, plan_date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_study_plans_user_date ON daily_study_plans(user_id, plan_date DESC);

    -- 3. Daily Study Tasks (Individual Actionable Units)
    CREATE TABLE IF NOT EXISTS daily_study_tasks (
      id TEXT PRIMARY KEY,
      daily_plan_id TEXT NOT NULL REFERENCES daily_study_plans(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      learning_objective TEXT,
      activity_type TEXT NOT NULL DEFAULT 'revision',
      estimated_duration_minutes INT NOT NULL DEFAULT 25,
      actual_duration_seconds INT NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      recommendation_reason TEXT,
      action_route TEXT DEFAULT '/study/timer',
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TIMESTAMPTZ,
      session_id TEXT REFERENCES student_study_sessions(id) ON DELETE SET NULL,
      attempt_id TEXT REFERENCES student_practice_attempts(id) ON DELETE SET NULL,
      display_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_daily_study_tasks_plan ON daily_study_tasks(daily_plan_id, display_order ASC);
    CREATE INDEX IF NOT EXISTS idx_daily_study_tasks_user_status ON daily_study_tasks(user_id, status);

    -- ─────────────────────────────────────────────────────────────
    -- PHASE 4: DOCUMENT-BASED LEARNING & KNOWLEDGE EXTRACTION
    -- ─────────────────────────────────────────────────────────────

    -- 1. Student Academic Documents
    CREATE TABLE IF NOT EXISTS student_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size_bytes INT NOT NULL,
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      processing_status TEXT NOT NULL DEFAULT 'uploaded',
      page_count INT NOT NULL DEFAULT 0,
      extracted_summary TEXT,
      extracted_topics TEXT DEFAULT '[]',
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_documents_user ON student_documents(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_student_documents_subject ON student_documents(user_id, subject_id);

    -- 2. Document Content Chunks
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES student_documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page_number INT NOT NULL DEFAULT 1,
      chunk_index INT NOT NULL DEFAULT 0,
      section_heading TEXT,
      content TEXT NOT NULL,
      token_count INT NOT NULL DEFAULT 0,
      search_vector TSVECTOR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id, chunk_index ASC);
    CREATE INDEX IF NOT EXISTS idx_document_chunks_user ON document_chunks(user_id);

    -- 3. Generated Learning Resources
    CREATE TABLE IF NOT EXISTS document_learning_resources (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES student_documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      title TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_doc_resources_doc ON document_learning_resources(document_id, resource_type);
    CREATE INDEX IF NOT EXISTS idx_doc_resources_user ON document_learning_resources(user_id);
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

  // Seed default subscription plans (Database-driven pricing and configuration)
  const defaultPlans = [
    {
      id: 'plan_basic',
      code: 'basic',
      name: 'Basic',
      description: 'Essential CGPA calculation and personal study planning.',
      amount_kobo: 0,
      currency: 'NGN',
      interval: 'monthly',
      paystack_plan_code: null,
      is_active: true,
      display_order: 1
    },
    {
      id: 'plan_student',
      code: 'student',
      name: 'Student',
      description: 'Advanced CGPA modeling, AI tutor assistance, and structured test prep.',
      amount_kobo: 250000, // ₦2,500
      currency: 'NGN',
      interval: 'monthly',
      paystack_plan_code: 'PLN_student_monthly',
      is_active: true,
      display_order: 2
    },
    {
      id: 'plan_pro',
      code: 'pro',
      name: 'Pro',
      description: 'Unlimited test prep, video tutoring sessions, and deep performance analytics.',
      amount_kobo: 500000, // ₦5,000
      currency: 'NGN',
      interval: 'monthly',
      paystack_plan_code: 'PLN_pro_monthly',
      is_active: true,
      display_order: 3
    },
    {
      id: 'plan_premium',
      code: 'premium',
      name: 'Premium',
      description: 'Highest AI allowance, dedicated tutor priority matching, and priority support.',
      amount_kobo: 1000000, // ₦10,000
      currency: 'NGN',
      interval: 'monthly',
      paystack_plan_code: 'PLN_premium_monthly',
      is_active: true,
      display_order: 4
    }
  ];

  for (const p of defaultPlans) {
    await db.query(`
      INSERT INTO subscription_plans (id, code, name, description, amount_kobo, currency, interval, paystack_plan_code, is_active, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        amount_kobo = EXCLUDED.amount_kobo,
        currency = EXCLUDED.currency,
        interval = EXCLUDED.interval,
        paystack_plan_code = EXCLUDED.paystack_plan_code,
        is_active = EXCLUDED.is_active,
        display_order = EXCLUDED.display_order,
        updated_at = CURRENT_TIMESTAMP;
    `, [p.id, p.code, p.name, p.description, p.amount_kobo, p.currency, p.interval, p.paystack_plan_code, p.is_active, p.display_order]);
  }

  // Seed default normalized feature definitions
  const defaultFeatures = [
    { code: 'CGPA_BASIC', name: 'Core CGPA Calculator', description: 'Multi-scale grade calculation and semester units tally', category: 'academic' },
    { code: 'CGPA_ADVANCED', name: 'Target GPA Modeling', description: 'Target grade forecasting and graduation honors projections', category: 'academic' },
    { code: 'STUDY_PLANNER_BASIC', name: 'Study Habit Planner', description: 'Organize study plans and track weekly syllabus checklists', category: 'study' },
    { code: 'STUDY_PLANNER_ADVANCED', name: 'Unlimited Study Engine', description: 'Unlimited concurrent study plans, automated topic pacing, and streaks', category: 'study' },
    { code: 'TEST_PREP_BASIC', name: 'Practice Exam Drills', description: 'Simulated practice tests and diagnostic feedback', category: 'exam' },
    { code: 'TEST_PREP_ADVANCED', name: 'Unlimited Exam Simulation', description: 'Unlimited mock exams, timed drills, and weak topic breakdowns', category: 'exam' },
    { code: 'AI_TUTOR', name: 'AI Academic Assistant', description: 'Contextual coursework explanations and step-by-step problem solver', category: 'ai' },
    { code: 'AI_TUTOR_ADVANCED', name: 'Advanced AI Tutor Modes', description: 'Multi-mode tutoring: explain, deep study, quiz generator, and flashcards', category: 'ai' },
    { code: 'TUTOR_MARKETPLACE', name: 'Tutor Directory', description: 'Browse verified campus subject-matter tutors and ratings', category: 'tutoring' },
    { code: 'TUTOR_BOOKING', name: 'Tutor Session Booking', description: 'Schedule and book 1-on-1 tutoring sessions', category: 'tutoring' },
    { code: 'VIDEO_TUTORING', name: 'ZEGOCLOUD Video Tutoring', description: 'Live interactive video calls, whiteboard, and screen sharing', category: 'tutoring' },
    { code: 'PRIVATE_GROUPS', name: 'Private Study Groups', description: 'Create and join private peer study channels and shared resources', category: 'community' },
    { code: 'ADVANCED_ANALYTICS', name: 'Predictive Academic Analytics', description: 'Grade trends, velocity graphs, and performance diagnostics', category: 'analytics' },
    { code: 'PREMIUM_RESOURCES', name: 'Curated Academic Vault', description: 'Verified past exams, lecture notes, and revision sheets', category: 'resources' },
    { code: 'PRIORITY_SUPPORT', name: 'Priority Academic Support', description: 'Expedited tutor matching and platform customer support', category: 'support' }
  ];

  for (const f of defaultFeatures) {
    const id = 'feat_' + f.code.toLowerCase();
    await db.query(`
      INSERT INTO feature_definitions (id, code, name, description, category)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category;
    `, [id, f.code, f.name, f.description, f.category]);
  }

  // Seed Plan Entitlements
  const planRows = await db.query(`SELECT id, code FROM subscription_plans;`);
  const planMap = {};
  for (const r of planRows.rows) {
    planMap[r.code] = r.id;
  }

  const defaultEntitlements = [
    // BASIC (₦0/month)
    { plan: 'basic', feature: 'CGPA_BASIC', enabled: true, limit: null },
    { plan: 'basic', feature: 'CGPA_ADVANCED', enabled: false, limit: null },
    { plan: 'basic', feature: 'STUDY_PLANNER_BASIC', enabled: true, limit: 2 },
    { plan: 'basic', feature: 'STUDY_PLANNER_ADVANCED', enabled: false, limit: null },
    { plan: 'basic', feature: 'TEST_PREP_BASIC', enabled: true, limit: 3 },
    { plan: 'basic', feature: 'TEST_PREP_ADVANCED', enabled: false, limit: null },
    { plan: 'basic', feature: 'AI_TUTOR', enabled: true, limit: 10 },
    { plan: 'basic', feature: 'AI_TUTOR_ADVANCED', enabled: false, limit: null },
    { plan: 'basic', feature: 'TUTOR_MARKETPLACE', enabled: true, limit: null },
    { plan: 'basic', feature: 'TUTOR_BOOKING', enabled: false, limit: null },
    { plan: 'basic', feature: 'VIDEO_TUTORING', enabled: false, limit: null },
    { plan: 'basic', feature: 'PRIVATE_GROUPS', enabled: false, limit: null },
    { plan: 'basic', feature: 'ADVANCED_ANALYTICS', enabled: false, limit: null },
    { plan: 'basic', feature: 'PREMIUM_RESOURCES', enabled: false, limit: null },
    { plan: 'basic', feature: 'PRIORITY_SUPPORT', enabled: false, limit: null },

    // STUDENT (₦2,500/month)
    { plan: 'student', feature: 'CGPA_BASIC', enabled: true, limit: null },
    { plan: 'student', feature: 'CGPA_ADVANCED', enabled: true, limit: null },
    { plan: 'student', feature: 'STUDY_PLANNER_BASIC', enabled: true, limit: null },
    { plan: 'student', feature: 'STUDY_PLANNER_ADVANCED', enabled: true, limit: null },
    { plan: 'student', feature: 'TEST_PREP_BASIC', enabled: true, limit: 15 },
    { plan: 'student', feature: 'TEST_PREP_ADVANCED', enabled: true, limit: 15 },
    { plan: 'student', feature: 'AI_TUTOR', enabled: true, limit: 100 },
    { plan: 'student', feature: 'AI_TUTOR_ADVANCED', enabled: false, limit: null },
    { plan: 'student', feature: 'TUTOR_MARKETPLACE', enabled: true, limit: null },
    { plan: 'student', feature: 'TUTOR_BOOKING', enabled: true, limit: 5 },
    { plan: 'student', feature: 'VIDEO_TUTORING', enabled: false, limit: null },
    { plan: 'student', feature: 'PRIVATE_GROUPS', enabled: true, limit: null },
    { plan: 'student', feature: 'ADVANCED_ANALYTICS', enabled: false, limit: null },
    { plan: 'student', feature: 'PREMIUM_RESOURCES', enabled: true, limit: null },
    { plan: 'student', feature: 'PRIORITY_SUPPORT', enabled: false, limit: null },

    // PRO (₦5,000/month)
    { plan: 'pro', feature: 'CGPA_BASIC', enabled: true, limit: null },
    { plan: 'pro', feature: 'CGPA_ADVANCED', enabled: true, limit: null },
    { plan: 'pro', feature: 'STUDY_PLANNER_BASIC', enabled: true, limit: null },
    { plan: 'pro', feature: 'STUDY_PLANNER_ADVANCED', enabled: true, limit: null },
    { plan: 'pro', feature: 'TEST_PREP_BASIC', enabled: true, limit: null },
    { plan: 'pro', feature: 'TEST_PREP_ADVANCED', enabled: true, limit: null },
    { plan: 'pro', feature: 'AI_TUTOR', enabled: true, limit: 300 },
    { plan: 'pro', feature: 'AI_TUTOR_ADVANCED', enabled: true, limit: 300 },
    { plan: 'pro', feature: 'TUTOR_MARKETPLACE', enabled: true, limit: null },
    { plan: 'pro', feature: 'TUTOR_BOOKING', enabled: true, limit: null },
    { plan: 'pro', feature: 'VIDEO_TUTORING', enabled: true, limit: 10 },
    { plan: 'pro', feature: 'PRIVATE_GROUPS', enabled: true, limit: null },
    { plan: 'pro', feature: 'ADVANCED_ANALYTICS', enabled: true, limit: null },
    { plan: 'pro', feature: 'PREMIUM_RESOURCES', enabled: true, limit: null },
    { plan: 'pro', feature: 'PRIORITY_SUPPORT', enabled: false, limit: null },

    // PREMIUM (₦10,000/month)
    { plan: 'premium', feature: 'CGPA_BASIC', enabled: true, limit: null },
    { plan: 'premium', feature: 'CGPA_ADVANCED', enabled: true, limit: null },
    { plan: 'premium', feature: 'STUDY_PLANNER_BASIC', enabled: true, limit: null },
    { plan: 'premium', feature: 'STUDY_PLANNER_ADVANCED', enabled: true, limit: null },
    { plan: 'premium', feature: 'TEST_PREP_BASIC', enabled: true, limit: null },
    { plan: 'premium', feature: 'TEST_PREP_ADVANCED', enabled: true, limit: null },
    { plan: 'premium', feature: 'AI_TUTOR', enabled: true, limit: 1000 },
    { plan: 'premium', feature: 'AI_TUTOR_ADVANCED', enabled: true, limit: 1000 },
    { plan: 'premium', feature: 'TUTOR_MARKETPLACE', enabled: true, limit: null },
    { plan: 'premium', feature: 'TUTOR_BOOKING', enabled: true, limit: null },
    { plan: 'premium', feature: 'VIDEO_TUTORING', enabled: true, limit: null },
    { plan: 'premium', feature: 'PRIVATE_GROUPS', enabled: true, limit: null },
    { plan: 'premium', feature: 'ADVANCED_ANALYTICS', enabled: true, limit: null },
    { plan: 'premium', feature: 'PREMIUM_RESOURCES', enabled: true, limit: null },
    { plan: 'premium', feature: 'PRIORITY_SUPPORT', enabled: true, limit: null }
  ];

  for (const ent of defaultEntitlements) {
    const planId = planMap[ent.plan];
    if (!planId) continue;
    const entId = `ent_${ent.plan}_${ent.feature.toLowerCase()}`;
    await db.query(`
      INSERT INTO plan_entitlements (id, plan_id, feature_code, is_enabled, limit_value)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (plan_id, feature_code) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        limit_value = EXCLUDED.limit_value,
        updated_at = CURRENT_TIMESTAMP;
    `, [entId, planId, ent.feature, ent.enabled, ent.limit]);
  }

  // Seed default demonstration user if none exists
  const userCheck = await db.query(`SELECT id FROM users WHERE email = 'alexander.vance@tech-academy.edu';`);
  if (userCheck.rows.length === 0) {
    const userId = 'usr_alexander_vance';
    const firebaseUid = 'fb_uid_alexander_vance';
    const { hash, salt } = hashPassword('Password123!');
    
    await db.query(`
      INSERT INTO users (id, firebase_uid, email, display_name, password_hash, salt, role, status)
      VALUES ($1, $2, $3, 'Alexander Vance', $4, $5, 'student', 'active');
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
      UPDATE users SET 
        firebase_uid = COALESCE(firebase_uid, 'fb_uid_alexander_vance'),
        display_name = COALESCE(display_name, 'Alexander Vance'),
        status = COALESCE(status, 'active')
      WHERE email = 'alexander.vance@tech-academy.edu';
    `);
  }

  // Ensure default demo user has active Basic subscription
  const demoUser = await db.query(`SELECT id FROM users WHERE email = 'alexander.vance@tech-academy.edu';`);
  if (demoUser.rows.length > 0) {
    const dUserId = demoUser.rows[0].id;
    const subCheck = await db.query(`SELECT id FROM user_subscriptions WHERE user_id = $1;`, [dUserId]);
    if (subCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
        VALUES ($1, $2, 'plan_basic', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', false);
      `, ['sub_alexander_vance', dUserId]);
    }
  }

  // Ensure second demo user (Student B - Maya Lin) exists for multi-user group call testing
  const mayaCheck = await db.query(`SELECT id FROM users WHERE email = 'maya.lin@tech-academy.edu';`);
  if (mayaCheck.rows.length === 0) {
    const mayaId = 'usr_maya_lin';
    const mayaFbUid = 'fb_uid_maya_lin';
    const { hash: mHash, salt: mSalt } = hashPassword('Password123!');
    await db.query(`
      INSERT INTO users (id, firebase_uid, email, display_name, password_hash, salt, role, status)
      VALUES ($1, $2, $3, 'Maya Lin', $4, $5, 'student', 'active');
    `, [mayaId, mayaFbUid, 'maya.lin@tech-academy.edu', mHash, mSalt]);

    await db.query(`
      INSERT INTO profiles (user_id, full_name, avatar_url, institution, department, academic_level, matric_number, bio, academic_interests, study_preferences, is_public)
      VALUES ($1, $2, null, 'Apex Institute of Technology', 'Data Science & Applied Statistics', 'Year 3 (Junior)', 'AIT/2023/DS/042', 'Statistics and Machine Learning scholar.', '["Statistics", "Machine Learning"]', '["Morning Focused"]', true);
    `, [mayaId, 'Maya Lin']);

    await db.query(`
      INSERT INTO user_settings (user_id, selected_scale)
      VALUES ($1, '5.0');
    `, [mayaId]);

    await db.query(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
      VALUES ($1, $2, 'plan_basic', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', false);
    `, ['sub_maya_lin', mayaId]);
  } else {
    await db.query(`
      UPDATE users SET 
        firebase_uid = COALESCE(firebase_uid, 'fb_uid_maya_lin'),
        display_name = COALESCE(display_name, 'Maya Lin')
      WHERE email = 'maya.lin@tech-academy.edu';
    `);
  }

  // Seed default core academic subjects, topics, and question bank for drills and practice
  await seedAcademicCurriculumAndQuestions();
}

/**
 * Seeds core subjects, topics, and verified question bank items
 * for student practice drills, diagnostic testing, and topic mastery.
 */
async function seedAcademicCurriculumAndQuestions() {
  const subjectsData = [
    { id: 'subj_math', name: 'Mathematics', code: 'MTH', description: 'Pure & Applied Mathematics', category: 'STEM', display_order: 1 },
    { id: 'subj_cs', name: 'Computer Science', code: 'CSC', description: 'Algorithms, Data Structures & Systems', category: 'STEM', display_order: 2 },
    { id: 'subj_phys', name: 'Physics', code: 'PHY', description: 'Classical Mechanics & Modern Physics', category: 'STEM', display_order: 3 },
    { id: 'subj_chem', name: 'Chemistry', code: 'CHM', description: 'Organic, Inorganic & Physical Chemistry', category: 'STEM', display_order: 4 },
  ];

  for (const s of subjectsData) {
    await db.query(`
      INSERT INTO subjects (id, name, code, description, category, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (id) DO NOTHING;
    `, [s.id, s.name, s.code, s.description, s.category, s.display_order]);
  }

  const topicsData = [
    { id: 'top_calc_limits', subject_id: 'subj_math', name: 'Limits & Calculus', code: 'MTH-01' },
    { id: 'top_linear_alg', subject_id: 'subj_math', name: 'Linear Algebra & Matrices', code: 'MTH-02' },
    { id: 'top_algo_sort', subject_id: 'subj_cs', name: 'Sorting & Divide-and-Conquer', code: 'CSC-01' },
    { id: 'top_algo_graphs', subject_id: 'subj_cs', name: 'Graph Theory & BFS/DFS', code: 'CSC-02' },
    { id: 'top_db_sql', subject_id: 'subj_cs', name: 'Database Systems & SQL', code: 'CSC-03' },
    { id: 'top_phys_kinematics', subject_id: 'subj_phys', name: 'Kinematics & Newton Laws', code: 'PHY-01' },
    { id: 'top_chem_organic', subject_id: 'subj_chem', name: 'Organic Reaction Mechanisms', code: 'CHM-01' },
  ];

  for (const t of topicsData) {
    await db.query(`
      INSERT INTO topics (id, subject_id, name, code, description, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5, 1, true)
      ON CONFLICT (id) DO NOTHING;
    `, [t.id, t.subject_id, t.name, t.code, t.name]);
  }

  const sampleQuestions = [
    // CSC - Sorting & Divide-and-Conquer
    {
      id: 'q_cs_sort_1', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'What is the worst-case time complexity of standard QuickSort without randomized pivot?',
      options: JSON.stringify([{ id: 'A', text: 'O(n)' }, { id: 'B', text: 'O(n log n)' }, { id: 'C', text: 'O(n^2)' }, { id: 'D', text: 'O(log n)' }]),
      correct_answer: 'C', explanation: 'Worst-case O(n^2) happens when the pivot repeatedly splits elements into 0 and n-1 items.'
    },
    {
      id: 'q_cs_sort_2', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'Which sorting algorithm is guaranteed O(n log n) in worst case and is stable?',
      options: JSON.stringify([{ id: 'A', text: 'MergeSort' }, { id: 'B', text: 'QuickSort' }, { id: 'C', text: 'HeapSort' }, { id: 'D', text: 'SelectionSort' }]),
      correct_answer: 'A', explanation: 'MergeSort is a stable divide-and-conquer sorting algorithm with guaranteed O(n log n) runtime.'
    },
    {
      id: 'q_cs_sort_3', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'What is the auxiliary space complexity of MergeSort on an array of size n?',
      options: JSON.stringify([{ id: 'A', text: 'O(1)' }, { id: 'B', text: 'O(log n)' }, { id: 'C', text: 'O(n)' }, { id: 'D', text: 'O(n^2)' }]),
      correct_answer: 'C', explanation: 'Standard MergeSort requires O(n) temporary space to merge sub-arrays.'
    },
    {
      id: 'q_cs_sort_4', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'Which sorting method uses the divide-and-conquer strategy?',
      options: JSON.stringify([{ id: 'A', text: 'Bubble Sort' }, { id: 'B', text: 'QuickSort' }, { id: 'C', text: 'Insertion Sort' }, { id: 'D', text: 'Counting Sort' }]),
      correct_answer: 'B', explanation: 'QuickSort recursively partitions arrays into smaller subproblems.'
    },
    {
      id: 'q_cs_sort_5', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'What is the lower bound for comparison-based sorting algorithms in worst-case?',
      options: JSON.stringify([{ id: 'A', text: 'Ω(n)' }, { id: 'B', text: 'Ω(n log n)' }, { id: 'C', text: 'Ω(n^2)' }, { id: 'D', text: 'Ω(log n)' }]),
      correct_answer: 'B', explanation: 'Decision tree analysis demonstrates comparison sorts require Ω(n log n) comparisons in worst case.'
    },
    {
      id: 'q_cs_sort_6', subject_id: 'subj_cs', topic_id: 'top_algo_sort',
      question: 'Which pivot selection strategy ensures expected O(n log n) performance for QuickSort?',
      options: JSON.stringify([{ id: 'A', text: 'Always pick first element' }, { id: 'B', text: 'Randomized pivot selection' }, { id: 'C', text: 'Always pick last element' }, { id: 'D', text: 'Pick zero index' }]),
      correct_answer: 'B', explanation: 'Randomized pivot selection guarantees expected O(n log n) time regardless of input ordering.'
    },

    // MTH - Limits & Calculus
    {
      id: 'q_mth_calc_1', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'What is the value of limit of (sin x)/x as x approaches 0?',
      options: JSON.stringify([{ id: 'A', text: '0' }, { id: 'B', text: '1' }, { id: 'C', text: 'Infinity' }, { id: 'D', text: 'Undefined' }]),
      correct_answer: 'B', explanation: 'lim(x->0) (sin x)/x = 1 is a fundamental trigonometric limit.'
    },
    {
      id: 'q_mth_calc_2', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'When can L\'Hôpital\'s Rule be applied?',
      options: JSON.stringify([{ id: 'A', text: 'Any fraction' }, { id: 'B', text: 'Indeterminate forms 0/0 or ±∞/±∞' }, { id: 'C', text: 'Only when denominator is zero' }, { id: 'D', text: 'Linear equations only' }]),
      correct_answer: 'B', explanation: 'L\'Hôpital\'s Rule requires an indeterminate form of 0/0 or ±∞/±∞.'
    },
    {
      id: 'q_mth_calc_3', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'What is the derivative of f(x) = ln(x) with respect to x?',
      options: JSON.stringify([{ id: 'A', text: 'e^x' }, { id: 'B', text: '1/x' }, { id: 'C', text: 'x' }, { id: 'D', text: '1/(x^2)' }]),
      correct_answer: 'B', explanation: 'd/dx [ln(x)] = 1/x for x > 0.'
    },
    {
      id: 'q_mth_calc_4', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'What is the derivative of f(x) = e^(2x)?',
      options: JSON.stringify([{ id: 'A', text: 'e^(2x)' }, { id: 'B', text: '2e^(2x)' }, { id: 'C', text: 'e^x' }, { id: 'D', text: '2x e^(2x-1)' }]),
      correct_answer: 'B', explanation: 'Using chain rule: d/dx [e^(2x)] = 2 * e^(2x).'
    },
    {
      id: 'q_mth_calc_5', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'Evaluate lim(x->infinity) (2x^2 + 3)/(5x^2 - 1).',
      options: JSON.stringify([{ id: 'A', text: '2/5' }, { id: 'B', text: '0' }, { id: 'C', text: '3/-1' }, { id: 'D', text: 'Infinity' }]),
      correct_answer: 'A', explanation: 'Dividing numerator and denominator by highest power x^2 yields 2/5.'
    },
    {
      id: 'q_mth_calc_6', subject_id: 'subj_math', topic_id: 'top_calc_limits',
      question: 'What does the First Derivative Test determine for a continuous function?',
      options: JSON.stringify([{ id: 'A', text: 'Inflection points' }, { id: 'B', text: 'Local extrema (maxima and minima)' }, { id: 'C', text: 'Asymptotes' }, { id: 'D', text: 'Domain of definition' }]),
      correct_answer: 'B', explanation: 'The first derivative test analyzes sign changes around critical numbers to find local maxima and minima.'
    }
  ];

  for (const q of sampleQuestions) {
    await db.query(`
      INSERT INTO question_bank (id, subject_id, topic_id, question, question_type, difficulty, options, correct_answer, explanation, status)
      VALUES ($1, $2, $3, $4, 'multiple_choice', 'intermediate', $5, $6, $7, 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [q.id, q.subject_id, q.topic_id, q.question, q.options, q.correct_answer, q.explanation]);
  }
}

export async function closeDatabase() {
  if (db && typeof db.close === 'function') {
    await db.close();
  }
}
