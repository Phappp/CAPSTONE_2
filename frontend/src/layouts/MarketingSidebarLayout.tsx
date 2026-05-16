import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  DollarSign,
  Library,
  LayoutDashboard,
  GraduationCap,
  Award,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/Auth';
import transLogo from '../assets/trans-logo-2.png';
import './MarketingSidebarLayout.css';

type NavKey = 'courses' | 'instructors' | 'pricing' | 'resources';

interface NavItem {
  key: NavKey;
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'courses', label: 'Explore Courses', to: '/courses', icon: <BookOpen size={18} strokeWidth={2} /> },
  { key: 'instructors', label: 'Instructors', to: '/instructors', icon: <Users size={18} strokeWidth={2} /> },
  { key: 'pricing', label: 'Pricing', to: '/pricing', icon: <DollarSign size={18} strokeWidth={2} /> },
  { key: 'resources', label: 'Resources', to: '/resources', icon: <Library size={18} strokeWidth={2} /> },
];

const LEARNER_NAV: NavItem[] = [
  { key: 'courses', label: 'Dashboard', to: '/learner/dashboard', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
  { key: 'instructors', label: 'My Courses', to: '/learner/my-courses', icon: <GraduationCap size={18} strokeWidth={2} /> },
  { key: 'pricing', label: 'Certificates', to: '/learner/certificates', icon: <Award size={18} strokeWidth={2} /> },
  { key: 'resources', label: 'Profile', to: '/learner/settings', icon: <Settings size={18} strokeWidth={2} /> },
];

export default function MarketingSidebarLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Learner';
  const initial = displayName.charAt(0).toUpperCase();
  const isLearner = location.pathname.startsWith('/learner') || location.pathname.startsWith('/learn');

  const navItems = isLearner ? LEARNER_NAV : NAV_ITEMS;

  const handleLogout = async () => {
    setAvatarMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="mkt-layout">
      {/* Sidebar */}
      <aside
        className={`mkt-layout__sidebar${sidebarOpen ? ' mkt-layout__sidebar--open' : ''}`}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="mkt-layout__brand">
          <Link to="/">
            <img src={transLogo} alt="MindBridge Logo" className="mkt-layout__brand-img" />
          </Link>
          {sidebarOpen && <span className="mkt-layout__brand-name">MindBridge</span>}
        </div>

        <nav className="mkt-layout__nav">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`mkt-layout__nav-link${isActive ? ' mkt-layout__nav-link--active' : ''}`}
              >
                <span className="mkt-layout__nav-icon">{item.icon}</span>
                <span className="mkt-layout__nav-label">{item.label}</span>
                {isActive && <span className="mkt-layout__nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        {isLearner && (
          <div className="mkt-layout__bottom">
            <button
              type="button"
              className="mkt-layout__logout-btn"
              onClick={handleLogout}
            >
              <span className="mkt-layout__nav-icon"><LogOut size={18} strokeWidth={2} /></span>
              <span className="mkt-layout__nav-label">Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* Topbar */}
      <header className="mkt-layout__topbar">
        <div className="mkt-layout__topbar-left">
          <span className="mkt-layout__breadcrumb">
            {navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? 'MindBridge'}
          </span>
        </div>

        <div className="mkt-layout__topbar-right">
          {isAuthenticated ? (
            <div className="mkt-layout__avatar-wrapper">
              <button
                type="button"
                className="mkt-layout__avatar"
                aria-label="User menu"
                onClick={() => setAvatarMenuOpen((v) => !v)}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} />
                ) : (
                  <div className="mkt-layout__avatar-fallback">{initial}</div>
                )}
              </button>

              {avatarMenuOpen && (
                <>
                  <div className="mkt-layout__dropdown">
                    <div className="mkt-layout__dropdown-header">
                      <div className="mkt-layout__dropdown-name">{displayName}</div>
                      <div className="mkt-layout__dropdown-email">{user?.email}</div>
                    </div>
                    <div className="mkt-layout__dropdown-divider" />
                    <Link
                      to="/learner/dashboard"
                      className="mkt-layout__dropdown-item"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} strokeWidth={2} />
                      Dashboard
                    </Link>
                    <Link
                      to="/learner/my-courses"
                      className="mkt-layout__dropdown-item"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      <GraduationCap size={15} strokeWidth={2} />
                      My Courses
                    </Link>
                    <Link
                      to="/learner/settings"
                      className="mkt-layout__dropdown-item"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      <Settings size={15} strokeWidth={2} />
                      Profile Settings
                    </Link>
                    <div className="mkt-layout__dropdown-divider" />
                    <button
                      type="button"
                      className="mkt-layout__dropdown-item mkt-layout__dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} strokeWidth={2} />
                      Logout
                    </button>
                  </div>
                  <div className="mkt-layout__overlay" onClick={() => setAvatarMenuOpen(false)} />
                </>
              )}
            </div>
          ) : (
            <div className="mkt-layout__auth-btns">
              <button
                type="button"
                className="mkt-layout__login-btn"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              <button
                type="button"
                className="mkt-layout__get-started-btn"
                onClick={() => navigate('/register')}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mkt-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
