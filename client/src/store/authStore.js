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
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    if (token && !currentUser) {
      try {
        const res = await authAPI.getProfile();
        set({ user: res.data.user, loading: false });
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, loading: false });
      }
    } else {
      set({ loading: false });
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
