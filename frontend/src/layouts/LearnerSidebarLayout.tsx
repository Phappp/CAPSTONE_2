import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Award,
  User,
  BookOpen,
  ClipboardList,
  Video,
  Bell,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/Auth';
import transLogo from '../assets/trans-logo-2.png';
import './LearnerSidebarLayout.css';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  to: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} strokeWidth={2.1} />,
    to: '/learner/dashboard',
    match: (p) => p === '/learner/dashboard' || p === '/student/dashboard',
  },
  {
    key: 'my-courses',
    label: 'My Courses',
    icon: <GraduationCap size={20} strokeWidth={2.1} />,
    to: '/learner/my-courses',
    match: (p) => p.startsWith('/learner/my-courses') || p.startsWith('/my-courses'),
  },
  {
    key: 'certificates',
    label: 'Certificates',
    icon: <Award size={20} strokeWidth={2.1} />,
    to: '/learner/certificates',
    match: (p) => p.startsWith('/learner/certificates'),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: <User size={20} strokeWidth={2.1} />,
    to: '/learner/settings',
    match: (p) => p.startsWith('/learner/settings') || p.startsWith('/profile'),
  },
  {
    key: 'workspace',
    label: 'Learning Workspace',
    icon: <BookOpen size={20} strokeWidth={2.1} />,
    to: '/learner/workspace',
    match: (p) => p.startsWith('/learner/workspace') || p.startsWith('/learning'),
  },
  {
    key: 'assignments',
    label: 'Assignments',
    icon: <ClipboardList size={20} strokeWidth={2.1} />,
    to: '/learner/assignments',
    match: (p) => p.startsWith('/learner/assignment'),
  },
  {
    key: 'live',
    label: 'Live Session',
    icon: <Video size={20} strokeWidth={2.1} />,
    to: '/learner/schedule',
    match: (p) => p.startsWith('/learner/schedule') || p.startsWith('/live-session'),
  },
];

export default function LearnerSidebarLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const displayName =
    user?.full_name?.trim() || user?.email?.split('@')[0] || 'Learner';
  const avatarUrl = user?.avatar_url || undefined;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="learner-layout">
      <aside className="learner-layout__sidebar">
        <div className="learner-layout__brand">
          <img
            src={transLogo}
            alt="MindBridge Logo"
            className="learner-layout__brand-img"
          />
        </div>

        <nav className="learner-layout__nav">
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`learner-layout__nav-link ${
                  active ? 'learner-layout__nav-link--active' : ''
                }`}
              >
                <span className="learner-layout__nav-icon">{item.icon}</span>
                <span className="learner-layout__nav-label">{item.label}</span>
                {active && <span className="learner-layout__nav-indicator" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="learner-layout__topbar">
        <div className="learner-layout__topbar-left">
          <a className="learner-layout__topbar-link" href="#">Help</a>
          <a className="learner-layout__topbar-link" href="#">Resources</a>
        </div>

        <div className="learner-layout__topbar-right">
          <button
            type="button"
            className="learner-layout__icon-btn"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2.1} />
            <span className="learner-layout__icon-dot" />
          </button>
          <button
            type="button"
            className="learner-layout__icon-btn"
            aria-label="Settings"
            onClick={() => navigate('/learner/settings')}
          >
            <Settings size={18} strokeWidth={2.1} />
          </button>

          <div
            className="learner-layout__avatar"
            onClick={() => navigate('/learner/settings')}
            role="button"
            tabIndex={0}
          >
            {avatarUrl ? (
              <img alt="User Profile" src={avatarUrl} />
            ) : (
              <div className="learner-layout__avatar-fallback">{initial}</div>
            )}
          </div>
        </div>
      </header>

      <main className="learner-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
