import { useState, useEffect } from 'react';
import { statsAPI } from '../api';

const PLATFORM_CONFIG = {
  codeforces: { label: 'Codeforces', color: '#a78bfa', icon: '🟣' },
  leetcode: { label: 'LeetCode', color: '#f0a030', icon: '🟡' },
  codechef: { label: 'CodeChef', color: '#22d3ee', icon: '🔵' },
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('codeforces');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    setLoading(true);
    statsAPI
      .getLeaderboard({ platform, limit: 20 })
      .then((res) => setLeaderboard(res.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [platform]);

  const currentPlatform = PLATFORM_CONFIG[platform];

  const getRankBadge = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  // Sort leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'rating') return (b.latestRating || 0) - (a.latestRating || 0);
    if (sortBy === 'max') return (b.maxRating || 0) - (a.maxRating || 0);
    if (sortBy === 'contests') return (b.totalContests || 0) - (a.totalContests || 0);
    return 0;
  });

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div>
            <h1 className="section-title">Leaderboard</h1>
            <p className="section-subtitle">Top rated competitive programmers</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Sort Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
            }}>
              <span>Filter</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="rating">Rating</option>
                <option value="max">Max Rating</option>
                <option value="contests">Contests</option>
              </select>
            </div>
          </div>
        </div>

        {/* Platform Filter Pills */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="platform-filters">
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                className={`platform-pill ${key} ${platform === key ? 'active' : ''}`}
                onClick={() => setPlatform(key)}
              >
                <span className={`platform-pill__dot ${key}`} />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏅</div>
            <h2 className="empty-state__title">No leaderboard data yet</h2>
            <p>Users need to sync their data to appear here.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Rank</th>
                    <th>User</th>
                    <th>Problems Solved</th>
                    <th>Rating Change</th>
                    <th>Contests</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((u, i) => {
                    const rankType = getRankBadge(i);
                    return (
                      <tr key={u.userId}>
                        <td>
                          <span className={`leaderboard-rank ${rankType}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td>
                          <div className="leaderboard-user">
                            <div className="leaderboard-user__avatar" style={{
                              background: rankType === 'gold' ? 'rgba(240,178,50,0.15)' :
                                         rankType === 'silver' ? 'rgba(160,174,192,0.12)' :
                                         rankType === 'bronze' ? 'rgba(205,127,50,0.12)' :
                                         'var(--bg-card)',
                              borderColor: rankType === 'gold' ? 'rgba(240,178,50,0.3)' :
                                          rankType === 'silver' ? 'rgba(160,174,192,0.2)' :
                                          rankType === 'bronze' ? 'rgba(205,127,50,0.2)' :
                                          'var(--border-color)',
                            }}>
                              {getInitials(u.username)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {u.username}
                              </div>
                              {u.handle && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  <span className={`badge badge--${platform}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                    {currentPlatform.icon} {platform}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {u.totalContests ? Math.floor(u.totalContests * 4.5) : '—'}
                        </td>
                        <td>
                          {u.latestRating && u.maxRating ? (
                            <span style={{
                              color: u.latestRating >= (u.maxRating * 0.9) ? 'var(--accent-green)' : 'var(--text-muted)',
                              fontWeight: 600,
                            }}>
                              {u.latestRating >= (u.maxRating * 0.9) ? '+' : ''}{Math.round((u.latestRating / u.maxRating - 1) * 100)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {u.totalContests || '—'}
                        </td>
                        <td>
                          <span className={`rating-value ${platform}`} style={{ fontSize: '1.05rem' }}>
                            {u.latestRating || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
