import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import transLogo from "../assets/trans-logo-2.png";
type NavKey = "courses" | "instructors" | "pricing" | "resources";

interface PublicSiteHeaderProps {
  active?: NavKey;
}

const NAV_LINKS: { key: NavKey; label: string; to: string }[] = [
  { key: "courses", label: "Courses", to: "/courses" },
  { key: "instructors", label: "Instructors", to: "/instructors" },
  { key: "pricing", label: "Pricing", to: "/pricing" },
  { key: "resources", label: "Resources", to: "/resources" },
];

export default function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const linkClass = (k: NavKey) =>
    k === active
      ? "text-teal-600 font-semibold border-b-2 border-teal-600 pb-1 transition-colors duration-200"
      : "text-slate-600 font-medium hover:text-teal-500 transition-colors duration-200";

  return (
    <nav className="bg-white/90 backdrop-blur-md text-slate-900 sticky top-0 z-50 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
            <img
              alt="TransLogo"
              src={transLogo}
              className="h-12 w-auto"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <NavLink key={item.key} to={item.to} className={() => linkClass(item.key)}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate("/learner/dashboard")}
              className="bg-[#0D9488] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0b7a70] transition-all duration-200"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden sm:block text-slate-600 font-medium hover:text-teal-500 px-4 py-2"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="cursor-pointer bg-[#0D9488] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0b7a70] transition-all duration-200"
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
