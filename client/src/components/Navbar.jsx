import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const user = useAuthStore(state => state.user);
  const loading = useAuthStore(state => state.loading);
  const logout = useAuthStore(state => state.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span>⚡</span>
          <span>Code</span><span className="brand-highlight">Contest</span>&nbsp;Analytics
        </Link>

        <div className="navbar-links">
          {loading ? null : user ? (
            <>
              <Link to="/contests" className={isActive('/contests')}>
                Contests
              </Link>
              <Link to="/leaderboard" className={isActive('/leaderboard')}>
                Leaderboard
              </Link>
              <Link to="/schedule" className={isActive('/schedule')}>
                My Schedule
              </Link>
              <Link to="/upsolve" className={isActive('/upsolve')}>
                Upsolve
              </Link>
              <Link to="/dashboard" className={isActive('/dashboard')}>
                Dashboard
              </Link>
              <Link to="/settings" className={isActive('/settings')}>
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn nav-btn--ghost">
                Login
              </Link>
              <Link to="/register" className="nav-btn nav-btn--primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
