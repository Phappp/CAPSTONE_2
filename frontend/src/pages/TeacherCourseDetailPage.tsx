import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import CourseContentTreeEditor from "../components/CourseContentTreeEditor";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../components/PrerequisiteGraph";
import "./TeacherCourseDetailPage.css";

type CourseStatus = "draft" | "published" | "archived";

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

type CourseOption = {
  id: number;
  title: string;
  slug: string;
  selectable?: boolean;
  reason?: string | null;
};

export default function TeacherCourseDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);

  const token = useMemo(() => getAccessToken(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CourseStatus>("draft");
  const [form, setForm] = useState({
    title: "",
    short_description: "",
    full_description: "",
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
    level: string;
    language: string;
    thumbnail_url: string;
    learning_objectives: string[];
    prerequisites: string[];
    publish_scheduled_at: string;
    status: CourseStatus;
  }>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rules, setRules] = useState<CompletionRules | null>(null);
  const [rulesDraft, setRulesDraft] = useState<{ video_min_seconds: string; video_min_percent: string; text_min_seconds: string }>({
    video_min_seconds: "60",
    video_min_percent: "0.7",
    text_min_seconds: "30",
  });

  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerError, setLearnerError] = useState<string | null>(null);
  const [learnerQ, setLearnerQ] = useState("");
  const [learnerPage, setLearnerPage] = useState(1);
  const [learnerPageSize] = useState(20);
  const [learnerResult, setLearnerResult] = useState<LearnerProgressResult | null>(null);
  const [prerequisiteOptions, setPrerequisiteOptions] = useState<CourseOption[]>([]);
  const [legacyPrerequisites, setLegacyPrerequisites] = useState<string[]>([]);
  const [prerequisiteGraph, setPrerequisiteGraph] = useState<PrerequisiteGraphData | null>(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return (
      form.title !== initialForm.title ||
      form.short_description !== initialForm.short_description ||
      form.full_description !== initialForm.full_description ||
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
        // ignore and try splitting plain text
      }
      const arr = s
        .split(/\r?\n|•|\u2022|-/g)
        .map((x) => x.trim())
        .filter(Boolean);
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

  const fetchDetail = async () => {
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
  };

  const fetchCompletionRules = async () => {
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
  };

  const fetchPrerequisiteOptions = async () => {
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
      // ignore optional UI fetch errors
    }
  };

  const fetchPrerequisiteGraph = async () => {
    try {
      const res = await fetch(`${url}${COURSES_API.prerequisiteGraph(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => null)) as PrerequisiteGraphData | null;
      if (!res.ok || !json) return;
      setPrerequisiteGraph(json);
    } catch {
      // ignore graph errors
    }
  };

  useEffect(() => {
    if (!prerequisiteOptions.length) return;
    const raw = (form.prerequisites || []).map((x) => String(x).trim()).filter(Boolean);
    const { ids, leftovers } = reconcilePrerequisitesToIds(raw, prerequisiteOptions);
    const next = ids.map(String);
    setLegacyPrerequisites(leftovers);
    if (JSON.stringify(next) === JSON.stringify(raw)) return;
    setForm((p) => ({ ...p, prerequisites: next }));
    if (initialForm) setInitialForm((p) => (p ? { ...p, prerequisites: next } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prerequisiteOptions]);

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

  const fetchLearnerProgress = async (opts?: { page?: number; q?: string }) => {
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
      const data = (await res.json().catch(() => ({}))) as Partial<LearnerProgressResult> & { message?: string };
      if (!res.ok) throw new Error(data?.message || "Không thể tải tiến độ học viên.");
      setLearnerResult(data as LearnerProgressResult);
    } catch (e: any) {
      setLearnerError(e?.message || "Không thể tải tiến độ học viên.");
      setLearnerResult(null);
    } finally {
      setLearnerLoading(false);
    }
  };

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
    void fetchPrerequisiteGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchLearnerProgress({ page: learnerPage, q: learnerQ });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerPage, learnerQ, courseId]);

  const save = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccessOpen(false);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        short_description: form.short_description,
        full_description: form.full_description,
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

      // Nếu có thay đổi trạng thái thì chỉ cập nhật khi bấm "Lưu thay đổi"
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
      await fetchPrerequisiteGraph();
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
      await fetchPrerequisiteGraph();
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
      case "published":
        return "course-status-published";
      case "draft":
        return "course-status-draft";
      case "archived":
        return "course-status-archived";
      default:
        return "";
    }
  };

  return (
    <div className="dashboard-page">
      <div className="course-detail-header">
        <div className="course-detail-header-left">
          <button
            type="button"
            className="secondary-button back-button"
            onClick={() => navigate("/teacher/dashboard?section=course")}
          >
            ← Quay lại
          </button>
          <div className="course-detail-info">
            <div className="course-detail-title">
              {course ? course.title : "Chi tiết khóa học"}
            </div>
            <div className="course-detail-slug">
              {course ? (
                <span className="course-detail-slug-text">{course.slug}</span>
              ) : (
                "Đang tải..."
              )}
            </div>
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card course-detail-main-card">
        {saveSuccessOpen && (
          <div className="save-success-modal-overlay" role="dialog" aria-modal="true">
            <div className="save-success-modal">
              <div className="save-success-modal-title">Lưu thay đổi thành công</div>
              <div className="save-success-modal-message">
                Bạn muốn quay trở về danh sách khóa học hay tiếp tục ở lại trang này?
              </div>
              <div className="save-success-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSaveSuccessOpen(false);
                    navigate("/teacher/dashboard?section=course");
                  }}
                >
                  Quay trở về
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setSaveSuccessOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div>
            {course ? (
              <span className={`course-status-badge ${getStatusClassName(course.status)}`}>
                {course.status === "published"
                  ? "Đã xuất bản"
                  : course.status === "draft"
                    ? "Bản nháp"
                    : "Đã lưu trữ"}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setGraphModalOpen(true)}
              disabled={loading}
            >
              Xem sơ đồ tiên quyết
            </button>
          <div className="course-actions-menu">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setOpenStatusMenu((v) => !v)}
              disabled={loading}
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {openStatusMenu ? (
              <div className="course-actions-dropdown">
                <button
                  type="button"
                  className={`course-action-item ${selectedStatus === "draft" ? "active" : ""}`}
                  onClick={() => {
                    setOpenStatusMenu(false);
                    void setStatusNow("draft");
                  }}
                  disabled={loading}
                >
                  Đặt thành bản nháp
                </button>
                {course?.status !== "archived" ? (
                  <button
                    type="button"
                    className={`course-action-item ${selectedStatus === "published" ? "active" : ""}`}
                    onClick={() => {
                      setOpenStatusMenu(false);
                      void setStatusNow("published");
                    }}
                    disabled={loading}
                  >
                    Đặt thành đã xuất bản
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`course-action-item ${selectedStatus === "archived" ? "active" : ""}`}
                  onClick={() => {
                    setOpenStatusMenu(false);
                    void setStatusNow("archived");
                  }}
                  disabled={loading}
                >
                  {course?.status === "archived" ? "Đang lưu trữ" : "Đặt thành lưu trữ"}
                </button>
                <div className="course-action-divider" />
                <button
                  type="button"
                  className="course-action-item course-action-danger"
                  onClick={() => {
                    setOpenStatusMenu(false);
                    del();
                  }}
                  disabled={loading}
                >
                  Xóa khóa học
                </button>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        {error && <div className="error-box" style={{ marginTop: "0.75rem" }}>{error}</div>}

        <div className="course-detail-two-column">
          <div>
            <div className="form-group">
              <label className="form-label">Tên khóa học</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả ngắn</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.short_description}
                onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả đầy đủ</label>
              <textarea
                className="form-input"
                rows={8}
                value={form.full_description}
                onChange={(e) => setForm((p) => ({ ...p, full_description: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Xuất bản tự động lúc (tùy chọn)</label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.publish_scheduled_at || ""}
                onChange={(e) => setForm((p) => ({ ...p, publish_scheduled_at: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mục tiêu học tập</label>
              {form.learning_objectives.map((item, idx) => (
                <div key={`obj-${idx}`} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setForm((p) => {
                        const copy = [...p.learning_objectives];
                        copy.splice(idx, 1);
                        return { ...p, learning_objectives: copy.length ? copy : [""] };
                      })
                    }
                    disabled={loading}
                  >
                    Xóa
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    learning_objectives: [...p.learning_objectives, ""],
                  }))
                }
                disabled={loading}
              >
                + Thêm mục tiêu
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Yêu cầu tiên quyết</label>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
                Học viên phải hoàn tất các khóa bên dưới trước khi đăng ký khóa này.
              </div>
              <div style={{ display: "grid", gap: "0.5rem", maxHeight: 220, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                {prerequisiteOptions.length ? (
                  prerequisiteOptions.map((c) => {
                    const checked = selectedPrerequisiteIds.has(c.id);
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          border: checked ? "1px solid #86efac" : "1px solid #e5e7eb",
                          background: checked ? "#f0fdf4" : "#fff",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={loading || (!checked && c.selectable === false)}
                          onChange={(e) => {
                            setForm((p) => {
                              const set = new Set(
                                (p.prerequisites || [])
                                  .map((x) => Number(String(x).trim()))
                                  .filter((n) => Number.isInteger(n) && n > 0)
                              );
                              if (e.target.checked) set.add(c.id);
                              else set.delete(c.id);
                              return { ...p, prerequisites: Array.from(set).map(String) };
                            });
                          }}
                        />
                        <span style={{ fontWeight: 700 }}>{c.title}</span>
                        </span>
                        {checked ? (
                          <span style={{ color: "#15803d", fontWeight: 800, fontSize: 12 }}>✓ Đã chọn</span>
                        ) : c.selectable === false ? (
                          <span style={{ color: "#b91c1c", fontWeight: 800, fontSize: 12 }} title={c.reason || ""}>Không khả dụng</span>
                        ) : null}
                      </label>
                    );
                  })
                ) : (
                  <div style={{ color: "#6b7280" }}>Chưa có khóa học để chọn.</div>
                )}
              </div>
              {legacyPrerequisites.length ? (
                <div style={{ marginTop: 8, color: "#92400e", fontSize: 12 }}>
                  Không map được một số điều kiện cũ: {legacyPrerequisites.join(", ")}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Cấp độ</label>
              <select
                className="form-input"
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                disabled={loading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ngôn ngữ</label>
              <select
                className="form-input"
                value={form.language}
                onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                disabled={loading}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ảnh khóa học</label>
              <div className="course-thumbnail-container">
                <div className="course-thumbnail-preview">
                  {form.thumbnail_url ? (
                    <img
                      src={form.thumbnail_url}
                      alt="Course thumbnail"
                      className="course-thumbnail-img"
                    />
                  ) : (
                    <span className="course-thumbnail-placeholder">Chưa có ảnh</span>
                  )}
                </div>
                <div className="course-thumbnail-input-group">
                  <input
                    className="form-input"
                    placeholder="Đường dẫn ảnh (tùy chọn)"
                    value={form.thumbnail_url}
                    onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
                    disabled={loading}
                  />
                  <div className="course-thumbnail-actions">
                    <label className="secondary-button" style={{ cursor: "pointer" }}>
                      Chọn ảnh từ máy
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.currentTarget.value = "";
                          if (!f) return;
                          try {
                            const formData = new FormData();
                            formData.append("file", f);
                            const res = await fetch(`${url}${COURSES_API.uploadCourseThumbnail()}`, {
                              method: "POST",
                              headers: {
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: formData,
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data?.message || "Upload ảnh thất bại.");
                            const imageUrl = data?.url as string | undefined;
                            if (imageUrl) {
                              const thumbUrl =
                                imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
                                  ? imageUrl
                                  : `${url}${imageUrl}`;
                              setForm((p) => ({ ...p, thumbnail_url: thumbUrl }));
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        disabled={loading}
                      />
                    </label>
                    <span className="course-thumbnail-hint">
                      Ảnh tỉ lệ 16:9 sẽ hiển thị đẹp nhất.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <div className="course-stats">
            {course ? (
              <>
                Học viên: <b>{course.learners_count}</b> · Chương: <b>{course.modules_count}</b> ·
                Bài học: <b>{course.lessons_count}</b>
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="primary-button"
              style={{ minWidth: "140px" }}
              onClick={save}
              disabled={loading || !isDirty}
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <div className="wizard-card content-editor-card">
        <div className="content-editor-header">
          <div className="content-editor-title">Nội dung khóa học</div>
        </div>
        <CourseContentTreeEditor courseId={courseId} embedded />
      </div>

      {graphModalOpen ? (
        <div className="save-success-modal-overlay" role="dialog" aria-modal="true">
          <div className="save-success-modal" style={{ width: "min(1200px, 96vw)" }}>
            <div className="save-success-modal-title">Sơ đồ tiên quyết</div>
            <div style={{ maxHeight: "70vh", overflow: "auto", marginTop: 8 }}>
              <PrerequisiteGraph
                data={prerequisiteGraph}
                showCompletionStatus={false}
                onOpenCourse={(s) => {
                  if (!s) return;
                  window.open(`/courses/${s}`, "_blank");
                }}
              />
            </div>
            <div className="save-success-modal-actions">
              <button type="button" className="primary-button" onClick={() => setGraphModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="wizard-card content-editor-card">
        <div className="content-editor-header">
          <div className="content-editor-title">Quy tắc hoàn thành (Time-based)</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="secondary-button" onClick={fetchCompletionRules} disabled={rulesLoading}>
              Tải lại
            </button>
            <button type="button" className="primary-button" onClick={saveCompletionRules} disabled={rulesLoading}>
              Lưu quy tắc
            </button>
          </div>
        </div>

        {rulesError ? <div className="error-box" style={{ marginTop: "0.75rem" }}>{rulesError}</div> : null}

        <div className="course-detail-two-column" style={{ marginTop: "0.75rem" }}>
          <div>
            <div className="form-group">
              <label className="form-label">Video: tối thiểu (giây)</label>
              <input
                className="form-input"
                inputMode="numeric"
                value={rulesDraft.video_min_seconds}
                onChange={(e) => setRulesDraft((p) => ({ ...p, video_min_seconds: e.target.value }))}
                disabled={rulesLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Video: tối thiểu (% thời lượng, 0..1)</label>
              <input
                className="form-input"
                inputMode="decimal"
                value={rulesDraft.video_min_percent}
                onChange={(e) => setRulesDraft((p) => ({ ...p, video_min_percent: e.target.value }))}
                disabled={rulesLoading}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Text: tối thiểu (giây)</label>
              <input
                className="form-input"
                inputMode="numeric"
                value={rulesDraft.text_min_seconds}
                onChange={(e) => setRulesDraft((p) => ({ ...p, text_min_seconds: e.target.value }))}
                disabled={rulesLoading}
              />
            </div>
            <div className="course-stats">
              Đang áp dụng:{" "}
              {rules ? (
                <>
                  Video ≥ <b>{rules.video_min_seconds}s</b> hoặc ≥ <b>{rules.video_min_percent}</b> · Text ≥ <b>{rules.text_min_seconds}s</b>
                </>
              ) : (
                <span>--</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-card content-editor-card">
        <div className="content-editor-header">
          <div className="content-editor-title">Tiến độ học viên</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
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
            <button type="button" className="secondary-button" onClick={() => fetchLearnerProgress()} disabled={learnerLoading}>
              Tải lại
            </button>
          </div>
        </div>

        {learnerError ? <div className="error-box" style={{ marginTop: "0.75rem" }}>{learnerError}</div> : null}

        <div className="teacherLearnersTableWrap" style={{ marginTop: "0.75rem" }}>
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
                  <td colSpan={7} style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>Đang tải...</td>
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
                    <td style={{ color: "#6b7280", fontSize: 13 }}>{it.last_accessed_at ? new Date(it.last_accessed_at).toLocaleString("vi-VN") : "--"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>Chưa có dữ liệu.</td>
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
    </div>
  );
}