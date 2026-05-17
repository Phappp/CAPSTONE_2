import { Link, useLocation } from "react-router-dom";
import "./CourseManagerDashboardPage.css";

const navItems = [
  { icon: "dashboard", label: "Overview", path: "/teacher/dashboard" },
  { icon: "analytics", label: "Student Insights", path: "/teacher/analytics" },
  { icon: "library_books", label: "Curriculum", path: "/teacher/course-builder" },
  { icon: "assignment_add", label: "Assignments", path: "/teacher/courses/1/assignment-editor" },
  { icon: "rule", label: "Grading", path: "/teacher/courses/1/grading" },
  { icon: "forum", label: "Discussions", path: "/teacher/discussions" },
];

const revenueBars = [
  { height: "40%", filled: false },
  { height: "55%", filled: false },
  { height: "45%", filled: false },
  { height: "70%", filled: false },
  { height: "85%", filled: true },
  { height: "95%", filled: true, dark: true },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const gradingRows = [
  {
    initials: "SK",
    avatarClass: "cmd-table__avatar--indigo",
    name: "Sarah Kinsley",
    course: "Advanced UX Patterns",
    date: "Oct 24, 2023",
    aiReady: true,
    analyzing: false,
  },
  {
    initials: "JM",
    avatarClass: "cmd-table__avatar--emerald",
    name: "James Miller",
    course: "Neural Networks 101",
    date: "Oct 23, 2023",
    aiReady: true,
    analyzing: false,
  },
  {
    initials: "RL",
    avatarClass: "cmd-table__avatar--amber",
    name: "Rosa Lopez",
    course: "Advanced UX Patterns",
    date: "Oct 23, 2023",
    aiReady: false,
    analyzing: true,
  },
];

const upcomingClasses = [
  {
    time: "10:00",
    period: "AM",
    muted: false,
    title: "Advanced UX Patterns",
    meta: "12 Students \u2022 Zoom",
    accent: true,
  },
  {
    time: "01:30",
    period: "PM",
    muted: true,
    title: "Neural Networks 101",
    meta: "45 Students \u2022 Hall B",
    accent: false,
  },
  {
    time: "04:00",
    period: "PM",
    muted: true,
    title: "Office Hours",
    meta: "Individual Sessions",
    accent: false,
  },
];

export default function CourseManagerDashboardPage() {
  const location = useLocation();

  return (
    <div className="cmd">
      {/* Top Nav Bar */}
      <header className="cmd-topbar">
        <div className="cmd-topbar__left">
          <Link to="/" className="cmd-topbar__logo">MindBridge E-Learning</Link>
          <nav className="cmd-topbar__nav">
            <Link
              to="/teacher/dashboard"
              className={`cmd-topbar__nav-link${location.pathname === "/teacher/dashboard" ? " cmd-topbar__nav-link--active" : ""}`}
            >
              Dashboard
            </Link>
            <Link to="/teacher/analytics" className="cmd-topbar__nav-link">Analytics</Link>
            <Link to="/courses" className="cmd-topbar__nav-link">Courses</Link>
          </nav>
        </div>
        <div className="cmd-topbar__actions">
          <div className="cmd-topbar__search">
            <span className="material-symbols-outlined cmd-topbar__search-icon">search</span>
            <input
              className="cmd-topbar__search-input"
              type="text"
              placeholder="Search students or courses..."
            />
          </div>
          <button className="cmd-topbar__icon-btn" type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="cmd-topbar__icon-btn" type="button" aria-label="Help">
            <span className="material-symbols-outlined">help</span>
          </button>
          <button className="cmd-topbar__icon-btn" type="button" aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="cmd-topbar__avatar">
            <img
              alt="Instructor Profile"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG3T0NJCVF0hu9cX84tvn6_95ncR_5Pi38N7WGl_CRgghGNNJHCwpRPe2QEnnw7ScBRirFZWYTJUg6iD5fikBETx4B5Ls-_FTRUfusgHghHuW_zmAc7EJZQWpOuKrK_Dvn9f3aM7wOz7T6ftVQMpISy3za_785RVn6X3vn-TY_MZ6ArgKGaVtANoCj53tOSJtqq3qmBiJc6YwEO8DblvwuO39IO3FivpbBBc6WDaMa0pzcdw4oMjW3Lqz1mOk0j3phkKtN5z6Elw"
            />
          </div>
        </div>
      </header>

      {/* Side Nav Bar */}
      <aside className="cmd-sidebar">
        <div className="cmd-sidebar__brand">
          <div className="cmd-sidebar__brand-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div>
            <h2 className="cmd-sidebar__brand-title">Instructor Suite</h2>
            <p className="cmd-sidebar__brand-sub">MindBridge AI</p>
          </div>
        </div>

        <nav className="cmd-sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`cmd-sidebar__nav-link${item.path === "/teacher/dashboard" ? " cmd-sidebar__nav-link--active" : ""}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="cmd-sidebar__footer">
          <Link to="/teacher/courses/new" className="cmd-sidebar__create-btn">
            <span className="material-symbols-outlined">add</span>
            Create New Course
          </Link>
          <div className="cmd-sidebar__footer-links">
            <Link to="/contact" className="cmd-sidebar__footer-link">
              <span className="material-symbols-outlined">contact_support</span>
              <span>Support</span>
            </Link>
            <Link to="/profile" className="cmd-sidebar__footer-link">
              <span className="material-symbols-outlined">manage_accounts</span>
              <span>Account</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="cmd-main">
        {/* <header className="cmd-main__header">
          <h1 className="cmd-main__title">Welcome back, Dr. Aris</h1>
          <p className="cmd-main__subtitle">Here's what's happening with your courses today.</p>
        </header> */}

        {/* Metrics Grid */}
        <div className="cmd-metrics">
          <div className="cmd-metric-card">
            <div className="cmd-metric-card__row">
              <div className="cmd-metric-card__icon">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="cmd-metric-card__badge cmd-metric-card__badge--up">+12%</span>
            </div>
            <p className="cmd-metric-card__label">Total Students</p>
            <p className="cmd-metric-card__value">1,284</p>
          </div>

          <div className="cmd-metric-card">
            <div className="cmd-metric-card__row">
              <div className="cmd-metric-card__icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="cmd-metric-card__badge cmd-metric-card__badge--up">+8.4%</span>
            </div>
            <p className="cmd-metric-card__label">Monthly Revenue</p>
            <p className="cmd-metric-card__value">$14,290</p>
          </div>

          <div className="cmd-metric-card">
            <div className="cmd-metric-card__row">
              <div className="cmd-metric-card__icon">
                <span className="material-symbols-outlined">star</span>
              </div>
              <span className="cmd-metric-card__badge cmd-metric-card__badge--stable">Stable</span>
            </div>
            <p className="cmd-metric-card__label">Average Rating</p>
            <p className="cmd-metric-card__value">4.9/5.0</p>
          </div>

          <div className="cmd-metric-card cmd-metric-card--highlight">
            <div className="cmd-metric-card__row">
              <div className="cmd-metric-card__icon cmd-metric-card__icon--teal">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <span className="cmd-metric-card__badge cmd-metric-card__badge--action">Action Required</span>
            </div>
            <p className="cmd-metric-card__label">Pending Grading</p>
            <p className="cmd-metric-card__value">24</p>
          </div>
        </div>

        {/* Bento Layout */}
        <div className="cmd-bento">
          {/* Revenue Trends */}
          <div className="cmd-card cmd-revenue-card">
            <div className="cmd-card__header">
              <h2 className="cmd-card__title">Revenue Trends</h2>
              <select className="cmd-revenue-card__period-select">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="cmd-revenue-card__chart">
              <div className="cmd-revenue-card__chart-bg" />
              <div className="cmd-revenue-card__bars">
                {revenueBars.map((bar, i) => (
                  <div key={i} className="cmd-revenue-card__bar-wrap">
                    <div
                      className={`cmd-revenue-card__bar${bar.dark ? " cmd-revenue-card__bar--filled-dark" : bar.filled ? " cmd-revenue-card__bar--filled" : ""}`}
                      style={{ height: bar.height }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="cmd-revenue-card__labels">
              {months.map((m) => (
                <span key={m} className="cmd-revenue-card__label">{m}</span>
              ))}
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="cmd-card cmd-classes-card">
            <h2 className="cmd-card__title">Upcoming Classes</h2>
            <div className="cmd-class-list">
              {upcomingClasses.map((cls, i) => (
                <div
                  key={i}
                  className={`cmd-class-item${cls.accent ? " cmd-class-item--teal" : ""}`}
                >
                  <div className="cmd-class-item__time">
                    <span className={`cmd-class-item__hour${cls.muted ? " cmd-class-item__hour--muted" : ""}`}>
                      {cls.time}
                    </span>
                    <span className="cmd-class-item__period">{cls.period}</span>
                  </div>
                  <div className="cmd-class-item__info">
                    <p className="cmd-class-item__title">{cls.title}</p>
                    <p className="cmd-class-item__meta">{cls.meta}</p>
                  </div>
                  <button className="cmd-class-item__action" type="button" aria-label="Open">
                    <span className="material-symbols-outlined">
                      {cls.accent ? "videocam" : i === 1 ? "more_vert" : "calendar_month"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <button className="cmd-classes-card__view-all" type="button">
              View Full Schedule
            </button>
          </div>

          {/* Grading Queue */}
          <div className="cmd-card cmd-grading-card">
            <div className="cmd-grading-card__toolbar">
              <h2 className="cmd-card__title">Grading Queue</h2>
              <div className="cmd-grading-card__actions">
                <button className="cmd-btn cmd-btn--ghost" type="button">Filter</button>
                <Link to="/teacher/courses/1/grading" className="cmd-btn cmd-btn--primary">
                  Grade All
                </Link>
              </div>
            </div>

            <div className="cmd-table-wrap">
              <table className="cmd-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Submission Date</th>
                    <th>AI Insight</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingRows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <div className="cmd-table__student">
                          <div className={`cmd-table__avatar ${row.avatarClass}`}>
                            {row.initials}
                          </div>
                          <span className="cmd-table__student-name">{row.name}</span>
                        </div>
                      </td>
                      <td className="cmd-table__course">{row.course}</td>
                      <td className="cmd-table__date">{row.date}</td>
                      <td>
                        {row.aiReady ? (
                          <span className="cmd-table__badge cmd-table__badge--ai-ready">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                              auto_awesome
                            </span>
                            AI Suggestion Ready
                          </span>
                        ) : (
                          <span className="cmd-table__badge cmd-table__badge--analyzing">
                            Analyzing...
                          </span>
                        )}
                      </td>
                      <td>
                        {row.aiReady ? (
                          <Link to="/teacher/courses/1/grading" className="cmd-table__action-link">
                            Review
                          </Link>
                        ) : (
                          <span className="cmd-table__action-btn">Review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cmd-grading-card__footer">
              <Link to="/teacher/courses/1/grading" className="cmd-grading-card__footer-link">
                View All Assignments
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* FAB */}
      <Link to="/teacher/courses/new" className="cmd-fab" aria-label="Create new course">
        <span className="material-symbols-outlined cmd-fab__icon" style={{ fontVariationSettings: "'FILL' 1" }}>
          add
        </span>
        <span className="cmd-fab__tooltip">New Course</span>
      </Link>
    </div>
  );
}
