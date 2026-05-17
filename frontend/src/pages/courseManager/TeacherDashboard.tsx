// TeacherDashboard.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { useAuth } from "../../contexts/Auth";
import CommonModal from "../../components/CommonModal";
import TeacherShell, {
  TeacherShellTopKey,
} from "../../components/TeacherShell";
import TeacherLiveSessionPage from "./LiveSessionPage";
import "./TeacherDashboard.css";
import { Video } from "lucide-react";
import { DEFAULT_COURSE_THUMB } from "../../utils/imageFallback";

type CourseViewMode = "list" | "grid" | "compact";

export default function TeacherDashboard() {
  const { user, accessToken: token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const TAB_STORAGE_KEY = "teacher_courses_tab";
  const SORT_STORAGE_KEY = "teacher_courses_sort";
  const VIEW_STORAGE_KEY = "teacher_courses_view";

  const [openMenuCourseId, setOpenMenuCourseId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    published: number;
    draft: number;
    pending_review?: number;
    archived: number;
    finance?: {
      currency: string;
      gross_revenue: number;
      platform_fee_total: number;
      net_revenue: number;
      paid_orders: number;
    };
  } | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<{
    currency: string;
    gross_revenue: number;
    platform_fee_total: number;
    net_revenue: number;
    paid_orders: number;
  } | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<
    Array<{
      date: string;
      gross_revenue: number;
      platform_fee_total: number;
      net_revenue: number;
      paid_orders: number;
    }>
  >([]);
  const [revenueTransactions, setRevenueTransactions] = useState<
    Array<{
      order_id: number;
      course_id: number;
      gross_amount: number;
      platform_fee_amount: number;
      net_amount: number;
      currency: string;
      recognized_at: string;
      status: "recognized" | "reversed";
    }>
  >([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "published" | "draft" | "pending_review" | "archived">(() => {
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (
        saved === "all" ||
        saved === "published" ||
        saved === "draft" ||
        saved === "pending_review" ||
        saved === "archived"
      ) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return "all";
  });
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{
    sort_by: "updated_at" | "created_at" | "title" | "learners_count";
    sort_dir: "asc" | "desc";
  }>(() => {
    try {
      const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sb = parsed?.sort_by;
        const sd = parsed?.sort_dir;
        const okBy =
          sb === "updated_at" ||
          sb === "created_at" ||
          sb === "title" ||
          sb === "learners_count";
        const okDir = sd === "asc" || sd === "desc";
        if (okBy && okDir) return { sort_by: sb, sort_dir: sd };
      }
    } catch {
      // ignore
    }
    return { sort_by: "updated_at", sort_dir: "desc" };
  });
  const [courseView, setCourseView] = useState<CourseViewMode>(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "list" || saved === "grid" || saved === "compact") return saved;
    } catch {
      // ignore
    }
    return "list";
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    items: any[];
    page: number;
    page_size: number;
    total: number;
  } | null>(null);
  const [ratings, setRatings] = useState<Record<number, { rating: number; rating_count: number }>>({});
  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ open: false, title: "", message: "" });
  const managerBlocked = Boolean(
    user?.primary_role === "course_manager" &&
      user?.manager_verification &&
      user.manager_verification.status !== "verified"
  );

  const ensureVerifiedForCourseActions = (): boolean => {
    if (!managerBlocked) return true;
    const note = user?.manager_verification?.review_note
      ? `\n\nNote from administrator: ${user.manager_verification.review_note}`
      : "";
    setModalState({
      open: true,
      title: "Instructor verification required",
      message: `This feature requires a verified instructor account.${note}\n\nYou will be redirected to your profile to check verification status.`,
      onConfirm: () => {
        setModalState({ open: false, title: "", message: "" });
        navigate("/profile");
      },
    });
    return false;
  };

  type TeacherSection = "dashboard" | "course" | "live";

  const parseTeacherSection = (raw: string | null): TeacherSection => {
    if (raw === "course") return "course";
    if (raw === "live") return "live";
    if (raw === "activities" || raw === "quizz" || raw === "assignment") return "course";
    return "dashboard";
  };

  const [section, setSection] = useState<TeacherSection>(() => {
    const p = new URLSearchParams(location.search);
    return parseTeacherSection(p.get("section"));
  });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setSection(parseTeacherSection(p.get("section")));
  }, [location.search]);

  useEffect(() => {
    if (section === "dashboard") {
      setTab("all");
      setSearchInput("");
      setQ("");
      setPage(1);
    }
  }, [section]);

  const [timeFilterEnabled, setTimeFilterEnabled] = useState(false);
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");

  const filteredCourses = useMemo(() => {
    const items = result?.items ?? [];
    if (!timeFilterEnabled) return items;

    const from = timeFrom ? new Date(`${timeFrom}T00:00:00`) : null;
    const to = timeTo ? new Date(`${timeTo}T23:59:59.999`) : null;

    return (items as any[]).filter((c) => {
      const raw = c?.created_at;
      if (!raw) return false;
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [result, timeFilterEnabled, timeFrom, timeTo]);


  const fetchStats = async () => {
    const res = await fetch(`${url}${COURSES_API.myStats}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load statistics.");
    setStats(data);
  };

  const fetchList = async (opts?: { nextPage?: number; nextQ?: string }) => {
    const nextPage = opts?.nextPage ?? page;
    const nextQ = opts?.nextQ ?? q;
    const params = new URLSearchParams();
    params.set("status", tab);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    params.set("page", String(nextPage));
    params.set("page_size", String(pageSize));
    params.set("sort_by", sort.sort_by);
    params.set("sort_dir", sort.sort_dir);

    const res = await fetch(`${url}${COURSES_API.myList}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load course list.");
    setResult(data);
  };

  const fetchRatings = async (courseIds: number[]) => {
    if (!courseIds.length) return;
    try {
      const results = await Promise.all(
        courseIds.map(async (id) => {
          const res = await fetch(`${url}${COURSES_API.detail(id)}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (!res.ok) return null;
          const data = await res.json().catch(() => ({}));
          return { id, rating: data.rating ?? 0, rating_count: data.rating_count ?? 0 };
        })
      );
      const newRatings: Record<number, { rating: number; rating_count: number }> = {};
      results.forEach((r) => {
        if (r) newRatings[r.id] = { rating: r.rating, rating_count: r.rating_count };
      });
      setRatings((prev) => ({ ...prev, ...newRatings }));
    } catch {
      // ignore
    }
  };

  const fetchRevenue = async () => {
    setFinanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeFilterEnabled && timeFrom) params.set("from", timeFrom);
      if (timeFilterEnabled && timeTo) params.set("to", timeTo);

      const [summaryRes, trendRes, txRes] = await Promise.all([
        fetch(`${url}${COURSES_API.myRevenueSummary}?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }),
        fetch(`${url}${COURSES_API.myRevenueTrend}?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }),
        fetch(`${url}${COURSES_API.myRevenueTransactions}?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }),
      ]);
      const summaryJson = await summaryRes.json().catch(() => ({}));
      const trendJson = await trendRes.json().catch(() => ({}));
      const txJson = await txRes.json().catch(() => ({}));
      if (!summaryRes.ok) throw new Error(summaryJson?.message || "Failed to load revenue summary.");
      if (!trendRes.ok) throw new Error(trendJson?.message || "Failed to load revenue trend.");
      if (!txRes.ok) throw new Error(txJson?.message || "Failed to load revenue transactions.");

      setRevenueSummary(summaryJson as any);
      setRevenueTrend(Array.isArray((trendJson as any)?.points) ? (trendJson as any).points : []);
      setRevenueTransactions(Array.isArray((txJson as any)?.items) ? (txJson as any).items : []);
    } finally {
      setFinanceLoading(false);
    }
  };

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchList(), fetchRevenue()]);
      const courseIds = (result?.items ?? []).map((c: any) => c.id);
      if (courseIds.length) fetchRatings(courseIds);
    } catch (e: any) {
      setError(e?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore storage errors
    }
  }, [tab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    } catch {
      // ignore storage errors
    }
  }, [sort]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, courseView);
    } catch {
      // ignore
    }
  }, [courseView]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(searchInput);
    }, 450);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-course-actions-menu="root"]')) {
        setOpenMenuCourseId(null);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    setPage(1);
    setError(null);
    const t = window.setTimeout(() => {
      (async () => {
        setLoading(true);
        try {
          await Promise.all([fetchStats(), fetchList({ nextPage: 1 }), fetchRevenue()]);
        } catch (e: any) {
          setError(e?.message || "An error occurred.");
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, sort.sort_by, sort.sort_dir]);

  useEffect(() => {
    if (!result?.items?.length) return;
    const courseIds = result.items.map((c: any) => c.id);
    const missingIds = courseIds.filter((id: number) => !ratings[id]);
    if (missingIds.length) fetchRatings(missingIds);
  }, [result]);

  useEffect(() => {
    if (section !== "dashboard") return;
    void fetchRevenue().catch(() => {
      // ignore UI error noise, summary cards fallback to 0
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, timeFilterEnabled, timeFrom, timeTo]);

  const handleSetStatus = async (
    courseId: number,
    status: "draft" | "pending_review" | "published" | "archived"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to update course status.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async (courseId: number) => {
    const ok = window.confirm(
      "Unpublish this course?\n\nThe course will no longer be visible to students."
    );
    if (!ok) return;
    await handleSetStatus(courseId, "draft");
  };

  const handleDelete = async (courseId: number) => {
    if (!window.confirm("Delete course? This action will move the course to the trash (soft delete).")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.softDelete(courseId)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete course.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const sections: { key: TeacherSection; label: string }[] = [
    { key: "dashboard", label: "Overview" },
    { key: "course", label: "Course Management" },
    { key: "live", label: "Live Session" },
  ];

  const filteredStatus = useMemo(() => {
    const items = filteredCourses ?? [];
    const published = items.filter((c: any) => c?.status === "published").length;
    const draft = items.filter((c: any) => c?.status === "draft").length;
    const pending_review = items.filter((c: any) => c?.status === "pending_review").length;
    const archived = items.filter((c: any) => c?.status === "archived").length;
    return { total: items.length, published, draft, pending_review, archived };
  }, [filteredCourses]);

  const levelPieData = useMemo(() => {
    const items = filteredCourses ?? [];
    const counts: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      other: 0,
    };

    for (const c of items as any[]) {
      const level = String(c?.level ?? "")
        .trim()
        .toLowerCase();
      if (level === "beginner") counts.beginner += 1;
      else if (level === "intermediate") counts.intermediate += 1;
      else if (level === "advanced") counts.advanced += 1;
      else counts.other += 1;
    }

    return [
      { label: "Beginner", value: counts.beginner, color: "#10b981" },
      { label: "Intermediate", value: counts.intermediate, color: "#f59e0b" },
      { label: "Advanced", value: counts.advanced, color: "#ef4444" },
      { label: "Other", value: counts.other, color: "#8b5cf6" },
    ].filter((d) => d.value > 0);
  }, [filteredCourses]);

  const totalLearners = useMemo(() => {
    const items = filteredCourses ?? [];
    return items.reduce(
      (sum: number, c: any) => sum + (Number(c?.learners_count) || 0),
      0
    );
  }, [filteredCourses]);

  const completionRate = useMemo(() => {
    const { total, published } = filteredStatus;
    if (!total) return 0;
    return Math.round((published / total) * 100);
  }, [filteredStatus]);

  const createdSeries = useMemo(() => {
    const now = new Date();
    const buckets = new Array(6).fill(0);
    for (const c of filteredCourses ?? []) {
      const raw = (c as any)?.created_at;
      const d = raw ? new Date(String(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 6) {
        buckets[5 - monthsAgo] += 1;
      }
    }

    const labels = new Array(6).fill(0).map((_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString(undefined, { month: "short" });
    });
    return { labels, buckets };
  }, [filteredCourses]);

  const learnersSeries = useMemo(() => {
    const now = new Date();
    const buckets = new Array(6).fill(0);
    for (const c of filteredCourses ?? []) {
      const raw = (c as any)?.created_at;
      const d = raw ? new Date(String(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 6) {
        const learners = Number((c as any)?.learners_count) || 0;
        buckets[5 - monthsAgo] += learners;
      }
    }
    return { labels: createdSeries.labels, buckets };
  }, [filteredCourses, createdSeries.labels]);

  const BarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const w = 500;
    const h = 220;
    const max = Math.max(1, ...data.map((d) => d.value));
    const barW = (w / data.length) * 0.55;
    const startX = (w / data.length - barW) / 2;
    const baseY = h - 28;

    return (
      <div className="chart-container">
        <svg
          className="chart-svg chart-svg--bar"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {data.map((d, i) => (
              <linearGradient
                key={`bg-${i}`}
                id={`mb-bar-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={d.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0.55" />
              </linearGradient>
            ))}
          </defs>
          {/* Horizontal gridlines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = baseY - (baseY - 20) * ratio;
            return (
              <line
                key={ratio}
                x1="0"
                y1={y}
                x2={w}
                y2={y}
                stroke="#eef2f7"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}
          {data.map((d, i) => {
            const barHeight = (d.value / max) * (baseY - 24);
            const x = i * (w / data.length) + startX;
            const y = baseY - barHeight;
            return (
              <g key={d.label} className="mb-bar-group">
                <rect
                  className="mb-bar-rect"
                  x={x}
                  y={y}
                  width={barW}
                  height={barHeight}
                  fill={`url(#mb-bar-${i})`}
                  rx="8"
                  style={{
                    transformOrigin: `${x + barW / 2}px ${baseY}px`,
                    transform: "scaleY(0)",
                    animation: `mb-bar-rise 0.7s ${0.05 * i}s cubic-bezier(0.34, 1.32, 0.64, 1) forwards`,
                  }}
                >
                  <title>{`${d.label}: ${d.value}`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#475569"
                >
                  {d.label}
                </text>
                <text
                  className="mb-bar-value"
                  x={x + barW / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#0f172a"
                  fontWeight="700"
                  style={{
                    opacity: 0,
                    animation: `mb-bar-value-in 0.5s ${0.3 + 0.05 * i}s ease forwards`,
                  }}
                >
                  {d.value}
                </text>
              </g>
            );
          })}
          <line
            x1="0"
            y1={baseY}
            x2={w}
            y2={baseY}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  };

  const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const r = 84;
    const innerR = 48;
    const sum = data.reduce((s, d) => s + d.value, 0);
    const total = sum <= 0 ? 0 : sum;
    let startAngle = -90;

    const describeArc = (start: number, end: number) => {
      const toRad = (a: number) => (a * Math.PI) / 180;
      const startRad = toRad(start);
      const endRad = toRad(end);
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = end - start <= 180 ? 0 : 1;
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="pie-container">
        <svg
          className="chart-svg chart-svg--pie"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="mb-pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
            </filter>
            {data.map((d, i) => (
              <radialGradient key={`pg-${i}`} id={`mb-pie-${i}`}>
                <stop offset="0%" stopColor={d.color} stopOpacity="1" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0.78" />
              </radialGradient>
            ))}
          </defs>
          <g filter="url(#mb-pie-shadow)" className="mb-pie-rotate">
            {total === 0 ? (
              <>
                <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />
              </>
            ) : (
              <>
                {data.map((d, i) => {
                  const angle = (d.value / total) * 360;
                  const endAngle = startAngle + angle;
                  const path = describeArc(startAngle, endAngle);
                  const element = (
                    <path
                      key={d.label}
                      d={path}
                      fill={`url(#mb-pie-${i})`}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="mb-pie-slice"
                      style={{
                        transformOrigin: `${cx}px ${cy}px`,
                        opacity: 0,
                        animation: `mb-pie-in 0.6s ${0.06 * i}s cubic-bezier(0.34, 1.32, 0.64, 1) forwards`,
                      }}
                    >
                      <title>{`${d.label}: ${d.value} (${((d.value / total) * 100).toFixed(1)}%)`}</title>
                    </path>
                  );
                  startAngle = endAngle;
                  return element;
                })}
                <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#ffffff" strokeWidth="2" />
              </>
            )}
          </g>
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
            {total}
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
            letterSpacing="1.5"
          >
            TOTAL
          </text>
        </svg>
        <div className="pie-legend">
          {data.map((d, i) => (
            <div
              key={d.label}
              className="pie-legend-item"
              style={{
                opacity: 0,
                animation: `mb-pie-legend-in 0.45s ${0.4 + 0.08 * i}s ease forwards`,
              }}
            >
              <div className="pie-legend-color" style={{ background: d.color }} />
              <span>{d.label}</span>
              <span className="pie-legend-value">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ labels, values }: { labels: string[]; values: number[] }) => {
    const w = 500;
    const h = 200;
    const max = Math.max(1, ...values);
    const padding = { top: 22, right: 22, bottom: 30, left: 40 };
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;

    const points = values.map((v, i) => ({
      x: padding.left + (innerW * i) / Math.max(1, values.length - 1),
      y: padding.top + innerH - (v / max) * innerH,
      v,
    }));

    // Smooth bezier path through points (Catmull-Rom inspired)
    const smoothPath = (() => {
      if (points.length === 0) return "";
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
      const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        parts.push(`C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`);
      }
      return parts.join(" ");
    })();

    const areaPath = (() => {
      if (!points.length) return "";
      const baseY = padding.top + innerH;
      return `${smoothPath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
    })();

    return (
      <div className="chart-container">
        <svg
          className="chart-svg chart-svg--line"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="mb-line-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mb-line-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <filter id="mb-line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + innerH * (1 - ratio);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={w - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3}
                  fontSize="10"
                  fill="#94a3b8"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#mb-line-area)"
            style={{
              opacity: 0,
              animation: "mb-line-area-in 0.85s 0.3s ease forwards",
            }}
          />

          {/* Stroke (animated draw-in) */}
          <path
            d={smoothPath}
            fill="none"
            stroke="url(#mb-line-stroke)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#mb-line-glow)"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset="1"
            style={{ animation: "mb-line-draw 1s 0.1s ease-out forwards" }}
          />

          {/* Dots + value labels */}
          {points.map((p, i) => (
            <g
              key={i}
              style={{
                opacity: 0,
                animation: `mb-line-dot-in 0.4s ${0.9 + 0.06 * i}s ease forwards`,
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#0d9488"
                strokeWidth="2.5"
                className="mb-line-dot"
              >
                <title>{`${labels[i] ?? ""}: ${p.v}`}</title>
              </circle>
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#0f172a"
                fontWeight="700"
              >
                {p.v}
              </text>
              <text
                x={p.x}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
                fontWeight="600"
              >
                {labels[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
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

  const formatVnd = (amount: number) => {
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount} VND`;
    }
  };

  const revenueLabels = revenueTrend.map((p) => {
    const d = new Date(p.date);
    return Number.isNaN(d.getTime())
      ? p.date
      : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  });
  const revenueNetValues = revenueTrend.map((p) => Number(p.net_revenue || 0));

  const firstName = (user?.full_name || user?.email || "Instructor")
    .split(/[ @]/)[0];
  const activeTopNav: TeacherShellTopKey =
    section === "course"
      ? "courses"
      : section === "live"
      ? "live"
      : "dashboard";

  return (
    <TeacherShell
      activeNav="overview"
      activeTopNav={activeTopNav}
      showFab={section === "dashboard"}
      fabLabel="New Course"
      onFabClick={() => {
        if (!ensureVerifiedForCourseActions()) return;
        navigate("/teacher/courses/new");
      }}
    >
      <div className="teacher-dashboard td-shell">
        <div className="dashboard-container">
          {/* Welcome Hero — matches CourseManagerDashboard.html */}
          {/* <header className="td-hero">
            <h1 className="td-hero__title">
              Welcome back, {firstName}
            </h1>
            <p className="td-hero__subtitle">
              Here is your courses' status today.
            </p>
          </header> */}

          {/* Section Tabs */}
          <div className="section-tabs">
            {sections.map((s) => (
              <button
                key={s.key}
                className={`section-tab ${s.key === section ? "active" : ""}`}
                onClick={() => setSection(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

        {/* Dashboard Section */}
        {section === "dashboard" && (
          <>
            {/* Time Filter */}
            <div className="filter-card">
              <div className="filter-card-content">
                <label className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={timeFilterEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTimeFilterEnabled(checked);
                      if (!checked) {
                        setTimeFrom("");
                        setTimeTo("");
                      }
                    }}
                  />
                  <span className="material-symbols-outlined">schedule</span>
                  <span>Filter by date</span>
                </label>

                <div className="date-range-group">
                  <input
                    type="date"
                    className="date-input"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    disabled={!timeFilterEnabled}
                  />
                  <span className="date-separator">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </span>
                  <input
                    type="date"
                    className="date-input"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    disabled={!timeFilterEnabled}
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setTimeFilterEnabled(false);
                      setTimeFrom("");
                      setTimeTo("");
                    }}
                    disabled={!timeFilterEnabled && !timeFrom && !timeTo}
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {[
                { label: "Total", value: filteredStatus.total, key: "total", icon: "dashboard", color: "#3b82f6" },
                { label: "Published", value: filteredStatus.published, key: "published", icon: "check_circle", color: "#10b981" },
                { label: "Draft", value: filteredStatus.draft, key: "draft", icon: "edit_note", color: "#f59e0b" },
                { label: "Pending review", value: filteredStatus.pending_review, key: "pending_review", icon: "hourglass_top", color: "#06b6d4" },
                { label: "Archived", value: filteredStatus.archived, key: "archived", icon: "archive", color: "#8b5cf6" },
              ].map((c) => (
                <div key={c.key} className="stat-card">
                  <div className="stat-card-icon" style={{ background: `${c.color}10`, color: c.color }}>
                    <span className="material-symbols-outlined">{c.icon}</span>
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-card-value">{c.value}</div>
                    <div className="stat-card-title">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-grid revenue-stats-grid">
              {[
                {
                  label: "Gross revenue",
                  value: formatVnd(Number(revenueSummary?.gross_revenue ?? stats?.finance?.gross_revenue ?? 0)),
                  icon: "payments",
                  color: "#16a34a",
                },
                {
                  label: "Platform fee",
                  value: formatVnd(Number(revenueSummary?.platform_fee_total ?? stats?.finance?.platform_fee_total ?? 0)),
                  icon: "account_balance",
                  color: "#f59e0b",
                },
                {
                  label: "Net revenue",
                  value: formatVnd(Number(revenueSummary?.net_revenue ?? stats?.finance?.net_revenue ?? 0)),
                  icon: "account_balance_wallet",
                  color: "#2563eb",
                },
                {
                  label: "Paid orders",
                  value: String(Number(revenueSummary?.paid_orders ?? stats?.finance?.paid_orders ?? 0)),
                  icon: "receipt_long",
                  color: "#8b5cf6",
                },
              ].map((c) => (
                <div key={c.label} className="stat-card">
                  <div className="stat-card-icon" style={{ background: `${c.color}10`, color: c.color }}>
                    <span className="material-symbols-outlined">{c.icon}</span>
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-card-value stat-card-value--money">{financeLoading ? "..." : c.value}</div>
                    <div className="stat-card-title">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">bar_chart</span>
                  <h3 className="chart-card-title">Status distribution</h3>
                </div>
                <BarChart
                  data={[
                    { label: "Published", value: filteredStatus.published ?? 0, color: "#10b981" },
                    { label: "Draft", value: filteredStatus.draft ?? 0, color: "#f59e0b" },
                    { label: "Pending review", value: filteredStatus.pending_review ?? 0, color: "#06b6d4" },
                    { label: "Archived", value: filteredStatus.archived ?? 0, color: "#8b5cf6" },
                  ]}
                />
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">pie_chart</span>
                  <h3 className="chart-card-title">Level distribution</h3>
                </div>
                <PieChart
                  data={
                    levelPieData.length
                      ? levelPieData
                      : [{ label: "No data yet", value: 0, color: "#e2e8f0" }]
                  }
                />
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">trending_up</span>
                  <h3 className="chart-card-title">Course creation trend</h3>
                </div>
                <LineChart
                  labels={createdSeries.labels}
                  values={createdSeries.buckets}
                />
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">monitoring</span>
                  <h3 className="chart-card-title">Net revenue trend</h3>
                </div>
                <LineChart
                  labels={revenueLabels.length ? revenueLabels : learnersSeries.labels}
                  values={revenueNetValues.length ? revenueNetValues : learnersSeries.buckets}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats-grid">
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">menu_book</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{filteredStatus.total}</div>
                  <div className="quick-stat-label">Total Courses</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">group</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{totalLearners.toLocaleString()}</div>
                  <div className="quick-stat-label">Students</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">verified</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{completionRate}%</div>
                  <div className="quick-stat-label">Publish rate</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">star</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">—</div>
                  <div className="quick-stat-label">Avg. rating</div>
                </div>
              </div>
            </div>

            <div className="transactions-card">
              <div className="chart-card-header">
                <span className="chart-card-icon material-symbols-outlined">receipt_long</span>
                <h3 className="chart-card-title">Recent revenue transactions</h3>
              </div>
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Recognized at</th>
                      <th>Gross revenue</th>
                      <th>Platform fee</th>
                      <th>Net revenue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueTransactions.length ? (
                      revenueTransactions.slice(0, 8).map((t) => (
                        <tr key={t.order_id}>
                          <td>#{t.order_id}</td>
                          <td>{new Date(t.recognized_at).toLocaleString("vi-VN")}</td>
                          <td>{formatVnd(Number(t.gross_amount || 0))}</td>
                          <td>{formatVnd(Number(t.platform_fee_amount || 0))}</td>
                          <td>{formatVnd(Number(t.net_amount || 0))}</td>
                          <td>
                            <span className={`tx-status ${t.status === "recognized" ? "ok" : "warn"}`}>
                              {t.status === "recognized" ? "Recognized" : "Reversed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="tx-empty">
                          No revenue transactions in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Course Management Section */}
        {section === "course" && (
          <div className="course-management">
            <div className="course-header">
              <div>
                <h2 className="section-title">My courses</h2>
                <p className="section-subtitle">Manage, publish, and monitor all your courses</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!ensureVerifiedForCourseActions()) return;
                  navigate("/teacher/courses/new");
                }}
              >
                <span className="material-symbols-outlined">add</span>
                Create new course
              </button>
            </div>

            {/* Course Tabs */}
            <div className="course-tabs">
              {[
                { key: "all", label: "All", count: stats?.total, icon: "apps" },
                { key: "published", label: "Published", count: stats?.published, icon: "check_circle" },
                { key: "draft", label: "Draft", count: stats?.draft, icon: "edit" },
                { key: "pending_review", label: "Pending review", count: stats?.pending_review ?? 0, icon: "hourglass_top" },
                { key: "archived", label: "Archived", count: stats?.archived, icon: "inventory" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`course-tab ${t.key === tab ? "active" : ""}`}
                  onClick={() => setTab(t.key as any)}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined">{t.icon}</span>
                  {t.label}
                  {t.count !== undefined && <span className="tab-count">{t.count}</span>}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="course-toolbar">
              <div className="search-wrapper">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search courses..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="sort-wrapper">
                <select
                  className="sort-select"
                  value={`${sort.sort_by}:${sort.sort_dir}`}
                  onChange={(e) => {
                    const [sb, sd] = e.target.value.split(":") as any;
                    setSort({ sort_by: sb, sort_dir: sd });
                  }}
                  disabled={loading}
                >
                  <option value="updated_at:desc">
                    <span className="material-symbols-outlined">Recently updated</span>
                  </option>
                  <option value="updated_at:asc">Oldest</option>
                  <option value="created_at:desc">Newly created</option>
                  <option value="created_at:asc">Earliest</option>
                  <option value="title:asc">Name A → Z</option>
                  <option value="title:desc">Name Z → A</option>
                  <option value="learners_count:desc">Most students</option>
                  <option value="learners_count:asc">Fewest students</option>
                </select>
              </div>

              <div className="view-toggle">
                <span className="view-toggle-label">View:</span>
                <button
                  className={`view-btn ${courseView === "list" ? "active" : ""}`}
                  onClick={() => setCourseView("list")}
                  title="List"
                >
                  <span className="material-symbols-outlined">view_list</span>
                </button>
                <button
                  className={`view-btn ${courseView === "grid" ? "active" : ""}`}
                  onClick={() => setCourseView("grid")}
                  title="Grid"
                >
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button
                  className={`view-btn ${courseView === "compact" ? "active" : ""}`}
                  onClick={() => setCourseView("compact")}
                  title="Compact"
                >
                  <span className="material-symbols-outlined">view_compact</span>
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Course List */}
            <div className={`course-list course-list--${courseView}`}>
              {(result?.items || []).map((c: any) => (
                <div
                  key={c.id}
                  className="course-card-item"
                  onClick={() => !loading && navigate(`/teacher/courses/${c.id}`)}
                >
                  <div className="course-card-content">
                    <div className="course-thumbnail">
                      {c.thumbnail_url ? (
                        <img
                          src={c.thumbnail_url}
                          alt={c.title}
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COURSE_THUMB; }}
                        />
                      ) : (
                        <img src={DEFAULT_COURSE_THUMB} alt={c.title} />
                      )}
                    </div>
                    
                    <div className="course-info">
                      <div className="course-title-row">
                        <h6 className="course-title">{c.title}</h6>
                        <span className={`status-badge status-badge--${c.status}`}>
                          {c.status === "published"
                            ? "Published"
                            : c.status === "draft"
                              ? "Draft"
                              : c.status === "pending_review"
                                ? "Waiting for admin approval"
                                : "Archived"}
                        </span>
                      </div>
                      <p className="course-description">
                        {c.short_description || "No description."}
                      </p>
                      <div className="course-meta">
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">group</span>
                          {c.learners_count ?? 0} students
                        </span>
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">library_books</span>
                          {c.modules_count ?? 0} chapters
                        </span>
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">menu_book</span>
                          {c.lessons_count ?? 0} lessons
                        </span>
                      </div>
                      <div className="course-rating">
                        <span className="rating-stars">
                          {renderStars(ratings[c.id]?.rating ?? 0).map((s) => (
                            <span key={s.key} className={`material-symbols-outlined ${s.cls}`}>
                              {s.icon}
                            </span>
                          ))}
                        </span>
                        <span className="rating-value">{(ratings[c.id]?.rating ?? 0).toFixed(1)}</span>
                        {ratings[c.id]?.rating_count > 0 && (
                          <span className="rating-count">({ratings[c.id].rating_count})</span>
                        )}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {c.quality_gate?.ready ? (
                          <span style={{ color: "#15803d", fontSize: 12, fontWeight: 700 }}>Quality gate: Ready</span>
                        ) : (
                          <span
                            style={{ color: "#b45309", fontSize: 12, fontWeight: 700 }}
                            title={(c.quality_gate?.issues || []).join("\n")}
                          >
                            Quality gate: Not yet achieved
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="course-actions" data-course-actions-menu="root">
                      {/* <button
                        className="action-trigger"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuCourseId((cur) => (cur === c.id ? null : c.id));
                        }}
                        disabled={loading}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button> */}

                      {openMenuCourseId === c.id && (
                        <div className="action-menu">
                          {c.status !== "archived" && (
                            c.status !== "published" ? (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                if (!ensureVerifiedForCourseActions()) return;
                                await handleSetStatus(c.id, "published");
                              }} disabled={loading}>
                                <span className="material-symbols-outlined">publish</span>
                                Publish
                              </button>
                            ) : (
                              <button className="danger" onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                if (!ensureVerifiedForCourseActions()) return;
                                await handleUnpublish(c.id);
                              }} disabled={loading}>
                                <span className="material-symbols-outlined">unpublish</span>
                                Unpublish
                              </button>
                            )
                          )}
                          
                          {c.status !== "archived" ? (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              if (!ensureVerifiedForCourseActions()) return;
                              await handleSetStatus(c.id, "archived");
                            }} disabled={loading}>
                              <span className="material-symbols-outlined">archive</span>
                              Archive
                            </button>
                          ) : (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              if (!ensureVerifiedForCourseActions()) return;
                              await handleSetStatus(c.id, "draft");
                            }} disabled={loading}>
                              <span className="material-symbols-outlined">unarchive</span>
                              Restore
                            </button>
                          )}
                          
                          <hr />
                          
                          <button className="danger" onClick={async (e) => {
                            e.stopPropagation();
                            setOpenMenuCourseId(null);
                            if (!ensureVerifiedForCourseActions()) return;
                            await handleDelete(c.id);
                          }} disabled={loading}>
                            <span className="material-symbols-outlined">delete</span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!loading && !error && (result?.items?.length === 0) && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <span className="material-symbols-outlined">inbox</span>
                </div>
                <p className="empty-state-text">No courses available.</p>
                {/* <button className="btn-primary btn-sm" onClick={() => navigate("/teacher/courses/new")}>
                  <span className="material-symbols-outlined">add</span>
                  Create course đầu tiên
                </button> */}
              </div>
            )}

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                {loading ? "Loading..." : `Showing ${result?.items?.length ?? 0} / ${result?.total ?? 0} courses`}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    setLoading(true);
                    fetchList({ nextPage: next })
                      .catch((e: any) => setError(e?.message || "An error occurred."))
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading || page <= 1}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Trước
                </button>
                <span className="pagination-current">{page}</span>
                <button
                  className="pagination-btn"
                  onClick={() => {
                    const maxPage = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
                    const next = Math.min(maxPage, page + 1);
                    setPage(next);
                    setLoading(true);
                    fetchList({ nextPage: next })
                      .catch((e: any) => setError(e?.message || "An error occurred."))
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading || page >= Math.max(1, Math.ceil((result?.total ?? 0) / pageSize))}
                >
                  Next
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Sessions Section */}
        {section === "live" && (
          <TeacherLiveSessionPage />
        )}
        </div>
      </div>
      <CommonModal
        open={modalState.open}
        title={modalState.title}
        message={modalState.message}
        onClose={() => setModalState({ open: false, title: "", message: "" })}
        onConfirm={() => {
          if (modalState.onConfirm) {
            modalState.onConfirm();
            return;
          }
          setModalState({ open: false, title: "", message: "" });
        }}
      />
    </TeacherShell>
  );
}