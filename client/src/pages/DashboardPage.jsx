import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { platformsAPI, statsAPI, syncAPI } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  // Graph Toggle State
  const [visibleGraphs, setVisibleGraphs] = useState({
    codeforces: true,
    leetcode: true,
    codechef: true,
  });

  const toggleGraph = (platform) => {
    setVisibleGraphs(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
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
      setSyncMsg('Sync queued! Refreshing in background...');
      // Allow workers a moment to process before re-fetching
      setTimeout(() => {
        fetchData();
        setSyncing(false);
      }, 3000);
    } catch (err) {
      setSyncMsg(err.message || 'Sync failed');
      setSyncing(false);
    }
  };

  // --- Graph Normalization ---
  // 1. Gather all events
  const allEvents = [];
  platforms.forEach(p => {
    (p.contests || []).forEach(c => {
      if (c.timestamp) {
        allEvents.push({
          platform: p.platform,
          timestamp: new Date(c.timestamp).getTime(),
          rating: c.rating || c.newRating,
          contestName: c.contestName,
          rank: c.rank,
          contestId: c.contestId || c._id
        });
      }
    });
  });

  // 2. Sort chronologically
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  // 3. Build unified chart data safely
  const chartData = [];
  let lastRatings = { codeforces: null, leetcode: null, codechef: null };

  allEvents.forEach(event => {
    lastRatings[event.platform] = event.rating;
    chartData.push({
      timestamp: event.timestamp,
      name: new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      codeforces: lastRatings.codeforces,
      leetcode: lastRatings.leetcode,
      codechef: lastRatings.codechef,
    });
  });

  // Unified Recent Contests table data
  const recentContests = [...allEvents].reverse().slice(0, 10);

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
          <div className={`alert ${(/fail|error|timeout|exceeded/i).test(syncMsg) ? 'alert--error' : 'alert--success'}`} style={{ marginBottom: '16px' }}>
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
            {/* Stats Grid */}
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

            {/* Rating Chart (Multi-Platform) */}
            {chartData.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <h2 className="card-title">Multi-Platform Rating History</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {chartData.length} total contests
                    </span>
                  </div>
                  {/* Graph Toggles */}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    {platforms.some(p => p.platform === 'codeforces') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={visibleGraphs.codeforces} onChange={() => toggleGraph('codeforces')} />
                        <span style={{ color: '#6366f1', fontWeight: 600 }}>Codeforces</span>
                      </label>
                    )}
                    {platforms.some(p => p.platform === 'leetcode') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={visibleGraphs.leetcode} onChange={() => toggleGraph('leetcode')} />
                        <span style={{ color: '#eab308', fontWeight: 600 }}>LeetCode</span>
                      </label>
                    )}
                    {platforms.some(p => p.platform === 'codechef') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={visibleGraphs.codechef} onChange={() => toggleGraph('codechef')} />
                        <span style={{ color: '#06b6d4', fontWeight: 600 }}>CodeChef</span>
                      </label>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={Math.ceil(chartData.length / 8)}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1f2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: '#f1f5f9',
                        fontSize: '0.85rem',
                      }}
                    />
                    <Legend />
                    {visibleGraphs.codeforces && (
                      <Line
                        type="stepAfter"
                        dataKey="codeforces"
                        name="Codeforces"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#818cf8' }}
                      />
                    )}
                    {visibleGraphs.leetcode && (
                      <Line
                        type="stepAfter"
                        dataKey="leetcode"
                        name="LeetCode"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#fef08a' }}
                      />
                    )}
                    {visibleGraphs.codechef && (
                      <Line
                        type="stepAfter"
                        dataKey="codechef"
                        name="CodeChef"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#67e8f9' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lower Section: Tables */}
            <div className="dashboard-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto', justifyContent: 'center' }}>
              {/* Recent Contests Table */}
              {recentContests.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Recent Contests</h2>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Platform</th>
                          <th>Contest</th>
                          <th>Rank</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentContests.map((h, i) => (
                          <tr key={h.contestId || i}>
                            <td>
                              <span className="badge" style={{
                                backgroundColor: h.platform === 'codeforces' ? 'rgba(99, 102, 241, 0.1)' : h.platform === 'leetcode' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                color: h.platform === 'codeforces' ? '#818cf8' : h.platform === 'leetcode' ? '#fef08a' : '#67e8f9',
                                textTransform: 'capitalize'
                              }}>
                                {h.platform}
                              </span>
                            </td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.contestName}
                            </td>
                            <td>{h.rank}</td>
                            <td>{h.rating}</td>
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
