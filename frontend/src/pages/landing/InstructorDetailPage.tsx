import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { House } from "lucide-react";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import { DEFAULT_COURSE_THUMB } from "../../utils/imageFallback";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import "./InstructorDetailPage.css";

interface InstructorCourse {
  slug: string;
  title: string;
  category: string;
  description: string;
  price: string;
  image: string | null;
  rating: number;
  reviewCount: number;
}

interface InstructorProfile {
  id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  stats: { students: number; courses: number; rating: number };
  credentials: { icon: string; title: string; sub: string }[];
  courses: InstructorCourse[];
  testimony: { quote: string; author: string; avatar: string | null } | null;
}

const DEFAULT_INSTRUCTOR_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQWbSP6l4jjWpUqhyNzmaKicl4UD0XC4wu0eneuTaqQUfbp5j64sSu0AnSLRuplKdgW5485bobbmH4lkTFi7tHBkprYcSQkK34iryL_sE2XRnpIOiH3Osim8ZDraIFEVzU721vIawWMIlgiBUB8ODiqwBYgZyzNId91o5y3TCKPqLGmK1MSC6uoPBcTcYNe0ugFr3_XII6gEq_byXKtGOj372-KoUXi5jkO4jZS5ocPEuZIJV2HRvK18eFrI81YLp45vT3Pp21Tw";

interface InstructorDetailResponse {
  item: InstructorProfile | null;
  message?: string;
}

export default function InstructorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      setError("Invalid instructor ID");
      setLoading(false);
      return;
    }

    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchInstructor = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.instructorDetail(numericId)}`, { headers });
        const data = (await res.json().catch(() => ({}))) as InstructorDetailResponse;
        if (!res.ok) throw new Error(data?.message || "Unable to load instructor.");
        if (cancelled) return;
        setProfile(data.item);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Unable to load instructor.");
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInstructor();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mb-public instructor-detail-page bg-background font-body text-on-background">
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-on-surface-variant">Loading instructor...</div>
          </div>
        </main>
        <MindBridgeFooter />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mb-public instructor-detail-page bg-background font-body text-on-background">
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
            {error || "Instructor not found."}
          </div>
          <div className="mt-4 text-center">
            <Link to="/instructors" className="text-teal-600 font-semibold hover:underline">
              Back to Instructors
            </Link>
          </div>
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

  const bioParagraphs = profile.bio
    ? profile.bio.split(/\n+/).filter(p => p.trim()).slice(0, 3)
    : [`${profile.full_name} is a dedicated instructor on MindBridge, sharing their expertise through high-quality courses.`];

  const displayAvatar = profile.avatar_url || DEFAULT_INSTRUCTOR_AVATAR;

  return (
    <div className="mb-public instructor-detail-page bg-background font-body text-on-background">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section className="instructor-hero-bg rounded-xl overflow-hidden shadow-xl p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          <div className="flex-shrink-0">
            <img
              alt={profile.full_name}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-teal-500/30 object-cover shadow-2xl"
              src={displayAvatar}
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_INSTRUCTOR_AVATAR; }}
            />
          </div>
          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight font-headline">
                {profile.full_name}
              </h1>
              <p className="text-slate-500 text-xs uppercase tracking-widest pt-1">
                Instructor ID: {profile.id}
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Students</span>
                <span className="text-2xl font-bold text-white">{profile.stats.students.toLocaleString()}</span>
              </div>
              <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Courses</span>
                <span className="text-2xl font-bold text-white">{profile.stats.courses}</span>
              </div>
              <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Rating</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-white">{profile.stats.rating > 0 ? profile.stats.rating.toFixed(1) : "N/A"}</span>
                  {profile.stats.rating > 0 && (
                    <span className="material-symbols-outlined text-yellow-400 instructor-detail-icon-filled">star</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center md:justify-start pt-6">
              <Link
                to="/contact"
                className="bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined">mail</span>
                Contact Instructor
              </Link>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all"
              >
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 space-y-6">
              <h2 className="text-2xl font-bold text-primary font-headline flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">person</span>
                </span>
                About the Instructor
              </h2>
              <div className="max-w-none text-on-surface-variant leading-relaxed space-y-4">
                {bioParagraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold text-primary font-headline">
                  Courses by {profile.full_name}
                </h2>
                <Link to="/courses" className="text-teal-600 font-semibold hover:underline text-sm">
                  See all {profile.stats.courses} courses
                </Link>
              </div>
              {profile.courses.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-on-surface-variant">
                  No courses available yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.courses.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/courses/${c.slug}`}
                      className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col no-underline hover:no-underline"
                    >
                      <div className="h-48 relative overflow-hidden">
                        <img
                          alt={c.title}
                          className="w-full h-full object-cover"
                          src={c.image || DEFAULT_COURSE_THUMB}
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COURSE_THUMB; }}
                        />
                        {/* <div className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          {c.category}
                        </div> */}
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <h3 className="text-lg font-bold text-primary mb-1 line-clamp-1">{c.title}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-sm font-semibold text-yellow-500">{Number(c.rating || 0).toFixed(1)}</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`material-symbols-outlined text-sm ${
                                star <= Math.round(c.rating || 0)
                                  ? 'text-yellow-400 instructor-detail-icon-filled'
                                  : 'text-gray-300'
                              }`}
                            >
                              star
                            </span>
                          ))}
                          <span className="text-xs text-gray-400 ml-1 no-underline">({c.reviewCount || 0} reviews)</span>
                        </div>
                        <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{c.description}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-xl font-black text-primary">{c.price}</span>
                          <span className="bg-secondary text-white px-4 py-2 rounded-lg font-bold text-sm">
                            View Course
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-primary font-headline">Credentials</h3>
              {profile.credentials.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No credentials available.</p>
              ) : (
                <ul className="space-y-4">
                  {profile.credentials.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-teal-600">{c.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-primary">{c.title}</p>
                        <p className="text-xs text-on-surface-variant">{c.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-surface-container rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-primary font-headline">Connect</h3>
              <div className="flex flex-wrap gap-2">
                <a href="#" className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary-container hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined text-sm">link</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary-container hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined">language</span>
                </a>
              </div>
            </div>

            {profile.testimony && (
              <div className="bg-white rounded-xl border-l-4 border-teal-500 p-6 shadow-sm space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-teal-500 text-sm instructor-detail-icon-filled"
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-sm text-on-surface-variant italic">
                  &quot;{profile.testimony.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                    <img
                      alt="Student"
                      className="w-full h-full object-cover"
                      src={profile.testimony.avatar || DEFAULT_COURSE_THUMB}
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COURSE_THUMB; }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary">{profile.testimony.author}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
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
