import { useState, useEffect, useCallback } from 'react';
import { scheduleAPI } from '../api';
import CalendarButtons from '../components/CalendarButtons';

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getCountdown(startTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const diff = start - now;
  if (diff <= 0) return 'Running / Past';
  const days = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `Starts in ${days}d ${h}h`;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scheduleAPI.getSchedule();
      setSchedule(res.data.contests || []);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleRemove = async (contestId) => {
    try {
      await scheduleAPI.removeBookmark(contestId);
      setSchedule((prev) => prev.filter((c) => c._id !== contestId));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div>
            <h1 className="section-title">My Schedule</h1>
            <p className="section-subtitle">Your bookmarked and upcoming programming contests.</p>
          </div>
          <span style={{ fontSize: '2.5rem' }}>📅</span>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
            <p className="loading-page__text">Loading schedule...</p>
          </div>
        ) : schedule.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">⭐</div>
            <h2 className="empty-state__title">Your schedule is empty</h2>
            <p>Go to the Contests page and click the star icon to bookmark upcoming contests.</p>
          </div>
        ) : (
          <div className="contest-upcoming-grid">
            {schedule.map((contest) => (
              <div key={contest.bookmarkId} className="contest-upcoming-card">
                <div className="contest-upcoming-card__content">
                  <div className="contest-upcoming-card__header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`badge badge--${contest.platform}`}>
                        {contest.platform.toUpperCase()}
                      </span>
                      {contest.type && <span className="badge badge--info">{contest.type}</span>}
                    </div>
                    <button
                      onClick={() => handleRemove(contest._id)}
                      className="btn btn--sm"
                      style={{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--accent-red)', padding: '4px 8px' }}
                      title="Remove from schedule"
                    >
                      ★ Unstar
                    </button>
                  </div>
                  <h3 className="contest-upcoming-card__title">{contest.name}</h3>
                  <div className="contest-upcoming-card__details">
                    <div className="contest-upcoming-card__detail">
                      <span>📅 {formatDateTime(contest.startTime)}</span>
                    </div>
                    <div className="contest-upcoming-card__detail">
                      <span>⏱ {formatDuration(contest.duration)}</span>
                    </div>
                  </div>
                  <div className="contest-upcoming-card__countdown">
                    <span className="contest-countdown">{getCountdown(contest.startTime)}</span>
                  </div>
                  <CalendarButtons contest={contest} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
