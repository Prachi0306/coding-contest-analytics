import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformsAPI, authAPI } from '../api';
import useAuthStore from '../store/authStore';

const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', icon: '🟣', color: '#a78bfa', gradient: 'linear-gradient(135deg, #6c5ce7, #a78bfa)', placeholder: 'e.g. tourist', profileUrl: (h) => `https://codeforces.com/profile/${h}` },
  { key: 'leetcode', label: 'LeetCode', icon: '🟡', color: '#f0a030', gradient: 'linear-gradient(135deg, #e09000, #f0c060)', placeholder: 'e.g. neetcode', profileUrl: (h) => `https://leetcode.com/u/${h}` },
  { key: 'codechef', label: 'CodeChef', icon: '🔵', color: '#22d3ee', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)', placeholder: 'e.g. codechef_master', profileUrl: (h) => `https://www.codechef.com/users/${h}` },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

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

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState({ error: '', success: '' });

  // Avatar state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ error: '', success: '' });

  useEffect(() => {
    if (user?.username) {
      setUsernameInput(user.username);
    }
  }, [user]);

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

  const compressImage = (file, maxSize = 400, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarMsg({ error: '', success: '' });

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setAvatarMsg({ error: 'Invalid file format. Please upload JPG, PNG, or WebP.', success: '' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ error: 'File size exceeds 5MB limit.', success: '' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressedDataUrl = await compressImage(file);
      const res = await authAPI.updateAvatar({ avatar: compressedDataUrl });
      if (res.data?.user) {
        updateUser(res.data.user);
        await checkAuth();
        setAvatarMsg({ error: '', success: 'Profile picture updated successfully!' });
        setTimeout(() => setAvatarMsg((prev) => ({ ...prev, success: '' })), 4000);
      }
    } catch (err) {
      setAvatarMsg({ error: err.message || 'Failed to upload profile picture.', success: '' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    setUsernameMsg({ error: '', success: '' });

    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
      setUsernameMsg({ error: 'Username must be between 3 and 30 characters.', success: '' });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setUsernameMsg({ error: 'Username may only contain letters, numbers, underscores, and hyphens.', success: '' });
      return;
    }

    setSavingUsername(true);
    try {
      const res = await authAPI.updateUsername({ username: trimmed });
      if (res.data?.user) {
        updateUser(res.data.user);
        await checkAuth();
        setUsernameMsg({ error: '', success: 'Username updated successfully!' });
        setEditingUsername(false);
        setTimeout(() => setUsernameMsg((prev) => ({ ...prev, success: '' })), 4000);
      }
    } catch (err) {
      setUsernameMsg({ error: err.message || 'Failed to update username.', success: '' });
    } finally {
      setSavingUsername(false);
    }
  };

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
            Manage your profile, platform handles, and account preferences
          </p>
        </div>

        {/* Profile Card with Avatar & Username */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: '24px' }}>
          {avatarMsg.error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{avatarMsg.error}</div>}
          {avatarMsg.success && <div className="alert alert--success" style={{ marginBottom: '16px' }}>{avatarMsg.success}</div>}
          {usernameMsg.error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{usernameMsg.error}</div>}
          {usernameMsg.success && <div className="alert alert--success" style={{ marginBottom: '16px' }}>{usernameMsg.success}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar with Click-to-Upload */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(168,85,247,0.1))',
                  border: '2px solid rgba(124,92,252,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change profile picture"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  '👤'
                )}

                {uploadingAvatar && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    color: '#fff',
                  }}>
                    ⏳
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn btn--secondary btn--sm"
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  padding: '4px 6px',
                  fontSize: '0.65rem',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Change Avatar"
              >
                📷
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Username / Email Section */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              {!editingUsername ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    {user?.username || 'User'}
                  </div>
                  <button
                    onClick={() => {
                      setUsernameInput(user?.username || '');
                      setEditingUsername(true);
                      setUsernameMsg({ error: '', success: '' });
                    }}
                    className="btn btn--sm"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                    }}
                    title="Edit username"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveUsername} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.9rem', maxWidth: '160px' }}
                    placeholder="New username"
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn--primary btn--sm"
                    disabled={savingUsername || !usernameInput.trim()}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    {savingUsername ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setEditingUsername(false);
                      setUsernameInput(user?.username || '');
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Cancel
                  </button>
                </form>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {user?.email || ''}
              </div>
            </div>

            {/* Connection badge & logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ color: 'var(--accent-red)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
              >
                Logout
              </button>
            </div>
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
