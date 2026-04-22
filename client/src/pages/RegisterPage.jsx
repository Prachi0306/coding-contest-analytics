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
    <div className="login-layout">
      {/* Left — Form Side */}
      <div className="login-form-side">
        <div className="login-card">
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 8px rgba(124,92,252,0.5))' }}>⚡</span>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.2rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #eef2ff, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>CodeContest Analytics</span>
            </div>
            <h1>Create Your Account</h1>
            <p className="login-subtitle">Start tracking your competitive programming stats</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
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
              style={{ width: '100%', marginTop: '12px' }}
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '🚀 Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right — Visual Side */}
      <div className="login-visual-side">
        <div className="login-visual-content">
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(168,85,247,0.1))',
            border: '1px solid rgba(124,92,252,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3.5rem',
          }}>
            🚀
          </div>

          <h2>Join the Community</h2>
          <p style={{ margin: '0 auto' }}>
            Connect your competitive programming profiles and unlock powerful analytics, leaderboards, and insights.
          </p>

          {/* Platform showcase */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '32px',
            flexWrap: 'wrap',
          }}>
            {[
              { name: 'Codeforces', color: '#6c5ce7', icon: '🟣' },
              { name: 'LeetCode', color: '#f0a030', icon: '🟡' },
              { name: 'CodeChef', color: '#06b6d4', icon: '🔵' },
            ].map((p, i) => (
              <div key={i} style={{
                background: 'rgba(15, 20, 45, 0.6)',
                border: `1px solid ${p.color}33`,
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'center',
                minWidth: '100px',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{p.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: p.color }}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
