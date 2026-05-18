import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { House } from "lucide-react";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import { DEFAULT_COURSE_THUMB } from "../../utils/imageFallback";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import "./InstructorsDirectoryPage.css";

const DEFAULT_INSTRUCTOR_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQWbSP6l4jjWpUqhyNzmaKicl4UD0XC4wu0eneuTaqQUfbp5j64sSu0AnSLRuplKdgW5485bobbmH4lkTFi7tHBkprYcSQkK34iryL_sE2XRnpIOiH3Osim8ZDraIFEVzU721vIawWMIlgiBUB8ODiqwBYgZyzNId91o5y3TCKPqLGmK1MSC6uoPBcTcYNe0ugFr3_XII6gEq_byXKtGOj372-KoUXi5jkO4jZS5ocPEuZIJV2HRvK18eFrI81YLp45vT3Pp21Tw";

function truncateText(text: string, maxWords: number): string {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  courseCount: number;
  verified?: boolean;
  topRated?: boolean;
}

interface InstructorsResponse {
  items?: Instructor[];
  message?: string;
}

export default function InstructorsDirectoryPage() {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchInstructors = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.instructorsCatalog}`, { headers });
        const data = (await res.json().catch(() => ({}))) as InstructorsResponse;
        if (!res.ok) throw new Error(data?.message || "Unable to load instructors.");
        if (cancelled) return;
        setInstructors(Array.isArray(data.items) ? data.items : []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Unable to load instructors.");
        setInstructors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInstructors();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-public instructors-page bg-[#F8FAFC] text-on-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-16 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight mb-4 font-headline">
            Learn from the Masters
          </h1>
          <p className="text-slate-600 max-w-2xl text-lg">
            Connect with world-class experts across technology, business, and creative disciplines. Our instructors are hand-picked for their industry impact and teaching excellence.
          </p>
        </header>

        {loading ? (
          <div className="text-center text-on-surface-variant py-12">Loading instructors…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">{error}</div>
        ) : instructors.length === 0 ? (
          <div className="text-center text-on-surface-variant py-12">No instructors found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {instructors.map((ins) => (
              <Link
                key={ins.id}
                to={`/instructors/${ins.id}`}
                className="instructor-card bg-white p-6 border border-slate-100 flex flex-col items-center text-center group"
              >
                <div className="relative mb-6">
                  <img
                    alt={ins.name}
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50"
                    src={ins.avatar || DEFAULT_INSTRUCTOR_AVATAR}
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_INSTRUCTOR_AVATAR; }}
                  />
                  {ins.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-secondary text-white rounded-full p-1 border-2 border-white">
                      <span className="material-symbols-outlined text-xs instructors-icon-filled">verified</span>
                    </div>
                  )}
                </div>
                <h2 className="text-[18px] font-bold text-[#1E293B] mb-1">{ins.name}</h2>
                <p className="instructor-title text-secondary font-semibold text-sm mb-4">{truncateText(ins.title ?? "", 30)}</p>
                <p className="instructor-bio text-[14px] text-[#64748B] leading-relaxed mb-6">{truncateText(ins.bio ?? "", 50)}</p>
                <div className="mt-auto flex flex-col gap-3 w-full">
                  {ins.topRated && (
                    <span className="tag-hover inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 py-1 px-3 rounded-full">
                      <span className="material-symbols-outlined text-sm instructors-icon-filled">star</span>
                      Top Rated
                    </span>
                  )}
                  <span className="text-primary font-medium text-sm hover:underline decoration-secondary decoration-2 underline-offset-4 flex items-center justify-center gap-1">
                    View {ins.courseCount} Courses
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="mt-24 bg-primary rounded-2xl p-8 md:p-12 overflow-hidden relative">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-4 font-headline">
              Want to become an instructor?
            </h2>
            <p className="text-slate-300 mb-8">
              Join thousands of world-class educators on MindBridge and share your knowledge with millions of students worldwide.
            </p>
            <Link
              to="/register"
              className="inline-block bg-secondary hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
              Apply Now
            </Link>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden lg:block flex items-center justify-center">
            <span className="material-symbols-outlined text-[240px] rotate-12">school</span>
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
