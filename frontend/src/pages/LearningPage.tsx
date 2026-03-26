import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
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

type CourseProgress = {
  course_id: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  completed_lesson_ids: number[];
  unlocked_lesson_ids: number[];
  next_locked_lesson_id: number | null;
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
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  const fetchLearning = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    setCourse(null);
    setProgress(null);
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

  const fetchProgress = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    try {
      const res = await fetch(`${url}${COURSES_API.progress(courseId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<CourseProgress> & { message?: string };
      if (!res.ok) throw new Error(json?.message || "Không thể tải tiến độ.");
      setProgress(json as CourseProgress);
    } catch {
      // Keep UI usable even if progress endpoint fails.
      setProgress(null);
    }
  };

  useEffect(() => {
    void fetchLearning();
    void fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading && !course) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button
            className="learningPage__back"
            onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)}
            type="button"
            disabled
          >
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
          <button
            className="learningPage__back"
            onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)}
            type="button"
            disabled={loading}
          >
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>
        <div className="learningPage__errorBox">
          <div className="learningPage__errorTitle">Không thể mở trang học</div>
          <div className="learningPage__errorMsg">{error}</div>
          <button className="btn btn--primary" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const completedSet = new Set<number>((progress?.completed_lesson_ids || []).map((x) => Number(x)));
  const unlockedSet = new Set<number>((progress?.unlocked_lesson_ids || []).map((x) => Number(x)));

  const progressPercent =
    typeof progress?.progress_percent === "number"
      ? progress.progress_percent
      : typeof course.enrollment?.progress_percent === "number"
        ? course.enrollment.progress_percent
        : 0;

  function formatTimeVi(date: Date): string {
    try {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  const modules = course.modules || [];

  return (
    <div className="learningPage">
      <div className="learningPage__topbar">
        <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">
          ← Quay lại
        </button>
        <div className="learningPage__topbarCenter">
          <div className="learningPage__title">{course.title}</div>
          <div className="learningPage__meta">
            Tiến độ: <b>{progressPercent}%</b>
            {slug ? <span className="learningPage__metaSep">·</span> : null}
            
          </div>
          <div className="learningPage__progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <div className="learningPage__progressFill" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="learningPage__body">
        <main className="learningPage__main">
          <div className="learningPage__moduleSteps">
            {modules.length ? (
              modules.map((m: ModuleItem, idx) => {
                const lessonIds = (m.lessons || []).map((l) => l.id);
                const allCompleted = lessonIds.length ? lessonIds.every((id) => completedSet.has(id)) : false;

                const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
                const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();

                const unlockedFallback = progress ? false : idx === 0;
                const anyUnlocked = lessonIds.some((id) => unlockedSet.has(id));
                const moduleUnlocked = progress ? anyUnlocked : unlockedFallback;

                const canClick = moduleUnlocked && !moduleNotOpenedYet;

                const pill =
                  moduleNotOpenedYet && moduleOpenAt
                    ? `Bị khóa (mở ${formatTimeVi(moduleOpenAt)})`
                    : allCompleted
                      ? "Hoàn thành"
                      : moduleUnlocked
                        ? "Đã mở"
                        : "Bị khóa";

                return (
                  <div key={m.id} className="learningPage__moduleStepWrap">
                    <button
                      type="button"
                      className={[
                        "learningPage__moduleCard",
                        allCompleted ? "learningPage__moduleCard--completed" : "",
                        moduleUnlocked && !allCompleted ? "learningPage__moduleCard--unlocked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (!canClick) return;
                        navigate(`/learning/${courseId}/${slug}/modules/${m.id}`);
                      }}
                      disabled={!canClick}
                    >
                      <div className="learningPage__moduleCardLeft">
                        <div className="learningPage__moduleIndex">Chương {idx + 1}</div>
                        <div className="learningPage__moduleTitle">{m.title}</div>
                      </div>
                      <div className="learningPage__moduleCardRight" aria-hidden="true">
                        <span
                          className={[
                            "learningPage__modulePill",
                            allCompleted
                              ? "learningPage__modulePill--completed"
                              : moduleNotOpenedYet
                                ? "learningPage__modulePill--locked"
                                : moduleUnlocked
                                  ? "learningPage__modulePill--unlocked"
                                  : "learningPage__modulePill--locked",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {pill}
                        </span>
                      </div>
                    </button>

                    {idx < modules.length - 1 ? <div className="learningPage__moduleArrow">↓</div> : null}
                  </div>
                );
              })
            ) : (
              <div className="learningPage__empty">Chưa có chương nào.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

