import { useState, useEffect, useCallback, useMemo } from 'react';
import { upsolveAPI, contestAPI } from '../api';
import CustomDropdown from '../components/CustomDropdown';

const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', icon: '🟣', color: '#a78bfa' },
  { key: 'leetcode', label: 'LeetCode', icon: '🟡', color: '#f0a030' },
  { key: 'codechef', label: 'CodeChef', icon: '🔵', color: '#22d3ee' },
];

const UPSOLVE_PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', icon: '🟣', color: '#a78bfa' },
  { key: 'leetcode', label: 'LeetCode', icon: '🟡', color: '#f0a030' },
  { key: 'codechef', label: 'CodeChef', icon: '🔵', color: '#22d3ee' },
];

export default function UpsolvePage() {
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [upsolveData, setUpsolveData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Platform & Contest Selection
  const [selectedPlatform, setSelectedPlatform] = useState('codeforces');
  const [platformContests, setPlatformContests] = useState([]);
  const [loadingPlatformContests, setLoadingPlatformContests] = useState(false);
  const [selectedContestToSync, setSelectedContestToSync] = useState('');
  const [syncingContest, setSyncingContest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState('');

  // Fetch available contests for the selected platform
  const fetchContestsForPlatform = useCallback(async (plat) => {
    setLoadingPlatformContests(true);
    try {
      const res = await contestAPI.getContests({ platform: plat, limit: 500 });
      let list = res.data?.contests || [];
      const now = new Date();
      list = list.filter(c => {
         const endTime = new Date(new Date(c.startTime).getTime() + (c.duration * 1000));
         return endTime < now;
      });
      setPlatformContests(list);
    } catch (err) {
      console.error(`Failed to fetch ${plat} contests:`, err);
      setPlatformContests([]);
    } finally {
      setLoadingPlatformContests(false);
    }
  }, []);

  // When platform changes, reset contest selection and load platform contests
  const handlePlatformChange = (newPlatform) => {
    setSelectedPlatform(newPlatform);
    setSelectedContestToSync('');
    setSearchQuery('');
    setSyncError('');
    fetchContestsForPlatform(newPlatform);
  };

  useEffect(() => {
    fetchContestsForPlatform('codeforces');
  }, [fetchContestsForPlatform]);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [contestsRes, statsRes] = await Promise.all([
          upsolveAPI.getContests(),
          upsolveAPI.getStats(),
        ]);
        const fetchedContests = contestsRes.data?.contests || [];
        setContests(fetchedContests);
        setStats(statsRes.data || null);

        if (fetchedContests.length > 0) {
          handleSelectContest(fetchedContests[0]._id);
        }
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
    setSyncError('');
    try {
      const syncRes = await upsolveAPI.syncContest(selectedContestToSync, selectedPlatform);
      const syncedContestId = syncRes.data?.contestId;
      const syncedContestDoc = syncRes.data?.contest;

      const [contestsRes, statsRes] = await Promise.all([
        upsolveAPI.getContests(),
        upsolveAPI.getStats(),
      ]);
      let newContests = contestsRes.data?.contests || [];
      
      // If the contest isn't in newContests (e.g. because user didn't participate / 0 submissions)
      // we prepend the returned contest doc so it shows up in the tabs
      if (syncedContestDoc && !newContests.some(c => String(c._id) === String(syncedContestId))) {
        newContests = [syncedContestDoc, ...newContests];
      }

      setContests(newContests);
      setStats(statsRes.data || null);

      if (syncedContestId) {
        handleSelectContest(syncedContestId);
      } else if (newContests.length > 0) {
        handleSelectContest(newContests[0]._id);
      }

      setSelectedContestToSync('');
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to sync contest:', err);
      setSyncError(err.message || 'Failed to sync contest problems');
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

  const filteredContests = useMemo(() => {
    const list = platformContests.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.contestId?.toString().toLowerCase().includes(q)
      );
    });
    return list.map(c => ({
      value: c.contestId,
      label: `${c.name} (#${c.contestId})`,
      badge: c.type
    }));
  }, [platformContests, searchQuery]);

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

            {/* Platform + Contest Selection Card */}
            <div
              className="card card--dropdown-container"
              style={{
                marginBottom: 'var(--space-xl)',
                padding: '20px 24px',
                position: 'relative',
                zIndex: 30,
              }}
            >
              <div className="upsolve-track-header">
                <div>
                  <h2
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}
                  >
                    Analyze a Past Contest
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Select a past contest to see your contest performance and upsolve progress.
                  </p>
                </div>

                <div className="upsolve-controls-row">
                  {/* Platform Selector */}
                  <CustomDropdown
                    id="upsolve-platform-select"
                    value={selectedPlatform}
                    onChange={handlePlatformChange}
                    options={UPSOLVE_PLATFORMS.map((p) => ({
                      value: p.key,
                      label: p.label,
                      icon: p.icon,
                    }))}
                    minWidth="160px"
                  />

                  {/* Contest Search/Filter */}
                  <input
                    type="text"
                    placeholder="Filter contests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="upsolve-filter-input"
                  />

                  {/* Contest Dropdown */}
                  <CustomDropdown
                    id="upsolve-contest-select"
                    value={selectedContestToSync}
                    onChange={(val) => setSelectedContestToSync(val)}
                    disabled={!selectedPlatform || loadingPlatformContests || filteredContests.length === 0}
                    placeholder={
                      !selectedPlatform
                        ? 'Select a platform first'
                        : loadingPlatformContests
                        ? 'Loading contests...'
                        : filteredContests.length === 0
                        ? `No ${PLATFORMS.find((p) => p.key === selectedPlatform)?.label || selectedPlatform} contests found`
                        : `Select ${PLATFORMS.find((p) => p.key === selectedPlatform)?.label || selectedPlatform} contest...`
                    }
                    options={filteredContests}
                    minWidth="250px"
                    maxWidth="400px"
                  />

                  {/* Sync Button */}
                  <button
                    className="btn btn--primary btn--sm upsolve-sync-btn"
                    onClick={handleSyncContest}
                    disabled={!selectedContestToSync || syncingContest}
                  >
                    {syncingContest ? '⏳ Syncing...' : '🔄 Sync'}
                  </button>
                </div>
              </div>

              {syncError && (
                <div className="alert alert--error" style={{ marginTop: '12px', fontSize: '0.82rem' }}>
                  {syncError}
                </div>
              )}
            </div>

            {/* Tracked Contests Selector / Tabs */}
            {contests.length > 0 && (
              <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {contests.map((c) => {
                  const isSelected = selectedContest === c._id;
                  const platCfg = PLATFORMS.find((p) => p.key === c.platform) || PLATFORMS[0];
                  return (
                    <button
                      key={c._id}
                      onClick={() => handleSelectContest(c._id)}
                      className={`btn btn--sm ${isSelected ? 'btn--primary' : 'btn--outline'}`}
                      style={{
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderColor: isSelected ? undefined : 'var(--border-color)',
                      }}
                    >
                      <span>{platCfg.icon}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {loadingProblems ? (
              <div className="loading-page">
                <div className="spinner" />
                <p className="loading-page__text">Loading problems...</p>
              </div>
            ) : upsolveData ? (
              <div className="upsolve-results">
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {upsolveData.contest?.name}
                  </h3>
                  {upsolveData.participated !== false ? (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>📊 {upsolveData.totalProblems} total problems</span>
                      <span style={{ color: 'var(--accent-green)' }}>
                        ✅ {upsolveData.solvedDuringContest?.length || 0} solved during contest
                      </span>
                      <span style={{ color: 'var(--accent-cyan)' }}>
                        🔄 {upsolveData.upsolvedAfter?.length || 0} upsolved
                      </span>
                      <span style={{ color: 'var(--accent-red)' }}>
                        ❌ {upsolveData.unsolved?.length || 0} unsolved
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ⚪ {upsolveData.unattempted?.length || 0} unattempted
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        📝 {(upsolveData.totalProblems || 0) - (upsolveData.unattempted?.length || 0)} attempted
                      </span>
                      <span style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                        (Total Attempts: {upsolveData.totalAttempts || 0})
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Codeforces
                    </div>
                  )}
                </div>


                {(!upsolveData.available) ? (
                  <div className="empty-state">
                    <div className="empty-state__icon">⚠️</div>
                    <h2 className="empty-state__title">Data Unavailable</h2>
                    <p>{upsolveData.reason || 'This platform does not expose required contest data.'}</p>
                  </div>
                ) : upsolveData.participated === false ? (
                  <div className="empty-state">
                    <div className="empty-state__icon">🚫</div>
                    <h2 className="empty-state__title" style={{ fontSize: '1.2rem' }}>You didn't participate in this contest.</h2>
                    <p style={{ marginBottom: '16px' }}>No contest submissions were found for your account during this contest.</p>
                    <a href={`https://codeforces.com/contest/${upsolveData.contest?.contestId}`} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                      View Contest
                    </a>
                  </div>
                ) : (
                  <>
                    {upsolveData.solvedDuringContest?.length > 0 && (
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

                    {upsolveData.upsolvedAfter?.length > 0 && (
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

                    {upsolveData.unsolved?.length > 0 && (
                      <ProblemSection
                        title="Attempted & Unsolved"
                        icon="❌"
                        iconClass="upsolve-section-icon--red"
                        problems={upsolveData.unsolved}
                        statusLabel="Unsolved"
                        statusClass="badge--negative"
                        onToggle={(p) => handleToggleStatus(p.problemId, 'unsolved')}
                        toggleLabel="Mark Solved"
                      />
                    )}

                    {upsolveData.unattempted?.length > 0 && (
                      <ProblemSection
                        title="Unattempted Problems"
                        icon="⚪"
                        iconClass="upsolve-section-icon--gray"
                        problems={upsolveData.unattempted}
                        statusLabel="Unattempted"
                        statusClass="badge--secondary"
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
                  </>
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
              {problem.attempts > 0 && (
                <span className="badge badge--secondary" style={{ fontSize: '0.65rem' }}>
                  {problem.attempts} {problem.attempts === 1 ? 'Attempt' : 'Attempts'}
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
