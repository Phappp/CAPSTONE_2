import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import { useAuth } from "../../contexts/Auth";
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

interface Review {
  id: number;
  user_id: number;
  user_full_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

const FALLBACK_HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC2CfqoRX0g7DDhkn5mgt5KAGvNliB4d76jddyUuLZDNoGcNp1XjnkSZ_xQnFTIY5y7gY-W-KpHEcRaOqKQaEQhfX9PJfUIfHAJWFbbGwyKyHHgqpn23OwcxIJgOehfMCf5BxFsIhneTLlT4Lbdy9t3e2ns9MezosB_h8wEjMCfNacxN1L0vVfuIqyIAp6nkBKFzs62gJsNgG6o9KTalD2Tl2bbn2U1AinVJnnaD-0kTSw_i98C106eqmhnACPIWZ7F43NNv_P9Vg";

const DEFAULT_LEARN_BULLETS = [
  "Implement CNNs for advanced image recognition and segmentation.",
  "Design Transformers and attention mechanisms for NLP tasks.",
  "Master hyperparameter tuning and optimization techniques.",
  "Deploy models to cloud environments using Docker and Kubernetes.",
];

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user: currentUser } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "syllabus" | "instructor" | "reviews">("overview");
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  const [enrolling, setEnrolling] = useState(false);

  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0 as number, count: 0 });
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

        // Transform backend response to frontend CourseDetail shape
        const instructors = Array.isArray((data as any).instructors) ? (data as any).instructors : [];
        const primaryInstructor = instructors.find((i: any) => i.is_primary) || instructors[0];
        const totalMinutes = (data as any).total_duration_minutes;
        const hours = totalMinutes ? Math.ceil(totalMinutes / 60) : null;

        const transformed: CourseDetail = {
          ...(data as CourseDetail),
          rating: (data as any).rating ?? (data as any).avg_rating ?? null,
          rating_count: (data as any).rating_count ?? null,
          instructor_name: primaryInstructor?.full_name ?? null,
          instructor_avatar: primaryInstructor?.avatar_url ?? null,
          duration_hours: hours,
          category: null,
          best_seller: false,
        };

        setCourse(transformed);
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
    } catch (err: any) {
      setError(err?.message || "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  // Fetch reviews when course loads or tab is reviews
  useEffect(() => {
    if (!course?.id) return;
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch(`${url}${COURSES_API.reviews(course.id)}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (cancelled) return;
          setReviewStats({
            avg: typeof data.avg_rating === "number" ? data.avg_rating : 0,
            count: typeof data.rating_count === "number" ? data.rating_count : 0,
          });
          setReviews(Array.isArray(data.items) ? data.items : []);
          if (token && currentUser) {
            const me = data.items?.find(
              (r: Review) => r.user_id === Number(currentUser.id)
            );
            if (me) {
              setUserReview(me);
              setReviewRating(me.rating);
              setReviewComment(me.comment ?? "");
            }
          }
        }
      } catch {
        // Silently fail — reviews are non-critical
      }
    };

    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [course?.id, currentUser]);

  const submitReview = async () => {
    if (!course?.id || reviewRating === 0) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch(`${url}${COURSES_API.reviews(course.id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Failed to submit review.");
      const newReview: Review = data;
      setReviews((prev) => [newReview, ...prev]);
      setUserReview(newReview);
      const newCount = reviewStats.count + 1;
      const newAvg =
        newCount > 0
          ? (reviewStats.avg * reviewStats.count + reviewRating) / newCount
          : reviewRating;
      setReviewStats({ avg: newAvg, count: newCount });
    } catch (err: any) {
      setReviewError(err?.message || "Failed to submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const items: { key: string; icon: string; cls: string }[] = [];
    for (let i = 0; i < full; i++) items.push({ key: `f${i}`, icon: "star", cls: "text-yellow-400" });
    if (half) items.push({ key: "h", icon: "star_half", cls: "text-yellow-400" });
    for (let i = 0; i < empty; i++) items.push({ key: `e${i}`, icon: "star", cls: "text-slate-300" });
    return items;
  };

  const learnBullets = useMemo(() => {
    if (course?.what_you_learn?.length) return course.what_you_learn;
    return DEFAULT_LEARN_BULLETS;
  }, [course?.what_you_learn]);

  const priceLabel = useMemo(() => {
    if (!course) return "";
    if (typeof course.price !== "number" || course.price <= 0) return "Free";
    return `$${course.price.toFixed(2)}`;
  }, [course]);

  if (loading) {
    return (
      <div className="mb-public course-detail-page bg-surface text-on-surface">
        <MindBridgeHeader active="courses" />
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
        <MindBridgeHeader active="courses" />
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
    <div className="course-detail-page bg-surface text-on-surface">

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
                    <span className="material-symbols-outlined text-amber-400 course-detail-icon-filled">star</span>
                    <span className="font-bold">{(course.rating ?? 4.9).toFixed(1)}</span>
                    <span className="text-on-primary-container text-sm">
                      ({(course.learners_count ?? 0).toLocaleString()} students)
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
                <div className="space-y-8">
                  {/* Summary row */}
                  <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="text-center min-w-[100px]">
                      <div className="text-5xl font-extrabold text-primary">
                        {reviewStats.avg > 0 ? reviewStats.avg.toFixed(1) : "—"}
                      </div>
                      <div className="flex justify-center mt-1 mb-1">
                        {renderStars(reviewStats.avg).map((s) => (
                          <span key={s.key} className={`material-symbols-outlined ${s.cls} text-lg`}>
                            {s.icon}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-slate-500">{reviewStats.count} reviews</div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const pct =
                          reviewStats.count > 0
                            ? (reviews.filter((r) => r.rating === star).length / reviewStats.count) * 100
                            : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-sm w-4 text-right">{star}</span>
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-10">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Write review form */}
                  {course.is_enrolled && !userReview && (
                    <div className="border-t border-slate-200 pt-8">
                      <h3 className="font-bold text-lg mb-4 text-primary">Write a Review</h3>
                      {reviewError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                          {reviewError}
                        </div>
                      )}
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <span
                              className={`material-symbols-outlined text-3xl ${
                                star <= (hoverRating || reviewRating) ? "text-yellow-400" : "text-slate-300"
                              }`}
                              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                            >
                              star
                            </span>
                          </button>
                        ))}
                      </div>
                      {reviewRating > 0 && (
                        <p className="text-sm text-slate-500 mb-3">
                          {reviewRating === 5
                            ? "Excellent!"
                            : reviewRating === 4
                            ? "Very Good"
                            : reviewRating === 3
                            ? "Average"
                            : reviewRating === 2
                            ? "Poor"
                            : "Very Poor"}
                        </p>
                      )}
                      <textarea
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-[#0D9488] focus:outline-none transition-colors resize-none"
                        rows={4}
                        placeholder="Share your experience with this course..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <button
                        type="button"
                        className="mt-3 bg-[#0D9488] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                        disabled={reviewRating === 0 || reviewLoading}
                        onClick={submitReview}
                      >
                        {reviewLoading ? "Submitting..." : "Submit Review"}
                      </button>
                    </div>
                  )}

                  {course.is_enrolled && userReview && (
                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-secondary">check_circle</span>
                        <h3 className="font-bold text-primary">Your Review</h3>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-1 mb-2">
                          {renderStars(userReview.rating).map((s) => (
                            <span key={s.key} className={`material-symbols-outlined ${s.cls} text-sm`}>
                              {s.icon}
                            </span>
                          ))}
                        </div>
                        {userReview.comment && (
                          <p className="text-slate-600 text-sm">{userReview.comment}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(userReview.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {!course.is_enrolled && (
                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 text-sm text-slate-600">
                      Enroll in this course to leave a review.
                    </div>
                  )}

                  {/* Reviews list */}
                  <div className="space-y-6">
                    {reviews.length === 0 && (
                      <div className="text-center text-slate-400 py-8">No reviews yet. Be the first!</div>
                    )}
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                            {review.user_full_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="font-bold text-sm text-slate-800">{review.user_full_name}</div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                  {renderStars(review.rating).map((s) => (
                                    <span key={s.key} className={`material-symbols-outlined ${s.cls} text-sm`}>
                                      {s.icon}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-slate-400">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-slate-600 text-sm mt-1 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:col-span-4">
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 sticky top-20 space-y-5">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-primary">{priceLabel}</span>
                    {typeof course.original_price === "number" && course.original_price > (course.price ?? 0) && (
                      <span className="text-slate-400 line-through">
                        ${course.original_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling || course.is_enrolled}
                  className="w-full bg-[#0D9488] text-white py-3 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {course.is_enrolled ? "Already Enrolled" : enrolling ? "Enrolling…" : "Enroll Now"}
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
    </div>
  );
}
