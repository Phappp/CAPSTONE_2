import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../components/PrerequisiteGraph";
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
  const token = useMemo(() => getAccessToken(), []);

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
    <div className="learnerHub">
      <div className="learnerHub__topbar">
        <button type="button" className="learnerHub__back" onClick={() => navigate("/student/dashboard")}>
          ← Dashboard
        </button>
        <div className="learnerHub__topbarTitle">Tổng quan khóa học</div>
        <AvatarMenu />
      </div>

      <div className="learnerHub__container">
        {error ? (
          <div className="learnerHub__error">
            <div className="learnerHub__errorTitle">Không thể mở khóa học</div>
            <div className="learnerHub__errorMsg">{error}</div>
            <button type="button" className="btn btn--primary" onClick={() => navigate("/student/dashboard")}>
              Về Dashboard
            </button>
          </div>
        ) : null}

        {loading && !course ? <div className="learnerHub__loading">Đang tải...</div> : null}

        {course ? (
          <div className="learnerHub__hero">
            <div className="learnerHub__thumb">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} />
              ) : (
                <div className="learnerHub__thumbPlaceholder">No image</div>
              )}
            </div>

            <div className="learnerHub__heroMain">
              <div className="learnerHub__title">{course.title}</div>
              <div className="learnerHub__meta">
                <span>{levelLabel(course.level)}</span>
                <span className="learnerHub__dot">·</span>
                <span>{languageLabel(course.language)}</span>
                {Array.isArray(course.instructors) && course.instructors.length ? (
                  <>
                    <span className="learnerHub__dot">·</span>
                    <span>Giảng viên: {course.instructors.map((i) => i.full_name).filter(Boolean).join(", ")}</span>
                  </>
                ) : null}
              </div>
              <div className={`learnerHub__desc ${course.short_description ? "" : "learnerHub__desc--empty"}`}>
                {course.short_description || "Chưa có mô tả ngắn."}
              </div>

              <div className="learnerHub__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate(`/learning/${courseId}/${slug || course.slug}`)}
                  disabled={!courseId}
                >
                  Học tiếp
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setGraphModalOpen(true)}>
                  Sơ đồ tiên quyết
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => fetchLeaderboard().catch(() => undefined)}>
                  Tải lại xếp hạng
                </button>
              </div>

              <div className="learnerHub__progressCard">
                <div className="learnerHub__progressRow">
                  <div className="learnerHub__progressLabel">Tiến độ của bạn</div>
                  <div className="learnerHub__progressPct">{progressPercent}%</div>
                </div>
                <div className="learnerHub__progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="learnerHub__progressFill" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
                </div>
                <div className="learnerHub__progressMeta">
                  Hoàn thành: <b>{completedLessons}</b> / <b>{totalLessons}</b> bài
                  {myRank != null ? (
                    <>
                      <span className="learnerHub__dot">·</span> Hạng của bạn: <b>#{myRank}</b>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {course ? (
          <div className="learnerHub__grid">
            <section className="learnerHub__card">
              <div className="learnerHub__cardHeader">
                <div className="learnerHub__cardTitle">Bảng xếp hạng</div>
                <div className="learnerHub__cardHint">Top {leaderboard?.top_limit ?? 100} + bạn (nếu ngoài top)</div>
              </div>
              <div className="learnerHub__leaderboardList">
                {leaderboard?.items?.length ? (
                  leaderboard.items.map((it) => (
                    <div
                      key={it.user_id}
                      className={[
                        "learnerHub__leaderboardItem",
                        it.rank === 1 ? "learnerHub__leaderboardItem--gold" : "",
                        it.rank === 2 ? "learnerHub__leaderboardItem--silver" : "",
                        it.rank === 3 ? "learnerHub__leaderboardItem--bronze" : "",
                        it.is_me ? "learnerHub__leaderboardItem--me" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="learnerHub__leaderboardRank">#{it.rank}</div>
                      {it.avatar_url ? (
                        <img src={it.avatar_url} alt={it.full_name} className="learnerHub__leaderboardAvatar" />
                      ) : (
                        <div className="learnerHub__leaderboardAvatar learnerHub__leaderboardAvatar--placeholder" aria-hidden="true">
                          {String(it.full_name || "U").trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="learnerHub__leaderboardName">{it.full_name}</div>
                      <div className="learnerHub__leaderboardScore">{Number(it.progress_percent || 0)}%</div>
                    </div>
                  ))
                ) : (
                  <div className="learnerHub__empty">Chưa có dữ liệu bảng xếp hạng.</div>
                )}
              </div>
            </section>

            <section className="learnerHub__card">
              <div className="learnerHub__cardHeader">
                <div className="learnerHub__cardTitle">Thông tin</div>
                <div className="learnerHub__cardHint">Một số thông tin cơ bản</div>
              </div>
              <div className="learnerHub__infoList">
                <div className="learnerHub__infoItem">
                  <span>Trạng thái</span>
                  <b>{course.enrollment?.status || "active"}</b>
                </div>
                <div className="learnerHub__infoItem">
                  <span>Slug</span>
                  <b>{course.slug}</b>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {graphModalOpen ? (
          <div className="learnerHub__modalOverlay" role="dialog" aria-modal="true">
            <div className="learnerHub__modal">
              <div className="learnerHub__modalHeader">
                <div className="learnerHub__modalTitle">Sơ đồ tiên quyết</div>
                <button type="button" className="btn btn--secondary" onClick={() => setGraphModalOpen(false)}>
                  Đóng
                </button>
              </div>
              <div className="learnerHub__modalBody">
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

