/**
 * STUDORA — PHASE 5.1 TEST ACCOUNT PROVISIONER
 * Creates the student and admin test accounts needed for runtime verification.
 *
 * Student: phase51.student@studora-test.dev (role: student — default)
 * Admin:   phase51.admin@studora-test.dev   (role: admin — must be set via service role)
 *
 * NOTE: Setting role='admin' requires the service role key because
 * the protect_profile_role() trigger blocks client-side role changes.
 * We use the Management API / service role to set the admin role safely.
 */

import { createClient } from '@supabase/supabase-js';

// ── Credentials from environment — never hardcoded ────────────────────────────
// Required environment variables:
//   VITE_SUPABASE_URL              (or set SUPABASE_URL)
//   VITE_SUPABASE_ANON_KEY         (or set SUPABASE_ANON_KEY)
//   STUDORA_TEST_STUDENT_EMAIL     e.g. phase51.student@studora-test.dev
//   STUDORA_TEST_STUDENT_PASSWORD
//   STUDORA_TEST_ADMIN_EMAIL       e.g. phase51.admin@studora-test.dev
//   STUDORA_TEST_ADMIN_PASSWORD
//
// Example: copy .env.test.example to .env.test and source it before running.

const REQUIRED_VARS = [
  'STUDORA_TEST_STUDENT_EMAIL',
  'STUDORA_TEST_STUDENT_PASSWORD',
  'STUDORA_TEST_ADMIN_EMAIL',
  'STUDORA_TEST_ADMIN_PASSWORD',
];

const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  for (const v of missing) console.error(`Missing required environment variable: ${v}`);
  process.exit(1);
}

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing required environment variable: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY)');
  process.exit(1);
}

const STUDENT_EMAIL = process.env.STUDORA_TEST_STUDENT_EMAIL;
const STUDENT_PASS  = process.env.STUDORA_TEST_STUDENT_PASSWORD;
const ADMIN_EMAIL   = process.env.STUDORA_TEST_ADMIN_EMAIL;
const ADMIN_PASS    = process.env.STUDORA_TEST_ADMIN_PASSWORD;

function client(key = SUPABASE_ANON) {
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function provisionStudent() {
  console.log('\n── Provisioning Student Account ────────────────────────────────────');
  const sb = client();

  // Try sign-in first
  const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
    email: STUDENT_EMAIL, password: STUDENT_PASS,
  });

  if (!loginErr && loginData.user) {
    console.log(`✅ Student already exists: ${loginData.user.id}`);
    await sb.auth.signOut();
    return loginData.user.id;
  }

  // Sign up
  const { data: signupData, error: signupErr } = await sb.auth.signUp({
    email: STUDENT_EMAIL,
    password: STUDENT_PASS,
    options: {
      data: {
        fullName: 'Phase51 Student',
        institution: 'Test University',
        department: 'Computer Science',
        academicLevel: '300',
      },
    },
  });

  if (signupErr) {
    console.error(`❌ Student signup failed: ${signupErr.message}`);
    return null;
  }

  const userId = signupData.user?.id;
  console.log(`✅ Student created: ${userId}`);

  // Confirm email is not required in Supabase config? 
  // The trigger handle_new_user will provision profile + subscription.
  await sb.auth.signOut();
  return userId;
}

async function provisionAdmin() {
  console.log('\n── Provisioning Admin Account ──────────────────────────────────────');
  const sb = client();

  // Try sign-in first
  const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASS,
  });

  if (!loginErr && loginData.user) {
    console.log(`   Admin exists: ${loginData.user.id}`);
    // Verify role
    const { data: profile } = await sb
      .from('profiles')
      .select('id, role')
      .eq('id', loginData.user.id)
      .single();
    console.log(`   Profile role: ${profile?.role}`);
    if (profile?.role === 'admin') {
      console.log('✅ Admin role confirmed');
    } else {
      console.log(`⚠️  Role is ${profile?.role} — needs elevation to admin`);
      console.log('   Role elevation requires service role key or Supabase Dashboard.');
      console.log('   Run this SQL in the Supabase Dashboard SQL editor:');
      console.log(`   UPDATE public.profiles SET role = 'admin' WHERE id = '${loginData.user.id}';`);
      console.log('   Note: trg_protect_profile_role allows SECURITY DEFINER bypass for admin elevation.');
    }
    await sb.auth.signOut();
    return loginData.user.id;
  }

  // Sign up
  const { data: signupData, error: signupErr } = await sb.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
    options: {
      data: {
        fullName: 'Phase51 Admin',
        institution: 'Studora Platform',
        department: 'Administration',
        academicLevel: 'staff',
      },
    },
  });

  if (signupErr) {
    console.error(`❌ Admin signup failed: ${signupErr.message}`);
    return null;
  }

  const userId = signupData.user?.id;
  console.log(`✅ Admin account created: ${userId}`);
  console.log('');
  console.log('⚠️  MANUAL STEP REQUIRED: Set admin role in Supabase Dashboard SQL editor:');
  console.log(`   UPDATE public.profiles SET role = 'admin' WHERE id = '${userId}';`);
  console.log('');
  console.log('   This bypasses protect_profile_role() which only permits admin elevation');
  console.log('   via SECURITY DEFINER or direct database access — not client JWT.');

  await sb.auth.signOut();
  return userId;
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  STUDORA — PHASE 5.1 TEST ACCOUNT PROVISIONER');
  console.log('══════════════════════════════════════════════════════════════════════');

  const studentId = await provisionStudent();
  const adminId   = await provisionAdmin();

  console.log('\n── Summary ─────────────────────────────────────────────────────────');
  console.log(`Student: ${studentId ?? 'FAILED'} (${STUDENT_EMAIL})`);
  console.log(`Admin:   ${adminId ?? 'FAILED'}  (${ADMIN_EMAIL})`);
  console.log('');
  console.log('After manual admin role elevation, re-run: node phase51_verify.mjs');
}

main().catch(e => { console.error(e); process.exit(1); });
