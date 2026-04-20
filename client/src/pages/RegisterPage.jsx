import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const register = useAuthStore(state => state.register);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    handles: { codeforces: '' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await register(form);
      
      const hasPlatformHandles = user.platformHandles && Object.values(user.platformHandles).some(h => h && h.trim());
      const hasLegacyHandles = user.handles && Object.values(user.handles).some(h => h && h.trim());
      
      if (!hasPlatformHandles && !hasLegacyHandles) {
        navigate('/connect-platforms');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="card form-card">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>Create account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Start tracking your competitive programming stats
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                id="register-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="register-username"
                type="text"
                className="form-input"
                placeholder="yourname"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                minLength={3}
                maxLength={30}
                pattern="^[a-zA-Z0-9_-]+$"
                title="Username may only contain letters, numbers, underscores, and hyphens"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Codeforces Handle</label>
              <input
                id="register-cf-handle"
                type="text"
                className="form-input"
                placeholder="your_cf_handle (optional)"
                value={form.handles.codeforces}
                onChange={(e) =>
                  setForm({ ...form, handles: { ...form.handles, codeforces: e.target.value } })
                }
                maxLength={64}
                pattern="^[a-zA-Z0-9_.-]*$"
                title="Valid characters: letters, numbers, underscores, dots, hyphens"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="register-password"
                type="password"
                className="form-input"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                maxLength={128}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                id="register-confirm-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={8}
                maxLength={128}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn--primary btn--lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
