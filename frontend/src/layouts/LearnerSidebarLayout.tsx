import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, LayoutDashboard, Menu, X } from "lucide-react";
import "./LearnerSidebarLayout.css";

const menuItems = [
  { path: "/student/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { path: "/courses", label: "Khám phá khóa học", icon: BookOpen },
];

export default function LearnerSidebarLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="learner-shell">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="learner-shell__overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Đóng menu điều hướng"
        />
      ) : null}

      <aside className={`learner-shell__sidebar ${isMobileSidebarOpen ? "is-open" : ""}`}>
        <div className="learner-shell__brand">
          <h1 className="learner-shell__brandName">MindBridge</h1>
          <p className="learner-shell__brandSub">CỔNG HỌC VIÊN</p>
        </div>
        <nav className="learner-shell__nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `learner-shell__link ${isActive ? "active" : ""}`}
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="learner-shell__content">
        <button
          type="button"
          className="learner-shell__menuBtn"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          aria-label={isMobileSidebarOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Outlet />
      </main>
    </div>
  );
}
