import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import CourseContentTreeEditor from "../components/CourseContentTreeEditor";

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
      const res = await fetch(`${url}${COURSES_API.update(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title,
          short_description: form.short_description,
          level: form.level,
          language: form.language,
          thumbnail_url: form.thumbnail_url || null,
        }),
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

  return (
    <div className="dashboard-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
          <button
            type="button"
            className="secondary-button"
            style={{ width: "auto" }}
            onClick={() => navigate("/teacher/dashboard")}
          >
            ← Quay lại
          </button>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {course ? course.title : "Chi tiết khóa học"}
            </div>
            <div style={{ marginTop: "0.3rem", fontSize: "0.95rem", color: "#6b7280" }}>
              {course ? (
                <>
                  <span style={{ fontFamily: "monospace" }}>{course.slug}</span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: "0.8rem",
                      padding: "0.15rem 0.6rem",
                      borderRadius: "999px",
                      background:
                        course.status === "published"
                          ? "#dcfce7"
                          : course.status === "draft"
                          ? "#fef3c7"
                          : "#e5e7eb",
                      color:
                        course.status === "published"
                          ? "#166534"
                          : course.status === "draft"
                          ? "#92400e"
                          : "#374151",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {course.status === "published"
                      ? "ĐÃ XUẤT BẢN"
                      : course.status === "draft"
                      ? "BẢN NHÁP"
                      : "ĐÃ LƯU TRỮ"}
                  </span>
                </>
              ) : (
                "Đang tải..."
              )}
            </div>
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card" style={{ padding: "1rem" }}>
        {saveSuccessOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              zIndex: 50,
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                width: "min(520px, 100%)",
                background: "white",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: "1rem",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>
                Lưu thay đổi thành công
              </div>
              <div style={{ color: "#6b7280", marginTop: "0.35rem", fontSize: "0.92rem" }}>
                Bạn muốn quay trở về danh sách khóa học hay tiếp tục ở lại trang này?
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  style={{ width: "auto" }}
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
                  style={{ width: "auto", minWidth: 88 }}
                  onClick={() => setSaveSuccessOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={
                selectedStatus === "draft" ? "primary-button" : "secondary-button"
              }
              style={{ width: "auto" }}
              onClick={() => setSelectedStatus("draft")}
              disabled={loading}
            >
              Bản nháp
            </button>
            {/* Nếu khóa học đang lưu trữ thì ẩn option "Xuất bản" (cần bỏ lưu trữ trước) */}
            {course?.status !== "archived" ? (
              <button
                type="button"
                className={
                  selectedStatus === "published"
                    ? "primary-button"
                    : "secondary-button"
                }
                style={{ width: "auto" }}
                onClick={() => setSelectedStatus("published")}
                disabled={loading}
              >
                Xuất bản
              </button>
            ) : null}
            <button
              type="button"
              className={
                selectedStatus === "archived" ? "primary-button" : "secondary-button"
              }
              style={{ width: "auto" }}
              onClick={() => setSelectedStatus("archived")}
              disabled={loading}
            >
              {course?.status === "archived" ? "Đang lưu trữ" : "Lưu trữ"}
            </button>
            <button
              type="button"
              className="link-button"
              style={{ color: "#b91c1c" }}
              onClick={del}
              disabled={loading}
            >
              Xóa
            </button>
          </div>
        </div>

        {error && <div className="error-box" style={{ marginTop: "0.75rem" }}>{error}</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
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
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 120,
                    height: 68,
                    borderRadius: 12,
                    background: "#f3f4f6",
                    border: "1px dashed #d1d5db",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {form.thumbnail_url ? (
                    <img
                      src={form.thumbnail_url}
                      alt="Course thumbnail"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Chưa có ảnh</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "grid", gap: "0.35rem" }}>
                  <input
                    className="form-input"
                    placeholder="Đường dẫn ảnh (tùy chọn)"
                    value={form.thumbnail_url}
                    onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
                    disabled={loading}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <label className="secondary-button" style={{ width: "auto", cursor: "pointer" }}>
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
                              setForm((p) => ({ ...p, thumbnail_url: `${url}${imageUrl}` }));
                            }
                          } catch (err) {
                            // Giữ nguyên form, chỉ log nhẹ qua console
                            // eslint-disable-next-line no-console
                            console.error(err);
                          }
                        }}
                        disabled={loading}
                      />
                    </label>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Ảnh tỉ lệ 16:9 sẽ hiển thị đẹp nhất.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
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
              style={{ width: "auto", minWidth: "140px" }}
              onClick={save}
              disabled={loading || !isDirty}
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <div className="wizard-card" style={{ padding: "1rem", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Nội dung khóa học</div>
          </div>
        </div>
        <CourseContentTreeEditor courseId={courseId} embedded />
      </div>
    </div>
  );
}

