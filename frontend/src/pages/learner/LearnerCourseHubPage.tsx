import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { useAuth } from "../../contexts/Auth";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../../components/PrerequisiteGraph";
import { DEFAULT_COURSE_THUMB } from "../../utils/imageFallback";
import "./LearnerCourseHubPage.css";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  instructors?: { id: number; full_name: string; avatar_url: string | null; is_primary?: boolean }[];
  modules?: { id: number; lessons?: { id: number }[] }[];
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

type CourseLeaderboardItem = {
  rank: number;
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  progress_percent: number;
  completed_lessons: number;
  time_spent_seconds: number;
  is_me?: boolean;
};

type CourseLeaderboard = {
  course_id: number;
  total_lessons: number;
  items: CourseLeaderboardItem[];
  top_limit: number;
  includes_me: boolean;
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

export default function LearnerCourseHubPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const slug = String(params.slug || "");
  const { accessToken: token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<CourseLeaderboard | null>(null);
  const [prerequisiteGraph, setPrerequisiteGraph] = useState<PrerequisiteGraphData | null>(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);

  const fetchCourse = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const res = await fetch(`${url}${COURSES_API.learning(courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseDetail> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải thông tin khóa học.");
    setCourse(json as CourseDetail);
  };

  const fetchProgress = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const res = await fetch(`${url}${COURSES_API.progress(courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseProgress> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải tiến độ.");
    setProgress(json as CourseProgress);
  };

  const fetchLeaderboard = async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const res = await fetch(`${url}${COURSES_API.leaderboard(courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseLeaderboard> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải bảng xếp hạng.");
    setLeaderboard(json as CourseLeaderboard);
  };

  const fetchPrerequisiteGraph = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`${url}${COURSES_API.catalogPrerequisiteGraph(slug)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => null)) as PrerequisiteGraphData | null;
      if (!res.ok || !json) return;
      setPrerequisiteGraph(json);
    } catch {
      // ignore optional graph errors
    }
  };

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) {
      navigate("/student/dashboard");
      return;
    }
    setLoading(true);
    setError(null);
    setCourse(null);
    setProgress(null);
    setLeaderboard(null);
    Promise.all([fetchCourse(), fetchProgress(), fetchLeaderboard(), fetchPrerequisiteGraph()])
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const totalLessons = useMemo(() => {
    if (typeof progress?.total_lessons === "number") return progress.total_lessons;
    const mods = course?.modules || [];
    return mods.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  }, [progress, course]);

  const completedLessons = useMemo(() => {
    if (typeof progress?.completed_lessons === "number") return progress.completed_lessons;
    return progress?.completed_lesson_ids?.length || 0;
  }, [progress]);

  const progressPercent =
    typeof progress?.progress_percent === "number"
      ? progress.progress_percent
      : typeof course?.enrollment?.progress_percent === "number"
        ? course.enrollment.progress_percent
        : 0;

  const myRank = leaderboard?.items?.find((x) => x.is_me)?.rank ?? null;

  return (
    <div className="lch-page">
      <div className="lch-topbar">
        <button type="button" className="lch-back" onClick={() => navigate("/student/dashboard")}>
          ← Về Dashboard
        </button>
        {/* <div className="lch-topbarTitle">Tổng quan khóa học</div> */}
        {/* <AvatarMenu /> */}
      </div>

      <div className="lch-container">
        {error ? (
          <div className="lch-error">
            <div className="lch-errorTitle">Không thể mở khóa học</div>
            <div className="lch-errorMsg">{error}</div>
            <button type="button" className="lch-btn lch-btn--primary" onClick={() => navigate("/student/dashboard")}>
              Về Dashboard
            </button>
          </div>
        ) : null}

        {loading && !course ? (
          <div className="lch-loading">
            <div className="lch-loadingSpinner" />
            <span>Đang tải...</span>
          </div>
        ) : null}

        {course ? (
          <div className="lch-hero">
            <div className="lch-thumb">
              <img
                src={course.thumbnail_url || DEFAULT_COURSE_THUMB}
                alt={course.title}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COURSE_THUMB; }}
              />
            </div>

            <div className="lch-heroMain">
              <div className="lch-title">{course.title}</div>
              <div className="lch-meta">
                <span>{levelLabel(course.level)}</span>
                <span className="lch-dot">·</span>
                <span>{languageLabel(course.language)}</span>
                {Array.isArray(course.instructors) && course.instructors.length ? (
                  <>
                    <span className="lch-dot">·</span>
                    <span>Giảng viên: {course.instructors.map((i) => i.full_name).filter(Boolean).join(", ")}</span>
                  </>
                ) : null}
              </div>
              <div className={`lch-desc ${course.short_description ? "" : "lch-desc--empty"}`}>
                {course.short_description || "Chưa có mô tả ngắn."}
              </div>

              <div className="lch-actions">
                <button
                  type="button"
                  className="lch-btn lch-btn--primary"
                  onClick={() => navigate(`/learning/${courseId}/${slug || course.slug}`)}
                  disabled={!courseId}
                >
                  Học tiếp
                </button>
                <button type="button" className="lch-btn lch-btn--secondary" onClick={() => setGraphModalOpen(true)}>
                  Sơ đồ tiên quyết
                </button>
              </div>

              <div className="lch-progressCard">
                <div className="lch-progressRow">
                  <div className="lch-progressLabel">Tiến độ của bạn</div>
                  <div className="lch-progressPct">{progressPercent}%</div>
                </div>
                <div className="lch-progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="lch-progressFill" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
                </div>
                <div className="lch-progressMeta">
                  Hoàn thành: <b>{completedLessons}</b> / <b>{totalLessons}</b> bài
                  {myRank != null ? (
                    <>
                      <span className="lch-dot">·</span> Hạng của bạn: <b>#{myRank}</b>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {course ? (
          <div className="lch-grid">
            <section className="lch-card">
              <div className="lch-cardHeader">
                <div className="lch-cardTitle">Bảng xếp hạng</div>
                <div className="lch-cardHint">Top {leaderboard?.top_limit ?? 100} + bạn (nếu ngoài top)</div>
              </div>
              <div className="lch-leaderboardList">
                {leaderboard?.items?.length ? (
                  leaderboard.items.map((it) => (
                    <div
                      key={it.user_id}
                      className={[
                        "lch-leaderboardItem",
                        it.rank === 1 ? "lch-leaderboardItem--gold" : "",
                        it.rank === 2 ? "lch-leaderboardItem--silver" : "",
                        it.rank === 3 ? "lch-leaderboardItem--bronze" : "",
                        it.is_me ? "lch-leaderboardItem--me" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="lch-leaderboardRank">#{it.rank}</div>
                      {it.avatar_url ? (
                        <img src={it.avatar_url} alt={it.full_name} className="lch-leaderboardAvatar" />
                      ) : (
                        <div className="lch-leaderboardAvatar lch-leaderboardAvatar--placeholder" aria-hidden="true">
                          {String(it.full_name || "U").trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="lch-leaderboardName">{it.full_name}</div>
                      <div className="lch-leaderboardScore">{Number(it.progress_percent || 0)}%</div>
                    </div>
                  ))
                ) : (
                  <div className="lch-empty">Chưa có dữ liệu bảng xếp hạng.</div>
                )}
              </div>
            </section>

            <section className="lch-card">
              <div className="lch-cardHeader">
                <div className="lch-cardTitle">Thông tin</div>
                <div className="lch-cardHint">Một số thông tin cơ bản</div>
              </div>
              <div className="lch-infoList">
                <div className="lch-infoItem">
                  <span>Trạng thái</span>
                  <b>{course.enrollment?.status || "active"}</b>
                </div>
                <div className="lch-infoItem">
                  <span>Slug</span>
                  <b>{course.slug}</b>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {graphModalOpen ? (
          <div className="lch-modalOverlay" role="dialog" aria-modal="true">
            <div className="lch-modal">
              <div className="lch-modalHeader">
                <div className="lch-modalTitle">Sơ đồ tiên quyết</div>
                <button type="button" className="lch-btn lch-btn--secondary" onClick={() => setGraphModalOpen(false)}>
                  Đóng
                </button>
              </div>
              <div className="lch-modalBody">
                <PrerequisiteGraph
                  data={prerequisiteGraph}
                  showCompletionStatus
                  onOpenCourse={(s) => {
                    if (!s) return;
                    window.open(`/courses/${s}`, "_blank");
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

