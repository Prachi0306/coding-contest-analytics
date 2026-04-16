import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request Interceptor: Attach JWT ──────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Handle errors ──────────
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject({ message, status });
  }
);

// ─── Auth ─────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Contests ─────────────────────────────────────
export const contestAPI = {
  getContests: (params) => api.get('/contests', { params }),
  getContestById: (id, platform) =>
    api.get(`/contests/${id}`, { params: { platform } }),
  getContestStats: () => api.get('/contests/stats'),
};

// ─── Stats ────────────────────────────────────────
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
    api.get('/stats/leaderboard', { params }),
};

// ─── Sync ─────────────────────────────────────────
export const syncAPI = {
  syncContests: () => api.post('/sync/contests'),
  syncMyRatings: () => api.post('/sync/my-ratings'),
};

export default api;
