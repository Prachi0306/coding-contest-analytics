import { useState, useEffect } from 'react';
import { contestAPI } from '../api';

export default function ContestsPage() {
  const [contests, setContests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchContests = async (p = 1, q = '') => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
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

  useEffect(() => { fetchContests(page, search); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchContests(1, search);
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div>
            <h1 className="section-title">Contests</h1>
            <p className="section-subtitle">{pagination.total.toLocaleString()} Codeforces contests</p>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              id="contest-search"
              type="text"
              className="form-input"
              placeholder="Search contests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <button type="submit" className="btn btn--secondary">Search</button>
          </form>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
          </div>
        ) : contests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏆</div>
            <h2 className="empty-state__title">No contests found</h2>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((c) => (
                    <tr key={c._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{c.contestId}</td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>
                        <span className="badge badge--info">{c.type}</span>
                      </td>
                      <td>{c.durationFormatted}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.startTime).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                className="btn btn--secondary btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="pagination__info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
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
