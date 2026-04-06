import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../components/PrerequisiteGraph";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";
import "./TeacherCourseDetailPage.css";

type CourseBrief = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  status: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
};

type ManagerOverview = {
  course: CourseBrief;
  enrollment_by_status: Record<string, number>;
  avg_progress_percent: number;
  enrollment_trend: { labels: string[]; values: number[] };
  lesson_type_counts: Record<string, number>;
  lessons_with_quiz_count: number;
  lessons_with_assignment_count: number;
  progress_distribution: { label: string; count: number }[];
};

type LearnerProgressItem = {
  rank: number;
  user_id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  enrolled_at: string;
  last_accessed_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  completed_lessons: number;
  time_spent_seconds: number;
};

type LearnerProgressResult = {
  course_id: number;
  total_lessons: number;
  items: LearnerProgressItem[];
  page: number;
  page_size: number;
  total: number;
};

function BarChartMini({ data }: { data: { label: string; value: number; color: string }[] }) {
  const w = 500;
  const h = 200;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (w / data.length) * 0.6;
  const startX = (w / data.length - barW) / 2;
  return (
    <div className="bar-chart-container">
      <svg className="bar-chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (h - 40);
          const x = i * (w / data.length) + startX;
          const y = h - barHeight - 20;
          return (
            <g key={d.label}>
              <rect className="bar-rect" x={x} y={y} width={barW} height={barHeight} fill={d.color} rx={6} />
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
                {d.label}
              </text>
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="500">
                {d.value}
              </text>
            </g>
          );
        })}
        <line x1="0" y1={h - 20} x2={w} y2={h - 20} stroke="#e5e7eb" strokeWidth="1" />
      </svg>
    </div>
  );
}

