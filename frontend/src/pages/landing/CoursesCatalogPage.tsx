import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MindBridgeHeader from "../../components/MindBridgeHeader";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import "./CoursesCatalogPage.css";

interface CatalogCourse {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  price?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  instructor_name?: string;
  category?: string | null;
}

interface CatalogResponse {
  items?: CatalogCourse[];
  total?: number;
  message?: string;
}

const FALLBACK_THUMB =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCU4Jx3s6o3gP6W_qnQwEbN_upNC2RrPgboIwyBIcHUUjG3gh4kXK0LBxP55wivPEzVNdz7J7qZpawWHuwig0R1lQW5QzRE5NsU3JFnmzgryZUchAyHLw2YKj9P-EcQ1auPTeYw3qWfXyW_2vet-yOo53wgy-6ndJjEZ57thi4UBuLYzpm-9HS_H8BOfaBJd4VchqX7GNPKYhtXNLdw_DWm46_5oyzSXqPlt6F173Uw-qd97hApERDLbpVHOWE6LmkFRc5iIw96iw";

const CATEGORIES = [
  "AI & Machine Learning",
  "Business Strategy",
  "Tech Stack Mastery",
  "Design & UX",
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const items: { key: string; icon: string; cls: string }[] = [];
  for (let i = 0; i < full; i++) items.push({ key: `f${i}`, icon: "star", cls: "text-yellow-400 catalog-icon-filled" });
  if (half) items.push({ key: "h", icon: "star_half", cls: "text-yellow-400 catalog-icon-filled" });
  for (let i = 0; i < empty; i++) items.push({ key: `e${i}`, icon: "star", cls: "text-slate-300" });
  return items;
};

export default function CoursesCatalogPage() {
  const [params, setParams] = useSearchParams();
  const queryFromUrl = params.get("q") ?? "";
  const [search, setSearch] = useState(queryFromUrl);
  const [debouncedQ, setDebouncedQ] = useState(queryFromUrl);
  const [activeDifficulties, setActiveDifficulties] = useState<Difficulty[]>([]);
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price_asc">("popular");

  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (debouncedQ) {
      setParams({ q: debouncedQ }, { replace: true });
    } else {
      params.delete("q");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ page: "1", page_size: "24" });
        if (debouncedQ) qs.set("q", debouncedQ);
        if (activeDifficulties.length === 1) qs.set("level", activeDifficulties[0]);
        if (sortBy === "newest") {
          qs.set("sort_by", "created_at");
          qs.set("sort_dir", "desc");
        } else if (sortBy === "price_asc") {
          qs.set("sort_by", "price");
          qs.set("sort_dir", "asc");
        } else {
          qs.set("sort_by", "learners_count");
          qs.set("sort_dir", "desc");
        }
        const res = await fetch(`${url}${COURSES_API.catalog}?${qs.toString()}`, { headers });
        const data = (await res.json().catch(() => ({}))) as CatalogResponse;
        if (!res.ok) throw new Error(data?.message || "Unable to load courses.");
        if (cancelled) return;
        setCourses(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Unable to load courses.");
        setCourses([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, activeDifficulties, sortBy]);

  const toggleDifficulty = (d: Difficulty) => {
    setActiveDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const totalLabel = useMemo(() => total.toLocaleString(), [total]);

  return (
    <div className="mb-public catalog-page bg-[#F8FAFC] text-on-surface">
      <MindBridgeHeader active="courses" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
              <h1 className="text-5xl md:text-6xl font-extrabold text-primary leading-tight font-headline">
                Explore World-Class <span className="text-[#0D9488]">Courses</span>
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl">
                Elevate your skills with professional-led training in the most in-demand technical and business domains.
              </p>
              <div className="flex items-center gap-4 max-w-2xl">
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    search
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-outline-variant bg-white focus:border-[#0D9488] outline-none transition-all text-lg"
                    placeholder="What do you want to learn today?"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDebouncedQ(search.trim())}
                  className="cursor-pointer bg-[#0D9488] text-white px-8 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="w-full lg:w-[260px] space-y-10 flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 font-headline">
                <span className="material-symbols-outlined">filter_list</span> Categories
              </h3>
              <div className="space-y-4">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="catalog-checkbox"
                    />
                    <span className="text-on-surface-variant group-hover:text-primary transition-colors">
                      {c}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary mb-6 font-headline">Difficulty</h3>
              <div className="space-y-4">
                {DIFFICULTIES.map((d) => (
                  <label key={d} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="catalog-checkbox"
                      checked={activeDifficulties.includes(d)}
                      onChange={() => toggleDifficulty(d)}
                    />
                    <span className="text-on-surface-variant group-hover:text-primary transition-colors capitalize">
                      {d}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveDifficulties([]);
                  setSortBy("popular");
                }}
                className=" cursor-pointer w-full py-3 rounded-lg border-2 border-[#0D9488] text-[#0D9488] font-bold hover:bg-teal-50 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          </aside>

          <div className="flex-grow">
            <div className="flex justify-between items-center mb-8">
              <p className="text-on-surface-variant font-medium">
                Showing <span className="text-primary font-bold">{totalLabel}</span> premium courses
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-outline">Sort by:</span>
                <select
                  className="border-none bg-transparent text-primary font-bold focus:ring-0 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-on-surface-variant">
                Loading courses…
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">{error}</div>
            ) : courses.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-on-surface-variant">
                No courses match your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {courses.map((c) => {
                  const rating = typeof c.rating === "number" ? c.rating : 4.8;
                  const priceLabel =
                    typeof c.price === "number" && c.price > 0
                      ? `$${c.price.toFixed(2)}`
                      : "Free";
                  return (
                    <Link
                      key={c.id}
                      to={`/courses/${c.slug}`}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col group"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                          src={c.thumbnail_url || FALLBACK_THUMB}
                          alt={c.title}
                        />
                        <span className="absolute top-3 left-3 bg-[#0D9488]/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                          {c.category || c.level || "Course"}
                        </span>
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h2 className="text-[16px] font-bold text-[#1E293B] mb-1 leading-snug line-clamp-2">
                          {c.title}
                        </h2>
                        <p className="text-[14px] text-[#64748B] mb-4">
                          {c.instructor_name || "MindBridge Instructor"}
                        </p>
                        <div className="flex items-center gap-1 mb-6">
                          {renderStars(rating).map((s) => (
                            <span key={s.key} className={`material-symbols-outlined ${s.cls} text-sm`}>
                              {s.icon}
                            </span>
                          ))}
                          <span className="text-xs font-bold text-on-surface-variant ml-1">
                            ({rating.toFixed(1)})
                          </span>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-4">
                          <span className="text-xl font-extrabold text-primary">{priceLabel}</span>
                          <span className="bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">
                            View Course
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <MindBridgeFooter />
    </div>
  );
}
