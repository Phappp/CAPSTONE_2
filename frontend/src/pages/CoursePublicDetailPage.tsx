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
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  enrollment?: { status: string; progress_percent: number } | null;
  instructors: { id: number; full_name: string; avatar_url: string | null; is_primary: boolean }[];
  modules?: { id: number; title: string; lessons: { id: number; title: string; is_free_preview?: boolean }[] }[];
};

export default function CoursePublicDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const slug = String(params.slug || "");
  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);

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
                <span>Học viên: {course.learners_count ?? 0}</span>
                <span>·</span>
                <span>Chương: {course.modules_count ?? 0}</span>
                <span>·</span>
                <span>Bài học: {course.lessons_count ?? 0}</span>
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

              {course.full_description ? (
                <div className="course-full-description">
                  {course.full_description}
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