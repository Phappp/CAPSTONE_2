// TeacherCourseOverviewPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../../components/PrerequisiteGraph";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { useAuth } from "../../contexts/Auth";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";

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

type QuickFixAction = {
  key: string;
  label: string;
  to: string;
};

type RejectedResourceItem = {
  id: number;
  module_id: number;
  module_title: string;
  lesson_id: number;
  lesson_title: string;
  lesson_type: "video" | "text" | "quiz" | "assignment";
  resource_kind: "pdf" | "word" | "video" | "youtube" | "other";
  filename: string | null;
  review_reason: string | null;
  review_event_note: string | null;
  review_event_at: string | null;
};

type PendingResourceItem = {
  id: number;
  module_id: number;
  module_title: string;
  lesson_id: number;
  lesson_title: string;
  lesson_type: "video" | "text" | "quiz" | "assignment";
  resource_kind: "pdf" | "word" | "video" | "youtube" | "other";
  filename: string | null;
  created_at: string;
  is_resubmitted?: boolean;
  last_reviewed_at?: string | null;
};

function BarChartMini({ data }: { data: { label: string; value: number; color: string }[] }) {
  const w = 500;
  const h = 200;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (w / data.length) * 0.6;
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
              <rect className="chart-bar" x={x} y={y} width={barW} height={barHeight} fill={d.color} rx="8" />
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
                {d.label}
              </text>
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#334155" fontWeight="600">
                {d.value}
              </text>
            </g>
          );
        })}
        <line x1="0" y1={h - 20} x2={w} y2={h - 20} stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  );
}

function PieMini({ data }: { data: { label: string; value: number; color: string }[] }) {
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
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
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
              startAngle = endAngle;
              return <path key={d.label} d={path} fill={d.color} stroke="#ffffff" strokeWidth="2" />;
            })}
            <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#ffffff" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="2" />
          </>
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#64748b">
          ghi danh
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
}

