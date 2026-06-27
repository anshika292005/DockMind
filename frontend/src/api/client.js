import axios from 'axios';

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://docmind-backend-ecoh.onrender.com';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export function buildApiUrl(path) {
  if (!path) return API_BASE_URL;
  const cleanPath = path.startsWith('/api') ? path.slice(4) : path;
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
  }
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout
});

client.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('docmind_settings');
    const settings = stored ? JSON.parse(stored) : null;
    if (settings) {
      if (settings.groqApiKey) {
        config.headers['X-Groq-Api-Key'] = settings.groqApiKey;
      }
      if (settings.model) {
        config.headers['X-Groq-Model'] = settings.model;
      }
    }
  } catch (e) {
    console.error('Failed to load settings in interceptor:', e);
  }
  return config;
});

// Generic helper methods used by hooks (returns { success, data } shape)
async function safeRequest(fn) {
  try {
    const res = await fn();
    return { success: true, data: res.data };
  } catch (err) {
    console.error('API error:', err);
    return { success: false, error: err?.response?.data || err.message };
  }
}

export const api = {
  // Generic REST helpers
  get: (url) => safeRequest(() => client.get(url)),
  post: (url, body) => safeRequest(() => client.post(url, body)),
  delete: (url) => safeRequest(() => client.delete(url)),

  // Documents
  uploadDocument: async (file, { onUploadProgress } = {}) => {
    const formData = new FormData();
    formData.append('files', file);
    return client.post('/upload', formData, {
      onUploadProgress,
      timeout: 120000,
    });
  },
  getUploadJob: async (jobId) => {
    return client.get(`/upload/jobs/${encodeURIComponent(jobId)}`, {
      timeout: 30000,
    });
  },
  getDocuments: async () => {
    return client.get('/documents');
  },
  deleteDocument: async (filename) => {
    return client.delete(`/documents/${encodeURIComponent(filename)}`);
  },
  
  // Evaluation
  getEvalResults: async () => {
    return client.get('/eval/results');
  },
  runEvaluation: async () => {
    return client.post('/eval/run');
  },

  // Deep Research
  runDeepResearch: async (query, { filename = null, sessionId = null } = {}) => {
    const body = { question: query };
    if (filename) body.filename = filename;
    if (sessionId) body.session_id = sessionId;
    return client.post('/research', body);
  },
};

export default client;
