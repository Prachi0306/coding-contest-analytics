import { useState, useEffect, useCallback } from 'react';
import { contestAPI, scheduleAPI } from '../api';
import useAuthStore from '../store/authStore';
import CalendarButtons from '../components/CalendarButtons';

const PLATFORM_CONFIG = {
  codeforces: { label: 'Codeforces', color: '#a78bfa', icon: '🟣' },
  leetcode: { label: 'LeetCode', color: '#f0a030', icon: '🟡' },
  codechef: { label: 'CodeChef', color: '#22d3ee', icon: '🔵' },
};

// ─── Helpers ────────────────────────────────────────

function formatDuration(contest) {
  if (contest.durationFormatted) return contest.durationFormatted;
  if (contest.duration) {
    const hours = Math.floor(contest.duration / 3600);
    const mins = Math.floor((contest.duration % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  return 'N/A';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getTimeRemaining(startTime, durationSec) {
  const now = Date.now();
  const endMs = new Date(startTime).getTime() + durationSec * 1000;
  const diff = endMs - now;
  if (diff <= 0) return 'Ending soon...';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
}

function getCountdown(startTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const diff = start - now;
  if (diff <= 0) return 'Starting now!';
  const days = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `Starts in ${days}d ${h}h`;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

// ─── Ongoing Contest Card ───────────────────────────

function OngoingCard({ contest, platform }) {
  const [timeLeft, setTimeLeft] = useState('');
  const cfg = PLATFORM_CONFIG[platform];

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeRemaining(contest.startTime, contest.duration));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [contest.startTime, contest.duration]);

  return (
    <div className="contest-live-card">
      <div className="contest-live-card__glow" />
      <div className="contest-live-card__content">
        <div className="contest-live-card__header">
          <span className="contest-live-badge">
            <span className="contest-live-badge__dot" />
            LIVE
          </span>
          <span className={`badge badge--${platform}`}>
            {cfg.icon} {cfg.label}
          </span>
          {useAuthStore.getState().user && (
            <button
              onClick={() => scheduleAPI.addBookmark(contest._id).then(() => alert('Added to schedule!')).catch(e => alert(e.response?.data?.message || 'Error'))}
              className="btn btn--sm"
              style={{ background: 'transparent', padding: '4px' }}
              title="Add to My Schedule"
            >
              ⭐
            </button>
          )}
        </div>
        <h3 className="contest-live-card__title">{contest.name}</h3>
        <div className="contest-live-card__meta">
          <div className="contest-live-card__meta-item">
            <span className="contest-live-card__meta-icon">⏱</span>
            <span>{formatDuration(contest)}</span>
          </div>
          <div className="contest-live-card__meta-item">
            <span className="contest-live-card__meta-icon">📅</span>
            <span>{formatDateTime(contest.startTime)}</span>
          </div>
          {contest.type && (
            <div className="contest-live-card__meta-item">
              <span className="contest-live-card__meta-icon">🏷</span>
              <span>{contest.type}</span>
            </div>
          )}
        </div>
        <div className="contest-live-card__countdown">
          <span className="contest-countdown contest-countdown--live">{timeLeft}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Contest Card ──────────────────────────

function UpcomingCard({ contest, platform, isFirst }) {
  const [countdown, setCountdown] = useState('');
  const cfg = PLATFORM_CONFIG[platform];

  useEffect(() => {
    const tick = () => setCountdown(getCountdown(contest.startTime));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [contest.startTime]);

  return (
    <div className={`contest-upcoming-card ${isFirst ? 'contest-upcoming-card--next' : ''}`}>
      <div className="contest-upcoming-card__content">
        <div className="contest-upcoming-card__header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`badge badge--${platform}`}>
              {cfg.icon} {cfg.label}
            </span>
            {isFirst && <span className="contest-next-badge">NEXT UP</span>}
            {contest.type && (
              <span className="badge badge--info">{contest.type}</span>
            )}
          </div>
          {useAuthStore.getState().user && (
            <button
              onClick={() => scheduleAPI.addBookmark(contest._id).then(() => alert('Added to schedule!')).catch(e => alert(e.response?.data?.message || 'Error'))}
              className="btn btn--sm"
              style={{ background: 'transparent', padding: '4px' }}
              title="Add to My Schedule"
            >
              ⭐
            </button>
          )}
        </div>
        <h3 className="contest-upcoming-card__title">{contest.name}</h3>
        <div className="contest-upcoming-card__details">
          <div className="contest-upcoming-card__detail">
            <span style={{ color: 'var(--text-muted)' }}>📅</span>
            <span>{formatDateTime(contest.startTime)}</span>
          </div>
          <div className="contest-upcoming-card__detail">
            <span style={{ color: 'var(--text-muted)' }}>⏱</span>
            <span>{formatDuration(contest)}</span>
          </div>
        </div>
        <div className="contest-upcoming-card__countdown">
          <span className="contest-countdown">{countdown}</span>
        </div>
        <CalendarButtons contest={{...contest, platform}} />
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────

export default function ContestsPage() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [pastPagination, setPastPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [pastPage, setPastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('codeforces');
  const [showPast, setShowPast] = useState(false);

  const fetchContests = useCallback(async (plat, pPage, searchTerm) => {
    setLoading(true);
    try {
      const params = { platform: plat, pastPage: pPage, pastLimit: 20 };
      if (searchTerm) params.search = searchTerm;
      const res = await contestAPI.getCategorizedContests(params);
      const data = res.data;
      setOngoing(data.ongoing || []);
      setUpcoming(data.upcoming || []);
      setPast(data.past?.contests || []);
      setPastPagination(data.past?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContests(platform, pastPage, search);
  }, [platform, pastPage, fetchContests]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPastPage(1);
    fetchContests(platform, 1, search);
  };

  const handlePlatformChange = (p) => {
    setPlatform(p);
    setPastPage(1);
    setSearch('');
    setShowPast(false);
  };

  const currentPlatform = PLATFORM_CONFIG[platform];

  return (
    <div className="page">
      <div className="container">
        {/* ── Header ─────────────────────────────── */}
        <div className="contests-header">
          <div>
            <h1>Contests Tracker</h1>
            <p className="subtitle">Track ongoing, upcoming, and past programming contests across platforms.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 12px rgba(240,178,50,0.4))' }}>🏆</span>
          </div>
        </div>

        {/* ── Toolbar ────────────────────────────── */}
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
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
            <p className="loading-page__text">Loading contests...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════ */}
            {/* ── ONGOING SECTION ────────────────── */}
            {/* ═══════════════════════════════════════ */}
            {ongoing.length > 0 && (
              <section className="contest-section" id="ongoing-contests">
                <div className="contest-section-header">
                  <div className="contest-section-header__icon contest-section-header__icon--live">🔴</div>
                  <div>
                    <h2 className="contest-section-title">Ongoing Contests</h2>
                    <p className="contest-section-subtitle">{ongoing.length} contest{ongoing.length > 1 ? 's' : ''} happening right now</p>
                  </div>
                </div>
                <div className="contest-live-grid">
                  {ongoing.map((c) => (
                    <OngoingCard key={c._id} contest={c} platform={platform} />
                  ))}
                </div>
              </section>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ── UPCOMING SECTION ───────────────── */}
            {/* ═══════════════════════════════════════ */}
            {upcoming.length > 0 ? (
              <section className="contest-section" id="upcoming-contests">
                <div className="contest-section-header">
                  <div className="contest-section-header__icon contest-section-header__icon--upcoming">🟡</div>
                  <div>
                    <h2 className="contest-section-title">Upcoming Contests</h2>
                    <p className="contest-section-subtitle">{upcoming.length} contest{upcoming.length > 1 ? 's' : ''} scheduled</p>
                  </div>
                </div>
                <div className="contest-upcoming-grid">
                  {upcoming.map((c, i) => (
                    <UpcomingCard key={c._id} contest={c} platform={platform} isFirst={i === 0} />
                  ))}
                </div>
              </section>
            ) : (
              !ongoing.length && (
                <section className="contest-section">
                  <div className="contest-section-header">
                    <div className="contest-section-header__icon contest-section-header__icon--upcoming">🟡</div>
                    <div>
                      <h2 className="contest-section-title">Upcoming Contests</h2>
                      <p className="contest-section-subtitle">No upcoming {currentPlatform.label} contests found</p>
                    </div>
                  </div>
                  <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                    <div className="empty-state__icon">📭</div>
                    <p>No upcoming contests scheduled. Check back later!</p>
                  </div>
                </section>
              )
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ── PAST SECTION ───────────────────── */}
            {/* ═══════════════════════════════════════ */}
            <section className="contest-section" id="past-contests">
              <div className="contest-past-toggle-wrapper">
                <button
                  className={`contest-past-toggle ${showPast ? 'contest-past-toggle--open' : ''}`}
                  onClick={() => setShowPast(!showPast)}
                >
                  <div className="contest-past-toggle__left">
                    <span className="contest-section-header__icon contest-section-header__icon--past">📋</span>
                    <div>
                      <span className="contest-past-toggle__title">Past Contests</span>
                      <span className="contest-past-toggle__count">{pastPagination.total.toLocaleString()} {currentPlatform.label} contests</span>
                    </div>
                  </div>
                  <span className={`contest-past-toggle__arrow ${showPast ? 'contest-past-toggle__arrow--open' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>

              {showPast && (
                <div className="contest-past-content" style={{ animation: 'slideUp 0.3s ease' }}>
                  {/* Search for past contests */}
                  <form onSubmit={handleSearch} className="search-box" style={{ marginBottom: 'var(--space-md)' }}>
                    <input
                      id="past-contest-search"
                      type="text"
                      placeholder={`🔍 Search ${currentPlatform.label} past contests...`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit">Search</button>
                  </form>

                  {past.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                      <div className="empty-state__icon">🏆</div>
                      <h2 className="empty-state__title">No past contests found</h2>
                      <p>Try a different search term.</p>
                    </div>
                  ) : (
                    <>
                      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
                          <table>
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Platform</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Duration</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {past.map((c) => (
                                <tr key={c._id} className={c.attended ? 'contest-row--attended' : ''}>
                                  <td style={{ textAlign: 'center', width: '40px' }}>
                                    {c.attended && (
                                      <span className="contest-attended-tick" title="You participated!">✓</span>
                                    )}
                                  </td>
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
                          disabled={pastPage <= 1}
                          onClick={() => setPastPage((p) => p - 1)}
                        >
                          ← Prev
                        </button>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {Array.from({ length: Math.min(pastPagination.totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (pastPagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pastPage <= 3) {
                              pageNum = i + 1;
                            } else if (pastPage >= pastPagination.totalPages - 2) {
                              pageNum = pastPagination.totalPages - 4 + i;
                            } else {
                              pageNum = pastPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                className={`btn btn--sm ${pageNum === pastPage ? 'btn--primary' : 'btn--outline'}`}
                                onClick={() => setPastPage(pageNum)}
                                style={{ minWidth: '36px' }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          className="btn btn--secondary btn--sm"
                          disabled={pastPage >= pastPagination.totalPages}
                          onClick={() => setPastPage((p) => p + 1)}
                        >
                          Next →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
