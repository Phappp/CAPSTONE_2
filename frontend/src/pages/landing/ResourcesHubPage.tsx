import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { House } from "lucide-react";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import "./ResourcesHubPage.css";

interface ResourceCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  cta: string;
  to: string;
}

const SECONDARY_RESOURCES: ResourceCard[] = [
  {
    key: "case-studies",
    title: "Case Studies",
    description: "Real-world success stories from institutions and individuals who transformed their results through MindBridge.",
    icon: "analytics",
    cta: "Read Stories",
    to: "/resources",
  },
  {
    key: "ai-docs",
    title: "AI Documentation",
    description: "Comprehensive technical guides, API references, and integration docs for our AI-powered learning modules.",
    icon: "smart_toy",
    cta: "Access Docs",
    to: "/resources",
  },
];

export default function ResourcesHubPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const q = query.trim();
    navigate(q ? `/courses?q=${encodeURIComponent(q)}` : "/courses");
  };

  return (
    <div className="mb-public resources-page bg-[#F8FAFC] text-on-surface">
      <header className="pt-12 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight font-headline">
            Resources Hub
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
            Explore our extensive collection of guides, case studies, and documentation to accelerate your learning journey.
          </p>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input
              className="block w-full pl-12 pr-4 py-4 bg-white border border-outline-variant rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary text-on-surface transition-all"
              placeholder="Search for blog posts, whitepapers, or documentation..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Link
            to="/resources"
            className="md:col-span-8 bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col group"
          >
            <div className="h-64 relative overflow-hidden">
              <img
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFiCF-GeYza8Zg_4YaqPjfOsl6TbTA1eOPYiRA2Ryky-cjjqTt14vvP0P-r9pI3JGEHGzBZDxpAujrJAqAa4_rceCSEeUUAo-oUJ7YCbiZ6fH2_vihloFhb9IrU2FP5Ul3rHUIurBaMQxTPHRcU4aacIjPbYEV_kTrbPoQTm6PYFbeOqtWNCwgUIPZzU-H1PZ1M_hI9c3R3lDNiwdiIpAcAO5CnOhHbRWs4YBvfIwXuH2zhnrYJa3yXYlrjJu4_KROTcsU5QzJHQ"
                alt="Modern workspace"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-secondary text-white px-3 py-1 text-xs font-bold rounded uppercase tracking-wider">
                  Blog Posts
                </span>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-between flex-grow">
              <div>
                <h3 className="text-2xl font-bold text-primary mb-3 font-headline">
                  Latest Insights &amp; Strategies
                </h3>
                <p className="text-on-surface-variant mb-6 leading-relaxed">
                  Stay updated with the latest trends in e-learning, neural mapping, and cognitive development from our team of experts.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-secondary resources-icon-filled">article</span>
                  <span className="text-sm font-semibold text-primary">120+ Articles</span>
                </div>
                <span className="text-secondary font-bold flex items-center gap-1">
                  Explore Blog
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>
          </Link>

          <div className="md:col-span-4 bg-white rounded-xl border border-outline-variant/30 shadow-sm p-8 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-secondary text-3xl">description</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-4 font-headline">Whitepapers</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                In-depth research and technical analysis on the future of educational technology and AI-assisted learning environments.
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border border-outline-variant/20 hover:border-secondary/50 transition-colors cursor-pointer">
                <p className="text-xs font-bold text-secondary uppercase mb-1">New Release</p>
                <p className="text-sm font-semibold text-primary">The Neural Frontier 2024</p>
              </div>
              <Link to="/resources" className="text-secondary font-bold flex items-center gap-1">
                View All
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          {SECONDARY_RESOURCES.map((r) => (
            <div
              key={r.key}
              className="md:col-span-6 bg-white rounded-xl border border-outline-variant/30 shadow-sm p-8 flex items-center gap-8 group"
            >
              <div className="flex-1">
                <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-secondary text-3xl">{r.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-3 font-headline">{r.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{r.description}</p>
                <Link to={r.to} className="text-secondary font-bold flex items-center gap-1">
                  {r.cta}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="hidden sm:block w-32 h-32 bg-slate-50 rounded-xl overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined text-5xl">{r.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-24 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-6 font-headline">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-on-surface-variant mb-10">
            Our support team is available 24/7 to help you navigate our resources and find exactly what you need for your learning path.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:opacity-95 transition-all"
            >
              Contact Support
            </Link>
            <Link
              to="/contact"
              className="px-8 py-3 border border-outline-variant text-primary font-semibold rounded-lg hover:bg-surface-container transition-all"
            >
              Visit Help Center
            </Link>
          </div>
        </section>
      </main>

      <MindBridgeFooter />

      <button
        type="button"
        className="ld-fab"
        aria-label="Add"
        onClick={() => navigate('/learner/dashboard')}
      >
        <House size={22} strokeWidth={2.6} />
      </button>
    </div>
  );
}
