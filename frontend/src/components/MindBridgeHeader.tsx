import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import transLogo from "../assets/trans-logo-2.png";
import { useAuth } from "../contexts/Auth";
import "./MindBridgeHeader.css";

type NavKey = "courses" | "instructors" | "pricing" | "resources";

interface MindBridgeHeaderProps {
  active?: NavKey;
}

const NAV_LINKS: { key: NavKey; label: string; to: string }[] = [
  { key: "courses", label: "Courses", to: "/courses" },
  { key: "instructors", label: "Instructors", to: "/instructors" },
  { key: "pricing", label: "Pricing", to: "/pricing" },
  { key: "resources", label: "Resources", to: "/resources" },
];

export default function MindBridgeHeader({ active }: MindBridgeHeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "Account";
  const avatarInitial = user?.full_name?.[0]?.toUpperCase() ?? "?";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <nav className="mb-nav">
      <div className="mb-nav__inner">
        <Link to="/" className="mb-nav__brand">
          <img alt="MindBridge Logo" className="mb-nav__logo" src={transLogo} />
        </Link>
        <div className="mb-nav__links">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={
                item.key === active
                  ? "mb-nav__link mb-nav__link--active"
                  : "mb-nav__link"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mb-nav__cta">
          {isAuthenticated ? (
            <div className="mb-nav__user-menu">
              <button
                type="button"
                className="mb-nav__avatar-btn"
                aria-label="User menu"
                aria-haspopup="true"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="mb-nav__avatar-img"
                  />
                ) : (
                  <div className="mb-nav__avatar-fallback">{avatarInitial}</div>
                )}
                <svg
                  className={`mb-nav__chevron${menuOpen ? " mb-nav__chevron--open" : ""}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 4L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="mb-nav__dropdown">
                    <div className="mb-nav__dropdown-header">
                      <div className="mb-nav__dropdown-name">{displayName}</div>
                      <div className="mb-nav__dropdown-email">{user?.email}</div>
                    </div>
                    <div className="mb-nav__dropdown-divider" />
                    <Link
                      to="/learner/dashboard"
                      className="mb-nav__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/learner/my-courses"
                      className="mb-nav__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Courses
                    </Link>
                    <Link
                      to="/learner/settings"
                      className="mb-nav__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <div className="mb-nav__dropdown-divider" />
                    <button
                      type="button"
                      className="mb-nav__dropdown-item mb-nav__dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                  <div
                    className="mb-nav__dropdown-overlay"
                    onClick={() => setMenuOpen(false)}
                  />
                </>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="mb-nav__login" onClick={() => navigate("/login")}>
                Login
              </button>
              <button
                type="button"
                className="mb-nav__get-started"
                onClick={() => navigate("/register")}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
