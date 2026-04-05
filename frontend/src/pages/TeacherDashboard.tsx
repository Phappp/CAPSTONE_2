import AvatarMenu from "../components/AvatarMenu";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import AssignmentEditor from "../components/AssignmentEditor";
import "./TeacherDashboard.css";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const TAB_STORAGE_KEY = "teacher_courses_tab";
  const SORT_STORAGE_KEY = "teacher_courses_sort";
  const [openMenuCourseId, setOpenMenuCourseId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  } | null>(null);
  const [tab, setTab] = useState<"all" | "published" | "draft" | "archived">(() => {
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (
        saved === "all" ||
        saved === "published" ||
        saved === "draft" ||
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

  type TeacherSection = "dashboard" | "course" | "quizz" | "assignment";
  const [section, setSection] = useState<TeacherSection>(() => {
    const p = new URLSearchParams(location.search);
    const s = p.get("section");
    if (s === "course" || s === "quizz" || s === "assignment" || s === "dashboard") return s;
    return "dashboard";
  });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const s = p.get("section");
    if (s === "course" || s === "quizz" || s === "assignment" || s === "dashboard") {
      setSection(s);
    }
  }, [location.search]);

  useEffect(() => {
    if (section === "dashboard") {
      setTab("all");
      setSearchInput("");
      setQ("");
      setPage(1);
    }
  }, [section]);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedCourseId != null) return;
    const first = result?.items?.[0]?.id;
    if (typeof first === "number") setSelectedCourseId(first);
  }, [result, selectedCourseId]);

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
    status: "draft" | "published" | "archived"
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

  const statCards = [
    { label: "Tổng số", value: stats?.total ?? 0, key: "total", icon: "📚", color: "#2563eb" },
    { label: "Đã xuất bản", value: stats?.published ?? 0, key: "published", icon: "✅", color: "#10b981" },
    { label: "Bản nháp", value: stats?.draft ?? 0, key: "draft", icon: "✏️", color: "#f59e0b" },
    { label: "Đã lưu trữ", value: stats?.archived ?? 0, key: "archived", icon: "📦", color: "#6b7280" },
  ];

  const sections: { key: TeacherSection; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "course", label: "Khóa học" },
    { key: "quizz", label: "Bài kiểm tra" },
    { key: "assignment", label: "Bài tập" },
  ];

  const filteredStatus = useMemo(() => {
    const items = filteredCourses ?? [];
    const published = items.filter((c: any) => c?.status === "published").length;
    const draft = items.filter((c: any) => c?.status === "draft").length;
    const archived = items.filter((c: any) => c?.status === "archived").length;
    return { total: items.length, published, draft, archived };
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
      { label: "Cơ bản", value: counts.beginner, color: "#2563eb" },
      { label: "Trung cấp", value: counts.intermediate, color: "#f59e0b" },
      { label: "Nâng cao", value: counts.advanced, color: "#ef4444" },
      { label: "Khác", value: counts.other, color: "#6b7280" },
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
      <div className="bar-chart-container">
        <svg className="bar-chart-svg" viewBox={`0 0 ${w} ${h}`}>
          {data.map((d, i) => {
            const barHeight = (d.value / max) * (h - 40);
            const x = i * (w / data.length) + startX;
            const y = h - barHeight - 20;
            return (
              <g key={d.label}>
                <rect
                  className="bar-rect"
                  x={x}
                  y={y}
                  width={barW}
                  height={barHeight}
                  fill={d.color}
                  rx="6"
                />
                <text
                  x={x + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {d.label}
                </text>
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  fontWeight="500"
                >
                  {d.value}
                </text>
              </g>
            );
          })}
          <line x1="0" y1={h - 20} x2={w} y2={h - 20} stroke="#e5e7eb" strokeWidth="1" />
        </svg>
      </div>
    );
  };

  const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const size = 180;
    const cx = size / 2;
    const cy = size / 2;
    const r = 70;
    const innerR = 36; // bán kính lỗ giữa (để nhìn thấy "vòng")
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
      <div className="pie-chart-container">
        <svg className="pie-chart-svg" viewBox={`0 0 ${size} ${size}`}>
          {/* Nền khi không có dữ liệu */}
          {total === 0 ? (
            <>
              <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2" />
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
                    strokeWidth="1"
                  />
                );
                startAngle = endAngle;
                return element;
              })}
              {/* Vòng trong (để thấy hình tròn rõ hơn) */}
              <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#ffffff" strokeWidth="1" />
              {/* Viền ngoài */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="2" />
            </>
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6b7280">
            tổng số
          </text>
        </svg>
        <div className="pie-legend">
          {data.map((d) => (
            <div key={d.label} className="pie-legend-item">
              <div className="pie-legend-color" style={{ background: d.color }} />
              <span>{d.label}:</span>
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
    const padding = { top: 20, right: 20, bottom: 30, left: 30 };
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;
    
    const points = values.map((v, i) => ({
      x: padding.left + (innerW * i) / Math.max(1, values.length - 1),
      y: padding.top + innerH - (v / max) * innerH,
      v,
    }));
    
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    
    return (
      <div className="line-chart-container">
        <svg className="line-chart-svg" viewBox={`0 0 ${w} ${h}`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + innerH * (1 - ratio);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={w - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 6} y={y + 3} fontSize="10" fill="#9ca3af">
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            className="line-path"
          />
          
          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fill="#374151">
                {p.v}
              </text>
              <text
                x={p.x}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
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
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
          </div>
          <AvatarMenu />
        </div>

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

        {section === "dashboard" && (
          <>
            <div className="stats-grid">
              {[
                { label: "Tổng số", value: filteredStatus.total, key: "total", icon: "📚" },
                { label: "Đã xuất bản", value: filteredStatus.published, key: "published", icon: "✅" },
                { label: "Bản nháp", value: filteredStatus.draft, key: "draft", icon: "✏️" },
                { label: "Đã lưu trữ", value: filteredStatus.archived, key: "archived", icon: "📦" },
              ].map((c) => (
                <div key={c.key} className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-card-title">{c.label}</span>
                    <div className="stat-card-icon">{c.icon}</div>
                  </div>
                  <div className="stat-card-value">{c.value}</div>
                </div>
              ))}
            </div>

            <div className="chart-card" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    fontWeight: 700,
                    color: "#111827",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    className="time-filter-checkbox"
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
                  Áp dụng lọc thời gian
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="date"
                    className="time-filter-input"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    disabled={!timeFilterEnabled}
                  />
                  <span style={{ color: "#6b7280", fontWeight: 700 }}>→</span>
                  <input
                    type="date"
                    className="time-filter-input"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    disabled={!timeFilterEnabled}
                  />
                  <button
                    type="button"
                    className="secondary-button time-filter-reset"
                    onClick={() => {
                      setTimeFilterEnabled(false);
                      setTimeFrom("");
                      setTimeTo("");
                    }}
                    disabled={!timeFilterEnabled && !timeFrom && !timeTo}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card-title">
                  📊 Phân bố khóa học
                </div>
                <BarChart
                  data={[
                    { label: "Đã xuất bản", value: filteredStatus.published ?? 0, color: "#10b981" },
                    { label: "Bản nháp", value: filteredStatus.draft ?? 0, color: "#f59e0b" },
                    { label: "Đã lưu trữ", value: filteredStatus.archived ?? 0, color: "#6b7280" },
                  ]}
                />
              </div>

              <div className="chart-card">
                <div className="chart-card-title">
                  🥧 Tỷ lệ theo cấp độ
                </div>
                <PieChart
                  data={
                    levelPieData.length
                      ? levelPieData
                      : [{ label: "Cơ bản", value: 0, color: "#2563eb" }]
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <div className="chart-card" style={{ marginBottom: 0 }}>
                <div className="chart-card-title">📈 Xu hướng tạo khóa học</div>
                <LineChart
                  labels={createdSeries.labels}
                  values={createdSeries.buckets}
                />
              </div>

              <div className="chart-card" style={{ marginBottom: 0 }}>
                <div className="chart-card-title">👥 Xu hướng học viên đăng ký</div>
                <LineChart
                  labels={learnersSeries.labels}
                  values={learnersSeries.buckets}
                />
              </div>
            </div>

            <div className="quick-stats-grid">
              <div className="quick-stat-card">
                <div className="quick-stat-label">📚 Tổng số khóa học</div>
                  <div className="quick-stat-value">{filteredStatus.total}</div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">👥 Tổng số học viên</div>
                <div className="quick-stat-value">{totalLearners}</div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">✅ Tỷ lệ xuất bản</div>
                <div className="quick-stat-value">{completionRate}%</div>
                <div className="quick-stat-note">Khóa học đã xuất bản / Tổng số</div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">⭐ Điểm trung bình</div>
                <div className="quick-stat-value">N/A</div>
                <div className="quick-stat-note">Cần API bổ sung</div>
              </div>
            </div>
          </>
        )}

        {section === "course" && (
          <div className="chart-card">
            <div className="course-header">
              <h2>Khóa học của tôi</h2>
              <button
                className="section-tab active"
                style={{ padding: "10px 24px" }}
                onClick={() => navigate("/teacher/courses/new")}
              >
                + Tạo khóa học mới
              </button>
            </div>

            <div className="course-tabs">
              {[
                { key: "all", label: "Tất cả" },
                { key: "published", label: "Đã xuất bản" },
                { key: "draft", label: "Bản nháp" },
                { key: "archived", label: "Đã lưu trữ" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`course-tab ${t.key === tab ? "active" : ""}`}
                  onClick={() => setTab(t.key as any)}
                  disabled={loading}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="course-filters">
              <div className="course-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="10" cy="10" r="7" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                <input
                  placeholder="Tìm kiếm theo tên khóa học..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="course-sort">
                <select
                  value={`${sort.sort_by}:${sort.sort_dir}`}
                  onChange={(e) => {
                    const [sb, sd] = e.target.value.split(":") as any;
                    setSort({ sort_by: sb, sort_dir: sd });
                  }}
                  disabled={loading}
                >
                  <option value="updated_at:desc">Mới cập nhật (gần nhất)</option>
                  <option value="updated_at:asc">Mới cập nhật (cũ nhất)</option>
                  <option value="created_at:desc">Mới tạo (gần nhất)</option>
                  <option value="created_at:asc">Mới tạo (cũ nhất)</option>
                  <option value="title:asc">Tên A → Z</option>
                  <option value="title:desc">Tên Z → A</option>
                  <option value="learners_count:desc">Học viên (nhiều → ít)</option>
                  <option value="learners_count:asc">Học viên (ít → nhiều)</option>
                </select>
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <div className="course-list">
              {(result?.items || []).map((c: any) => (
                <div
                  key={c.id}
                  className="course-item"
                  onClick={() => !loading && navigate(`/teacher/courses/${c.id}`)}
                >
                  <div className="course-item-content">
                    <div className="course-info">
                      <div className="course-thumbnail">
                        {c.thumbnail_url ? (
                          <img src={c.thumbnail_url} alt={c.title} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                            📘
                          </div>
                        )}
                      </div>
                      <div className="course-details">
                        <div className="course-title-row">
                          <span className="course-title">{c.title}</span>
                          <span className={`course-status ${c.status}`}>
                            {c.status === "published" ? "Đã xuất bản" : c.status === "draft" ? "Bản nháp" : "Đã lưu trữ"}
                          </span>
                        </div>
                        <div className="course-description">
                          {c.short_description || "Chưa có mô tả"}
                        </div>
                        <div className="course-meta">
                          <span>👥 {c.learners_count ?? 0} học viên</span>
                          <span>📚 {c.modules_count ?? 0} chương</span>
                          <span>📖 {c.lessons_count ?? 0} bài học</span>
                        </div>
                      </div>
                    </div>

                    <div className="course-actions" data-course-actions-menu="root">
                      <button
                        className="actions-trigger"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuCourseId((cur) => (cur === c.id ? null : c.id));
                        }}
                        disabled={loading}
                      >
                        ⋯
                      </button>

                      {openMenuCourseId === c.id && (
                        <div className="actions-menu">
                          {c.status !== "archived" && (
                            c.status !== "published" ? (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                await handleSetStatus(c.id, "published");
                              }} disabled={loading}>
                                ✨ Xuất bản
                              </button>
                            ) : (
                              <button className="danger" onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                await handleUnpublish(c.id);
                              }} disabled={loading}>
                                📤 Bỏ xuất bản
                              </button>
                            )
                          )}
                          
                          {c.status !== "archived" ? (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              await handleSetStatus(c.id, "archived");
                            }} disabled={loading}>
                              📦 Lưu trữ
                            </button>
                          ) : (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              await handleSetStatus(c.id, "draft");
                            }} disabled={loading}>
                              🔓 Bỏ lưu trữ
                            </button>
                          )}
                          
                          <hr />
                          
                          <button className="danger" onClick={async (e) => {
                            e.stopPropagation();
                            setOpenMenuCourseId(null);
                            await handleDelete(c.id);
                          }} disabled={loading}>
                            🗑️ Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <div className="pagination-info">
                {loading ? "Đang tải..." : `Hiển thị ${result?.items?.length ?? 0} / ${result?.total ?? 0} khóa học`}
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-button"
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
                  ← Trước
                </button>
                <button
                  className="pagination-button"
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
                  Sau →
                </button>
              </div>
            </div>
          </div>
        )}

        {section === "quizz" && (
          <div className="quiz-section">
            <h2>📝 Bài kiểm tra (Quiz)</h2>
            <p>Quiz được tạo và chỉnh sửa trong Content Builder của từng khóa học</p>
            <div className="quiz-controls">
              <select
                value={selectedCourseId ?? ""}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                disabled={loading || !(result?.items?.length ?? 0)}
              >
                <option value="">Chọn khóa học</option>
                {(result?.items ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                className="section-tab active"
                onClick={() => {
                  if (!selectedCourseId) return;
                  navigate(`/teacher/courses/${selectedCourseId}/content`);
                }}
                disabled={!selectedCourseId}
              >
                Mở Content Builder →
              </button>
            </div>
          </div>
        )}

        {section === "assignment" && (
          <div className="assignment-section">
            <h2>📋 Bài tập (Assignment)</h2>
            <p>Tạo bài tập theo bài học, upload file đính kèm, xem trước và chỉnh sửa.</p>
            <AssignmentEditor courses={(result?.items ?? []) as any[]} token={token} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}