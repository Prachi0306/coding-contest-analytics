import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { platformsAPI, statsAPI, syncAPI } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);
  
  // Data State
  const [platforms, setPlatforms] = useState([]);
  const [failedPlatforms, setFailedPlatforms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel safe fetching
      const [profRes, leadRes] = await Promise.all([
        platformsAPI.getProfile().catch(() => ({ data: { platforms: [], failedPlatforms: [] } })),
        statsAPI.getLeaderboard({ platform: 'codeforces', limit: 10 }).catch(() => ({ data: {} })),
      ]);
      
      setPlatforms(profRes.data?.platforms || []);
      setFailedPlatforms(profRes.data?.failedPlatforms || []);
      setLeaderboard(leadRes.data?.leaderboard || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncAPI.syncMyRatings();
      setSyncMsg('Sync complete! Refreshing...');
      await fetchData();
    } catch (err) {
      setSyncMsg(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Find Codeforces data specifically to maintain legacy dashboard widgets until fully migrated
  const cfData = platforms.find(p => p.platform === 'codeforces');
  const cfContests = cfData?.contests || [];
  
  const chartData = cfContests.map((h) => ({
    name: h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'Unknown',
    rating: h.rating || h.newRating,
    change: h.ratingChange || 0,
  }));

  if (loading) {
    return (
      <div className="page">
        <div className="container loading-page">
          <div className="spinner" />
          <p className="loading-page__text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-subtitle">Welcome back, {user?.username} 👋</p>
          </div>
          <button
            className="btn btn--primary"
            onClick={handleSync}
            disabled={syncing || platforms.length === 0}
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Data'}
          </button>
        </div>

        {/* Action Messages */}
        {syncMsg && (
          <div className={`alert ${syncMsg.includes('fail') ? 'alert--error' : 'alert--success'}`} style={{ marginBottom: '16px' }}>
            {syncMsg}
          </div>
        )}

        {/* Failed Platforms Warning Box - FAULT TOLERANCE UI */}
        {failedPlatforms.length > 0 && (
          <div className="alert alert--warning" style={{ marginBottom: '24px' }}>
            <strong>Warning:</strong> The following platforms failed to sync and their data is not displayed:
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {failedPlatforms.map((fp, idx) => (
                <li key={idx}>
                  <strong>{fp.platform}</strong> ({fp.handle}): {fp.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {platforms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <h2 className="empty-state__title">No stats available</h2>
            <p>Connect platforms via the settings or profile page to start tracking your competitive programming stats.</p>
          </div>
        ) : (
          <>
            {/* Stats Grid - Currently driven by Codeforces for backward compatibility before multi-platform graph task */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              {platforms.map(platform => (
                <div key={platform.platform} className="stat-card" style={{ borderLeft: `4px solid var(--accent-${platform.platform === 'codeforces' ? 'primary' : platform.platform === 'leetcode' ? 'yellow' : 'cyan'})` }}>
                  <span className="stat-card__label" style={{textTransform: 'capitalize'}}>{platform.platform} Rating</span>
                  <span className="stat-card__value stat-card__value--accent">
                    {platform.rating ?? '—'}
                  </span>
                  <span className="stat-card__sub">Max: {platform.maxRating ?? '—'}</span>
                </div>
              ))}
            </div>

            {/* Rating Chart (Codeforces only for now) */}
            {chartData.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header">
                  <h2 className="card-title">Codeforces Rating History</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {chartData.length} contests
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1f2e',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '10px',
                        color: '#f1f5f9',
                        fontSize: '0.85rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: '#818cf8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lower Section: Tables */}
            <div className="dashboard-columns">
              {/* Recent Contests Table */}
              {cfContests.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Recent CF Contests</h2>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Contest</th>
                          <th>Rank</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cfContests.slice(-10).reverse().map((h, i) => (
                          <tr key={h._id || h.contestId || i}>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.contestName}
                            </td>
                            <td>{h.rank}</td>
                            <td>{h.rating || h.newRating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              {leaderboard.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Top 10 Global Leaderboard</h2>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>User</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.slice(0, 10).map((u, i) => (
                          <tr key={u.userId} style={{ backgroundColor: u.userId === user?.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                            <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                              {i + 1}
                            </td>
                            <td style={{ fontWeight: u.userId === user?.id ? 700 : 500, color: u.userId === user?.id ? 'var(--accent-primary)' : 'inherit' }}>
                              {u.username} {u.userId === user?.id && '(You)'}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {u.latestRating}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
