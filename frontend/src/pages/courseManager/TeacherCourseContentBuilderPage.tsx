// TeacherCourseContentBuilderPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { useAuth } from "../../contexts/Auth";
import CourseContentSimpleTree from "../../components/CourseContentSimpleTree";
import TeacherCourseAssessmentsPage from "./TeacherCourseAssessmentsPage";
import TeacherShell from "../../components/TeacherShell";
import "./TeacherDashboard.css";
import "./TeacherCourseContentBuilderPage.css";

type CourseStatus = "draft" | "pending_review" | "published" | "archived";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description?: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learning_objectives?: string[] | string | null;
  prerequisites?: string[] | string | null;
  price?: number | null;
  status: CourseStatus;
  published_at: string | null;
  publish_scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
};

type CompletionRules = {
  course_id: number;
  video_min_seconds: number;
  video_min_percent: number;
  text_min_seconds: number;
};

type CourseOption = {
  id: number;
  title: string;
  slug: string;
  selectable?: boolean;
  reason?: string | null;
};

type MainTab = "info" | "content" | "assessment" | "rules";

export default function TeacherCourseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const courseId = Number(params.id);

  const { accessToken: token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CourseStatus>("draft");
  const [activeTab, setActiveTab] = useState<MainTab>("info");

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tab = q.get("tab");
    if (tab === "content" || tab === "info" || tab === "assessment" || tab === "rules") {
      setActiveTab(tab);
    }
  }, [location.search]);

  const [form, setForm] = useState({
    title: "",
    short_description: "",
    full_description: "",
    price: "",
    level: "beginner",
    language: "vi",
    thumbnail_url: "",
    learning_objectives: [""] as string[],
    prerequisites: [""] as string[],
    publish_scheduled_at: "" as string,
  });
  const [initialForm, setInitialForm] = useState<null | {
    title: string;
    short_description: string;
    full_description: string;
    price: string;
    level: string;
    language: string;
    thumbnail_url: string;
    learning_objectives: string[];
    prerequisites: string[];
    publish_scheduled_at: string;
    status: CourseStatus;
  }>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [withdrawingReview, setWithdrawingReview] = useState(false);

  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rules, setRules] = useState<CompletionRules | null>(null);
  const [rulesDraft, setRulesDraft] = useState<{ video_min_seconds: string; video_min_percent: string; text_min_seconds: string }>({
    video_min_seconds: "60",
    video_min_percent: "0.7",
    text_min_seconds: "30",
  });

  const [prerequisiteOptions, setPrerequisiteOptions] = useState<CourseOption[]>([]);
  const [legacyPrerequisites, setLegacyPrerequisites] = useState<string[]>([]);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return (
      form.title !== initialForm.title ||
      form.short_description !== initialForm.short_description ||
      form.full_description !== initialForm.full_description ||
      form.price !== initialForm.price ||
      form.level !== initialForm.level ||
      form.language !== initialForm.language ||
      form.thumbnail_url !== initialForm.thumbnail_url ||
      form.publish_scheduled_at !== initialForm.publish_scheduled_at ||
      JSON.stringify(form.learning_objectives) !== JSON.stringify(initialForm.learning_objectives) ||
      JSON.stringify(form.prerequisites) !== JSON.stringify(initialForm.prerequisites) ||
      selectedStatus !== initialForm.status
    );
  }, [form, initialForm, selectedStatus]);

  const normalizeStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      const arr = value.map((x) => String(x).trim()).filter(Boolean);
      return arr.length ? arr : [""];
    }
    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return [""];
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const arr = parsed.map((x) => String(x).trim()).filter(Boolean);
          return arr.length ? arr : [""];
        }
      } catch {
        // ignore
      }
      const arr = s.split(/\r?\n|•|\u2022|-/g).map((x) => x.trim()).filter(Boolean);
      return arr.length ? arr : [""];
    }
    return [""];
  };

  const selectedPrerequisiteIds = useMemo(() => {
    return new Set(
      (form.prerequisites || [])
        .map((x) => Number(String(x).trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
  }, [form.prerequisites]);

  const reconcilePrerequisitesToIds = (rawList: string[], options: CourseOption[]) => {
    const byTitle = new Map<string, number>();
    for (const o of options) {
      const key = String(o.title || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (key) byTitle.set(key, o.id);
    }
    const ids: number[] = [];
    const leftovers: string[] = [];
    for (const raw of rawList) {
      const s = String(raw || "").trim();
      if (!s) continue;
      const n = Number(s);
      if (Number.isInteger(n) && n > 0) {
        ids.push(n);
        continue;
      }
      const m = s.match(/^kh[oó]a h[oọ]c\s*#\s*(\d+)$/i);
      if (m) {
        const mid = Number(m[1]);
        if (Number.isInteger(mid) && mid > 0) {
          ids.push(mid);
          continue;
        }
      }
      const titleKey = s.toLowerCase().replace(/\s+/g, " ");
      const mappedId = byTitle.get(titleKey);
      if (mappedId) ids.push(mappedId);
      else leftovers.push(s);
    }
    return {
      ids: Array.from(new Set(ids)),
      leftovers: Array.from(new Set(leftovers)),
    };
  };

  useEffect(() => {
    if (!selectedPrerequisiteIds.size) return;
    setPrerequisiteOptions((prev) => {
      const map = new Map<number, CourseOption>(prev.map((x) => [x.id, x]));
      let changed = false;
      for (const id of selectedPrerequisiteIds) {
        if (!map.has(id) && id !== courseId) {
          map.set(id, { id, title: `Khóa học #${id}`, slug: "" });
          changed = true;
        }
      }
      if (!changed) return prev;
      return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "vi"));
    });
  }, [selectedPrerequisiteIds, courseId]);

  const isoToDatetimeLocalValue = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad2 = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`${url}${COURSES_API.detail(courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải chi tiết khóa học.");
    setCourse(data as CourseDetail);
    const nextForm = {
      title: data.title ?? "",
      short_description: data.short_description ?? "",
      full_description: data.full_description ?? "",
      price: data.price != null ? String(data.price) : "",
      level: data.level ?? "beginner",
      language: data.language ?? "vi",
      thumbnail_url: data.thumbnail_url ?? "",
      learning_objectives: normalizeStringArray(data.learning_objectives),
      prerequisites: normalizeStringArray(data.prerequisites),
      publish_scheduled_at: isoToDatetimeLocalValue(data.publish_scheduled_at),
    };
    setForm(nextForm);
    const nextStatus = (data.status ?? "draft") as CourseStatus;
    setSelectedStatus(nextStatus);
    setInitialForm({ ...nextForm, status: nextStatus });
  }, [courseId, token]);

  const fetchCompletionRules = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.completionRules(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CompletionRules> & { message?: string };
      if (!res.ok) throw new Error(data?.message || "Không thể tải quy tắc hoàn thành.");
      const next = data as CompletionRules;
      setRules(next);
      setRulesDraft({
        video_min_seconds: String(next.video_min_seconds ?? 60),
        video_min_percent: String(next.video_min_percent ?? 0.7),
        text_min_seconds: String(next.text_min_seconds ?? 30),
      });
    } catch (e: any) {
      setRulesError(e?.message || "Không thể tải quy tắc hoàn thành.");
      setRules(null);
    } finally {
      setRulesLoading(false);
    }
  }, [courseId, token]);

  const fetchPrerequisiteOptions = useCallback(async () => {
    try {
      const res = await fetch(`${url}${COURSES_API.prerequisiteOptions(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as { items?: any[] };
      if (!res.ok) return;
      const items = Array.isArray(json.items) ? json.items : [];
      setPrerequisiteOptions(
        items
          .map((x) => ({
            id: Number((x as any)?.id),
            title: String((x as any)?.title || ""),
            slug: String((x as any)?.slug || ""),
            selectable: Boolean((x as any)?.selectable),
            reason: (x as any)?.reason ? String((x as any).reason) : null,
          }))
          .filter((x) => Number.isInteger(x.id) && x.id > 0)
      );
    } catch {
      // ignore
    }
  }, [courseId, token]);

  useEffect(() => {
    if (!prerequisiteOptions.length) return;
    const raw = (form.prerequisites || []).map((x) => String(x).trim()).filter(Boolean);
    const { ids, leftovers } = reconcilePrerequisitesToIds(raw, prerequisiteOptions);
    const next = ids.map(String);
    setLegacyPrerequisites(leftovers);
    if (JSON.stringify(next) === JSON.stringify(raw)) return;
    setForm((p) => ({ ...p, prerequisites: next }));
    if (initialForm) setInitialForm((p) => (p ? { ...p, prerequisites: next } : p));
  }, [prerequisiteOptions, form.prerequisites, initialForm]);

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) {
      navigate("/teacher/dashboard");
      return;
    }
    setLoading(true);
    setError(null);
    fetchDetail()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    void fetchCompletionRules();
    void fetchPrerequisiteOptions();
  }, [courseId, navigate, fetchDetail, fetchCompletionRules, fetchPrerequisiteOptions]);

  const save = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccessOpen(false);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        short_description: form.short_description,
        full_description: form.full_description,
        price: form.price.trim() ? Number(form.price) : null,
        level: form.level,
        language: form.language,
        learning_objectives: form.learning_objectives.map((x) => x.trim()).filter(Boolean),
        prerequisites: Array.from(selectedPrerequisiteIds).map(String),
        publish_scheduled_at: form.publish_scheduled_at ? new Date(form.publish_scheduled_at).toISOString() : null,
      };
      if (initialForm && form.thumbnail_url !== initialForm.thumbnail_url) {
        payload.thumbnail_url = form.thumbnail_url || null;
      }
      const res = await fetch(`${url}${COURSES_API.update(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể lưu thay đổi.");
      }

      const scheduledAt = form.publish_scheduled_at ? new Date(form.publish_scheduled_at) : null;
      const scheduleFuture = scheduledAt && scheduledAt.getTime() > Date.now();

      if (course && selectedStatus !== course.status && !scheduleFuture) {
        const res2 = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: selectedStatus }),
        });
        if (!res2.ok) {
          const data2 = await res2.json().catch(() => ({}));
          throw new Error(data2?.message || "Không thể cập nhật trạng thái.");
        }
      }

      await fetchDetail();
      setSaveSuccessOpen(true);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const setStatusNow = async (nextStatus: CourseStatus) => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật trạng thái.");
      await fetchDetail();
      setSelectedStatus(nextStatus);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Xóa khóa học? (soft delete)")) return;
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
      navigate("/teacher/dashboard");
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClassName = (status: CourseStatus) => {
    switch (status) {
      case "published": return "status-published";
      case "pending_review": return "status-draft";
      case "draft": return "status-draft";
      case "archived": return "status-archived";
      default: return "";
    }
  };

  const getStatusLabel = (status: CourseStatus) => {
    switch (status) {
      case "published": return "Đã xuất bản";
      case "pending_review": return "Chờ duyệt";
      case "draft": return "Bản nháp";
      case "archived": return "Đã lưu trữ";
      default: return status;
    }
  };

  const saveCompletionRules = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setRulesLoading(true);
    setRulesError(null);
    try {
      const payload: Record<string, number> = {};
      const vms = Number(rulesDraft.video_min_seconds);
      const vmp = Number(rulesDraft.video_min_percent);
      const tms = Number(rulesDraft.text_min_seconds);
      if (Number.isFinite(vms)) payload.video_min_seconds = vms;
      if (Number.isFinite(vmp)) payload.video_min_percent = vmp;
      if (Number.isFinite(tms)) payload.text_min_seconds = tms;

      const res = await fetch(`${url}${COURSES_API.completionRules(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CompletionRules> & { message?: string };
      if (!res.ok) throw new Error(data?.message || "Không thể lưu quy tắc hoàn thành.");
      setRules(data as CompletionRules);
    } catch (e: any) {
      setRulesError(e?.message || "Không thể lưu quy tắc hoàn thành.");
    } finally {
      setRulesLoading(false);
    }
  };

  const withdrawReviewRequest = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const confirmed = window.confirm("Thu hồi yêu cầu duyệt để mở khóa chỉnh sửa?");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể thu hồi yêu cầu duyệt.");
      await fetchDetail();
      setSelectedStatus("draft");
      setOpenStatusMenu(false);
    } catch (e: any) {
      setError(e?.message || "Không thể thu hồi yêu cầu duyệt.");
    } finally {
      setWithdrawingReview(false);
    }
  };

  const isReadOnlyByReview = course?.status === "pending_review";

  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <TeacherShell activeNav="curriculum" activeTopNav="courses" showFab={false}>
    <div className="teacher-dashboard content-builder-page td-shell">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <div className="back-nav">
              <button
                type="button"
                className="back-btn"
                onClick={() => navigate(`/teacher/courses/${courseId}`)}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Tổng quan khóa học
              </button>
            </div>
            {/* <h1
              className="dashboard-title"
              style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
            >
              <button
                type="button"
                onClick={() => navigate("/teacher/dashboard")}
                style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                title="Đi tới Dashboard"
              >
                Dashboard
              </button>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#94a3b8" }}>chevron_right</span>
              <button
                type="button"
                onClick={() => navigate(`/teacher/courses/${courseId}`)}
                style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                title="Đi tới tổng quan khóa học"
              >
                {course ? course.title : "Khóa học"}
              </button>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#94a3b8" }}>chevron_right</span>
              <span>Quản lý nội dung</span>
            </h1> */}
            {/* <p className="dashboard-subtitle">
              Quản lý thông tin, nội dung, bài kiểm tra và quy tắc hoàn thành khóa học
            </p> */}
          </div>
        </div>

        {/* Status Bar */}
        {course && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span className={`status-badge ${getStatusClassName(course.status)}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {course.status === "published" ? "public" : course.status === "draft" ? "edit_note" : "archive"}
              </span>
              {getStatusLabel(course.status)}
            </span>
            <div className="course-stats">
              <span><span className="material-symbols-outlined meta-icon">library_books</span> {course.modules_count} chương</span>
              <span><span className="material-symbols-outlined meta-icon">menu_book</span> {course.lessons_count} bài học</span>
              <span><span className="material-symbols-outlined meta-icon">group</span> {course.learners_count} học viên</span>
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {/* Main Tabs */}
        <div className="content-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            <span className="material-symbols-outlined">info</span>
            Thông tin khóa học
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "content" ? "active" : ""}`}
            onClick={() => setActiveTab("content")}
          >
            <span className="material-symbols-outlined">menu_book</span>
            Nội dung
          </button>
          {/* <button
            type="button"
            className={`tab-btn ${activeTab === "assessment" ? "active" : ""}`}
            onClick={() => setActiveTab("assessment")}
          >
            <span className="material-symbols-outlined">quiz</span>
            Quiz & Bài tập
          </button> */}
          <button
            type="button"
            className={`tab-btn ${activeTab === "rules" ? "active" : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            <span className="material-symbols-outlined">check_circle</span>
            Quy tắc hoàn thành
          </button>
        </div>

        <div className="content-builder-layout">
          {/* Info Section */}
          {activeTab === "info" && (
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">
                  <span className="material-symbols-outlined">edit_note</span>
                  <h2>Thông tin cơ bản</h2>
                </div>
                <div className="section-card-actions">
                  {isReadOnlyByReview ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={withdrawReviewRequest}
                      disabled={loading || withdrawingReview}
                    >
                      <span className="material-symbols-outlined">undo</span>
                      {withdrawingReview ? "Đang thu hồi..." : "Thu hồi yêu cầu duyệt"}
                    </button>
                  ) : null}
                  <div className="dropdown">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setOpenStatusMenu(!openStatusMenu)}
                      disabled={loading || isReadOnlyByReview}
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {openStatusMenu && (
                      <div className="dropdown-menu">
                        <button
                          type="button"
                          className={`dropdown-item ${selectedStatus === "draft" ? "active" : ""}`}
                          onClick={() => {
                            setOpenStatusMenu(false);
                            void setStatusNow("draft");
                          }}
                          disabled={loading || isReadOnlyByReview}
                        >
                          <span className="material-symbols-outlined">edit_note</span>
                          Đặt thành bản nháp
                        </button>
                        {course?.status !== "archived" && (
                          <button
                            type="button"
                            className={`dropdown-item ${selectedStatus === "published" ? "active" : ""}`}
                            onClick={() => {
                              setOpenStatusMenu(false);
                              void setStatusNow("published");
                            }}
                            disabled={loading || isReadOnlyByReview}
                          >
                            <span className="material-symbols-outlined">public</span>
                            Đặt thành đã xuất bản
                          </button>
                        )}
                        <button
                          type="button"
                          className={`dropdown-item ${selectedStatus === "archived" ? "active" : ""}`}
                          onClick={() => {
                            setOpenStatusMenu(false);
                            void setStatusNow("archived");
                          }}
                          disabled={loading || isReadOnlyByReview}
                        >
                          <span className="material-symbols-outlined">archive</span>
                          {course?.status === "archived" ? "Đang lưu trữ" : "Đặt thành lưu trữ"}
                        </button>
                        <div className="dropdown-divider" />
                        <button
                          type="button"
                          className="dropdown-item danger"
                          onClick={() => {
                            setOpenStatusMenu(false);
                            del();
                          }}
                          disabled={loading || isReadOnlyByReview}
                        >
                          <span className="material-symbols-outlined">delete</span>
                          Xóa khóa học
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={save}
                    disabled={loading || !isDirty || isReadOnlyByReview}
                  >
                    <span className="material-symbols-outlined">save</span>
                    Lưu thay đổi
                  </button>
                </div>
              </div>

              <div className="section-card-content">
                <div className="course-info-grid">
                  {/* Left Column */}
                  <div className="info-group">
                    <div className="form-group">
                      <label>Tên khóa học <span className="required">*</span></label>
                      <input
                        className="form-input"
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                        placeholder="Nhập tên khóa học"
                      />
                    </div>

                    <div className="form-group">
                      <label>Mô tả ngắn</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={form.short_description}
                        onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                        placeholder="Mô tả ngắn gọn về khóa học..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Mô tả đầy đủ</label>
                      <textarea
                        className="form-input"
                        rows={6}
                        value={form.full_description}
                        onChange={(e) => setForm((p) => ({ ...p, full_description: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                        placeholder="Mô tả chi tiết nội dung khóa học..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Xuất bản tự động lúc (tùy chọn)</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={form.publish_scheduled_at || ""}
                        onChange={(e) => setForm((p) => ({ ...p, publish_scheduled_at: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="info-group">
                    <div className="form-group">
                      <label>Giá (VNĐ)</label>
                      <input
                        className="form-input"
                        inputMode="numeric"
                        value={form.price}
                        onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                        placeholder="Để trống nếu miễn phí"
                      />
                    </div>

                    <div className="form-group">
                      <label>Cấp độ</label>
                      <select
                        className="form-input"
                        value={form.level}
                        onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                      >
                        <option value="beginner">Cơ bản</option>
                        <option value="intermediate">Trung cấp</option>
                        <option value="advanced">Nâng cao</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Ngôn ngữ</label>
                      <select
                        className="form-input"
                        value={form.language}
                        onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                        disabled={loading || isReadOnlyByReview}
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Ảnh khóa học</label>
                      <div className="thumbnail-container">
                        <div className="thumbnail-preview">
                          {form.thumbnail_url ? (
                            <img src={form.thumbnail_url} alt="Course thumbnail" />
                          ) : (
                            <span className="thumbnail-placeholder">Chưa có ảnh</span>
                          )}
                        </div>
                        <div className="thumbnail-upload">
                          <div className="thumbnail-input-group">
                            <input
                              className="form-input"
                              placeholder="Đường dẫn ảnh (tùy chọn)"
                              value={form.thumbnail_url}
                              onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
                              disabled={loading || isReadOnlyByReview}
                            />
                            <label className="btn-secondary btn-sm" style={{ cursor: "pointer", margin: 0 }}>
                              <span className="material-symbols-outlined">upload</span>
                              Chọn ảnh
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={async (e) => {
                                  if (isReadOnlyByReview) return;
                                  const f = e.target.files?.[0];
                                  e.currentTarget.value = "";
                                  if (!f) return;
                                  try {
                                    const formData = new FormData();
                                    formData.append("file", f);
                                    const res = await fetch(`${url}${COURSES_API.uploadCourseThumbnail()}`, {
                                      method: "POST",
                                      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                      body: formData,
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(data?.message || "Upload ảnh thất bại.");
                                    const imageUrl = data?.url as string | undefined;
                                    if (imageUrl) {
                                      const thumbUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
                                        ? imageUrl
                                        : `${url}${imageUrl}`;
                                      setForm((p) => ({ ...p, thumbnail_url: thumbUrl }));
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                disabled={loading || isReadOnlyByReview}
                              />
                            </label>
                          </div>
                          <span className="thumbnail-hint">Ảnh tỉ lệ 16:9 sẽ hiển thị đẹp nhất</span>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Mục tiêu học tập</label>
                      <div className="array-field">
                        {form.learning_objectives.map((item, idx) => (
                          <div key={`obj-${idx}`} className="array-item">
                            <input
                              className="form-input"
                              placeholder="Ví dụ: Hiểu cú pháp Python cơ bản"
                              value={item}
                              onChange={(e) =>
                                setForm((p) => {
                                  const copy = [...p.learning_objectives];
                                  copy[idx] = e.target.value;
                                  return { ...p, learning_objectives: copy };
                                })
                              }
                              disabled={loading || isReadOnlyByReview}
                            />
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setForm((p) => {
                                  const copy = [...p.learning_objectives];
                                  copy.splice(idx, 1);
                                  return { ...p, learning_objectives: copy.length ? copy : [""] };
                                })
                              }
                              disabled={loading || isReadOnlyByReview}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add-btn"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              learning_objectives: [...p.learning_objectives, ""],
                            }))
                          }
                          disabled={loading || isReadOnlyByReview}
                        >
                          <span className="material-symbols-outlined">add</span>
                          Thêm mục tiêu
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Yêu cầu tiên quyết</label>
                      <div className="prerequisite-list">
                        {prerequisiteOptions.length ? (
                          prerequisiteOptions.map((c) => {
                            const checked = selectedPrerequisiteIds.has(c.id);
                            const isDisabled = !checked && c.selectable === false;
                            return (
                              <div
                                key={c.id}
                                className={`prerequisite-item ${checked ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                                onClick={() => {
                                  if (isReadOnlyByReview) return;
                                  if (isDisabled) return;
                                  setForm((p) => {
                                    const set = new Set(
                                      (p.prerequisites || [])
                                        .map((x) => Number(String(x).trim()))
                                        .filter((n) => Number.isInteger(n) && n > 0)
                                    );
                                    if (checked) set.delete(c.id);
                                    else set.add(c.id);
                                    return { ...p, prerequisites: Array.from(set).map(String) };
                                  });
                                }}
                              >
                                <div className="prerequisite-info">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isDisabled || isReadOnlyByReview}
                                    onChange={() => {}}
                                  />
                                  <span className="prerequisite-title">{c.title}</span>
                                </div>
                                {checked && <span className="prerequisite-badge selected">✓ Đã chọn</span>}
                                {isDisabled && (
                                  <span className="prerequisite-badge disabled" title={c.reason || ""}>
                                    Không khả dụng
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ color: "var(--gray-500)", textAlign: "center", padding: 20 }}>
                            Chưa có khóa học để chọn
                          </div>
                        )}
                      </div>
                      {legacyPrerequisites.length > 0 && (
                        <div className="legacy-warning">
                          Không map được một số điều kiện cũ: {legacyPrerequisites.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Section */}
          {activeTab === "content" && (
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">
                  <span className="material-symbols-outlined">menu_book</span>
                  <h2>Cấu trúc nội dung</h2>
                </div>
              </div>
              <div className="section-card-content content-editor-wrapper">
                <CourseContentSimpleTree courseId={courseId} readOnly={isReadOnlyByReview} />
              </div>
            </div>
          )}

          {/* Assessment Section - Embed TeacherCourseAssessmentsPage */}
          {activeTab === "assessment" && (
            <div className="section-card assessment-embedded-section">
              <div className="section-card-header">
                <div className="section-card-title">
                  <span className="material-symbols-outlined">quiz</span>
                  <h2>Quiz & Bài tập</h2>
                </div>
              </div>
              <div className="section-card-content" style={{ padding: 0 }}>
                <TeacherCourseAssessmentsPage />
              </div>
            </div>
          )}

          {/* Rules Section */}
          {activeTab === "rules" && (
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">
                  <span className="material-symbols-outlined">check_circle</span>
                  <h2>Quy tắc hoàn thành (Time-based)</h2>
                </div>
                <div className="section-card-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={fetchCompletionRules}
                    disabled={rulesLoading || isReadOnlyByReview}
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Tải lại
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={saveCompletionRules}
                    disabled={rulesLoading || isReadOnlyByReview}
                  >
                    <span className="material-symbols-outlined">save</span>
                    Lưu quy tắc
                  </button>
                </div>
              </div>

              <div className="section-card-content">
                {rulesError && <div className="error-box">{rulesError}</div>}

                <div className="rules-grid">
                  <div>
                    <div className="form-group">
                      <label>Video: thời gian tối thiểu (giây)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1"
                        value={rulesDraft.video_min_seconds}
                        onChange={(e) => setRulesDraft((p) => ({ ...p, video_min_seconds: e.target.value }))}
                        disabled={rulesLoading || isReadOnlyByReview}
                      />
                    </div>
                    <div className="form-group">
                      <label>Video: phần trăm thời lượng tối thiểu (0..1)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={rulesDraft.video_min_percent}
                        onChange={(e) => setRulesDraft((p) => ({ ...p, video_min_percent: e.target.value }))}
                        disabled={rulesLoading || isReadOnlyByReview}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="form-group">
                      <label>Khác: thời gian tối thiểu (giây)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1"
                        value={rulesDraft.text_min_seconds}
                        onChange={(e) => setRulesDraft((p) => ({ ...p, text_min_seconds: e.target.value }))}
                        disabled={rulesLoading || isReadOnlyByReview}
                      />
                    </div>
                  </div>
                </div>

                <div className="rules-stats">
                  <strong>Đang áp dụng:</strong>
                  {rules ? (
                    <>
                      {" "}Video ≥ {rules.video_min_seconds}s hoặc ≥ {rules.video_min_percent} · Khác ≥ {rules.text_min_seconds}s
                    </>
                  ) : (
                    " -- "
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {saveSuccessOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-title">Lưu thay đổi thành công</div>
            <div className="modal-message">
              Bạn muốn quay trở về danh sách khóa học hay tiếp tục ở lại trang này?
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSaveSuccessOpen(false);
                  navigate(`/teacher/courses/${courseId}`);
                }}
              >
                Về tổng quan
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSaveSuccessOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TeacherShell>
  );
}