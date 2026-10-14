/**
 * Masal AI — Frontend API Client
 * Single integration layer for all backend REST endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.detail || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.code = data?.error?.code || 'API_ERROR';
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkErr = new Error('Cannot connect to backend server. Ensure backend is running on port 8000.');
      networkErr.code = 'NETWORK_ERROR';
      throw networkErr;
    }
    throw error;
  }
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => request('/dashboard/metrics'),

  // Leads
  getLeads: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params.status && params.status !== 'all') searchParams.set('status_filter', params.status);
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);
    
    const query = searchParams.toString();
    return request(`/leads${query ? `?${query}` : ''}`);
  },

  getLead: (leadId) => request(`/leads/${leadId}`),

  createLead: (leadData) =>
    request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    }),

  updateLead: (leadId, updateData) =>
    request(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),

  deleteLead: (leadId) =>
    request(`/leads/${leadId}`, {
      method: 'DELETE',
    }),

  analyzeLead: (leadId) =>
    request(`/leads/${leadId}/analyze`, {
      method: 'POST',
    }),

  generateCallBrief: (leadId) =>
    request(`/leads/${leadId}/brief`, {
      method: 'POST',
    }),

  // Chat
  sendChatMessage: (leadId, message) =>
    request(`/leads/${leadId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getChatHistory: (leadId) => request(`/leads/${leadId}/chat/history`),

  // Tasks
  getTasks: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.leadId) searchParams.set('lead_id', params.leadId);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },

  createTask: (taskData) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),

  updateTask: (taskId, updateData) =>
    request(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),

  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),
};
