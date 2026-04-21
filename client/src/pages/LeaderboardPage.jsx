import { useState, useEffect } from 'react';
import { statsAPI } from '../api';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('codeforces');

  useEffect(() => {
    setLoading(true);
    statsAPI
      .getLeaderboard({ platform, limit: 20 })
      .then((res) => setLeaderboard(res.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [platform]);

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div>
            <h1 className="section-title">Leaderboard</h1>
            <p className="section-subtitle">Top rated users globally</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${platform === 'codeforces' ? 'btn--primary' : 'btn--outline'} btn--sm`}
              onClick={() => setPlatform('codeforces')}
            >
              Codeforces
            </button>
            <button 
              className={`btn ${platform === 'leetcode' ? 'btn--primary' : 'btn--outline'} btn--sm`}
              onClick={() => setPlatform('leetcode')}
              style={{ borderColor: platform === 'leetcode' ? '#eab308' : '', backgroundColor: platform === 'leetcode' ? '#eab308' : '' }}
            >
              LeetCode
            </button>
            <button 
              className={`btn ${platform === 'codechef' ? 'btn--primary' : 'btn--outline'} btn--sm`}
              onClick={() => setPlatform('codechef')}
              style={{ borderColor: platform === 'codechef' ? '#06b6d4' : '', backgroundColor: platform === 'codechef' ? '#06b6d4' : '' }}
            >
              CodeChef
            </button>
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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Rating</th>
                  <th>Max Rating</th>
                  <th>Contests</th>
                  <th>Last Contest</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => (
                  <tr key={u.userId}>
                    <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: platform === 'leetcode' ? '#eab308' : platform === 'codechef' ? '#06b6d4' : 'var(--accent-primary)' }}>
                        {u.latestRating}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.maxRating}</td>
                    <td>{u.totalContests}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.latestContest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
