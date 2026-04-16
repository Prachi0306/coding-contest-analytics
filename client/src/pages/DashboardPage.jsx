import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { statsAPI, syncAPI } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, histRes] = await Promise.all([
        statsAPI.getSummary('codeforces'),
        statsAPI.getRatingHistory('codeforces'),
      ]);
      setSummary(sumRes.data.summary);
      setHistory(histRes.data.history || []);
    } catch {
      // Data might not be synced yet
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

  const chartData = history.map((h) => ({
    name: new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    rating: h.newRating,
    change: h.ratingChange,
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
            disabled={syncing}
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Data'}
          </button>
        </div>

        {syncMsg && (
          <div className={`alert ${syncMsg.includes('fail') ? 'alert--error' : 'alert--success'}`}>
            {syncMsg}
          </div>
        )}

        {!summary && history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <h2 className="empty-state__title">No stats yet</h2>
            <p>Click "Sync Data" to import your Codeforces rating history.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
              Make sure your Codeforces handle is set in your profile.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="stat-card">
                <span className="stat-card__label">Current Rating</span>
                <span className="stat-card__value stat-card__value--accent">
                  {summary?.currentRating ?? '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Max Rating</span>
                <span className="stat-card__value stat-card__value--cyan">
                  {summary?.maxRating ?? '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Total Contests</span>
                <span className="stat-card__value">{summary?.totalContests ?? '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Best Rank</span>
                <span className="stat-card__value stat-card__value--positive">
                  #{summary?.bestRank ?? '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Avg Rank</span>
                <span className="stat-card__value">{summary?.avgRank ?? '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Rating Gains</span>
                <span className="stat-card__value stat-card__value--positive">
                  {summary?.totalPositiveChanges ?? '—'}
                </span>
                <span className="stat-card__sub">contests with +Δ</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Rating Drops</span>
                <span className="stat-card__value stat-card__value--negative">
                  {summary?.totalNegativeChanges ?? '—'}
                </span>
                <span className="stat-card__sub">contests with -Δ</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Best Δ</span>
                <span className="stat-card__value stat-card__value--positive">
                  +{summary?.maxRatingChange ?? '—'}
                </span>
              </div>
            </div>

            {/* Rating Chart */}
            {chartData.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header">
                  <h2 className="card-title">Rating History</h2>
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

            {/* Recent Contests Table */}
            {history.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Contests</h2>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Contest</th>
                        <th>Rank</th>
                        <th>Rating</th>
                        <th>Change</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(-15).reverse().map((h) => (
                        <tr key={h._id || h.contestId}>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.contestName}
                          </td>
                          <td>{h.rank}</td>
                          <td>{h.newRating}</td>
                          <td>
                            <span className={`badge ${h.ratingChange >= 0 ? 'badge--positive' : 'badge--negative'}`}>
                              {h.ratingChange >= 0 ? '+' : ''}{h.ratingChange}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(h.timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
