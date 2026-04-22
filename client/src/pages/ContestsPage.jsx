import { useState, useEffect } from 'react';
import { contestAPI } from '../api';

const PLATFORM_CONFIG = {
  codeforces: { label: 'Codeforces', color: '#a78bfa', icon: '🟣' },
  leetcode: { label: 'LeetCode', color: '#f0a030', icon: '🟡' },
  codechef: { label: 'CodeChef', color: '#22d3ee', icon: '🔵' },
};

export default function ContestsPage() {
  const [contests, setContests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('codeforces');

  const fetchContests = async (p = 1, q = '', plat = 'codeforces') => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, platform: plat };
      if (q) params.search = q;
      const res = await contestAPI.getContests(params);
      setContests(res.data.contests);
      setPagination(res.data.pagination);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContests(page, search, platform); }, [page, platform]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchContests(1, search, platform);
  };

  const handlePlatformChange = (p) => {
    setPlatform(p);
    setPage(1);
    setSearch('');
  };

  const formatDuration = (contest) => {
    if (contest.durationFormatted) return contest.durationFormatted;
    if (contest.durationSeconds) {
      const hours = Math.floor(contest.durationSeconds / 3600);
      const mins = Math.floor((contest.durationSeconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    return 'N/A';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const currentPlatform = PLATFORM_CONFIG[platform];

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="contests-header">
          <div>
            <h1>Contests Tracker</h1>
            <p className="subtitle">Track and monitor your ongoing and upcoming programming contests.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>🏆</span>
          </div>
        </div>

        {/* Toolbar: Platform Filters + Search */}
        <div className="contests-toolbar">
          <div className="platform-filters">
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                className={`platform-pill ${key} ${platform === key ? 'active' : ''}`}
                onClick={() => handlePlatformChange(key)}
              >
                <span className={`platform-pill__dot ${key}`} />
                {cfg.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="search-box">
            <input
              id="contest-search"
              type="text"
              placeholder={`🔍 Search ${currentPlatform.label} contests...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {/* Contest count */}
        <div style={{ marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {pagination.total.toLocaleString()} {currentPlatform.label} contests
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
          </div>
        ) : contests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏆</div>
            <h2 className="empty-state__title">No contests found</h2>
            <p>Try a different search term or platform.</p>
          </div>
        ) : (
          <>
            {/* Contests Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contests.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <span className={`badge badge--${platform}`}>
                            {currentPlatform.icon} {currentPlatform.label}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {c.name}
                        </td>
                        <td>
                          <span className="badge badge--info">{c.type || 'N/A'}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          ⏱ {formatDuration(c)}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          📅 {formatDate(c.startTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                className="btn btn--secondary btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              
              {/* Page numbers */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`btn btn--sm ${pageNum === page ? 'btn--primary' : 'btn--outline'}`}
                      onClick={() => setPage(pageNum)}
                      style={{ minWidth: '36px' }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn--secondary btn--sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
