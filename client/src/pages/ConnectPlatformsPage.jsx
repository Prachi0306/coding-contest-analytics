import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformsAPI } from '../api';
import useAuthStore from '../store/authStore';

const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', icon: '🟣', color: '#a78bfa', placeholder: 'e.g. tourist' },
  { key: 'leetcode', label: 'LeetCode', icon: '🟡', color: '#f0a030', placeholder: 'e.g. neetcode' },
  { key: 'codechef', label: 'CodeChef', icon: '🔵', color: '#22d3ee', placeholder: 'e.g. codechef_master' },
];

export default function ConnectPlatformsPage() {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [form, setForm] = useState({ codeforces: '', leetcode: '', codechef: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await platformsAPI.getStatus();
        const { status } = res.data;
        setForm({
          codeforces: status.codeforces?.handle || '',
          leetcode: status.leetcode?.handle || '',
          codechef: status.codechef?.handle || '',
        });
      } catch (err) {
        console.error('Failed to fetch platform status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.codeforces.trim() && !form.leetcode.trim() && !form.codechef.trim()) {
      setError('Please provide at least one platform handle to continue.');
      return;
    }

    setSaving(true);
    try {
      await platformsAPI.connect(form);
      setSuccess('Platforms connected successfully! Redirecting...');
      await checkAuth();
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to connect platforms. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '560px', margin: '0 auto', padding: '0 24px' }}>
        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(168,85,247,0.08))',
              border: '1px solid rgba(124,92,252,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
            }}>
              🔗
            </div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '6px',
              background: 'linear-gradient(135deg, #eef2ff, #c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Connect Your Platforms
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Link your competitive programming profiles to track your stats in one place.
            </p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}
          {success && <div className="alert alert--success">{success}</div>}

          <form onSubmit={handleSubmit}>
            {PLATFORMS.map((p) => (
              <div key={p.key} className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{p.icon}</span>
                  <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Handle</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={p.placeholder}
                  value={form[p.key]}
                  onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
                  maxLength={64}
                  style={{
                    borderColor: form[p.key] ? `${p.color}40` : undefined,
                  }}
                />
                {form[p.key] && (
                  <div style={{ fontSize: '0.72rem', color: p.color, marginTop: '2px' }}>
                    ✓ Handle entered
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button
                type="button"
                className="btn btn--outline btn--lg"
                style={{ flex: 1 }}
                onClick={handleSkip}
                disabled={saving}
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--lg"
                style={{ flex: 2 }}
                disabled={saving}
              >
                {saving ? '⏳ Connecting...' : '🔗 Connect Accounts'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
