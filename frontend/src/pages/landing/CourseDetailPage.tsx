import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { House } from "lucide-react";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import Chatbot from "../../components/Chatbot/Chatbot";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { PAYMENTS_API } from "../../api/payments";
import { getAccessToken } from "../../utils/authStorage";
import { useAuth } from "../../contexts/Auth";
import { DEFAULT_COURSE_THUMB } from "../../utils/imageFallback";
import "./CourseDetailPage.css";

interface ModuleLesson {
  id: number;
  title: string;
  duration?: string | null;
}

interface ModuleEntry {
  id: number;
  title: string;
  lessons?: ModuleLesson[];
}

interface CourseDetail {
  id: number;
  slug: string;
  title: string;
  short_description?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  level?: string | null;
  category?: string | null;
  price?: number | null;
  original_price?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  learners_count?: number | null;
  duration_hours?: number | null;
  language?: string | null;
  instructor_name?: string | null;
  instructor_title?: string | null;
  instructor_avatar?: string | null;
  what_you_learn?: string[];
  modules?: ModuleEntry[];
  is_enrolled?: boolean;
  best_seller?: boolean;
}

const FALLBACK_HERO_IMG = DEFAULT_COURSE_THUMB;

const DEFAULT_LEARN_BULLETS = [
  "Implement CNNs for advanced image recognition and segmentation.",
  "Design Transformers and attention mechanisms for NLP tasks.",
  "Master hyperparameter tuning and optimization techniques.",
  "Deploy models to cloud environments using Docker and Kubernetes.",
];

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "syllabus" | "instructor" | "reviews">("overview");
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.catalogDetail(slug)}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Course not found.");
        if (cancelled) return;
        setCourse(data as CourseDetail);
        const firstModule = (data as CourseDetail)?.modules?.[0];
        if (firstModule?.id) setOpenModules({ [firstModule.id]: true });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Could not load course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleEnroll = async () => {
    if (!course) return;
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`);
      return;
    }
    setEnrolling(true);
    try {
      const token = getAccessToken();
      const isPaid = typeof course.price === "number" && course.price > 0;

      if (isPaid) {
        // Paid course: create payment order first, then redirect to payment page
        const res = await fetch(`${url}${PAYMENTS_API.createMomoOrder}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ course_id: course.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Không thể tạo đơn thanh toán.");

        const { payment_url, status } = data as { payment_url: string; status: string };

        if (status === "paid") {
          // Already paid in a previous order — go directly to course
          navigate(`/my-courses/${course.id}/${course.slug}`);
        } else if (payment_url) {
          // Redirect to the payment page (mock or real MoMo)
          window.location.href = payment_url;
        } else {
          throw new Error("Không nhận được liên kết thanh toán.");
        }
      } else {
        // Free course: enroll directly
        const res = await fetch(`${url}${COURSES_API.enroll(course.id)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Enrollment failed.");
        navigate(`/my-courses/${course.id}/${course.slug}`);
      }
    } catch (err: any) {
      setError(err?.message || "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  const learnBullets = useMemo(() => {
    if (course?.what_you_learn?.length) return course.what_you_learn;
    return DEFAULT_LEARN_BULLETS;
  }, [course?.what_you_learn]);

  const priceLabel = useMemo(() => {
    if (!course) return "";
    if (typeof course.price !== "number" || course.price <= 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(course.price);
  }, [course]);

  if (loading) {
    return (
      <div className="mb-public course-detail-page bg-surface text-on-surface">
        <main className="max-w-7xl mx-auto px-6 py-24 text-center text-on-surface-variant">
          Loading course…
        </main>
        <MindBridgeFooter />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mb-public course-detail-page bg-surface text-on-surface">
        <main className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Course not found</h1>
          <p className="text-on-surface-variant mb-6">{error || "We couldn't find that course."}</p>
          <Link to="/courses" className="text-teal-600 font-semibold hover:underline">
            ← Back to catalog
          </Link>
        </main>
        <MindBridgeFooter />
      </div>
    );
  }

  return (
    <div className="mb-public course-detail-page bg-surface text-on-surface">
      <main>
        <section className="bg-primary-container text-white py-16 md:py-24 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                {course.category && (
                  <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                    {course.category}
                  </span>
                )}
                {course.best_seller && (
                  <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold px-3 py-1 rounded-full">
                    Best Seller
                  </span>
                )}
                {course.is_enrolled && (
                  <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
                    Enrolled
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight font-headline">
                {course.title}
              </h1>
              <p className="text-on-primary-container text-lg mb-8 max-w-xl">
                {course.short_description ||
                  "Master the architecture of modern AI. Build, train, and deploy sophisticated deep learning models from scratch using industry-standard frameworks."}
              </p>
              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-3">
                  {course.instructor_avatar ? (
                    <img
                      className="w-12 h-12 rounded-full border-2 border-secondary object-cover"
                      src={course.instructor_avatar}
                      alt={course.instructor_name || "Instructor"}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-secondary bg-slate-700 flex items-center justify-center text-white font-bold">
                      {(course.instructor_name || "I").charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-on-primary-container">Instructor</p>
                    <p className="font-bold text-white">{course.instructor_name || "MindBridge Instructor"}</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-on-primary-container">Rating</p>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{(course.rating ?? 0).toFixed(1)}</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-sm ${
                          star <= Math.round(course.rating ?? 0)
                            ? 'text-amber-400 course-detail-icon-filled'
                            : 'text-gray-400'
                        }`}
                      >
                        star
                      </span>
                    ))}
                    <span className="text-on-primary-container text-sm">
                      ({(course.rating_count ?? 0).toLocaleString()} đánh giá)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-white/10">
                <img
                  className="w-full h-full object-cover"
                  src={course.thumbnail_url || FALLBACK_HERO_IMG}
                  alt={course.title}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_HERO_IMG; }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8">
              <div className="flex border-b border-slate-200 mb-10 overflow-x-auto whitespace-nowrap">
                {(["overview", "syllabus", "instructor", "reviews"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={
                      activeTab === t
                        ? "px-6 py-4 text-sm font-bold text-secondary border-b-2 border-secondary capitalize"
                        : "px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors capitalize"
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-primary font-headline">What you&apos;ll learn</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {learnBullets.map((b, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="material-symbols-outlined text-secondary">check_circle</span>
                          <span className="text-slate-600">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="max-w-none">
                    <h2 className="text-2xl font-bold text-primary font-headline">Course Description</h2>
                    <p className="text-slate-600 leading-relaxed mt-2">
                      {course.description ||
                        "This comprehensive course takes you from the foundations of perceptrons to the cutting edge of Large Language Models (LLMs). We dive deep into the mathematical underpinnings of backpropagation, the nuances of gradient descent variants, and the architecture of state-of-the-art networks."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "syllabus" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary font-headline">Course Syllabus</h2>
                  <div className="space-y-3">
                    {(course.modules ?? []).length === 0 ? (
                      <div className="text-slate-500">Syllabus details coming soon.</div>
                    ) : (
                      (course.modules ?? []).map((m) => {
                        const open = !!openModules[m.id];
                        return (
                          <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenModules((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                              }
                              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                              <span className="font-bold text-slate-800">{m.title}</span>
                              <span className="material-symbols-outlined">
                                {open ? "expand_less" : "expand_more"}
                              </span>
                            </button>
                            {open && (m.lessons?.length ?? 0) > 0 && (
                              <div className="p-4 border-t border-slate-200 space-y-3">
                                {m.lessons!.map((l) => (
                                  <div key={l.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="material-symbols-outlined text-slate-400">
                                        play_circle
                                      </span>
                                      <span className="text-slate-600">{l.title}</span>
                                    </div>
                                    {l.duration && <span className="text-slate-400">{l.duration}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "instructor" && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-primary font-headline">About the Instructor</h2>
                  <p className="text-slate-600 leading-relaxed">
                    {course.instructor_name || "Your instructor"} brings deep expertise and a hands-on
                    teaching style honed through years of industry and academic work.
                  </p>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="text-slate-500">Reviews module coming soon.</div>
              )}
            </div>

            <aside className="lg:col-span-4">
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 sticky top-20 space-y-5">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-primary">{priceLabel}</span>
                    {typeof course.original_price === "number" && course.original_price > (course.price ?? 0) && (
                      <span className="text-slate-400 line-through">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(course.original_price)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (course.is_enrolled) {
                      navigate(`/my-courses/${course.id}/${course.slug}`);
                    } else {
                      handleEnroll();
                    }
                  }}
                  disabled={enrolling}
                  className="w-full bg-[#0D9488] text-white py-3 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {course.is_enrolled ? "Go to Course" : enrolling ? "Enrolling…" : "Enroll Now"}
                </button>
                <ul className="text-sm text-slate-600 space-y-3 pt-2 border-t border-slate-100">
                  {course.duration_hours && (
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400">schedule</span>
                      {course.duration_hours} hours of content
                    </li>
                  )}
                  {course.language && (
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400">language</span>
                      {course.language}
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">workspace_premium</span>
                    Certificate of completion
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <MindBridgeFooter />

      <Chatbot />

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
