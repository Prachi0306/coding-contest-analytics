import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { platformsAPI, statsAPI, syncAPI } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const PLATFORM_COLORS = {
  codeforces: { main: '#a78bfa', bg: 'rgba(108, 92, 231, 0.12)', border: 'rgba(108, 92, 231, 0.3)', label: 'Codeforces' },
  leetcode: { main: '#f0a030', bg: 'rgba(240, 160, 48, 0.12)', border: 'rgba(240, 160, 48, 0.3)', label: 'LeetCode' },
  codechef: { main: '#22d3ee', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', label: 'CodeChef' },
};

const DONUT_COLORS = ['#a78bfa', '#f0a030', '#22d3ee', '#34d399', '#f87171', '#fbbf24', '#fb923c', '#818cf8'];

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);
  
  const [platforms, setPlatforms] = useState([]);
  const [failedPlatforms, setFailedPlatforms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

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
      setTimeout(() => {
        fetchData();
        setSyncing(false);
      }, 3000);
    } catch (err) {
      setSyncMsg(err.message || 'Sync failed');
      setSyncing(false);
    }
  };

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

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  const chartData = [];
  let lastRatings = { codeforces: null, leetcode: null, codechef: null };

  allEvents.forEach(event => {
    lastRatings[event.platform] = event.rating;
    chartData.push({
      timestamp: event.timestamp,
      name: new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      codeforces: lastRatings.codeforces,
      leetcode: lastRatings.leetcode,
      codechef: lastRatings.codechef,
    });
  });

  const recentContests = [...allEvents].reverse().slice(0, 8);

  const contestsPerPlatform = platforms.map(p => ({
    name: PLATFORM_COLORS[p.platform]?.label || p.platform,
    value: (p.contests || []).length,
    platform: p.platform,
  })).filter(d => d.value > 0);

  const totalContests = platforms.reduce((sum, p) => sum + (p.contests || []).length, 0);

  const userRank = leaderboard.findIndex(u => u.userId === user?.id) + 1;

  const maxRating = platforms.reduce((max, p) => Math.max(max, p.maxRating || 0), 0);

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
        <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: '28px 32px' }}>
          <div className="profile-hero" style={{ marginBottom: 0 }}>
            <div className="profile-avatar">
              👤
            </div>
            <div className="profile-info">
              <h1>{user?.username || 'User'}</h1>
              <p className="profile-subtitle">
                Max: {maxRating > 0 ? maxRating.toLocaleString() : '—'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {userRank > 0 && (
                <div className="profile-rank">
                  <div className="rank-label">Global Rank</div>
                  <div className="rank-number">#{userRank}</div>
                </div>
              )}
              <button
                className="btn btn--primary"
                onClick={handleSync}
                disabled={syncing || platforms.length === 0}
              >
                {syncing ? '⏳ Syncing...' : '🔄 Sync Data'}
              </button>
            </div>
          </div>
        </div>

        {syncMsg && (
          <div className={`alert ${(/fail|error|timeout|exceeded/i).test(syncMsg) ? 'alert--error' : 'alert--success'}`}>
            {syncMsg}
          </div>
        )}

        {failedPlatforms.length > 0 && (
          <div className="alert alert--warning" style={{ marginBottom: '24px' }}>
            <strong>⚠️ Warning:</strong> The following platforms failed to sync:
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
            <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: '24px 32px' }}>
              <div className="dashboard-stats-row" style={{ marginBottom: 0 }}>
                {platforms.map(platform => {
                  const pc = PLATFORM_COLORS[platform.platform] || {};
                  return (
                    <div key={platform.platform} className="dash-stat">
                      <div className="dash-stat__value" style={{ color: pc.main }}>
                        {platform.rating ?? '—'}
                      </div>
                      <div className="dash-stat__label" style={{ textTransform: 'capitalize' }}>
                        {platform.platform} Rating
                      </div>
                    </div>
                  );
                })}
                <div className="dash-stat">
                  <div className="dash-stat__value" style={{ color: '#34d399' }}>
                    {maxRating > 0 ? maxRating.toLocaleString() : '—'}
                  </div>
                  <div className="dash-stat__label">Highest Rating</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat__value" style={{ color: '#fbbf24' }}>
                    {totalContests}
                  </div>
                  <div className="dash-stat__label">Contests Played</div>
                </div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 className="card-title">Multi-Platform Rating History</h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {chartData.length} total contests
                    </span>
                  </div>
                  <div className="graph-toggles" style={{ marginLeft: 'auto' }}>
                    {platforms.some(p => p.platform === 'codeforces') && (
                      <button
                        className={`graph-toggle codeforces ${visibleGraphs.codeforces ? 'active' : ''}`}
                        onClick={() => toggleGraph('codeforces')}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
                        Codeforces
                      </button>
                    )}
                    {platforms.some(p => p.platform === 'leetcode') && (
                      <button
                        className={`graph-toggle leetcode ${visibleGraphs.leetcode ? 'active' : ''}`}
                        onClick={() => toggleGraph('leetcode')}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0a030', display: 'inline-block' }} />
                        LeetCode
                      </button>
                    )}
                    {platforms.some(p => p.platform === 'codechef') && (
                      <button
                        className={`graph-toggle codechef ${visibleGraphs.codechef ? 'active' : ''}`}
                        onClick={() => toggleGraph('codechef')}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
                        CodeChef
                      </button>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="cfGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6c5ce7" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                      <linearGradient id="lcGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#e09000" />
                        <stop offset="100%" stopColor="#f0c060" />
                      </linearGradient>
                      <linearGradient id="ccGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,92,252,0.08)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#5a6a85', fontSize: 11 }}
                      interval={Math.ceil(chartData.length / 8)}
                      axisLine={{ stroke: 'rgba(124,92,252,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#5a6a85', fontSize: 11 }}
                      domain={['auto', 'auto']}
                      axisLine={{ stroke: 'rgba(124,92,252,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 20, 45, 0.95)',
                        border: '1px solid rgba(124,92,252,0.2)',
                        borderRadius: '12px',
                        color: '#eef2ff',
                        fontSize: '0.82rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                    <Legend />
                    {visibleGraphs.codeforces && (
                      <Line
                        type="monotone"
                        dataKey="codeforces"
                        name="Codeforces"
                        stroke="url(#cfGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#a78bfa', stroke: '#6c5ce7', strokeWidth: 2 }}
                      />
                    )}
                    {visibleGraphs.leetcode && (
                      <Line
                        type="monotone"
                        dataKey="leetcode"
                        name="LeetCode"
                        stroke="url(#lcGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#f0c060', stroke: '#e09000', strokeWidth: 2 }}
                      />
                    )}
                    {visibleGraphs.codechef && (
                      <Line
                        type="monotone"
                        dataKey="codechef"
                        name="CodeChef"
                        stroke="url(#ccGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 5, fill: '#22d3ee', stroke: '#0891b2', strokeWidth: 2 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="submissions-grid">
              {recentContests.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Recent Submissions</h2>
                  </div>
                  <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
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
                        {recentContests.map((h, i) => {
                          const pc = PLATFORM_COLORS[h.platform] || {};
                          return (
                            <tr key={h.contestId || i}>
                              <td>
                                <span className={`badge badge--${h.platform}`}>
                                  {pc.label || h.platform}
                                </span>
                              </td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                {h.contestName}
                              </td>
                              <td style={{ fontWeight: 600 }}>{h.rank}</td>
                              <td>
                                <span className={`rating-value ${h.platform}`}>
                                  {h.rating}
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

              {contestsPerPlatform.length > 0 && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <h2 className="card-title" style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>
                    Contests Breakdown
                  </h2>
                  <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contestsPerPlatform}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {contestsPerPlatform.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={PLATFORM_COLORS[entry.platform]?.main || DONUT_COLORS[index % DONUT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15, 20, 45, 0.95)',
                            border: '1px solid rgba(124,92,252,0.2)',
                            borderRadius: '10px',
                            color: '#eef2ff',
                            fontSize: '0.82rem',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {totalContests}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {contestsPerPlatform.map(d => {
                      const pc = PLATFORM_COLORS[d.platform] || {};
                      return (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: pc.main, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                          <span style={{ fontWeight: 700, color: pc.main }}>{d.value}</span>
                        </div>
                      );
                    })}
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
