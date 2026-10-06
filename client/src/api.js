import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    const status = error.response?.status;

    if (status === 401 && !window.location.pathname.includes('/login') && !error.config?.url?.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject({ message, status });
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateUsername: (data) => api.put('/auth/username', data),
  updateAvatar: (data) => api.put('/auth/avatar', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
};

export const platformsAPI = {
  getProfile: () => api.get('/platforms/profile'),
  getStatus: () => api.get('/platforms/status'),
  connect: (data) => api.post('/platforms/connect', data),
};

export const contestAPI = {
  getContests: (params) => api.get('/contests', { params }),
  getCategorizedContests: (params) => api.get('/contests/categorized', { params }),
  getContestById: (id, platform) =>
    api.get(`/contests/${id}`, { params: { platform } }),
  getContestStats: () => api.get('/contests/stats'),
};

export const scheduleAPI = {
  getSchedule: () => api.get('/schedule'),
  addBookmark: (contestId) => api.post('/schedule/star', { contestId }),
  removeBookmark: (contestId) => api.delete('/schedule/unstar', { data: { contestId } }),
};

export const statsAPI = {
  getRatingHistory: (platform) =>
    api.get('/stats/rating-history', { params: { platform } }),
  getSummary: (platform) =>
    api.get('/stats/summary', { params: { platform } }),
  getContestHistory: (params) =>
    api.get('/stats/contest-history', { params }),
  getLatestRating: (platform) =>
    api.get('/stats/latest-rating', { params: { platform } }),
  getCodeforcesProfile: () => api.get('/stats/codeforces-profile'),
  getLeaderboard: (params) =>
    api.get('/leaderboard', { params }),
};

export const syncAPI = {
  syncContests: () => api.post('/sync/contests'),
  syncMyRatings: () => api.post('/sync/my-ratings'),
};

export const upsolveAPI = {
  getUpsolveList: (contestId) => api.get(`/upsolve/${contestId}`),
  updateSolveStatus: (contestId, problemId, data) =>
    api.put(`/upsolve/${contestId}/${problemId}`, data),
  getStats: () => api.get('/upsolve/stats'),
  getContests: () => api.get('/upsolve/contests'),
  syncContest: (contestId, platform = 'codeforces') =>
    api.post(`/upsolve/sync/${contestId}`, { platform }, { params: { platform } }),
};

export default api;
