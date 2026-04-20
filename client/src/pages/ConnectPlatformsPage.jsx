import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformsAPI } from '../api';
import useAuthStore from '../store/authStore';

export default function ConnectPlatformsPage() {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [form, setForm] = useState({ codeforces: '', leetcode: '', codechef: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch current status so the form reflects already connected platforms
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
        // Not setting blocking error so user can still try to connect
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

    // Require at least one handle
    if (!form.codeforces.trim() && !form.leetcode.trim() && !form.codechef.trim()) {
      setError('Please provide at least one platform handle to continue.');
      return;
    }

    setSaving(true);
    try {
      await platformsAPI.connect(form);
      setSuccess('Platforms connected successfully! Redirecting...');
      
      // Re-check auth to update the global `user.platformHandles` state
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
      <div className="container">
        <div className="card form-card">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>
            Connect Platforms
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Link your competitive programming profiles to track your stats in one place. You can leave fields blank.
          </p>

          {error && <div className="alert alert--error">{error}</div>}
          {success && <div className="alert alert--success">{success}</div>}

          <form onSubmit={handleSubmit}>
            {/* Codeforces */}
            <div className="form-group">
              <label className="form-label">Codeforces Handle</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. tourist"
                value={form.codeforces}
                onChange={(e) => setForm({ ...form, codeforces: e.target.value })}
                maxLength={64}
              />
            </div>

            {/* LeetCode */}
            <div className="form-group">
              <label className="form-label">LeetCode Handle</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. neetcode"
                value={form.leetcode}
                onChange={(e) => setForm({ ...form, leetcode: e.target.value })}
                maxLength={64}
              />
            </div>

            {/* CodeChef */}
            <div className="form-group">
              <label className="form-label">CodeChef Handle</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. codechef_master"
                value={form.codechef}
                onChange={(e) => setForm({ ...form, codechef: e.target.value })}
                maxLength={64}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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
                {saving ? 'Connecting...' : 'Connect Accounts'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
