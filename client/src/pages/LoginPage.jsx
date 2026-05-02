import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      
      const hasPlatformHandles = user.platformHandles && Object.values(user.platformHandles).some(h => h && h.trim());
      const hasLegacyHandles = user.handles && Object.values(user.handles).some(h => h && h.trim());
      
      if (!hasPlatformHandles && !hasLegacyHandles) {
        navigate('/connect-platforms');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
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
            <h1>Login to Your Account</h1>
            <p className="login-subtitle">Enter your credentials to access your dashboard</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="login-extras">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Remember Me
              </label>
              <a href="#" style={{ fontSize: '0.82rem' }}>Forgot Password?</a>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn--primary btn--lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? '⏳ Signing in...' : 'Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>Sign Up</Link>
          </p>
        </div>
      </div>

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
            🏆
          </div>

          <h2>CodeContest Analytics</h2>
          <p style={{ margin: '0 auto' }}>
            Track ratings across Codeforces, LeetCode & CodeChef. Visualize your growth and compete globally.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '32px',
            maxWidth: '320px',
            margin: '32px auto 0',
          }}>
            {[
              { title: 'Analytics', desc: 'Track your ratings', icon: '📊', color: '#a78bfa' },
              { title: 'Leaderboard', desc: 'Compete globally', icon: '🌍', color: '#f0a030' },
              { title: 'Upsolving', desc: 'Improve your skills', icon: '📝', color: '#34d399' },
              { title: 'Auto Sync', desc: 'Real-time updates', icon: '🔄', color: '#22d3ee' },
            ].map((f, i) => (
              <div key={i} style={{
                background: 'rgba(15, 20, 45, 0.6)',
                border: `1px solid ${f.color}33`,
                borderRadius: '12px',
                padding: '16px 12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: f.color,
                  marginBottom: '4px',
                }}>{f.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
