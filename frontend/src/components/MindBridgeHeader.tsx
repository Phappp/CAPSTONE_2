import { Link, useNavigate } from "react-router-dom";
import transLogo from "../assets/trans-logo-2.png";
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
        </div>
      </div>
    </nav>
  );
}
