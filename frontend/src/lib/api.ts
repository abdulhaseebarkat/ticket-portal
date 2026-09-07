import axios from 'axios';

const TOKEN_KEY = 'plantit-token';
const EMAIL_KEY = 'plantit-email';

export const getStoredToken = () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
export const getStoredEmail = () => (typeof window !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null);
export const setStoredAuth = (token: string, email: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
};
export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
};

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the session token to every request.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the session is missing/expired - clear it and send the user back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      clearStoredAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data as { token: string; email: string };
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data as { message: string };
};

export const fetchBridgeStatus = async () => {
  const response = await api.get('/whatsapp/bridge-status');
  return response.data as {
    connected: boolean;
    stale: boolean;
    status: string;
    lastHeartbeatAt: string | null;
    minutesSinceLastHeartbeat: number | null;
  };
};

export const fetchDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const simulateWhatsApp = async (payload: { groupName: string; employeeName: string; message: string }) => {
  await api.post('/whatsapp/simulate', payload);
};

export const fetchComplaintDetail = async (id: number) => {
  const response = await api.get(`/complaints/${id}`);
  return response.data;
};

export const fetchAllComplaints = async () => {
  const response = await api.get('/complaints');
  return response.data;
};

export const fetchEmployees = async () => {
  const response = await api.get('/employees');
  return response.data;
};

export const fetchGroups = async () => {
  const response = await api.get('/whatsapp/groups');
  return response.data;
};

export const updateGroup = async (
  id: number,
  patch: { name: string; area: string | null; active: boolean; monitoringEnabled: boolean; defaultCategory: string | null }
) => {
  const response = await api.patch(`/whatsapp/groups/${id}`, patch);
  return response.data;
};

export const replayGroupMessages = async (id: number) => {
  const response = await api.post(`/whatsapp/groups/${id}/replay`);
  return response.data as { messagesReplayed: number };
};

export default api;
