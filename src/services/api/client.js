import { supabase } from '../../lib/supabase/client';

const TOKEN_KEY = 'academic_platform_token';
const memoryTokenStore = new Map();
const inFlightRequests = new Map();

class ApiClient {
  constructor() {
    let token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = localStorage.getItem(TOKEN_KEY);
      }
    } catch (err) {
      console.warn('LocalStorage token read failed, using memory fallback:', err);
    }
    this.token = token || memoryTokenStore.get(TOKEN_KEY) || null;
  }

  setToken(token) {
    this.token = token;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
        return;
      }
    } catch (err) {
      console.warn('LocalStorage token write failed, using memory fallback:', err);
    }
    if (token) {
      memoryTokenStore.set(TOKEN_KEY, token);
    } else {
      memoryTokenStore.delete(TOKEN_KEY);
    }
  }

  getToken() {
    return this.token;
  }

  async getSupabaseSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async request(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    // Deduplicate identical GET requests while in-flight (Rule 17)
    if (method === 'GET' && !options.noDedupe) {
      const cacheKey = `${endpoint}:${this.token || 'anon'}`;
      if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
      }
      const promise = this._executeRequest(endpoint, options).finally(() => {
        inFlightRequests.delete(cacheKey);
      });
      inFlightRequests.set(cacheKey, promise);
      return promise;
    }

    return this._executeRequest(endpoint, options);
  }

  async _executeRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 12000);

    const config = {
      ...options,
      headers,
      signal: options.signal || controller.signal
    };

    try {
      const response = await fetch(endpoint, config);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      let data = {};
      if (isJson) {
        data = await response.json().catch(() => ({}));
      } else {
        // Guard against HTML returned on SPA fallback
        const text = await response.text().catch(() => '');
        if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
          const err = new Error(`API endpoint ${endpoint} returned HTML instead of JSON.`);
          err.status = response.status;
          throw err;
        }
        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        if (response.status === 401 && endpoint !== '/api/auth/login') {
          this.setToken(null);
        }
        const error = new Error(data.error || `HTTP ${response.status}: Request failed`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error(`Request to ${endpoint} timed out.`);
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw err;
    }
  }

  // --- Auth ---
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async register(formData) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // --- Profile ---
  async updateProfile(updates) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const profileUpdates = {};
      const fields = {
        fullName: 'full_name',
        avatarUrl: 'avatar_url',
        institution: 'institution',
        department: 'department',
        courseOfStudy: 'course_of_study',
        academicLevel: 'academic_level',
        matricNumber: 'matric_number',
        bio: 'bio',
        academicInterests: 'academic_interests',
        studyPreferences: 'study_preferences',
        registeredSubjects: 'registered_subject_ids'
      };
      for (const [inputKey, column] of Object.entries(fields)) {
        if (updates[inputKey] !== undefined) profileUpdates[column] = updates[inputKey];
      }
      profileUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', session.user.id)
        .select('*')
        .single();
      if (error) throw error;
      return { profile: data };
    }
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // --- Academic / CGPA ---
  async getScales() {
    const { data, error } = await supabase
      .from('grading_scales')
      .select('id, name, max_scale, rules, classifications')
      .order('max_scale', { ascending: true });
    if (error) throw error;
    return { scales: data || [] };
  }

  async getAcademicRecords() {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const userId = session.user.id;
      const [semestersResult, coursesResult, settingsResult] = await Promise.all([
        supabase
          .from('semesters')
          .select('id, user_id, academic_year, semester_name, display_order')
          .eq('user_id', userId)
          .order('display_order', { ascending: true }),
        supabase
          .from('student_courses')
          .select('id, semester_id, user_id, course_code, course_title, credit_units, letter_grade')
          .eq('user_id', userId),
        supabase
          .from('user_settings')
          .select('selected_scale')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const queryError = semestersResult.error || coursesResult.error || settingsResult.error;
      if (queryError) throw queryError;
      const coursesBySemester = new Map();
      for (const course of coursesResult.data || []) {
        const courses = coursesBySemester.get(course.semester_id) || [];
        courses.push(course);
        coursesBySemester.set(course.semester_id, courses);
      }

      return {
        semesters: (semestersResult.data || []).map(semester => ({
          ...semester,
          courses: coursesBySemester.get(semester.id) || []
        })),
        selectedScale: settingsResult.data?.selected_scale || '5.0'
      };
    }
    return this.request('/api/academic/records');
  }

  async updateSelectedScale(scaleId) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: session.user.id, selected_scale: scaleId });
      if (error) throw error;
      return { success: true, selectedScale: scaleId };
    }
    return this.request('/api/academic/settings/scale', {
      method: 'PUT',
      body: JSON.stringify({ scaleId })
    });
  }

  async createSemester(academicYear, semesterName) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const userId = session.user.id;
      const { data: lastSemester, error: orderError } = await supabase
        .from('semesters')
        .select('display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orderError) throw orderError;

      const semester = {
        id: `sem_${crypto.randomUUID()}`,
        user_id: userId,
        academic_year: academicYear || 'Year 1',
        semester_name: semesterName || 'First Semester',
        display_order: (lastSemester?.display_order || 0) + 1
      };
      const { data, error } = await supabase
        .from('semesters')
        .insert(semester)
        .select('id, user_id, academic_year, semester_name, display_order')
        .single();
      if (error) throw error;
      return { semester: { ...data, courses: [] } };
    }
    return this.request('/api/academic/semesters', {
      method: 'POST',
      body: JSON.stringify({ academicYear, semesterName })
    });
  }

  async deleteSemester(id) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { error } = await supabase.from('semesters').delete().eq('id', id);
      if (error) throw error;
      return { success: true, deleted: 1 };
    }
    return this.request(`/api/academic/semesters/${id}`, {
      method: 'DELETE'
    });
  }

  async duplicateSemester(id) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase.rpc('duplicate_semester', { p_semester_id: id });
      if (error) throw error;
      return data;
    }
    return this.request(`/api/academic/semesters/${id}/duplicate`, {
      method: 'POST'
    });
  }

  async addCourse(courseData) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const userId = session.user.id;
      const semesterId = courseData.semesterId;
      if (!semesterId || !courseData.courseCode || !courseData.creditUnits) {
        throw new Error('Semester ID, Course Code, and Units are required.');
      }
      const { data: semester, error: semesterError } = await supabase
        .from('semesters')
        .select('id')
        .eq('id', semesterId)
        .eq('user_id', userId)
        .maybeSingle();
      if (semesterError) throw semesterError;
      if (!semester) throw new Error('Unauthorized access to semester.');

      const course = {
        id: `crs_${crypto.randomUUID()}`,
        semester_id: semesterId,
        user_id: userId,
        course_code: courseData.courseCode.toUpperCase().trim(),
        course_title: (courseData.courseTitle || '').trim(),
        credit_units: Number(courseData.creditUnits),
        letter_grade: courseData.letterGrade || 'A'
      };
      const { data, error } = await supabase
        .from('student_courses')
        .insert(course)
        .select('id, semester_id, user_id, course_code, course_title, credit_units, letter_grade')
        .single();
      if (error) throw error;
      return { course: data };
    }
    return this.request('/api/academic/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  async updateCourse(id, courseData) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const updates = {};
      if (courseData.courseCode) updates.course_code = courseData.courseCode.toUpperCase().trim();
      if (courseData.courseTitle) updates.course_title = courseData.courseTitle.trim();
      if (courseData.creditUnits) updates.credit_units = Number(courseData.creditUnits);
      if (courseData.letterGrade !== undefined) updates.letter_grade = courseData.letterGrade;
      const { data, error } = await supabase
        .from('student_courses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select('id, semester_id, user_id, course_code, course_title, credit_units, letter_grade')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Course not found.');
      return { course: data };
    }
    return this.request(`/api/academic/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    });
  }

  async deleteCourse(id) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { error } = await supabase
        .from('student_courses')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (error) throw error;
      return { success: true };
    }
    return this.request(`/api/academic/courses/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Study Planner & Progress ---
  async getStudyPlans() {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const userId = session.user.id;
      const [plansResult, topicsResult] = await Promise.all([
        supabase
          .from('study_plans')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('study_topics')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true })
      ]);
      const queryError = plansResult.error || topicsResult.error;
      if (queryError) throw queryError;

      const topicsByPlan = new Map();
      for (const topic of topicsResult.data || []) {
        const topics = topicsByPlan.get(topic.study_plan_id) || [];
        topics.push(topic);
        topicsByPlan.set(topic.study_plan_id, topics);
      }
      return {
        plans: (plansResult.data || []).map(plan => ({
          ...plan,
          topics: topicsByPlan.get(plan.id) || []
        }))
      };
    }
    return this.request('/api/study/plans');
  }

  async createStudyPlan(planData) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase.rpc('create_study_plan', {
        p_subject: planData.subject,
        p_goal: planData.goal,
        p_deadline: planData.deadline,
        p_study_frequency: planData.studyFrequency || 'Daily',
        p_difficulty: planData.difficulty || 'Medium',
        p_estimated_hours: Number(planData.estimatedHours) || 10,
        p_topics: Array.isArray(planData.topics) ? planData.topics : []
      });
      if (error) throw error;
      return data;
    }
    return this.request('/api/study/plans', {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  }

  async deleteStudyPlan(id) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (error) throw error;
      return { success: true };
    }
    return this.request(`/api/study/plans/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleTopic(id) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase.rpc('toggle_study_topic', { p_topic_id: id });
      if (error) throw error;
      return data;
    }
    return this.request(`/api/study/topics/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  async logStudySession(planId, durationMinutes, notes) {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase.rpc('log_study_session', {
        p_plan_id: planId || null,
        p_duration_minutes: Number(durationMinutes) || 60,
        p_notes: notes || null
      });
      if (error) throw error;
      return data;
    }
    return this.request('/api/study/logs', {
      method: 'POST',
      body: JSON.stringify({ planId, durationMinutes, notes })
    });
  }

  async getStreak() {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('study_logs')
        .select('logged_at, duration_minutes')
        .eq('user_id', session.user.id)
        .order('logged_at', { ascending: false });
      if (error) throw error;

      const dates = [...new Set((data || []).map(row => String(row.logged_at).split('T')[0]))];
      let streak = 0;
      if (dates.length) {
        const today = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().slice(0, 10);
        if (dates.includes(today) || dates.includes(yesterday)) {
          const current = new Date(dates.includes(today) ? today : yesterday);
          while (dates.includes(current.toISOString().slice(0, 10))) {
            streak += 1;
            current.setUTCDate(current.getUTCDate() - 1);
          }
        }
      }
      const totalMinutes = (data || []).reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
      return { streak, totalHours: Number((totalMinutes / 60).toFixed(1)), activeDays: dates.length };
    }
    return this.request('/api/study/streak');
  }

  // --- Privacy, Consent & Account Management ---
  async recordConsent(consents, context = 'cookie_banner') {
    return this.request('/api/consent', {
      method: 'POST',
      body: JSON.stringify({ consents, context })
    });
  }

  async getConsent() {
    return this.request('/api/consent');
  }

  async exportUserData() {
    const response = await fetch('/api/auth/export-data', {
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      }
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to export data');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studora-student-data-export.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  }

  async deleteAccount(password) {
    const res = await this.request('/api/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });
    this.logout();
    return res;
  }

  // --- Billing & Subscription (Paystack) ---
  async getBillingPlans() {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('id, code, name, description, amount_kobo, currency, interval, display_order, plan_entitlements(feature_code, is_enabled, limit_value, feature_definitions(name))')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (!error) {
      return { plans: (plans || []).map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        amount: plan.amount_kobo / 100,
        amountKobo: plan.amount_kobo,
        currency: plan.currency,
        interval: plan.interval,
        displayOrder: plan.display_order,
        entitlements: (plan.plan_entitlements || []).map((entry) => ({
          featureCode: entry.feature_code,
          featureName: entry.feature_definitions?.name,
          isEnabled: entry.is_enabled,
          limit: entry.limit_value
        }))
      })) };
    }
    return this.request('/api/billing/plans');
  }

  async getSubscription() {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', { body: { action: 'subscription' } });
      if (error) throw error;
      return data;
    }
    return this.request('/api/billing/subscription');
  }

  async getEntitlements() {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', { body: { action: 'entitlements' } });
      if (error) throw error;
      return data;
    }
    return this.request('/api/billing/entitlements');
  }

  async initializeCheckout(planCode, callbackUrl) {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', {
        body: { action: 'checkout', planCode, callbackUrl }
      });
      if (error) throw error;
      return data;
    }
    return this.request('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planCode, callbackUrl })
    });
  }

  async verifyPayment(reference) {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', {
        body: { action: 'verify', reference }
      });
      if (error) throw error;
      return data;
    }
    return this.request('/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ reference })
    });
  }

  async cancelSubscription() {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', { body: { action: 'cancel' } });
      if (error) throw error;
      return data;
    }
    return this.request('/api/billing/cancel', {
      method: 'POST'
    });
  }

  async getBillingHistory() {
    const session = await this.getSupabaseSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id, reference, amount_kobo, currency, status, paid_at, created_at, subscription_plans(name, code)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { history: (data || []).map((row) => ({
        id: row.id,
        reference: row.reference,
        planName: row.subscription_plans?.name,
        planCode: row.subscription_plans?.code,
        amount: row.amount_kobo / 100,
        amountKobo: row.amount_kobo,
        currency: row.currency,
        status: row.status,
        paidAt: row.paid_at,
        createdAt: row.created_at
      })) };
    }
    return this.request('/api/billing/history');
  }

  async getAdminBillingMetrics() {
    if ((await this.getSupabaseSession())?.user?.id) {
      const { data, error } = await supabase.functions.invoke('billing', { body: { action: 'admin_metrics' } });
      if (error) throw error;
      return data;
    }
    return this.request('/api/admin/billing');
  }

  // --- Real-time Communication (GetStream) ---
  async getStreamToken() {
    return this.request('/api/stream/token', {
      method: 'POST'
    });
  }

  async getOrCreateStreamConversation({ tutorId, recipientId, bookingId, subject, channelName } = {}) {
    return this.request('/api/stream/conversation', {
      method: 'POST',
      body: JSON.stringify({ tutorId, recipientId, bookingId, subject, channelName })
    });
  }
}

export const api = new ApiClient();
