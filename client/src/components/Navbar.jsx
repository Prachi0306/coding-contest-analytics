import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span>⚡</span> CodeContest Analytics
        </Link>

        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/contests" className={isActive('/contests')}>
                Contests
              </Link>
              <Link to="/leaderboard" className={isActive('/leaderboard')}>
                Leaderboard
              </Link>
              <Link to="/dashboard" className={isActive('/dashboard')}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="nav-btn nav-btn--ghost">
                Logout
              </button>
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
