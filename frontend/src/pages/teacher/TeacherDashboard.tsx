// TeacherDashboard.tsx
import AvatarMenu from "../../components/AvatarMenu";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import { useAuth } from "../../contexts/Auth";
import CommonModal from "../../components/CommonModal";
import "./TeacherDashboard.css";

type CourseViewMode = "list" | "grid" | "compact";

export default function TeacherDashboard() {
  const { user } = useAuth();
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
  } | null>(null);
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
      ? `\n\nGhi chú từ quản trị viên: ${user.manager_verification.review_note}`
      : "";
    setModalState({
      open: true,
      title: "Cần cấp phép giảng viên",
      message: `Tính năng này yêu cầu tài khoản giảng viên đã được xác minh.${note}\n\nBạn sẽ được chuyển đến trang hồ sơ để xem trạng thái xác minh.`,
      onConfirm: () => {
        setModalState({ open: false, title: "", message: "" });
        navigate("/profile");
      },
    });
    return false;
  };

  type TeacherSection = "dashboard" | "course";

  const parseTeacherSection = (raw: string | null): TeacherSection => {
    if (raw === "course") return "course";
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

  const token = useMemo(() => getAccessToken(), []);

  const fetchStats = async () => {
    const res = await fetch(`${url}${COURSES_API.myStats}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải thống kê.");
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
    if (!res.ok) throw new Error(data?.message || "Không thể tải danh sách khóa học.");
    setResult(data);
  };

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchList()]);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
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
          await Promise.all([fetchStats(), fetchList({ nextPage: 1 })]);
        } catch (e: any) {
          setError(e?.message || "Đã xảy ra lỗi.");
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, sort.sort_by, sort.sort_dir]);

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
        throw new Error(data?.message || "Không thể cập nhật trạng thái.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async (courseId: number) => {
    const ok = window.confirm(
      "Bỏ xuất bản khóa học này?\n\nKhóa học sẽ không còn hiển thị cho học viên."
    );
    if (!ok) return;
    await handleSetStatus(courseId, "draft");
  };

  const handleDelete = async (courseId: number) => {
    if (!window.confirm("Xóa khóa học? Thao tác sẽ đưa khóa học vào thùng rác (soft delete).")) {
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
        throw new Error(data?.message || "Không thể xóa khóa học.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const sections: { key: TeacherSection; label: string }[] = [
    { key: "dashboard", label: "Tổng quan" },
    { key: "course", label: "Quản lý khóa học" },
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
      { label: "Cơ bản", value: counts.beginner, color: "#10b981" },
      { label: "Trung cấp", value: counts.intermediate, color: "#f59e0b" },
      { label: "Nâng cao", value: counts.advanced, color: "#ef4444" },
      { label: "Khác", value: counts.other, color: "#8b5cf6" },
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
    const h = 200;
    const max = Math.max(1, ...data.map((d) => d.value));
    const barW = w / data.length * 0.6;
    const startX = (w / data.length - barW) / 2;
    
    return (
      <div className="chart-container">
        <svg className="chart-svg chart-svg--bar" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          {data.map((d, i) => {
            const barHeight = (d.value / max) * (h - 40);
            const x = i * (w / data.length) + startX;
            const y = h - barHeight - 20;
            return (
              <g key={d.label}>
                <rect
                  className="chart-bar"
                  x={x}
                  y={y}
                  width={barW}
                  height={barHeight}
                  fill={d.color}
                  rx="8"
                />
                <text
                  x={x + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  {d.label}
                </text>
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#334155"
                  fontWeight="600"
                >
                  {d.value}
                </text>
              </g>
            );
          })}
          <line x1="0" y1={h - 20} x2={w} y2={h - 20} stroke="#e2e8f0" strokeWidth="1" />
        </svg>
      </div>
    );
  };

  const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const r = 72;
    const innerR = 40;
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
        <svg className="chart-svg chart-svg--pie" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
          {total === 0 ? (
            <>
              <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />
            </>
          ) : (
            <>
              {data.map((d) => {
                const angle = (d.value / total) * 360;
                const endAngle = startAngle + angle;
                const path = describeArc(startAngle, endAngle);
                const element = (
                  <path
                    key={d.label}
                    d={path}
                    fill={d.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
                startAngle = endAngle;
                return element;
              })}
              <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#ffffff" strokeWidth="2" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="2" />
            </>
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#64748b">
            tổng số
          </text>
        </svg>
        <div className="pie-legend">
          {data.map((d) => (
            <div key={d.label} className="pie-legend-item">
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
    const h = 180;
    const max = Math.max(1, ...values);
    const padding = { top: 20, right: 20, bottom: 30, left: 35 };
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;
    
    const points = values.map((v, i) => ({
      x: padding.left + (innerW * i) / Math.max(1, values.length - 1),
      y: padding.top + innerH - (v / max) * innerH,
      v,
    }));
    
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    
    return (
      <div className="chart-container">
        <svg className="chart-svg chart-svg--line" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
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
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 8} y={y + 3} fontSize="10" fill="#94a3b8">
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}
          
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            className="chart-line"
          />
          
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2.5" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500">
                {p.v}
              </text>
              <text
                x={p.x}
                y={h - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {labels[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <h1 className="dashboard-title">Teacher Hub</h1>
            <p className="dashboard-subtitle">Quản lý khóa học và theo dõi hiệu suất giảng dạy</p>
          </div>
          <AvatarMenu />
        </div>

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
                  <span>Lọc theo thời gian</span>
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
                    Đặt lại
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {[
                { label: "Tổng số", value: filteredStatus.total, key: "total", icon: "dashboard", color: "#3b82f6" },
                { label: "Đã xuất bản", value: filteredStatus.published, key: "published", icon: "check_circle", color: "#10b981" },
                { label: "Bản nháp", value: filteredStatus.draft, key: "draft", icon: "edit_note", color: "#f59e0b" },
                { label: "Chờ duyệt", value: filteredStatus.pending_review, key: "pending_review", icon: "hourglass_top", color: "#06b6d4" },
                { label: "Đã lưu trữ", value: filteredStatus.archived, key: "archived", icon: "archive", color: "#8b5cf6" },
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

            {/* Charts Row 1 */}
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">bar_chart</span>
                  <h3 className="chart-card-title">Phân bố trạng thái</h3>
                </div>
                <BarChart
                  data={[
                    { label: "Đã xuất bản", value: filteredStatus.published ?? 0, color: "#10b981" },
                    { label: "Bản nháp", value: filteredStatus.draft ?? 0, color: "#f59e0b" },
                    { label: "Chờ duyệt", value: filteredStatus.pending_review ?? 0, color: "#06b6d4" },
                    { label: "Đã lưu trữ", value: filteredStatus.archived ?? 0, color: "#8b5cf6" },
                  ]}
                />
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">pie_chart</span>
                  <h3 className="chart-card-title">Phân bố theo cấp độ</h3>
                </div>
                <PieChart
                  data={
                    levelPieData.length
                      ? levelPieData
                      : [{ label: "Chưa có dữ liệu", value: 0, color: "#e2e8f0" }]
                  }
                />
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">trending_up</span>
                  <h3 className="chart-card-title">Xu hướng tạo khóa học</h3>
                </div>
                <LineChart
                  labels={createdSeries.labels}
                  values={createdSeries.buckets}
                />
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">people</span>
                  <h3 className="chart-card-title">Xu hướng học viên đăng ký</h3>
                </div>
                <LineChart
                  labels={learnersSeries.labels}
                  values={learnersSeries.buckets}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats-grid">
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">menu_book</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{filteredStatus.total}</div>
                  <div className="quick-stat-label">Tổng khóa học</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">group</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{totalLearners.toLocaleString()}</div>
                  <div className="quick-stat-label">Học viên</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">verified</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">{completionRate}%</div>
                  <div className="quick-stat-label">Tỷ lệ xuất bản</div>
                </div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-icon material-symbols-outlined">star</div>
                <div className="quick-stat-content">
                  <div className="quick-stat-value">—</div>
                  <div className="quick-stat-label">Đánh giá TB</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Course Management Section */}
        {section === "course" && (
          <div className="course-management">
            <div className="course-header">
              <div>
                <h2 className="section-title">Khóa học của tôi</h2>
                <p className="section-subtitle">Quản lý, xuất bản và theo dõi tất cả khóa học</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!ensureVerifiedForCourseActions()) return;
                  navigate("/teacher/courses/new");
                }}
              >
                <span className="material-symbols-outlined">add</span>
                Tạo khóa học mới
              </button>
            </div>

            {/* Course Tabs */}
            <div className="course-tabs">
              {[
                { key: "all", label: "Tất cả", count: stats?.total, icon: "apps" },
                { key: "published", label: "Đã xuất bản", count: stats?.published, icon: "check_circle" },
                { key: "draft", label: "Bản nháp", count: stats?.draft, icon: "edit" },
                { key: "pending_review", label: "Chờ duyệt", count: stats?.pending_review ?? 0, icon: "hourglass_top" },
                { key: "archived", label: "Đã lưu trữ", count: stats?.archived, icon: "inventory" },
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
                  placeholder="Tìm kiếm khóa học..."
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
                    <span className="material-symbols-outlined">update</span> Mới cập nhật
                  </option>
                  <option value="updated_at:asc">Cũ nhất</option>
                  <option value="created_at:desc">Mới tạo</option>
                  <option value="created_at:asc">Tạo sớm nhất</option>
                  <option value="title:asc">Tên A → Z</option>
                  <option value="title:desc">Tên Z → A</option>
                  <option value="learners_count:desc">Học viên nhiều nhất</option>
                  <option value="learners_count:asc">Học viên ít nhất</option>
                </select>
              </div>

              <div className="view-toggle">
                <span className="view-toggle-label">Hiển thị:</span>
                <button
                  className={`view-btn ${courseView === "list" ? "active" : ""}`}
                  onClick={() => setCourseView("list")}
                  title="Danh sách"
                >
                  <span className="material-symbols-outlined">view_list</span>
                </button>
                <button
                  className={`view-btn ${courseView === "grid" ? "active" : ""}`}
                  onClick={() => setCourseView("grid")}
                  title="Lưới"
                >
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button
                  className={`view-btn ${courseView === "compact" ? "active" : ""}`}
                  onClick={() => setCourseView("compact")}
                  title="Gọn"
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
                        <img src={c.thumbnail_url} alt={c.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span className="material-symbols-outlined">menu_book</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="course-info">
                      <div className="course-title-row">
                        <h6 className="course-title">{c.title}</h6>
                        <span className={`status-badge status-badge--${c.status}`}>
                          {c.status === "published"
                            ? "Đã xuất bản"
                            : c.status === "draft"
                              ? "Bản nháp"
                              : c.status === "pending_review"
                                ? "Chờ quản trị viên duyệt"
                                : "Đã lưu trữ"}
                        </span>
                      </div>
                      <p className="course-description">
                        {c.short_description || "Chưa có mô tả"}
                      </p>
                      <div className="course-meta">
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">group</span>
                          {c.learners_count ?? 0} học viên
                        </span>
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">library_books</span>
                          {c.modules_count ?? 0} chương
                        </span>
                        <span className="meta-item">
                          <span className="material-symbols-outlined meta-icon">menu_book</span>
                          {c.lessons_count ?? 0} bài học
                        </span>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {c.quality_gate?.ready ? (
                          <span style={{ color: "#15803d", fontSize: 12, fontWeight: 700 }}>Quality gate: Ready</span>
                        ) : (
                          <span
                            style={{ color: "#b45309", fontSize: 12, fontWeight: 700 }}
                            title={(c.quality_gate?.issues || []).join("\n")}
                          >
                            Quality gate: Chưa đạt
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="course-actions" data-course-actions-menu="root">
                      <button
                        className="action-trigger"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuCourseId((cur) => (cur === c.id ? null : c.id));
                        }}
                        disabled={loading}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>

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
                                Xuất bản
                              </button>
                            ) : (
                              <button className="danger" onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                if (!ensureVerifiedForCourseActions()) return;
                                await handleUnpublish(c.id);
                              }} disabled={loading}>
                                <span className="material-symbols-outlined">unpublish</span>
                                Bỏ xuất bản
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
                              Lưu trữ
                            </button>
                          ) : (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              if (!ensureVerifiedForCourseActions()) return;
                              await handleSetStatus(c.id, "draft");
                            }} disabled={loading}>
                              <span className="material-symbols-outlined">unarchive</span>
                              Khôi phục
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
                            Xóa
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
                <p className="empty-state-text">Chưa có khóa học nào</p>
                {/* <button className="btn-primary btn-sm" onClick={() => navigate("/teacher/courses/new")}>
                  <span className="material-symbols-outlined">add</span>
                  Tạo khóa học đầu tiên
                </button> */}
              </div>
            )}

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                {loading ? "Đang tải..." : `Hiển thị ${result?.items?.length ?? 0} / ${result?.total ?? 0} khóa học`}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    setLoading(true);
                    fetchList({ nextPage: next })
                      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
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
                      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
                      .finally(() => setLoading(false));
                  }}
                  disabled={loading || page >= Math.max(1, Math.ceil((result?.total ?? 0) / pageSize))}
                >
                  Sau
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
}