function PieMini({ data }: { data: { label: string; value: number; color: string }[] }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const sum = data.reduce((s, d) => s + d.value, 0);
  const total = sum <= 0 ? 0 : sum;
  let startAngle = -90;
  const describeArc = (start: number, end: number) => {
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const largeArc = end - start <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  return (
    <div className="pie-chart-container">
      <svg className="pie-chart-svg" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2" />
        ) : (
          <>
            {data.map((d) => {
              const angle = (d.value / total) * 360;
              const endAngle = startAngle + angle;
              const path = describeArc(startAngle, endAngle);
              startAngle = endAngle;
              return <path key={d.label} d={path} fill={d.color} stroke="#ffffff" strokeWidth="1" />;
            })}
            <circle cx={cx} cy={cy} r={36} fill="#ffffff" stroke="#ffffff" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="2" />
          </>
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6b7280">
          ghi danh
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
}

function LineMini({ labels, values }: { labels: string[]; values: number[] }) {
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
      <svg className="line-chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
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
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" className="line-path" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fill="#374151">
              {p.v}
            </text>
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function TeacherCourseOverviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManagerOverview | null>(null);

  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [prerequisiteGraph, setPrerequisiteGraph] = useState<PrerequisiteGraphData | null>(null);

  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerError, setLearnerError] = useState<string | null>(null);
  const [learnerQ, setLearnerQ] = useState("");
  const [learnerPage, setLearnerPage] = useState(1);
  const [learnerPageSize] = useState(20);
  const [learnerResult, setLearnerResult] = useState<LearnerProgressResult | null>(null);

  const loadPrerequisiteGraph = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setGraphLoading(true);
    try {
      const res = await fetch(`${url}${COURSES_API.prerequisiteGraph(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => null)) as PrerequisiteGraphData | null;
      if (!res.ok || !json) {
        setPrerequisiteGraph(null);
        return;
      }
      setPrerequisiteGraph(json);
    } catch {
      setPrerequisiteGraph(null);
    } finally {
      setGraphLoading(false);
    }
  }, [courseId, token]);

  const openGraphModal = () => {
    setGraphModalOpen(true);
    void loadPrerequisiteGraph();
  };

  const fetchLearnerProgress = useCallback(
    async (opts?: { page?: number; q?: string }) => {
      if (!courseId || Number.isNaN(courseId)) return;
      const page = opts?.page ?? learnerPage;
      const q = opts?.q ?? learnerQ;
      setLearnerLoading(true);
      setLearnerError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(learnerPageSize));
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`${url}${COURSES_API.learnersProgress(courseId)}?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const j = (await res.json().catch(() => ({}))) as Partial<LearnerProgressResult> & { message?: string };
        if (!res.ok) throw new Error(j?.message || "Không thể tải tiến độ học viên.");
        setLearnerResult(j as LearnerProgressResult);
      } catch (e: any) {
        setLearnerError(e?.message || "Không thể tải tiến độ học viên.");
        setLearnerResult(null);
      } finally {
        setLearnerLoading(false);
      }
    },
    [courseId, learnerPage, learnerPageSize, learnerQ, token]
  );

  useEffect(() => {
    if (!data?.course) return;
    const t = window.setTimeout(() => {
      void fetchLearnerProgress({ page: learnerPage, q: learnerQ });
    }, 400);
    return () => window.clearTimeout(t);
  }, [data?.course, learnerPage, learnerQ, fetchLearnerProgress]);

  const load = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.managerOverview(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<ManagerOverview> & { message?: string };
      if (!res.ok) throw new Error(json?.message || "Không tải được tổng quan khóa học.");
      setData(json as ManagerOverview);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const c = data?.course;
  const statusLabel =
    c?.status === "published" ? "Đã xuất bản" : c?.status === "draft" ? "Bản nháp" : c?.status === "archived" ? "Đã lưu trữ" : "";

  const enrollmentPie = useMemo(() => {
    const e = data?.enrollment_by_status || {};
    const items = [
      { label: "Đang học", value: Number(e.active) || 0, color: "#2563eb" },
      { label: "Hoàn thành", value: Number(e.completed) || 0, color: "#10b981" },
      { label: "Bỏ học", value: Number(e.dropped) || 0, color: "#f59e0b" },
      { label: "Hết hạn", value: Number(e.expired) || 0, color: "#6b7280" },
    ];
    return items.filter((x) => x.value > 0);
  }, [data?.enrollment_by_status]);

  /** Chỉ nội dung bài (video + text); không gồm quiz/assignment */
  const lessonContentBars = useMemo(() => {
    const lt = data?.lesson_type_counts || {};
    return [
      { label: "Video", value: Number(lt.video) || 0, color: "#4f46e5" },
      { label: "Khác", value: Number(lt.text) || 0, color: "#0891b2" },
    ];
  }, [data?.lesson_type_counts]);

  /** Gắn quiz/assignment trên bài video/text không đổi lesson_type — dùng đếm từ API, không dùng lesson_type_counts.quiz/assignment */
  const assessmentBars = useMemo(() => {
    return [
      { label: "Quizz", value: Number(data?.lessons_with_quiz_count) || 0, color: "#c026d3" },
      { label: "Bài tập", value: Number(data?.lessons_with_assignment_count) || 0, color: "#ea580c" },
    ];
  }, [data?.lessons_with_quiz_count, data?.lessons_with_assignment_count]);

  const progressBars = useMemo(() => {
    const pd = data?.progress_distribution || [];
    const colors = ["#94a3b8", "#60a5fa", "#34d399", "#a78bfa"];
    return pd.map((x, i) => ({
      label: x.label,
      value: x.count,
      color: colors[i % colors.length],
    }));
  }, [data?.progress_distribution]);

  if (!courseId || Number.isNaN(courseId)) {
    return null;
  }

  return (
    <div className="dashboard-page teacher-course-overview">
      <div className="dashboard-container">
        <div className="dashboard-header teacher-course-overview__top">
          <div className="teacher-course-overview__topLeft">
            <button type="button" className="secondary-button back-button" onClick={() => navigate("/teacher/dashboard?section=course")}>
              ← Dashboard
            </button>
          </div>
          <AvatarMenu />
        </div>

        {loading && !data ? (
          <div className="chart-card teacher-course-overview__loading">Đang tải tổng quan…</div>
        ) : null}

        {error ? <div className="error-box">{error}</div> : null}

        {c ? (
          <>
            <div className="teacher-course-overview__hero chart-card">
              <div className="teacher-course-overview__heroMain">
                <div className="teacher-course-overview__thumb">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" />
                  ) : (
                    <div className="teacher-course-overview__thumbPh">📘</div>
                  )}
                </div>
                <div>
                  <h1 className="teacher-course-overview__title">{c.title}</h1>
                  <p className="teacher-course-overview__slug">/{c.slug}</p>
                  <p className="teacher-course-overview__desc">{c.short_description || "Chưa có mô tả ngắn."}</p>
                  <span className={`teacher-course-overview__status teacher-course-overview__status--${c.status}`}>{statusLabel}</span>
                </div>
              </div>
              <div className="teacher-course-overview__actions">
                <button type="button" className="primary-button" onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}>
                  Chỉnh sửa khóa học
                </button>
                <button type="button" className="secondary-button" onClick={() => navigate(`/teacher/courses/${courseId}/content`)}>
                  Xây dựng nội dung
                </button>
                <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
                  Làm mới dữ liệu
                </button>
                <button type="button" className="secondary-button" onClick={openGraphModal}>
                  Sơ đồ tiên quyết
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate(`/teacher/courses/${courseId}/assessments`)}
                >
                  Quản lý Quizz &amp; bài tập
                </button>
              </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 16 }}>
              {[
                { label: "Học viên", value: c.learners_count, icon: "👥" },
                { label: "Chương", value: c.modules_count, icon: "📚" },
                { label: "Bài học", value: c.lessons_count, icon: "📖" },
                { label: "Tiến độ TB", value: `${data?.avg_progress_percent ?? 0}%`, icon: "📈" },
                { label: "Bài có Quizz", value: data?.lessons_with_quiz_count ?? 0, icon: "📝" },
                { label: "Bài có bài tập", value: data?.lessons_with_assignment_count ?? 0, icon: "📋" },
              ].map((x) => (
                <div key={x.label} className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-card-title">{x.label}</span>
                    <div className="stat-card-icon">{x.icon}</div>
                  </div>
                  <div className="stat-card-value">{x.value}</div>
                </div>
              ))}
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card-title">📈 Ghi danh theo tháng (6 tháng gần nhất)</div>
                <LineMini labels={data?.enrollment_trend?.labels ?? []} values={data?.enrollment_trend?.values ?? []} />
              </div>
              <div className="chart-card">
                <div className="chart-card-title">🥧 Trạng thái ghi danh</div>
                <PieMini data={enrollmentPie.length ? enrollmentPie : [{ label: "Chưa có", value: 0, color: "#e5e7eb" }]} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
              className="teacher-course-overview__grid2"
            >
              <div className="chart-card" style={{ marginBottom: 0 }}>
                <div className="chart-card-title">📊 Loại bài học</div>
                <BarChartMini data={lessonContentBars} />
              </div>
              <div className="chart-card" style={{ marginBottom: 0 }}>
                <div className="chart-card-title">📊 Quizz &amp; bài tập</div>
                <BarChartMini data={assessmentBars} />
              </div>
              <div className="chart-card" style={{ marginBottom: 0 }}>
                <div className="chart-card-title">📊 Phân bố tiến độ học viên</div>
                <BarChartMini data={progressBars} />
              </div>
            </div>

            <div className="chart-card" style={{ marginBottom: 20 }}>
              <div className="chart-card-title">🏆 Bảng xếp hạng / tiến độ học viên</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <input
                  className="form-input"
                  style={{ width: 280, maxWidth: "70vw" }}
                  placeholder="Tìm theo tên/email..."
                  value={learnerQ}
                  onChange={(e) => {
                    setLearnerPage(1);
                    setLearnerQ(e.target.value);
                  }}
                  disabled={learnerLoading}
                />
                <button type="button" className="secondary-button" onClick={() => void fetchLearnerProgress()} disabled={learnerLoading}>
                  Tải lại
                </button>
              </div>
              {learnerError ? <div className="error-box">{learnerError}</div> : null}
              <div className="teacherLearnersTableWrap" style={{ marginTop: 8 }}>
                <table className="teacherLearnersTable">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Học viên</th>
                      <th>Tiến độ</th>
                      <th>Hoàn thành</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Lần truy cập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                          Đang tải...
                        </td>
                      </tr>
                    ) : learnerResult?.items?.length ? (
                      learnerResult.items.map((it) => (
                        <tr key={it.user_id}>
                          <td style={{ fontWeight: 900, color: "#1d4ed8" }}>#{it.rank}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {it.avatar_url ? (
                                <img
                                  src={it.avatar_url}
                                  alt={it.full_name}
                                  style={{ width: 34, height: 34, borderRadius: "999px", objectFit: "cover", border: "1px solid #e5e7eb" }}
                                />
                              ) : (
                                <div
                                  aria-hidden="true"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "999px",
                                    background: "#e2e8f0",
                                    border: "1px solid #e5e7eb",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: "#334155",
                                  }}
                                >
                                  {String(it.full_name || "U").trim().charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 900 }}>{it.full_name}</div>
                                <div style={{ color: "#6b7280", fontSize: 13 }}>{it.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 900 }}>{Number(it.progress_percent ?? 0)}%</td>
                          <td>
                            {it.completed_lessons}/{learnerResult.total_lessons}
                          </td>
                          <td>{Math.round(Number(it.time_spent_seconds ?? 0) / 60)} phút</td>
                          <td>{it.status}</td>
                          <td style={{ color: "#6b7280", fontSize: 13 }}>
                            {it.last_accessed_at ? new Date(it.last_accessed_at).toLocaleString("vi-VN") : "--"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                          Chưa có dữ liệu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {learnerResult ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <div className="course-stats">
                    Tổng: <b>{learnerResult.total}</b>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setLearnerPage((p) => Math.max(1, p - 1))}
                      disabled={learnerLoading || learnerPage <= 1}
                    >
                      Trước
                    </button>
                    <span className="course-stats">
                      Trang <b>{learnerResult.page}</b>
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setLearnerPage((p) => p + 1)}
                      disabled={learnerLoading || learnerResult.items.length < learnerResult.page_size}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {graphModalOpen ? (
              <div className="save-success-modal-overlay" role="dialog" aria-modal="true">
                <div className="save-success-modal" style={{ width: "min(1200px, 96vw)" }}>
                  <div className="save-success-modal-title">Sơ đồ tiên quyết</div>
                  <div style={{ maxHeight: "70vh", overflow: "auto", marginTop: 8 }}>
                    {graphLoading ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Đang tải sơ đồ…</div>
                    ) : (
                      <PrerequisiteGraph
                        data={prerequisiteGraph}
                        showCompletionStatus={false}
                        onOpenCourse={(s) => {
                          if (!s) return;
                          window.open(`/courses/${s}`, "_blank");
                        }}
                      />
                    )}
                  </div>
                  <div className="save-success-modal-actions">
                    <button type="button" className="primary-button" onClick={() => setGraphModalOpen(false)}>
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
