import { useState, useEffect, useCallback } from 'react';
import { upsolveAPI } from '../api';

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

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [contestsRes, statsRes] = await Promise.all([
          upsolveAPI.getContests(),
          upsolveAPI.getStats(),
        ]);
        setContests(contestsRes.data?.contests || []);
        setStats(statsRes.data || null);
      } catch (err) {
        console.error('Failed to fetch upsolve data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

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

            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h2 className="card-title">Select a Contest</h2>
              </div>
              {contests.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                  <div className="empty-state__icon">📭</div>
                  <h2 className="empty-state__title">No contests with problems yet</h2>
                  <p>Problems will appear here once they are added to contests.</p>
                </div>
              ) : (
                <div className="upsolve-contest-list">
                  {contests.map((c) => {
                    const cfg = PLATFORM_CONFIG[c.platform] || PLATFORM_CONFIG.codeforces;
                    return (
                      <button
                        key={c._id}
                        className={`upsolve-contest-item ${selectedContest === c._id ? 'upsolve-contest-item--active' : ''}`}
                        onClick={() => handleSelectContest(c._id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge badge--${c.platform}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="upsolve-contest-item__name">{c.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="upsolve-contest-item__meta">
                            {c.totalProblems} problems
                          </span>
                          <span className="upsolve-contest-item__meta">
                            📅 {formatDateTime(c.startTime)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
