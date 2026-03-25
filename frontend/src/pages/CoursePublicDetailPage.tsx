import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./CoursePublicDetailPage.css";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learning_objectives?: any;
  prerequisites?: any;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  enrollment?: { status: string; progress_percent: number } | null;
  instructors: { id: number; full_name: string; avatar_url: string | null; is_primary: boolean }[];
  modules?: { id: number; title: string; lessons: { id: number; title: string; is_free_preview?: boolean }[] }[];
};

type PrerequisiteCourseOption = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
};

function levelLabel(level: string) {
  if (level === "beginner") return "Cơ bản";
  if (level === "intermediate") return "Trung cấp";
  if (level === "advanced") return "Nâng cao";
  return level || "—";
}

function languageLabel(lang: string) {
  if (lang === "vi") return "Tiếng Việt";
  if (lang === "en") return "English";
  return lang || "—";
}

function toStringList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {
      // ignore
    }
    return s
      .split(/\r?\n|•|\u2022|-/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

export default function CoursePublicDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const slug = String(params.slug || "");
  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [prerequisiteCatalog, setPrerequisiteCatalog] = useState<PrerequisiteCourseOption[]>([]);
  const [myEnrollmentStatusByCourseId, setMyEnrollmentStatusByCourseId] = useState<Record<number, string>>({});

  const fetchDetail = async () => {
    const res = await fetch(`${url}${COURSES_API.catalogDetail(slug)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseDetail> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải chi tiết khóa học.");
    setCourse(json as CourseDetail);
  };

  const fetchPrerequisiteCatalog = async () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "200");
    params.set("sort_by", "title");
    params.set("sort_dir", "asc");
    const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as { items?: any[] };
    if (!res.ok) return;
    const items = Array.isArray(json.items) ? json.items : [];
    setPrerequisiteCatalog(
      items.map((x) => ({
        id: Number(x.id),
        title: String(x.title || ""),
        slug: String(x.slug || ""),
        thumbnail_url: x?.thumbnail_url ? String(x.thumbnail_url) : null,
      }))
    );
  };

  const fetchMyEnrollmentStatus = async () => {
    if (!token) {
      setMyEnrollmentStatusByCourseId({});
      return;
    }
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "200");
    const res = await fetch(`${url}${COURSES_API.myEnrollments}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as { items?: any[] };
    if (!res.ok) return;
    const items = Array.isArray(json.items) ? json.items : [];
    const next: Record<number, string> = {};
    for (const item of items) {
      const id = Number(item?.course_id);
      if (Number.isInteger(id) && id > 0) {
        next[id] = String(item?.status || "");
      }
    }
    setMyEnrollmentStatusByCourseId(next);
  };

  const prerequisiteItems = useMemo(() => {
    const raw = toStringList(course?.prerequisites);
    if (!raw.length) return [];
    const byId = new Map<number, PrerequisiteCourseOption>();
    for (const c of prerequisiteCatalog) byId.set(c.id, c);
    return raw.map((value) => {
      const id = Number(String(value).trim());
      if (Number.isInteger(id) && id > 0 && byId.has(id)) {
        const c = byId.get(id)!;
        const status = myEnrollmentStatusByCourseId[id] || "";
        return {
          id,
          label: c.title,
          slug: c.slug,
          thumbnail_url: c.thumbnail_url || null,
          isLinkedCourse: true,
          status,
          isCompleted: status === "completed",
        };
      }
      return { id: 0, label: value, slug: "", thumbnail_url: null, isLinkedCourse: false, status: "", isCompleted: false };
    });
  }, [course?.prerequisites, prerequisiteCatalog, myEnrollmentStatusByCourseId]);

  const enroll = async () => {
    if (!course) return;
    const ok = window.confirm("Đăng ký khóa học này?");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.enroll(course.id)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể đăng ký khóa học.");
      await fetchDetail();
      window.alert("Đăng ký thành công. Vào Dashboard học viên để xem khóa học của bạn.");
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) {
      navigate("/courses");
      return;
    }
    setLoading(true);
    setError(null);
    fetchDetail()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    void fetchPrerequisiteCatalog();
    void fetchMyEnrollmentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="course-detail-page">
      <div className="course-detail-container">
        <div className="course-detail-header">
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="back-button"
            disabled={loading}
          >
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>

        {error ? (
          <div className="error-message">
            {error}
          </div>
        ) : null}

        {course ? (
          <div className="course-card">
            {course.thumbnail_url ? (
              <img 
                src={course.thumbnail_url} 
                alt={course.title} 
                className="course-thumbnail" 
              />
            ) : null}
            <div className="course-content">
              <h1 className="course-title">{course.title}</h1>
              <div className="course-short-description">
                {course.short_description || "—"}
              </div>

              <div className="course-stats">
                <span>Cấp độ: {levelLabel(course.level)}</span>
                <span>·</span>
                <span>Ngôn ngữ: {languageLabel(course.language)}</span>
                <span>·</span>
                <span>Học viên: {course.learners_count ?? 0}</span>
                <span>·</span>
                <span>Chương: {course.modules_count ?? 0}</span>
                <span>·</span>
                <span>Bài học: {course.lessons_count ?? 0}</span>
                {course.total_duration_minutes != null ? (
                  <>
                    <span>·</span>
                    <span>Tổng thời lượng: {course.total_duration_minutes} phút</span>
                  </>
                ) : null}
              </div>

              <div className="course-actions">
                <button
                  type="button"
                  onClick={enroll}
                  disabled={loading || !!course.is_enrolled}
                  className={`enroll-button ${course.is_enrolled ? "enrolled" : ""}`}
                >
                  {course.is_enrolled ? "Đã đăng ký" : "Đăng ký"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/student/dashboard")}
                  disabled={loading}
                  className="dashboard-button"
                >
                  Về Dashboard
                </button>
              </div>

              {Array.isArray(course.instructors) && course.instructors.length ? (
                <div className="course-full-description">
                  <h3 style={{ margin: "16px 0 8px 0" }}>Giảng viên</h3>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {course.instructors.map((ins) => (
                      <div key={ins.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 10px" }}>
                        {ins.avatar_url ? (
                          <img src={ins.avatar_url} alt={ins.full_name} style={{ width: 34, height: 34, borderRadius: 999, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: 999, background: "#e5e7eb" }} />
                        )}
                        <div style={{ fontWeight: 900 }}>
                          {ins.full_name}
                          {ins.is_primary ? <span style={{ marginLeft: 8, fontWeight: 800, color: "#2563eb" }}>(Chính)</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {toStringList(course.learning_objectives).length ? (
                <div className="course-full-description">
                  <h3 style={{ margin: "16px 0 8px 0" }}>Bạn sẽ học được</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {toStringList(course.learning_objectives).map((x, idx) => (
                      <li key={idx} style={{ marginBottom: 6 }}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {prerequisiteItems.length ? (
                <div className="course-full-description">
                  <h3 style={{ margin: "16px 0 8px 0" }}>Yêu cầu trước khi học</h3>
                  <div className="prerequisite-grid">
                    {prerequisiteItems.map((x, idx) => (
                      <div key={`${x.label}-${idx}`} className="prerequisite-card">
                        {x.thumbnail_url ? (
                          <img src={x.thumbnail_url} alt={x.label} className="prerequisite-card__thumb" />
                        ) : (
                          <div className="prerequisite-card__thumb prerequisite-card__thumb--empty">No image</div>
                        )}
                        <div className="prerequisite-card__content">
                          {x.isLinkedCourse ? (
                            <button type="button" onClick={() => navigate(`/courses/${x.slug}`)} className="prerequisite-card__titleBtn">
                              {x.label}
                            </button>
                          ) : (
                            <div className="prerequisite-card__title">{x.label}</div>
                          )}
                          {x.isLinkedCourse ? (
                            <div className={`prerequisite-card__status ${x.isCompleted ? "done" : "pending"}`}>
                              {x.isCompleted ? "✓ Đã hoàn thành" : "✗ Chưa hoàn thành"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.full_description ? (
                <div className="course-full-description">
                  <h3 style={{ margin: "16px 0 8px 0" }}>Mô tả chi tiết</h3>
                  {course.full_description}
                </div>
              ) : null}

              {Array.isArray(course.modules) && course.modules.length ? (
                <div className="course-full-description">
                  <h3 style={{ margin: "16px 0 8px 0" }}>Nội dung khóa học</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {course.modules.map((m, midx) => (
                      <div key={m.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>
                          Chương {midx + 1}: {m.title}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(m.lessons || []).map((l, lidx) => (
                            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#fafafa" }}>
                              <div style={{ fontWeight: 800 }}>
                                Bài {lidx + 1}: {l.title}
                              </div>
                              {l.is_free_preview ? (
                                <span className="badge badge--blue">Preview</span>
                              ) : (
                                <span style={{ color: "#6b7280", fontWeight: 700 }}>—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            {loading ? "Đang tải..." : "Không có dữ liệu."}
          </div>
        )}
      </div>
    </div>
  );
}