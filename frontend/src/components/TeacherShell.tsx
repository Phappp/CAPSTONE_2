import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AvatarMenu from "./AvatarMenu";
import transLogo from "../assets/trans-logo-2.png";
import "./TeacherShell.css";

/**
 * TeacherShell
 *
 * Shared chrome for the Teacher (Course Manager) area — sidebar + top nav.
 * Mirrors the design language of the HTML mockups in
 * src/pages/courseManager/*.html (slate / teal / Manrope).
 *
 * Pages opt in by wrapping their content in <TeacherShell activeNav="...">.
 * Existing TSX inside the page stays untouched — only the outer chrome
 * comes from this component.
 */

export type TeacherShellNavKey =
  | "overview"
  | "analytics"
  | "curriculum"
  | "assignments"
  | "grading"
  | "discussions"
  | "live"
  | "courses";

/**
 * Top-level page keys (kept for backwards-compat in callers; the visible
 * topnav now only shows logo + notification + profile per the latest
 * Course Manager UX spec).
 */
export type TeacherShellTopKey =
  | "dashboard"
  | "analytics"
  | "courses"
  | "live";

type NavEntry = {
  key: TeacherShellNavKey;
  label: string;
  icon: string;
  to: string;
};

const SIDEBAR_NAV: NavEntry[] = [
  { key: "overview", label: "Overview", icon: "dashboard", to: "/teacher/dashboard" },
  { key: "analytics", label: "Student Insights", icon: "analytics", to: "/teacher/analytics" },
  // { key: "courses", label: "Curriculum", icon: "library_books", to: "/teacher/course-builder" },
  // { key: "assignments", label: "Assignments", icon: "assignment_add", to: "/teacher/assignment-builder" },
  // { key: "grading", label: "Grading", icon: "rule", to: "/teacher/grading-station" },
  { key: "discussions", label: "Discussions", icon: "forum", to: "/teacher/discussions" },
];

type Props = {
  /** Active sidebar item key. */
  activeNav: TeacherShellNavKey;
  /** Reserved for future top-nav highlight (currently the topnav has no links). */
  activeTopNav?: TeacherShellTopKey;
  /** Hide the floating action button (defaults to true on dashboard). */
  showFab?: boolean;
  fabLabel?: string;
  onFabClick?: () => void;
  children: React.ReactNode;
};

const TeacherShell: React.FC<Props> = ({
  activeNav,
  showFab = true,
  fabLabel = "New Course",
  onFabClick,
  children,
}) => {
  const navigate = useNavigate();

  const handleCreateCourse = () => {
    navigate("/teacher/courses/new");
  };

  return (
    <div className="tshell">
      <div className="tshell-utility" aria-label="User utilities">
        <button
          type="button"
          className="tshell-iconbtn"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="tshell-iconbtn__dot" aria-hidden />
        </button>
        <AvatarMenu />
      </div>

      <aside className="tshell-sidebar" aria-label="Teacher navigation">
        <Link
          to="/teacher/dashboard"
          className="tshell-sidebar__brand"
          aria-label="MindBridge — Course Manager home"
        >
          <img
            src={transLogo}
            alt="MindBridge"
            className="tshell-sidebar__logo"
          />
          <div className="tshell-sidebar__brand-meta">
            <p className="tshell-sidebar__brand-title">Instructor Suite</p>
            <p className="tshell-sidebar__brand-sub">Course Manager</p>
          </div>
        </Link>

        <nav className="tshell-sidebar__nav">
          {SIDEBAR_NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`tshell-navitem${
                activeNav === item.key ? " is-active" : ""
              }`}
            >
              <span className="material-symbols-outlined tshell-navitem__icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="tshell-sidebar__footer">
          <button
            type="button"
            className="tshell-cta"
            onClick={handleCreateCourse}
          >
            <span className="material-symbols-outlined">add</span>
            Create New Course
          </button>
          <div className="tshell-sidebar__sub-nav">
            <button type="button" className="tshell-navitem">
              <span className="material-symbols-outlined tshell-navitem__icon">
                contact_support
              </span>
              <span>Support</span>
            </button>
            <Link to="/profile" className="tshell-navitem">
              <span className="material-symbols-outlined tshell-navitem__icon">
                manage_accounts
              </span>
              <span>Account</span>
            </Link>
          </div>
        </div>
      </aside>

      <main className="tshell-main">{children}</main>

      {showFab && (
        <button
          type="button"
          className="tshell-fab"
          aria-label={fabLabel}
          onClick={onFabClick ?? handleCreateCourse}
        >
          <span className="material-symbols-outlined">add</span>
          <span className="tshell-fab__label">{fabLabel}</span>
        </button>
      )}
    </div>
  );
};

export default TeacherShell;
