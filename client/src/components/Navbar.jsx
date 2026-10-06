import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileMenuOpen]);

  const isActive = (path) => (location.pathname === path ? 'nav-link active' : 'nav-link');

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
          <span>⚡</span>
          <span>Code</span><span className="brand-highlight">Contest</span>&nbsp;Analytics
        </Link>

        {/* Desktop Navigation Links */}
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
              <Link to="/contests" className={isActive('/contests')}>
                Contests
              </Link>
              <Link to="/leaderboard" className={isActive('/leaderboard')}>
                Leaderboard
              </Link>
              <Link to="/login" className="nav-btn nav-btn--ghost">
                Login
              </Link>
              <Link to="/register" className="nav-btn nav-btn--primary">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'navbar-mobile-menu--open' : ''}`}>
        {loading ? null : user ? (
          <>
            <Link to="/contests" className={isActive('/contests')}>
              🏆 Contests
            </Link>
            <Link to="/leaderboard" className={isActive('/leaderboard')}>
              📊 Leaderboard
            </Link>
            <Link to="/schedule" className={isActive('/schedule')}>
              📅 My Schedule
            </Link>
            <Link to="/upsolve" className={isActive('/upsolve')}>
              🧩 Upsolve
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              📈 Dashboard
            </Link>
            <Link to="/settings" className={isActive('/settings')}>
              ⚙️ Settings
            </Link>
            <button
              type="button"
              className="nav-btn nav-btn--ghost"
              style={{
                width: '100%',
                textAlign: 'left',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
              }}
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/contests" className={isActive('/contests')}>
              🏆 Contests
            </Link>
            <Link to="/leaderboard" className={isActive('/leaderboard')}>
              📊 Leaderboard
            </Link>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Link
                to="/login"
                className="nav-btn nav-btn--ghost"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="nav-btn nav-btn--primary"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Sign Up
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

