import { create } from 'zustand';
import { authAPI } from '../api';

const useAuthStore = create((set) => ({
  user: (() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  })(),
  loading: true,

  setLoading: (loading) => set({ loading }),

  checkAuth: async () => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const res = await authAPI.getProfile();
        const { user } = res.data;
        set({ user, loading: false });
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }
  },

  login: async (credentials) => {
    const res = await authAPI.login(credentials);
    const { user: u, tokens } = res.data;
    localStorage.setItem('token', tokens.accessToken);
    localStorage.setItem('user', JSON.stringify(u));
    set({ user: u });
    return u;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    const { user: u, tokens } = res.data;
    localStorage.setItem('token', tokens.accessToken);
    localStorage.setItem('user', JSON.stringify(u));
    set({ user: u });
    return u;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null });
  },
}));

export default useAuthStore;
