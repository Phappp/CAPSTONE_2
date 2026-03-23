import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import CourseContentTreeEditor from "../components/CourseContentTreeEditor";
import "./TeacherCourseDetailPage.css";

type CourseStatus = "draft" | "published" | "archived";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
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
  });
  const [initialForm, setInitialForm] = useState<null | {
    title: string;
    short_description: string;
    full_description: string;
    level: string;
    language: string;
    thumbnail_url: string;
    status: CourseStatus;
  }>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return (
      form.title !== initialForm.title ||
      form.short_description !== initialForm.short_description ||
      form.full_description !== initialForm.full_description ||
      form.level !== initialForm.level ||
      form.language !== initialForm.language ||
      form.thumbnail_url !== initialForm.thumbnail_url ||
      selectedStatus !== initialForm.status
    );
  }, [form, initialForm, selectedStatus]);

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
    };
    setForm(nextForm);
    const nextStatus = (data.status ?? "draft") as CourseStatus;
    setSelectedStatus(nextStatus);
    setInitialForm({ ...nextForm, status: nextStatus });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const save = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccessOpen(false);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        short_description: form.short_description,
        level: form.level,
        language: form.language,
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
      if (course && selectedStatus !== course.status) {
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
            onClick={() => navigate("/teacher/dashboard")}
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
                    navigate("/teacher/dashboard");
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
                    setSelectedStatus("draft");
                    setOpenStatusMenu(false);
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
                      setSelectedStatus("published");
                      setOpenStatusMenu(false);
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
                    setSelectedStatus("archived");
                    setOpenStatusMenu(false);
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
    </div>
  );
}