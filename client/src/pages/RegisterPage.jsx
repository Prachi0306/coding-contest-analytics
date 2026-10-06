import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authAPI } from '../api';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await register(form);
      
      if (result.requiresVerification) {
        setVerificationPending(true);
        setVerificationEmail(result.email);
        return;
      }
      
      const user = result;
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



  const handleResend = async () => {
    setError('');
    try {
      await authAPI.resendVerification({ email: verificationEmail });
      alert('Verification email resent!');
    } catch (err) {
      setError(err.message || 'Failed to resend email');
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
            <h1>Create Your Account</h1>
            <p className="login-subtitle">Start tracking your competitive programming stats</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}
          {verificationPending ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
              <h3>Check your email</h3>
              <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                We sent a verification link to <strong>{verificationEmail}</strong>. Please click the link to verify your account.
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                Didn't receive the email? <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>Resend Link</button>
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
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
                autoComplete="off"
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
                pattern="^[a-zA-Z0-9_\-]+$"
                title="Username may only contain letters, numbers, underscores, and hyphens"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle-btn"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
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
          )}


          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
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
            🚀
          </div>

          <h2>Join the Community</h2>
          <p style={{ margin: '0 auto' }}>
            Connect your competitive programming profiles and unlock powerful analytics, leaderboards, and insights.
          </p>

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
