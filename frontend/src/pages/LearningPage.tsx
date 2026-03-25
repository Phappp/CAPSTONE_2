import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import LearnerCourseContentTree from "../components/LearnerCourseContentTree";
import type { ModuleItem } from "../components/LearnerCourseContentTree";
import "./LearningPage.css";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  modules: ModuleItem[];
  enrollment?: {
    status: string;
    enrolled_at: string;
    completed_at: string | null;
    progress_percent: number;
  };
};

export default function LearningPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const slug = String(params.slug || "");

  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDetail | null>(null);

  const fetchLearning = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    setCourse(null);
    try {
      const res = await fetch(`${url}${COURSES_API.learning(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<CourseDetail> & { message?: string };
      if (!res.ok) throw new Error(json?.message || "Không thể tải khóa học để học.");

      const nextCourse = json as CourseDetail;
      setCourse(nextCourse);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLearning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading && !course) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(-1)} type="button" disabled>
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>
        <div className="learningPage__loading">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(-1)} type="button" disabled={loading}>
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>
        <div className="learningPage__errorBox">
          <div className="learningPage__errorTitle">Không thể mở trang học</div>
          <div className="learningPage__errorMsg">{error}</div>
          <button className="btn btn--primary" onClick={() => navigate("/student/dashboard")} type="button">
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const progress = typeof course.enrollment?.progress_percent === "number" ? course.enrollment.progress_percent : 0;

  return (
    <div className="learningPage">
      <div className="learningPage__topbar">
        <button className="learningPage__back" onClick={() => navigate("/student/dashboard")} type="button">
          ← Dashboard
        </button>
        <div className="learningPage__topbarCenter">
          <div className="learningPage__title">{course.title}</div>
          <div className="learningPage__meta">
            Tiến độ: <b>{progress}%</b>
            {slug ? <span className="learningPage__metaSep">·</span> : null}
            {slug ? <span>{slug}</span> : null}
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="learningPage__body">
        <main className="learningPage__main">
          <LearnerCourseContentTree courseId={courseId} modules={course.modules || []} />
        </main>
      </div>
    </div>
  );
}

