/**
 * Central API Service Layer for Practical 6 Full-Stack Integration
 * Connects React UI (port 5173) to Node/Express/MongoDB Backend (port 5000)
 */

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Standardized Fetch Helper with JSON parsing and error extraction
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
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
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server at ${BASE_URL}. Ensure Express backend is running on port 5000 and CORS is enabled.`);
    }
    throw err;
  }
}

/**
 * Get all tasks with query parameters (search, status, priority, page, limit)
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
 * Health check to ping backend server
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/tasks?limit=1`, { method: 'GET' });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
