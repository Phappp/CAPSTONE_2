import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import "./LearnerSidebar.css";

type SidebarItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

type LearnerSidebarProps = {
  isMobileOpen: boolean;
  menuItems: SidebarItem[];
  onItemClick?: () => void;
};

export default function LearnerSidebar(props: LearnerSidebarProps) {
  const { isMobileOpen, menuItems, onItemClick } = props;
  const location = useLocation();

  const isItemActive = (itemPath: string) => {
    return location.pathname === itemPath;
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? "is-open" : ""}`}>
      <div className="sidebar-brand">
        <h1 className="brand-name">MindBridge</h1>
        <p className="brand-subtitle">CỔNG HỌC VIÊN</p>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={`${item.path}-${item.label}`}>
              <Link
                to={item.path}
                className={`nav-link ${isItemActive(item.path) ? "active" : ""}`}
                onClick={onItemClick}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