function LineMini({ labels, values }: { labels: string[]; values: number[] }) {
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
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" className="chart-line" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500">
              {p.v}
            </text>
            <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
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
  const { accessToken: token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManagerOverview | null>(null);
  const [rejectedResources, setRejectedResources] = useState<RejectedResourceItem[]>([]);
  const [pendingResources, setPendingResources] = useState<PendingResourceItem[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [withdrawingReview, setWithdrawingReview] = useState(false);

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
      const rejectedRes = await fetch(`${url}${COURSES_API.myRejectedResources(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const pendingRes = await fetch(`${url}${COURSES_API.myPendingResources(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const rejectedJson = (await rejectedRes.json().catch(() => ({}))) as { items?: RejectedResourceItem[]; message?: string };
      const pendingJson = (await pendingRes.json().catch(() => ({}))) as { items?: PendingResourceItem[]; message?: string };
      if (!rejectedRes.ok) throw new Error(rejectedJson?.message || "Không thể tải danh sách nội dung bị từ chối.");
      if (!pendingRes.ok) throw new Error(pendingJson?.message || "Không thể tải danh sách nội dung đang chờ duyệt.");
      setRejectedResources(Array.isArray(rejectedJson.items) ? rejectedJson.items : []);
      setPendingResources(Array.isArray(pendingJson.items) ? pendingJson.items : []);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
      setData(null);
      setRejectedResources([]);
      setPendingResources([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitForReview = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const confirmed = window.confirm("Bạn có chắc muốn gửi khóa học này để quản trị viên duyệt không?");
    if (!confirmed) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "pending_review" }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(json?.message || "Không thể gửi duyệt khóa học.");
      }
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể gửi duyệt khóa học.");
    } finally {
      setSubmittingReview(false);
    }
  }, [courseId, load, token]);

  const withdrawReviewRequest = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const confirmed = window.confirm("Thu hồi yêu cầu duyệt để quay về bản nháp và tiếp tục chỉnh sửa?");
    if (!confirmed) return;
    setWithdrawingReview(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "draft" }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(json?.message || "Không thể thu hồi yêu cầu duyệt.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể thu hồi yêu cầu duyệt.");
    } finally {
      setWithdrawingReview(false);
    }
  }, [courseId, load, token]);

  const c = data?.course;
  const statusLabel =
    c?.status === "published"
      ? "Đã xuất bản"
      : c?.status === "draft"
      ? "Bản nháp"
      : c?.status === "pending_review"
      ? "Chờ duyệt"
      : c?.status === "archived"
      ? "Đã lưu trữ"
      : "";

  const quickFixActions = useMemo<QuickFixAction[]>(() => {
    if (!error || !courseId || Number.isNaN(courseId)) return [];
    const lower = String(error).toLowerCase();
    const actions: QuickFixAction[] = [];
    const addAction = (key: string, label: string, to: string) => {
      if (actions.some((x) => x.key === key)) return;
      actions.push({ key, label, to });
    };

    // Nhóm lỗi thông tin khóa học -> tab info.
    if (
      lower.includes("thiếu tiêu đề khóa học") ||
      lower.includes("thiếu mô tả ngắn") ||
      lower.includes("thiếu mô tả chi tiết") ||
      lower.includes("thiếu ảnh đại diện")
    ) {
      addAction("go-info", "Đi tới Thông tin khóa học", `/teacher/courses/${courseId}/content?tab=info`);
    }

    // Nhóm lỗi cấu trúc/nội dung -> tab content.
    if (
      lower.includes("ít nhất 1 chương") ||
      lower.includes("ít nhất 3 bài học") ||
      lower.includes("ít nhất 1 tài nguyên") ||
      lower.includes("chưa có nội dung hợp lệ") ||
      lower.includes("bài quiz") ||
      lower.includes("bài tập") ||
      lower.includes("tài nguyên bị từ chối") ||
      lower.includes("tài nguyên đã được duyệt")
    ) {
      addAction("go-content", "Đi tới Cấu trúc nội dung", `/teacher/courses/${courseId}/content?tab=content`);
    }

    return actions;
  }, [error, courseId]);

  const enrollmentPie = useMemo(() => {
    const e = data?.enrollment_by_status || {};
    const items = [
      { label: "Đang học", value: Number(e.active) || 0, color: "#3b82f6" },
      { label: "Hoàn thành", value: Number(e.completed) || 0, color: "#10b981" },
      { label: "Bỏ học", value: Number(e.dropped) || 0, color: "#f59e0b" },
      { label: "Hết hạn", value: Number(e.expired) || 0, color: "#8b5cf6" },
    ];
    return items.filter((x) => x.value > 0);
  }, [data?.enrollment_by_status]);

  const lessonContentBars = useMemo(() => {
    const lt = data?.lesson_type_counts || {};
    return [
      { label: "Video", value: Number(lt.video) || 0, color: "#8b5cf6" },
      { label: "Văn bản", value: Number(lt.text) || 0, color: "#06b6d4" },
    ];
  }, [data?.lesson_type_counts]);

  const assessmentBars = useMemo(() => {
    return [
      { label: "Quiz", value: Number(data?.lessons_with_quiz_count) || 0, color: "#ec4899" },
      { label: "Bài tập", value: Number(data?.lessons_with_assignment_count) || 0, color: "#f97316" },
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
    <div className="teacher-dashboard course-overview-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <div className="back-nav">
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => navigate("/teacher/dashboard?section=course")}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Quay lại danh sách
              </button>
            </div>
            <h1 className="dashboard-title">Tổng quan khóa học</h1>
            <p className="dashboard-subtitle">Theo dõi hiệu suất và tiến độ học viên</p>
          </div>
          <AvatarMenu />
        </div>

        {/* Loading & Error */}
        {loading && !data ? (
          <div className="loading-state">
            <span className="material-symbols-outlined loading-icon">sync</span>
            <p>Đang tải tổng quan khóa học...</p>
          </div>
        ) : null}

        {error && (
          <div className="warning-message">
            <div>{error}</div>
            {quickFixActions.length > 0 && (
              <div className="quick-fix-actions">
                {quickFixActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="quick-fix-btn"
                    onClick={() => navigate(action.to)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!error && rejectedResources.length > 0 && (
          <div className="warning-message warning-message--rejected">
            Có {rejectedResources.length} nội dung bị từ chối. Vui lòng mở mục cần sửa để cập nhật và gửi lại.
          </div>
        )}

        {!error && c?.status === "pending_review" && pendingResources.length > 0 && (
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div className="chart-card-header">
              <span className="chart-card-icon material-symbols-outlined">pending_actions</span>
              <h3 className="chart-card-title">Nội dung đang chờ duyệt ({pendingResources.length})</h3>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {pendingResources.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: item.is_resubmitted ? "#f8fafc" : "#ffffff",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.filename || `${item.lesson_title} - ${item.resource_kind}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {item.module_title} / {item.lesson_title}
                    </div>
                  </div>
                  <span className={`status-badge ${item.is_resubmitted ? "status-badge--draft" : "status-badge--pending_review"}`}>
                    {item.is_resubmitted ? "Gửi lại" : "Mới gửi"}
                  </span>
                </div>
              ))}
              {pendingResources.length > 8 && (
                <div style={{ fontSize: 12, color: "#64748b" }}>Và {pendingResources.length - 8} mục khác...</div>
              )}
            </div>
          </div>
        )}

        {/* Course Content */}
        {c && (
          <>
            {/* Course Hero Section */}
            <div className="course-hero">
              <div className="course-hero-top-right">
                {c.status === "pending_review" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}
                      disabled={loading || withdrawingReview}
                      title="Mở nội dung bị từ chối để sửa và gửi lại"
                    >
                      <span className="material-symbols-outlined">build</span>
                      {rejectedResources.length > 0 ? `Mở mục cần sửa (${rejectedResources.length})` : "Mở mục cần sửa"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => void withdrawReviewRequest()}
                      disabled={loading || withdrawingReview}
                      title="Thu hồi yêu cầu duyệt để quay về bản nháp"
                    >
                      <span className="material-symbols-outlined">undo</span>
                      {withdrawingReview ? "Đang thu hồi..." : "Thu hồi yêu cầu duyệt"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => void submitForReview()}
                    disabled={loading || submittingReview}
                    title="Gửi khóa học để quản trị viên duyệt"
                  >
                    <span className="material-symbols-outlined">send</span>
                    {submittingReview ? "Đang gửi..." : "Gửi duyệt"}
                  </button>
                )}
              </div>
              <div className="course-hero-main">
                <div className="course-thumbnail-large">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} />
                  ) : (
                    <div className="thumbnail-placeholder-large">
                      <span className="material-symbols-outlined">menu_book</span>
                    </div>
                  )}
                </div>
                <div className="course-info-large">
                  <div className="course-title-section">
                    <h1 className="course-title-large">{c.title}</h1>
                    <span className={`status-badge status-badge--${c.status}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="course-slug">/{c.slug}</p>
                  <p className="course-description-large">{c.short_description || "Chưa có mô tả ngắn."}</p>
                </div>
              </div>
              
              <div className="course-actions-bar">
                {/* <button className="btn-primary" onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}>
                  <span className="material-symbols-outlined">edit</span>
                  Chỉnh sửa
                </button> */}
                <button className="btn-secondary" onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}>
                  <span className="material-symbols-outlined">format_list_bulleted</span>
                  Nội dung
                </button>
                <button className="btn-secondary" onClick={openGraphModal}>
                  <span className="material-symbols-outlined">account_tree</span>
                  Sơ đồ tiên quyết
                </button>
                {/* <button className="btn-secondary" onClick={() => navigate(`/teacher/courses/${courseId}/assessments`)}>
                  <span className="material-symbols-outlined">quiz</span>
                  Quiz & Bài tập
                </button> */}
                <button className="btn-secondary" onClick={() => navigate(`/teacher/courses/${courseId}/question-banks`)}>
                  <span className="material-symbols-outlined">question_answer</span>
                  Ngân hàng câu hỏi
                </button>
                {/* <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
                  <span className="material-symbols-outlined">refresh</span>
                  Làm mới
                </button> */}
              </div>
            </div>

            {/* Quick Stats Section */}
            <div className="section-header">
              <span className="material-symbols-outlined section-icon">insights</span>
              <h2 className="section-title">Thống kê nhanh</h2>
            </div>
            <div className="stats-grid">
              {[
                { label: "Học viên", value: c.learners_count, icon: "group", color: "#3b82f6" },
                { label: "Chương", value: c.modules_count, icon: "library_books", color: "#8b5cf6" },
                { label: "Bài học", value: c.lessons_count, icon: "menu_book", color: "#10b981" },
                { label: "Tiến độ TB", value: `${data?.avg_progress_percent ?? 0}%`, icon: "trending_up", color: "#f59e0b" },
                { label: "Bài có Quiz", value: data?.lessons_with_quiz_count ?? 0, icon: "quiz", color: "#ec4899" },
                { label: "Bài có bài tập", value: data?.lessons_with_assignment_count ?? 0, icon: "assignment", color: "#f97316" },
              ].map((x) => (
                <div key={x.label} className="stat-card">
                  <div className="stat-card-icon" style={{ background: `${x.color}10`, color: x.color }}>
                    <span className="material-symbols-outlined">{x.icon}</span>
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-card-value">{x.value}</div>
                    <div className="stat-card-title">{x.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="section-header">
              <span className="material-symbols-outlined section-icon">analytics</span>
              <h2 className="section-title">Phân tích & Xu hướng</h2>
            </div>
            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">show_chart</span>
                  <h3 className="chart-card-title">Ghi danh theo tháng</h3>
                </div>
                <LineMini labels={data?.enrollment_trend?.labels ?? []} values={data?.enrollment_trend?.values ?? []} />
              </div>
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">pie_chart</span>
                  <h3 className="chart-card-title">Trạng thái ghi danh</h3>
                </div>
                <PieMini data={enrollmentPie.length ? enrollmentPie : [{ label: "Chưa có dữ liệu", value: 0, color: "#e2e8f0" }]} />
              </div>
            </div>

            {/* Additional Stats Section */}
            <div className="section-header">
              <span className="material-symbols-outlined section-icon">bar_chart</span>
              <h2 className="section-title">Phân bố chi tiết</h2>
            </div>
            <div className="stats-row-3col">
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">smart_display</span>
                  <h3 className="chart-card-title">Loại bài học</h3>
                </div>
                <BarChartMini data={lessonContentBars} />
              </div>
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">assignment_turned_in</span>
                  <h3 className="chart-card-title">Đánh giá</h3>
                </div>
                <BarChartMini data={assessmentBars} />
              </div>
              <div className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-card-icon material-symbols-outlined">speed</span>
                  <h3 className="chart-card-title">Tiến độ học viên</h3>
                </div>
                <BarChartMini data={progressBars} />
              </div>
            </div>

            {/* Learners Ranking Section */}
            <div className="section-header">
              <span className="material-symbols-outlined section-icon">leaderboard</span>
              <h2 className="section-title">Bảng xếp hạng học viên</h2>
            </div>
            <div className="chart-card learners-section">
              <div className="learners-toolbar">
                <div className="search-wrapper small">
                  <span className="material-symbols-outlined search-icon">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Tìm theo tên hoặc email..."
                    value={learnerQ}
                    onChange={(e) => {
                      setLearnerPage(1);
                      setLearnerQ(e.target.value);
                    }}
                    disabled={learnerLoading}
                  />
                </div>
                <button className="btn-secondary btn-sm" onClick={() => void fetchLearnerProgress()} disabled={learnerLoading}>
                  <span className="material-symbols-outlined">refresh</span>
                  Tải lại
                </button>
              </div>

              {learnerError && <div className="error-message small">{learnerError}</div>}

              <div className="learners-table-wrapper">
                <table className="learners-table">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Học viên</th>
                      <th>Tiến độ</th>
                      <th>Hoàn thành</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Lần truy cập cuối</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerLoading ? (
                      <tr>
                        <td colSpan={7} className="table-loading">
                          <span className="material-symbols-outlined loading-spinner">sync</span>
                          Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : learnerResult?.items?.length ? (
                      learnerResult.items.map((it) => (
                        <tr key={it.user_id}>
                          <td className="rank-cell">#{it.rank}</td>
                          <td>
                            <div className="learner-info">
                              {it.avatar_url ? (
                                <img src={it.avatar_url} alt={it.full_name} className="learner-avatar" />
                              ) : (
                                <div className="learner-avatar-placeholder">
                                  {String(it.full_name || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="learner-name">{it.full_name}</div>
                                <div className="learner-email">{it.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-bg">
                                <div 
                                  className="progress-bar-fill" 
                                  style={{ width: `${it.progress_percent}%` }}
                                />
                              </div>
                              <span className="progress-value">{it.progress_percent}%</span>
                            </div>
                          </td>
                          <td>{it.completed_lessons}/{learnerResult.total_lessons}</td>
                          <td>{Math.round(Number(it.time_spent_seconds ?? 0) / 60)} phút</td>
                          <td>
                            <span className={`status-badge-small status-${it.status === "active" ? "active" : "completed"}`}>
                              {it.status === "active" ? "Đang học" : it.status === "completed" ? "Hoàn thành" : it.status}
                            </span>
                          </td>
                          <td className="last-access">
                            {it.last_accessed_at ? new Date(it.last_accessed_at).toLocaleDateString("vi-VN") : "--"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty">
                          <span className="material-symbols-outlined">inbox</span>
                          <p>Chưa có dữ liệu học viên</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {learnerResult && (
                <div className="learners-pagination">
                  <div className="pagination-info">
                    Tổng: <strong>{learnerResult.total}</strong> học viên
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => setLearnerPage((p) => Math.max(1, p - 1))}
                      disabled={learnerLoading || learnerPage <= 1}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                      Trước
                    </button>
                    <span className="pagination-current">Trang {learnerResult.page}</span>
                    <button
                      className="pagination-btn"
                      onClick={() => setLearnerPage((p) => p + 1)}
                      disabled={learnerLoading || learnerResult.items.length < learnerResult.page_size}
                    >
                      Sau
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prerequisite Graph Modal */}
            {graphModalOpen && (
              <div className="modal-overlay" onClick={() => setGraphModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title">
                      <span className="material-symbols-outlined">account_tree</span>
                      Sơ đồ tiên quyết
                    </h3>
                    <button className="modal-close" onClick={() => setGraphModalOpen(false)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    {graphLoading ? (
                      <div className="loading-state small">
                        <span className="material-symbols-outlined loading-icon">sync</span>
                        <p>Đang tải sơ đồ...</p>
                      </div>
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
                  <div className="modal-footer">
                    <button className="btn-primary" onClick={() => setGraphModalOpen(false)}>
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}