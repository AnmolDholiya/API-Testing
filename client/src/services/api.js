/**
 * Central API Service Layer for Practical 6 & Practical 7
 * Handles:
 * - JWT Token Storage & Automatic Authorization Header Injection
 * - Auto-Port Fallback (port 5000 / 3000)
 * - User Authentication (register, login, getMe, logout)
 * - Task CRUD and Level 3 HATEOAS Execution
 */

export let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FALLBACK_PORTS = ['http://localhost:5000', 'http://localhost:3000'];
const TOKEN_STORAGE_KEY = 'adwf_auth_token';
const USER_STORAGE_KEY = 'adwf_auth_user';

export function setBaseUrl(newUrl) {
  BASE_URL = newUrl;
}

/**
 * Token & User Local Storage Management
 */
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Standardized Fetch Helper with JWT Header Injection and auto-port recovery
 */
async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const attemptFetch = async (baseUrl) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // 401 Unauthorized handling
      if (response.status === 401) {
        const errorMsg = (data && (data.error || data.message)) || 'Unauthorized - Please login';
        const error = new Error(errorMsg);
        error.status = 401;
        error.isAuthError = true;
        throw error;
      }

      let errorMessage = (data && (data.error || data.message)) || `HTTP ${response.status}: ${response.statusText}`;
      if (data && Array.isArray(data.details)) {
        errorMessage = `${errorMessage} - ${data.details.map(d => `${d.field}: ${d.message}`).join(', ')}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  };

  try {
    return await attemptFetch(BASE_URL);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      for (const altUrl of FALLBACK_PORTS) {
        if (altUrl !== BASE_URL) {
          try {
            const data = await attemptFetch(altUrl);
            BASE_URL = altUrl;
            return data;
          } catch {
            // continue fallback
          }
        }
      }
      throw new Error(`Cannot connect to backend server at ${BASE_URL}. Ensure Express server is running on port 5000 and MongoDB is connected.`);
    }
    throw err;
  }
}

// ── Authentication Endpoints ──────────────────────────────────────────────────

/**
 * User Registration (POST /auth/register)
 */
export async function registerUser({ name, email, password }) {
  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  if (res && res.token) {
    setToken(res.token);
    setStoredUser(res.user);
  }
  return res;
}

/**
 * User Login (POST /auth/login)
 */
export async function loginUser({ email, password }) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res && res.token) {
    setToken(res.token);
    setStoredUser(res.user);
  }
  return res;
}

/**
 * Get Authenticated User Profile (GET /auth/me)
 */
export async function getMe() {
  return await request('/auth/me', { method: 'GET' });
}

// ── Task Management Endpoints (Protected by JWT) ──────────────────────────────

/**
 * Get all tasks with query parameters
 */
export async function getTasks(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.priority) query.append('priority', params.priority);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/tasks${queryString ? `?${queryString}` : ''}`;
  return await request(endpoint, { method: 'GET' });
}

/**
 * Get single task by ID
 */
export async function getTaskById(id) {
  return await request(`/tasks/${id}`, { method: 'GET' });
}

/**
 * Create a new task (POST /tasks)
 */
export async function createTask(taskData) {
  return await request('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
}

/**
 * Full update of existing task (PUT /tasks/:id)
 */
export async function updateTask(id, taskData) {
  return await request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });
}

/**
 * Partial update of existing task (PATCH /tasks/:id)
 */
export async function patchTask(id, partialData) {
  return await request(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(partialData)
  });
}

/**
 * Delete a task (DELETE /tasks/:id)
 */
export async function deleteTask(id) {
  return await request(`/tasks/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Direct execution of hypermedia / HATEOAS action
 */
export async function executeHypermediaAction(href, method = 'GET', body = null) {
  const options = { method };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }
  return await request(href, options);
}

/**
 * Health check to ping backend server with auto-port detection
 */
export async function checkBackendHealth() {
  for (const url of [BASE_URL, ...FALLBACK_PORTS.filter(u => u !== BASE_URL)]) {
    try {
      const res = await fetch(`${url}/tasks/test-error`, { method: 'GET' });
      // If server responds with 500 from error handler, it's alive!
      if (res.status === 500 || res.status === 200 || res.status === 401) {
        BASE_URL = url;
        return { ok: true, status: res.status, url };
      }
    } catch {
      // try next
    }
  }
  return { ok: false, error: 'Connection failed' };
}
