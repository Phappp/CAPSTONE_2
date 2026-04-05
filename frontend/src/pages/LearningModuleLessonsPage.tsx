import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import LearnerCourseContentTree, { type ModuleItem } from "../components/LearnerCourseContentTree";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./LearningModuleLessonsPage.css";

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

function formatTimeVi(date: Date): string {
  try {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function LearningModuleLessonsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const slug = String(params.slug || "");
  const moduleId = Number(params.moduleId);

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
      setCourse(json as CourseDetail);
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
      setProgress(null);
    }
  };

  useEffect(() => {
    void fetchLearning();
    void fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const selectedModule = useMemo(() => {
    if (!course || !Number.isFinite(moduleId)) return null;
    return course.modules?.find((m) => m.id === moduleId) || null;
  }, [course, moduleId]);

  const completedSet = useMemo(() => new Set<number>((progress?.completed_lesson_ids || []).map((x) => Number(x))), [progress]);
  const unlockedSet = useMemo(() => new Set<number>((progress?.unlocked_lesson_ids || []).map((x) => Number(x))), [progress]);

  const progressPercent =
    typeof progress?.progress_percent === "number"
      ? progress.progress_percent
      : typeof course?.enrollment?.progress_percent === "number"
        ? course.enrollment.progress_percent
        : 0;

  const moduleNotOpenedYet = useMemo(() => {
    if (!selectedModule?.open_at) return false;
    const dt = new Date(selectedModule.open_at);
    if (!Number.isFinite(dt.getTime())) return false;
    return dt.getTime() > Date.now();
  }, [selectedModule?.open_at]);

  const moduleUnlocked = useMemo(() => {
    if (!selectedModule) return false;
    const lessonIds = (selectedModule.lessons || []).map((l) => l.id);
    if (!lessonIds.length) return false;
    if (!progress) return lessonIds[0] != null; // fallback
    return lessonIds.some((id) => unlockedSet.has(id));
  }, [selectedModule, progress, unlockedSet]);

  const allCompleted = useMemo(() => {
    if (!selectedModule) return false;
    const lessonIds = (selectedModule.lessons || []).map((l) => l.id);
    if (!lessonIds.length) return false;
    return lessonIds.every((id) => completedSet.has(id));
  }, [selectedModule, completedSet]);

  if (loading && !course) {
    return (
      <div className="learningModuleLessonsPage">
        <div className="learningModuleLessonsPage__topbar">
          <button className="learningModuleLessonsPage__back" onClick={() => navigate(`/learning/${courseId}/${slug}`)} type="button" disabled>
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>
        <div className="learningModuleLessonsPage__loading">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learningModuleLessonsPage">
        <div className="learningModuleLessonsPage__topbar">
          <button className="learningModuleLessonsPage__back" onClick={() => navigate(`/learning/${courseId}/${slug}`)} type="button" disabled={loading}>
            ← Quay lại
          </button>
          <AvatarMenu />
        </div>
        <div className="learningModuleLessonsPage__errorBox">
          <div className="learningModuleLessonsPage__errorTitle">Không thể mở trang bài học</div>
          <div className="learningModuleLessonsPage__errorMsg">{error}</div>
          <button type="button" className="btn btn--primary" onClick={() => navigate(`/learning/${courseId}/${slug}`)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!course || !selectedModule) {
    return null;
  }

  return (
    <div className="learningModuleLessonsPage">
      <div className="learningModuleLessonsPage__topbar">
        <button className="learningModuleLessonsPage__back" onClick={() => navigate(`/learning/${courseId}/${slug}`)} type="button">
          ← Quay lại
        </button>
        <div className="learningModuleLessonsPage__center">
          <div className="learningModuleLessonsPage__title">{course.title}</div>
          <div className="learningModuleLessonsPage__meta">
            Tiến độ: <b>{progressPercent}%</b> <span className="learningModuleLessonsPage__sep">·</span> {`Chương ${course.modules.findIndex((m) => m.id === selectedModule.id) + 1}`}
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="learningModuleLessonsPage__body">
        <div className="learningModuleLessonsPage__moduleHeader">
          <div className="learningModuleLessonsPage__moduleTitle">{selectedModule.title}</div>
          <div className="learningModuleLessonsPage__modulePillWrap">
            {allCompleted ? (
              <span className="learningModuleLessonsPage__pill learningModuleLessonsPage__pill--completed">Hoàn thành</span>
            ) : moduleNotOpenedYet && selectedModule.open_at ? (
              <span className="learningModuleLessonsPage__pill learningModuleLessonsPage__pill--locked">
                Bị khóa (mở {formatTimeVi(new Date(selectedModule.open_at))})
              </span>
            ) : !moduleUnlocked ? (
              <span className="learningModuleLessonsPage__pill learningModuleLessonsPage__pill--locked">Bị khóa</span>
            ) : (
              <span className="learningModuleLessonsPage__pill learningModuleLessonsPage__pill--unlocked">Đã mở</span>
            )}
          </div>
        </div>

        {!moduleUnlocked ? (
          <div className="learningModuleLessonsPage__empty">
            Chương này đang bị khóa. Vui lòng hoàn thành chương trước để mở.
          </div>
        ) : (
          <LearnerCourseContentTree
            courseId={courseId}
            modules={[selectedModule]}
            courseThumbnailUrl={course.thumbnail_url}
            progress={progress}
            refreshProgress={fetchProgress}
            variant="module-lessons"
          />
        )}
      </div>
    </div>
  );
}

