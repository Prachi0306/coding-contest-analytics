import { useState, useEffect, useCallback } from 'react';
import { upsolveAPI, statsAPI, contestAPI } from '../api';

const PLATFORM_CONFIG = {
  codeforces: { label: 'Codeforces', color: '#a78bfa', icon: '🟣' },
  leetcode: { label: 'LeetCode', color: '#f0a030', icon: '🟡' },
  codechef: { label: 'CodeChef', color: '#22d3ee', icon: '🔵' },
};

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function UpsolvePage() {
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [upsolveData, setUpsolveData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProblems, setLoadingProblems] = useState(false);
  
  const [pastContests, setPastContests] = useState([]);
  const [selectedContestToSync, setSelectedContestToSync] = useState('');
  const [syncingContest, setSyncingContest] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const displayResults = pastContests.filter(c => 
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.contestId.toString().includes(searchQuery)
  );

  const handleSelectFromSearch = async (contest) => {
    setSelectedContestToSync(contest.contestId);
    setSearchQuery(contest.name);
    setShowDropdown(false);

    setSyncingContest(true);
    try {
      await upsolveAPI.syncContest(contest.contestId);
      const [contestsRes, statsRes] = await Promise.all([
        upsolveAPI.getContests(),
        upsolveAPI.getStats(),
      ]);
      const newContests = contestsRes.data?.contests || [];
      setContests(newContests);
      setStats(statsRes.data || null);
      
      const syncedContest = newContests.find(c => String(c.contestId) === String(contest.contestId));
      if (syncedContest) {
        handleSelectContest(syncedContest._id);
      }
      
      setSelectedContestToSync('');
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to sync contest:', err);
      alert(err.message || 'Failed to sync contest problems');
    } finally {
      setSyncingContest(false);
    }
  };

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [contestsRes, statsRes, historyRes] = await Promise.all([
          upsolveAPI.getContests(),
          upsolveAPI.getStats(),
          statsAPI.getContestHistory({ platform: 'codeforces', limit: 500 }),
        ]);
        const fetchedContests = contestsRes.data?.contests || [];
        setContests(fetchedContests);
        setStats(statsRes.data || null);
        
        if (fetchedContests.length > 0) {
          handleSelectContest(fetchedContests[0]._id);
        }
        
        const history = (historyRes.data?.history || []).map(c => ({
          contestId: c.contestId,
          name: c.contestName || `Contest ${c.contestId}`
        }));
        setPastContests(history);
      } catch (err) {
        console.error('Failed to fetch upsolve data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const handleSyncContest = async () => {
    if (!selectedContestToSync) return;
    setSyncingContest(true);
    try {
      await upsolveAPI.syncContest(selectedContestToSync);
      const [contestsRes, statsRes] = await Promise.all([
        upsolveAPI.getContests(),
        upsolveAPI.getStats(),
      ]);
      const newContests = contestsRes.data?.contests || [];
      setContests(newContests);
      setStats(statsRes.data || null);
      
      const syncedContest = newContests.find(c => String(c.contestId) === String(selectedContestToSync));
      if (syncedContest) {
        handleSelectContest(syncedContest._id);
      }
      
      setSelectedContestToSync('');
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to sync contest:', err);
      alert(err.message || 'Failed to sync contest problems');
    } finally {
      setSyncingContest(false);
    }
  };

  const handleSelectContest = useCallback(async (contestId) => {
    setSelectedContest(contestId);
    setLoadingProblems(true);
    try {
      const res = await upsolveAPI.getUpsolveList(contestId);
      setUpsolveData(res.data || null);
    } catch (err) {
      console.error('Failed to fetch upsolve list:', err);
      setUpsolveData(null);
    } finally {
      setLoadingProblems(false);
    }
  }, []);

  const handleToggleStatus = async (problemId, currentStatus) => {
    const newStatus = currentStatus === 'solved' ? 'unsolved' : 'solved';
    try {
      await upsolveAPI.updateSolveStatus(selectedContest, problemId, {
        status: newStatus,
        solvedDuringContest: false,
      });
      handleSelectContest(selectedContest);
      const statsRes = await upsolveAPI.getStats();
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div>
            <h1 className="section-title">Upsolve Tracker</h1>
            <p className="section-subtitle">
              Track problems you've solved during contests and upsolve the rest.
            </p>
          </div>
          <span style={{ fontSize: '2.5rem' }}>🧩</span>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
            <p className="loading-page__text">Loading upsolve tracker...</p>
          </div>
        ) : (
          <>
            {stats && (
              <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="stat-card">
                  <div className="stat-card__icon">📊</div>
                  <div className="stat-card__label">Contests Tracked</div>
                  <div className="stat-card__value stat-card__value--accent">
                    {stats.totalContests}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__icon">✅</div>
                  <div className="stat-card__label">Solved During Contest</div>
                  <div className="stat-card__value stat-card__value--positive">
                    {stats.totalSolvedDuringContest}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__icon">🔄</div>
                  <div className="stat-card__label">Upsolved After</div>
                  <div className="stat-card__value stat-card__value--cyan">
                    {stats.totalUpsolved}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__icon">❌</div>
                  <div className="stat-card__label">Unsolved</div>
                  <div className="stat-card__value stat-card__value--negative">
                    {stats.totalUnsolved}
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 'var(--space-xl)', overflow: 'visible', zIndex: 50 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="card-title">Select a Contest</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search Codeforces contests..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                          if (!e.target.value) setSelectedContestToSync('');
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '300px' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>▼</span>
                      {showDropdown && displayResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border-color)', zIndex: 100, maxHeight: '250px', overflowY: 'auto', borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          {displayResults.map(c => (
                            <div 
                              key={c.contestId} 
                              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card, #1e1e2e)' }}
                              onMouseDown={() => handleSelectFromSearch(c)}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary, #2a2a3e)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-card, #1e1e2e)'}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={handleSyncContest}
                      disabled={!selectedContestToSync || syncingContest}
                    >
                      {syncingContest ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
              </div>
            </div>

            {loadingProblems ? (
              <div className="loading-page">
                <div className="spinner" />
                <p className="loading-page__text">Loading problems...</p>
              </div>
            ) : upsolveData ? (
              <div className="upsolve-results">
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {upsolveData.contest.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>📊 {upsolveData.totalProblems} total problems</span>
                    <span style={{ color: 'var(--accent-green)' }}>
                      ✅ {upsolveData.solvedDuringContest.length} solved during contest
                    </span>
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      🔄 {upsolveData.upsolvedAfter.length} upsolved
                    </span>
                    <span style={{ color: 'var(--accent-red)' }}>
                      ❌ {upsolveData.unsolved.length} unsolved
                    </span>
                  </div>
                </div>

                {upsolveData.solvedDuringContest.length > 0 && (
                  <ProblemSection
                    title="Solved During Contest"
                    icon="✅"
                    iconClass="upsolve-section-icon--green"
                    problems={upsolveData.solvedDuringContest}
                    statusLabel="Solved"
                    statusClass="badge--positive"
                    onToggle={null}
                  />
                )}

                {upsolveData.upsolvedAfter.length > 0 && (
                  <ProblemSection
                    title="Upsolved After Contest"
                    icon="🔄"
                    iconClass="upsolve-section-icon--cyan"
                    problems={upsolveData.upsolvedAfter}
                    statusLabel="Upsolved"
                    statusClass="badge--info"
                    onToggle={(p) => handleToggleStatus(p.problemId, 'solved')}
                    toggleLabel="Mark Unsolved"
                  />
                )}

                {upsolveData.unsolved.length > 0 && (
                  <ProblemSection
                    title="Unsolved Problems"
                    icon="❌"
                    iconClass="upsolve-section-icon--red"
                    problems={upsolveData.unsolved}
                    statusLabel="Unsolved"
                    statusClass="badge--negative"
                    onToggle={(p) => handleToggleStatus(p.problemId, 'unsolved')}
                    toggleLabel="Mark Solved"
                  />
                )}

                {upsolveData.totalProblems === 0 && (
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <h2 className="empty-state__title">No problems registered</h2>
                    <p>This contest doesn't have any problems added yet.</p>
                  </div>
                )}
              </div>
            ) : selectedContest ? (
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <h2 className="empty-state__title">Select a contest to view problems</h2>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ProblemSection({ title, icon, iconClass, problems, statusLabel, statusClass, onToggle, toggleLabel }) {
  return (
    <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
      <div className="upsolve-section-header">
        <span className={`upsolve-section-icon ${iconClass}`}>{icon}</span>
        <h3 className="upsolve-section-title">{title}</h3>
        <span className="upsolve-section-count">{problems.length}</span>
      </div>
      <div className="upsolve-problem-list">
        {problems.map((problem) => (
          <div key={problem.problemId} className="upsolve-problem-row">
            <div className="upsolve-problem-row__left">
              {problem.index && (
                <span className="upsolve-problem-index">{problem.index}</span>
              )}
              <span className="upsolve-problem-name">{problem.name}</span>
              {problem.difficulty && (
                <span className="badge badge--info" style={{ fontSize: '0.65rem' }}>
                  {problem.difficulty}
                </span>
              )}
            </div>
            <div className="upsolve-problem-row__right">
              <span className={`badge ${statusClass}`}>{statusLabel}</span>
              {onToggle && (
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => onToggle(problem)}
                >
                  {toggleLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
