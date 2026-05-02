import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformsAPI } from '../api';
import useAuthStore from '../store/authStore';

const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', icon: '🟣', color: '#a78bfa', gradient: 'linear-gradient(135deg, #6c5ce7, #a78bfa)', placeholder: 'e.g. tourist', profileUrl: (h) => `https://codeforces.com/profile/${h}` },
  { key: 'leetcode', label: 'LeetCode', icon: '🟡', color: '#f0a030', gradient: 'linear-gradient(135deg, #e09000, #f0c060)', placeholder: 'e.g. neetcode', profileUrl: (h) => `https://leetcode.com/u/${h}` },
  { key: 'codechef', label: 'CodeChef', icon: '🔵', color: '#22d3ee', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)', placeholder: 'e.g. codechef_master', profileUrl: (h) => `https://www.codechef.com/users/${h}` },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const [form, setForm] = useState({ codeforces: '', leetcode: '', codechef: '' });
  const [original, setOriginal] = useState({ codeforces: '', leetcode: '', codechef: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await platformsAPI.getStatus();
        const { status } = res.data;
        const handles = {
          codeforces: status.codeforces?.handle || '',
          leetcode: status.leetcode?.handle || '',
          codechef: status.codechef?.handle || '',
        };
        setForm(handles);
        setOriginal(handles);
      } catch (err) {
        console.error('Failed to fetch platform status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const hasAnyHandle = Object.values(original).some((h) => h && h.trim());
  const hasChanges = JSON.stringify(form) !== JSON.stringify(original);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.codeforces.trim() && !form.leetcode.trim() && !form.codechef.trim()) {
      setError('Please provide at least one platform handle.');
      return;
    }

    setSaving(true);
    try {
      await platformsAPI.connect(form);
      setOriginal({ ...form });
      setSuccess('Platform handles updated successfully!');
      setEditMode(false);
      await checkAuth();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update handles. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...original });
    setEditMode(false);
    setError('');
    setSuccess('');
  };

  const connectedCount = Object.values(original).filter((h) => h && h.trim()).length;

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.75rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #eef2ff, #c4b5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
          }}>
            ⚙️ Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage your platform handles and account preferences
          </p>
        </div>

        <div className="card" style={{ padding: '24px 28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(168,85,247,0.1))',
              border: '1px solid rgba(124,92,252,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}>
              👤
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '2px',
              }}>
                {user?.username || 'User'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.email || ''}
              </div>
            </div>
            <div style={{
              background: connectedCount > 0
                ? 'rgba(52, 211, 153, 0.1)'
                : 'rgba(251, 191, 36, 0.1)',
              border: `1px solid ${connectedCount > 0 ? 'rgba(52, 211, 153, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: connectedCount > 0 ? '#34d399' : '#fbbf24',
            }}>
              {connectedCount}/3 Connected
            </div>
            <button
              onClick={handleLogout}
              className="btn btn--outline btn--sm"
              style={{ color: 'var(--accent-red)', borderColor: 'rgba(248, 113, 113, 0.3)', marginLeft: '8px' }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '28px 28px 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                🔗 Platform Handles
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {hasAnyHandle
                  ? 'Your linked competitive programming profiles'
                  : 'Link your profiles to start tracking stats'}
              </p>
            </div>
            {!editMode && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setEditMode(true)}
                style={{ flexShrink: 0 }}
              >
                ✏️ {hasAnyHandle ? 'Edit Handles' : 'Add Handles'}
              </button>
            )}
          </div>

          {error && <div className="alert alert--error">{error}</div>}
          {success && <div className="alert alert--success">{success}</div>}

          {!editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PLATFORMS.map((p) => {
                const handle = original[p.key];
                const isConnected = handle && handle.trim();
                return (
                  <div
                    key={p.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isConnected ? `${p.color}25` : 'var(--border-color)'}`,
                      background: isConnected
                        ? `linear-gradient(135deg, ${p.color}08, transparent)`
                        : 'rgba(12, 16, 36, 0.4)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isConnected
                        ? `${p.color}15`
                        : 'rgba(124, 92, 252, 0.06)',
                      border: `1px solid ${isConnected ? `${p.color}30` : 'var(--border-color)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}>
                      {p.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: isConnected ? p.color : 'var(--text-muted)',
                        marginBottom: '1px',
                      }}>
                        {p.label}
                      </div>
                      {isConnected ? (
                        <a
                          href={p.profileUrl(handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = p.color}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                          {handle}
                          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>↗</span>
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Not connected
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isConnected ? '#34d399' : 'var(--text-muted)',
                      boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.4)' : 'none',
                      flexShrink: 0,
                    }} />
                  </div>
                );
              })}

              {!hasAnyHandle && (
                <div style={{
                  textAlign: 'center',
                  padding: '20px 16px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.5 }}>🔗</div>
                  No platform handles connected yet.
                  <br />
                  <span style={{ color: 'var(--accent-primary-hover)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setEditMode(true)}>
                    Click "Add Handles" to get started →
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {PLATFORMS.map((p) => (
                  <div key={p.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{p.icon}</span>
                      <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Handle</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={p.placeholder}
                        value={form[p.key]}
                        onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
                        maxLength={64}
                        style={{
                          borderColor: form[p.key] ? `${p.color}40` : undefined,
                          paddingRight: form[p.key] !== original[p.key] ? '36px' : undefined,
                        }}
                      />
                      {form[p.key] !== original[p.key] && (
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.65rem',
                          color: '#fbbf24',
                          fontWeight: 700,
                          background: 'rgba(251, 191, 36, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                        }}>
                          MODIFIED
                        </span>
                      )}
                    </div>
                    {form[p.key] && form[p.key] === original[p.key] && (
                      <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '2px' }}>
                        ✓ Currently connected
                      </div>
                    )}
                    {form[p.key] && form[p.key] !== original[p.key] && (
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '2px' }}>
                        ⚡ Will be updated on save
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  style={{ flex: 1 }}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ flex: 2 }}
                  disabled={saving || !hasChanges}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </div>

              {!hasChanges && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}>
                  No changes to save
                </div>
              )}
            </form>
          )}
        </div>

        <div className="card" style={{ padding: '20px 24px', marginTop: '24px' }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            💡 Quick Tips
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { text: 'Use your exact handle as it appears on the platform', icon: '🎯' },
              { text: 'You can update handles anytime from this page', icon: '🔄' },
              { text: 'After updating, sync your data from the Dashboard', icon: '📊' },
            ].map((tip, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}>
                <span>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
