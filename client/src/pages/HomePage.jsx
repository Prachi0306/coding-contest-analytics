import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function HomePage() {
  const user = useAuthStore(state => state.user);

  return (
    <div className="page">
      <div className="container">
        {/* Hero */}
        <div className="hero-section">
          <h1 className="hero-title">
            Track your competitive<br />programming journey
          </h1>
          <p className="hero-subtitle">
            Sync your LeetCode, Codeforces, and CodeChef ratings, visualize your progress, and compete with friends — all in one beautiful dashboard.
          </p>

          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn--primary btn--lg">
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn--primary btn--lg">
                  🚀 Get Started — Free
                </Link>
                <Link to="/contests" className="btn btn--secondary btn--lg">
                  Browse Contests
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-card__icon">📈</div>
            <h3 className="feature-card__title">Rating History</h3>
            <p className="feature-card__desc">
              Interactive multi-platform charts showing your rating trajectory with detailed contest breakdowns.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">🏆</div>
            <h3 className="feature-card__title">Global Leaderboard</h3>
            <p className="feature-card__desc">
              See how you rank against other competitive programmers. Compete, climb, and dominate.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">🔄</div>
            <h3 className="feature-card__title">Auto Sync</h3>
            <p className="feature-card__desc">
              Connect your platform handles and sync all your contest stats with one click.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">📊</div>
            <h3 className="feature-card__title">Deep Analytics</h3>
            <p className="feature-card__desc">
              Best rank, average rank, win rate, rating streaks, problems solved, and much more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
