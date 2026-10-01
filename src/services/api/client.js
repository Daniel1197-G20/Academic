// Unified API client for Academic Platform with session token persistence
const TOKEN_KEY = 'academic_platform_token';

class ApiClient {
  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json().catch(() => ({}));

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
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // --- Academic / CGPA ---
  async getScales() {
    return this.request('/api/academic/scales');
  }

  async getAcademicRecords() {
    return this.request('/api/academic/records');
  }

  async updateSelectedScale(scaleId) {
    return this.request('/api/academic/settings/scale', {
      method: 'PUT',
      body: JSON.stringify({ scaleId })
    });
  }

  async createSemester(academicYear, semesterName) {
    return this.request('/api/academic/semesters', {
      method: 'POST',
      body: JSON.stringify({ academicYear, semesterName })
    });
  }

  async deleteSemester(id) {
    return this.request(`/api/academic/semesters/${id}`, {
      method: 'DELETE'
    });
  }

  async duplicateSemester(id) {
    return this.request(`/api/academic/semesters/${id}/duplicate`, {
      method: 'POST'
    });
  }

  async addCourse(courseData) {
    return this.request('/api/academic/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  async updateCourse(id, courseData) {
    return this.request(`/api/academic/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    });
  }

  async deleteCourse(id) {
    return this.request(`/api/academic/courses/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Study Planner & Progress ---
  async getStudyPlans() {
    return this.request('/api/study/plans');
  }

  async createStudyPlan(planData) {
    return this.request('/api/study/plans', {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  }

  async deleteStudyPlan(id) {
    return this.request(`/api/study/plans/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleTopic(id) {
    return this.request(`/api/study/topics/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  async logStudySession(planId, durationMinutes, notes) {
    return this.request('/api/study/logs', {
      method: 'POST',
      body: JSON.stringify({ planId, durationMinutes, notes })
    });
  }

  async getStreak() {
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
    a.download = `academic-platform-student-data-export.json`;
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
}

export const api = new ApiClient();
