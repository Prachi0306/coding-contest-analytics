import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '16px',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Track your competitive<br />programming journey
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          margin: '0 auto 40px',
          lineHeight: 1.7,
        }}>
          Sync your Codeforces ratings, visualize your progress, and compete
          with friends — all in one beautiful dashboard.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/dashboard" className="btn btn--primary btn--lg">
              Open Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn--primary btn--lg">
                Get Started — Free
              </Link>
              <Link to="/contests" className="btn btn--secondary btn--lg">
                Browse Contests
              </Link>
            </>
          )}
        </div>

        {/* Feature cards */}
        <div className="stats-grid" style={{ marginTop: '80px', textAlign: 'left' }}>
          <div className="stat-card">
            <span style={{ fontSize: '2rem' }}>📈</span>
            <span className="stat-card__label">Rating History</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Interactive charts showing your rating over time with detailed contest breakdowns.
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: '2rem' }}>🏆</span>
            <span className="stat-card__label">Leaderboard</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              See how you rank against other users on the platform. Compete and climb.
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: '2rem' }}>🔄</span>
            <span className="stat-card__label">Auto Sync</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Connect your Codeforces handle and sync your stats with one click.
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: '2rem' }}>📊</span>
            <span className="stat-card__label">Deep Analytics</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Best rank, average rank, win rate, rating streaks, and much more.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
