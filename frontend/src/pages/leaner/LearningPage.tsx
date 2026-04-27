import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { useAuth } from "../../contexts/Auth";
import type { ModuleItem } from "../../components/LearnerCourseContentTree";
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

type LessonResourceItem = {
  id: number;
  url: string;
  filename: string | null;
  mime_type: string | null;
  created_at?: string;
};

type LessonHeartbeatDto = {
  lesson_id: number;
  time_spent_seconds: number;
  required_seconds: number;
  can_complete: boolean;
  progress_percent: number;
};

export default function LearningPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const slug = String(params.slug || "");

  const { accessToken: token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [animatedModules, setAnimatedModules] = useState<Set<number>>(new Set());
  const [assessmentSubmittedByLessonId, setAssessmentSubmittedByLessonId] = useState<
    Record<number, { quiz: boolean; assignment: boolean }>
  >({});
  const roadmapRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [assessmentQuickPick, setAssessmentQuickPick] = useState<{
    moduleId: number;
    lessonId: number;
    x: number;
    y: number;
    options: { kind: "lesson" | "quiz" | "assignment"; disabled?: boolean; completed?: boolean }[];
  } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ moduleId: number; lessonId: number } | null>(null);
  const [lessonModalNavPick, setLessonModalNavPick] = useState<{
    moduleId: number;
    lessonId: number;
    options: ("quiz" | "assignment")[];
  } | null>(null);
  const [lessonModalLoading, setLessonModalLoading] = useState(false);
  const [lessonModalError, setLessonModalError] = useState<string | null>(null);
  const [lessonModalResource, setLessonModalResource] = useState<{
    url: string;
    filename: string;
    mime: string;
  } | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const completedAttemptedRef = useRef<Set<number>>(new Set());
  const [heartbeat, setHeartbeat] = useState<LessonHeartbeatDto | null>(null);
  const [countdownRemainingPct, setCountdownRemainingPct] = useState<number>(100);
  const countdownRequiredSecondsRef = useRef<number>(0);
  const countdownBaselineTimeSpentRef = useRef<number>(0);
  const countdownBaselineAtMsRef = useRef<number>(0);
  const countdownAnimTimerRef = useRef<number | null>(null);
  const [linkGeoms, setLinkGeoms] = useState<
    {
      key: string;
      linkIndex: number;
      moduleId: number;
      lessonIds: number[];
      x1: number;
      y1: number;
      x1o: number;
      y1o: number;
      x2o: number;
      y2o: number;
      x2: number;
      y2: number;
      lessonCount: number;
      completedCount: number;
    }[]
  >([]);

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
      setProgress(null);
    }
  };

  useEffect(() => {
    void fetchLearning();
    void fetchProgress();
  }, [courseId]);

  useEffect(() => {
    if (!course?.modules?.length || !courseId) {
      setAssessmentSubmittedByLessonId({});
      return;
    }
    let alive = true;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const targets = (course.modules || [])
      .flatMap((m) => m.lessons || [])
      .filter(
        (l) =>
          l.lesson_type === "quiz" ||
          l.lesson_type === "assignment" ||
          ((l.lesson_type === "video" || l.lesson_type === "text") && (Boolean(l.has_quiz) || Boolean(l.has_assignment)))
      );

    const load = async () => {
      const entries = await Promise.all(
        targets.map(async (l) => {
          let quiz = false;
          let assignment = false;

          const needQuiz = l.lesson_type === "quiz" || Boolean(l.has_quiz);
          const needAssignment = l.lesson_type === "assignment" || Boolean(l.has_assignment);

          if (needQuiz) {
            try {
              const r = await fetch(`${url}${COURSES_API.learnerQuizTake(courseId, l.id)}`, { headers });
              if (r.ok) {
                const data = await r.json().catch(() => ({}));
                const attempts = (data as any)?.quiz?.recent_attempts;
                quiz = Array.isArray(attempts) && attempts.some((a: any) => a?.submitted_at || a?.status === "submitted" || a?.status === "graded");
              }
            } catch {
              // ignore
            }
          }

          if (needAssignment) {
            try {
              const ar = await fetch(`${url}${ASSIGNMENTS_API.learnerAssignmentForLesson(l.id)}`, { headers });
              if (ar.ok) {
                const ad = await ar.json().catch(() => ({}));
                const assignmentId = Number((ad as any)?.assignment_id || (ad as any)?.id || 0);
                if (assignmentId > 0) {
                  const gr = await fetch(`${url}${ASSIGNMENTS_API.myAssignmentGrade(assignmentId)}`, { headers });
                  if (gr.ok) {
                    const gd = await gr.json().catch(() => ({}));
                    const row = (gd as any)?.data ?? gd;
                    const status = String((row as any)?.status || "").toLowerCase();
                    assignment = Boolean(
                      (row as any)?.submission_id ||
                        (row as any)?.submitted_at ||
                        (row as any)?.resubmission_count != null ||
                        status === "submitted" ||
                        status === "graded"
                    );
                  }
                }
              }
            } catch {
              // ignore
            }
          }

          return [l.id, { quiz, assignment }] as const;
        })
      );

      if (!alive) return;
      const next: Record<number, { quiz: boolean; assignment: boolean }> = {};
      for (const [id, v] of entries) next[id] = v;
      setAssessmentSubmittedByLessonId(next);
    };

    void load();
    return () => {
      alive = false;
    };
  }, [course, courseId, token]);

  useEffect(() => {
    if (!lessonModal) {
      setLessonModalLoading(false);
      setLessonModalError(null);
      setLessonModalResource(null);
      return;
    }
    let alive = true;
    const modalTitle =
      course?.modules
        ?.flatMap((m) => m.lessons || [])
        ?.find((l) => l.id === lessonModal.lessonId)
        ?.title || "Tài nguyên";
    const load = async () => {
      setLessonModalLoading(true);
      setLessonModalError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.listLessonResources(courseId, lessonModal.lessonId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as any)?.message || "Không tải được tài nguyên bài học.");
        const items = (json as any)?.items as LessonResourceItem[] | undefined;
        const first = Array.isArray(items) && items.length ? items[0] : null;
        if (!alive) return;
        if (first) {
          setLessonModalResource({
            url: first.url || "",
            filename: first.filename || modalTitle,
            mime: first.mime_type || "",
          });
        } else {
          setLessonModalResource(null);
        }
      } catch (e: any) {
        if (!alive) return;
        setLessonModalError(e?.message || "Không tải được tài nguyên.");
        setLessonModalResource(null);
      } finally {
        if (alive) setLessonModalLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [lessonModal, courseId, token, course]);

  const syncCountdownBaseline = (data: LessonHeartbeatDto) => {
    const req = Number(data?.required_seconds || 0);
    const spent = Number(data?.time_spent_seconds || 0);
    if (!Number.isFinite(req) || req <= 0) return;
    countdownRequiredSecondsRef.current = req;
    countdownBaselineTimeSpentRef.current = Math.max(0, spent);
    countdownBaselineAtMsRef.current = Date.now();

    const elapsedSeconds = (Date.now() - countdownBaselineAtMsRef.current) / 1000;
    const predictedSpent = countdownBaselineTimeSpentRef.current + elapsedSeconds;
    const remaining = Math.max(0, Math.min(100, (1 - predictedSpent / req) * 100));
    setCountdownRemainingPct(Math.round(remaining * 10) / 10);
  };

  const postHeartbeat = async (lessonId: number, deltaSeconds: number) => {
    const res = await fetch(`${url}${COURSES_API.lessonHeartbeat(courseId, lessonId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ delta_seconds: deltaSeconds }),
    });
    const json = (await res.json().catch(() => ({}))) as Partial<LessonHeartbeatDto> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể cập nhật tiến độ bài học.");
    return json as LessonHeartbeatDto;
  };

  const tryCompleteLesson = async (lessonId: number) => {
    if (completedAttemptedRef.current.has(lessonId)) return;
    completedAttemptedRef.current.add(lessonId);
    try {
      const res = await fetch(`${url}${COURSES_API.completeLesson(courseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<{ message?: string }>;
      if (!res.ok) throw new Error(json?.message || "Không thể hoàn thành bài học.");
      await fetchProgress();
    } catch {
      completedAttemptedRef.current.delete(lessonId);
    }
  };

  useEffect(() => {
    if (!lessonModal) {
      setHeartbeat(null);
      setCountdownRemainingPct(100);
      countdownRequiredSecondsRef.current = 0;
      countdownBaselineTimeSpentRef.current = 0;
      countdownBaselineAtMsRef.current = Date.now();
      return;
    }

    const lesson = course?.modules?.flatMap((m) => m.lessons || []).find((x) => x.id === lessonModal.lessonId);
    if (!lesson || (lesson.lesson_type !== "video" && lesson.lesson_type !== "text")) return;
    if (progress && !(progress.unlocked_lesson_ids || []).some((id) => Number(id) === lessonModal.lessonId)) return;

    setHeartbeat(null);
    setCountdownRemainingPct(100);
    countdownRequiredSecondsRef.current = 0;
    countdownBaselineTimeSpentRef.current = 0;
    countdownBaselineAtMsRef.current = Date.now();
    const lessonId = lessonModal.lessonId;

    const tick = async (deltaSeconds: number) => {
      try {
        const data = await postHeartbeat(lessonId, deltaSeconds);
        setHeartbeat(data);
        syncCountdownBaseline(data);
        if (data?.can_complete) {
          void tryCompleteLesson(lessonId);
        }
      } catch {
        // ignore
      }
    };

    void tick(1);
    heartbeatTimerRef.current = window.setInterval(() => {
      void tick(3);
    }, 3000);

    return () => {
      if (heartbeatTimerRef.current != null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      void tick(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonModal, courseId, token, progress, course]);

  useEffect(() => {
    if (!lessonModal) return;
    const req = countdownRequiredSecondsRef.current;
    if (!req || req <= 0) return;

    if (countdownAnimTimerRef.current != null) {
      window.clearInterval(countdownAnimTimerRef.current);
      countdownAnimTimerRef.current = null;
    }

    countdownAnimTimerRef.current = window.setInterval(() => {
      const localReq = countdownRequiredSecondsRef.current;
      if (!localReq || localReq <= 0) return;
      const elapsedSeconds = (Date.now() - countdownBaselineAtMsRef.current) / 1000;
      const predictedSpent = countdownBaselineTimeSpentRef.current + elapsedSeconds;
      const remaining = Math.max(0, Math.min(100, (1 - predictedSpent / localReq) * 100));
      setCountdownRemainingPct(Math.round(remaining * 10) / 10);
    }, 120);

    return () => {
      if (countdownAnimTimerRef.current != null) {
        window.clearInterval(countdownAnimTimerRef.current);
        countdownAnimTimerRef.current = null;
      }
    };
  }, [lessonModal, heartbeat]);

  // Trigger unlock animations when progress data arrives
  useEffect(() => {
    if (progress && course) {
      const unlockedIds = new Set(progress.unlocked_lesson_ids);
      const newlyUnlocked = new Set<number>();
      course.modules.forEach(module => {
        const moduleLessons = module.lessons || [];
        if (moduleLessons.length > 0) {
          const firstLessonId = moduleLessons[0].id;
          if (unlockedIds.has(firstLessonId)) {
            newlyUnlocked.add(module.id);
          }
        }
      });
      setAnimatedModules(newlyUnlocked);
      // Remove animation class after animation ends
      const timers = Array.from(newlyUnlocked).map(id => 
        setTimeout(() => setAnimatedModules(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }), 800)
      );
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [progress, course]);

  useLayoutEffect(() => {
    if (!course?.modules?.length || !roadmapRef.current) {
      setLinkGeoms([]);
      return;
    }

    const compute = () => {
      const host = roadmapRef.current;
      if (!host) return;
      const dirFromClockwiseDeg = (deg: number) => {
        // Quy ước góc theo chiều kim đồng hồ, mốc 0° ở hướng 12h.
        const rad = ((90 - deg) * Math.PI) / 180;
        return { dx: Math.cos(rad), dy: -Math.sin(rad) };
      };
      const hostRect = host.getBoundingClientRect();
      const mods = course.modules || [];
      const links: {
        key: string;
        linkIndex: number;
        moduleId: number;
        lessonIds: number[];
        x1: number;
        y1: number;
        x1o: number;
        y1o: number;
        x2o: number;
        y2o: number;
        x2: number;
        y2: number;
        lessonCount: number;
        completedCount: number;
      }[] = [];
      const escapeLen = 18;
      const completedIds = new Set<number>((progress?.completed_lesson_ids || []).map((x) => Number(x)));

      for (let i = 0; i < mods.length - 1; i++) {
        const cur = mods[i];
        const nxt = mods[i + 1];
        const n1 = nodeRefs.current[cur.id];
        const n2 = nodeRefs.current[nxt.id];
        if (!n1 || !n2) continue;
        const r1 = n1.getBoundingClientRect();
        const r2 = n2.getBoundingClientRect();
        const c1x = r1.left - hostRect.left + r1.width / 2;
        const c1y = r1.top - hostRect.top + r1.height / 2;
        const c2x = r2.left - hostRect.left + r2.width / 2;
        const c2y = r2.top - hostRect.top + r2.height / 2;
        const isOddToEvenPair = i % 2 === 0; // 1-based: 1->2, 3->4...
        const fromDeg = isOddToEvenPair ? 135 : 225;
        const toDeg = isOddToEvenPair ? 315 : 45;
        const fromDir = dirFromClockwiseDeg(fromDeg);
        const toDir = dirFromClockwiseDeg(toDeg);
        const radius1 = Math.min(r1.width, r1.height) / 2;
        const radius2 = Math.min(r2.width, r2.height) / 2;
        const x1 = c1x + fromDir.dx * radius1;
        const y1 = c1y + fromDir.dy * radius1;
        const x2 = c2x + toDir.dx * radius2;
        const y2 = c2y + toDir.dy * radius2;
        const x1o = x1 + fromDir.dx * escapeLen;
        const y1o = y1 + fromDir.dy * escapeLen;
        const x2o = x2 + toDir.dx * escapeLen;
        const y2o = y2 + toDir.dy * escapeLen;
        const lessonIds = (cur.lessons || []).map((l) => l.id);
        const lessonCount = Math.max(1, lessonIds.length);
        const completedCount = lessonIds.filter((id) => completedIds.has(id)).length;
        links.push({
          key: `${cur.id}-${nxt.id}`,
          linkIndex: i,
          moduleId: cur.id,
          lessonIds,
          x1,
          y1,
          x1o,
          y1o,
          x2o,
          y2o,
          x2,
          y2,
          lessonCount,
          completedCount,
        });
      }
      setLinkGeoms(links);
    };

    const mods = course.modules || [];
    // Khớp với CSS: .learningPage__node { animation-delay: calc(0.1s * var(--idx)); animation-duration: 0.5s; }
    const nodeStaggerMs = 100;
    const nodeAppearMs = 500;
    const settleMs = Math.max(0, mods.length - 1) * nodeStaggerMs + nodeAppearMs + 120;

    const raf1 = requestAnimationFrame(compute);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(compute));
    const timer = window.setTimeout(compute, 120);
    const settleTimer = window.setTimeout(compute, settleMs);
    const onLoad = () => compute();

    const onNodeAppearEnd = (ev: AnimationEvent) => {
      if (ev.animationName !== "nodeAppear") return;
      compute();
    };

    const ro = new ResizeObserver(() => compute());
    ro.observe(roadmapRef.current);
    for (const m of mods) {
      const n = nodeRefs.current[m.id];
      if (n) ro.observe(n);
    }
    window.addEventListener("resize", compute);
    window.addEventListener("load", onLoad);
    roadmapRef.current.addEventListener("animationend", onNodeAppearEnd);

    const fontsApi = document.fonts as FontFaceSet | undefined;
    let disposed = false;
    if (fontsApi?.ready) {
      void fontsApi.ready.then(() => {
        if (!disposed) compute();
      });
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
      window.clearTimeout(settleTimer);
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("load", onLoad);
      roadmapRef.current?.removeEventListener("animationend", onNodeAppearEnd);
    };
  }, [course, progress]);

  if (loading && !course) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button" disabled>← Quay lại</button>
          <AvatarMenu />
        </div>
        <div className="learningPage__loading">Đang tải bản đồ lộ trình...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">← Quay lại</button>
          <AvatarMenu />
        </div>
        <div className="learningPage__errorBox">
          <div className="learningPage__errorTitle">Không thể mở trang học</div>
          <div className="learningPage__errorMsg">{error}</div>
          <button className="btn btn--primary" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">Quay lại</button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const completedSet = new Set<number>((progress?.completed_lesson_ids || []).map(x => Number(x)));
  const unlockedSet = new Set<number>((progress?.unlocked_lesson_ids || []).map(x => Number(x)));
  const progressPercent = typeof progress?.progress_percent === "number"
    ? progress.progress_percent
    : typeof course.enrollment?.progress_percent === "number"
      ? course.enrollment.progress_percent
      : 0;
  const modules = course.modules || [];
  const lessonTitleById = new Map<number, string>();
  const lessonModuleIdById = new Map<number, number>();
  const lessonNeedsAssessmentsById = new Map<number, boolean>();
  const lessonAssessmentKindsById = new Map<number, ("quiz" | "assignment")[]>();
  const lessonById = new Map<number, ModuleItem["lessons"][number]>();
  const nextLessonIdById = new Map<number, number | null>();
  const moduleIndexById = new Map<number, number>();
  const firstLessonIdByModuleId = new Map<number, number | null>();
  const orderedLessonIds: number[] = [];
  for (let moduleIdx = 0; moduleIdx < modules.length; moduleIdx++) {
    const mod = modules[moduleIdx];
    moduleIndexById.set(mod.id, moduleIdx);
    const sortedLessons = [...(mod.lessons || [])].sort((a, b) => {
      const oa = Number(a.order_index ?? 0);
      const ob = Number(b.order_index ?? 0);
      if (oa !== ob) return oa - ob;
      return Number(a.id) - Number(b.id);
    });
    firstLessonIdByModuleId.set(mod.id, sortedLessons[0]?.id ?? null);
    for (const le of sortedLessons) {
      lessonTitleById.set(le.id, le.title);
      lessonById.set(le.id, le);
      lessonModuleIdById.set(le.id, mod.id);
      lessonNeedsAssessmentsById.set(
        le.id,
        le.lesson_type === "quiz" ||
          le.lesson_type === "assignment" ||
          ((le.lesson_type === "video" || le.lesson_type === "text") && (Boolean(le.has_quiz) || Boolean(le.has_assignment)))
      );
      if (le.lesson_type === "quiz") {
        lessonAssessmentKindsById.set(le.id, ["quiz"]);
      } else if (le.lesson_type === "assignment") {
        lessonAssessmentKindsById.set(le.id, ["assignment"]);
      } else if (le.lesson_type === "video" || le.lesson_type === "text") {
        const kinds: ("quiz" | "assignment")[] = [];
        if (le.has_quiz) kinds.push("quiz");
        if (le.has_assignment) kinds.push("assignment");
        lessonAssessmentKindsById.set(le.id, kinds);
      } else {
        lessonAssessmentKindsById.set(le.id, []);
      }
      orderedLessonIds.push(le.id);
    }
    for (let i = 0; i < sortedLessons.length; i++) {
      nextLessonIdById.set(sortedLessons[i].id, sortedLessons[i + 1]?.id ?? null);
    }
  }

  const canOpenLesson = (moduleId: number, lessonId: number | undefined) => {
    if (!lessonId) return false;
    const m = modules.find((x) => x.id === moduleId);
    if (!m) return false;
    const idx = modules.findIndex((x) => x.id === moduleId);
    const lids = (m.lessons || []).map((l) => l.id);
    const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
    const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();
    const anyUnlocked = lids.some((id) => unlockedSet.has(id));
    const moduleUnlocked = progress ? anyUnlocked : idx === 0;
    if (!moduleUnlocked || moduleNotOpenedYet) return false;
    if (progress && !unlockedSet.has(lessonId)) return false;
    return true;
  };

  const completedModules = modules.filter((m) => {
    const ids = (m.lessons || []).map((l) => l.id);
    return ids.length > 0 && ids.every((id) => completedSet.has(id));
  }).length;
  const isWarningLesson = (lessonId: number) => {
    if (!completedSet.has(lessonId)) return false;
    if (!lessonNeedsAssessmentsById.get(lessonId)) return false;
    const kinds = lessonAssessmentKindsById.get(lessonId) || [];
    const submitted = assessmentSubmittedByLessonId[lessonId];
    const anySubmitted = kinds.some((k) => (k === "quiz" ? submitted?.quiz : submitted?.assignment));
    if (anySubmitted) return false;

    // Nếu đã mở được bài kế tiếp thì coi như cụm Q/A đã xử lý xong => không tô vàng nữa.
    const nextInModule = nextLessonIdById.get(lessonId) ?? null;
    if (nextInModule && unlockedSet.has(nextInModule)) return false;

    const moduleId = lessonModuleIdById.get(lessonId);
    if (moduleId != null) {
      const mIdx = moduleIndexById.get(moduleId);
      if (mIdx != null) {
        const nextModule = modules[mIdx + 1];
        if (nextModule) {
          const firstNextModuleLessonId = firstLessonIdByModuleId.get(nextModule.id) ?? null;
          if (firstNextModuleLessonId && unlockedSet.has(firstNextModuleLessonId)) return false;
        }
      }
    }
    return true;
  };
  const needsAction = (lessonId: number) =>
    !completedSet.has(lessonId) || isWarningLesson(lessonId);
  const actionableOrdered = orderedLessonIds.filter((id) => {
    const moduleId = lessonModuleIdById.get(id);
    return moduleId != null && canOpenLesson(moduleId, id) && needsAction(id);
  });
  const processingLessonId = actionableOrdered[0] ?? null;
  const nextLessonId = actionableOrdered[1] ?? null;
  const modalLessonIndex = lessonModal ? orderedLessonIds.indexOf(lessonModal.lessonId) : -1;
  const modalPrevLessonId = modalLessonIndex > 0 ? orderedLessonIds[modalLessonIndex - 1] : null;
  const modalNextLessonId = modalLessonIndex >= 0 && modalLessonIndex < orderedLessonIds.length - 1 ? orderedLessonIds[modalLessonIndex + 1] : null;
  const modalPrevModuleId = modalPrevLessonId ? lessonModuleIdById.get(modalPrevLessonId) ?? null : null;
  const modalNextModuleId = modalNextLessonId ? lessonModuleIdById.get(modalNextLessonId) ?? null : null;
  const modalCanGoPrev = Boolean(modalPrevLessonId && modalPrevModuleId && canOpenLesson(modalPrevModuleId, modalPrevLessonId));
  const modalCanGoNext = Boolean(modalNextLessonId && modalNextModuleId && canOpenLesson(modalNextModuleId, modalNextLessonId));
  const modalLesson = lessonModal ? lessonById.get(lessonModal.lessonId) || null : null;

  const parseYoutubeVideoId = (input?: string | null): string | null => {
    if (!input) return null;
    const s = String(input);
    const m1 = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m1?.[1]) return m1[1];
    const m2 = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m2?.[1]) return m2[1];
    const m3 = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (m3?.[1]) return m3[1];
    return null;
  };

  const unlockedModules = modules.filter((m, idx) => {
    const ids = (m.lessons || []).map((l) => l.id);
    const anyUnlocked = ids.some((id) => unlockedSet.has(id));
    return progress ? anyUnlocked : idx === 0;
  }).length;
  const totalLessons = progress?.total_lessons ?? modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = progress?.completed_lessons ?? completedSet.size;
  const nextModule = modules.find((m, idx) => {
    const ids = (m.lessons || []).map((l) => l.id);
    const allCompleted = ids.length > 0 && ids.every((id) => completedSet.has(id));
    const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
    const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();
    const anyUnlocked = ids.some((id) => unlockedSet.has(id));
    const moduleUnlocked = progress ? anyUnlocked : idx === 0;
    return !allCompleted && moduleUnlocked && !moduleNotOpenedYet;
  });
  const nextModuleOrder = nextModule ? modules.findIndex((m) => m.id === nextModule.id) + 1 : null;

  function formatTimeVi(date: Date): string {
    try {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  /** Mở quiz/bài tập trong tab mới; giữ người dùng trên trang Learning (không điều hướng sang trang module lessons). */
  const openLearnerAssessmentInNewTab = (kind: "quiz" | "assignment", lessonId: number, lessonTitle: string) => {
    const params = new URLSearchParams({ title: lessonTitle || "" });
    if (slug) params.set("slug", slug);
    if (kind === "quiz") {
      window.open(`/learner/quiz/${courseId}/${lessonId}?${params.toString()}`, "_blank", "noopener,noreferrer");
    } else {
      params.set("courseId", String(courseId));
      window.open(`/learner/assignment/${lessonId}?${params.toString()}`, "_blank", "noopener,noreferrer");
    }
  };

  const openLessonFromModalNav = (targetLessonId: number | null) => {
    if (!targetLessonId) return;
    const targetModuleId = lessonModuleIdById.get(targetLessonId);
    if (!targetModuleId) return;
    if (!canOpenLesson(targetModuleId, targetLessonId)) return;
    const assessmentKinds = lessonAssessmentKindsById.get(targetLessonId) || [];
    if (!assessmentKinds.length) {
      setLessonModalNavPick(null);
      setLessonModal({ moduleId: targetModuleId, lessonId: targetLessonId });
      return;
    }
    if (assessmentKinds.length === 1) {
      setLessonModalNavPick(null);
      const le = lessonById.get(targetLessonId);
      openLearnerAssessmentInNewTab(assessmentKinds[0], targetLessonId, le?.title || "");
      setLessonModal(null);
      void fetchProgress();
      return;
    }
    setLessonModalNavPick({
      moduleId: targetModuleId,
      lessonId: targetLessonId,
      options: assessmentKinds,
    });
  };

  return (
    <div className="learningPage">
      <div className="learningPage__topbar">
        <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">← Quay lại</button>
        <div className="learningPage__topbarCenter">
          <div className="learningPage__title">{course.title}</div>
          <div className="learningPage__meta">
            Đã hoàn thành <b>{completedLessons}</b>/<b>{totalLessons}</b> bài học · Tiến độ tổng <b>{progressPercent}%</b>
          </div>
          <div className="learningPage__progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <div className="learningPage__progressFill" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
          </div>
        </div>
        <AvatarMenu />
      </div>

      <div className="learningPage__body">
        <section className="learningPage__summaryCards">
          <article className="learningPage__summaryCard">
            <div className="learningPage__summaryLabel">Chương đã mở</div>
            <div className="learningPage__summaryValue">{unlockedModules}/{modules.length}</div>
          </article>
          <article className="learningPage__summaryCard">
            <div className="learningPage__summaryLabel">Chương hoàn thành</div>
            <div className="learningPage__summaryValue">{completedModules}/{modules.length}</div>
          </article>
          <article className="learningPage__summaryCard learningPage__summaryCard--highlight">
            <div className="learningPage__summaryLabel">Mục tiêu tiếp theo</div>
            <div className="learningPage__summaryValue learningPage__summaryValue--sm">
              {nextModule ? `Chương ${nextModuleOrder}: ${nextModule.title}` : "Bạn đã hoàn thành toàn bộ lộ trình"}
            </div>
          </article>
        </section>

        <div
          className="learningPage__roadmap"
          ref={roadmapRef}
          onClick={() => {
            setAssessmentQuickPick(null);
          }}
        >
          <svg className="learningPage__linksSvg" role="presentation">
            {linkGeoms.map((link) => {
              const ddx = link.x2o - link.x1o;
              const ddy = link.y2o - link.y1o;
              const seg2Len = Math.hypot(ddx, ddy) || 1;
              const nx = -ddy / seg2Len;
              const ny = ddx / seg2Len;
              const perpOff = Math.min(34, Math.max(18, seg2Len * 0.11));
              const side = link.linkIndex % 2 === 0 ? 1 : -1;
              const edgeInsetPx = Math.min(84, Math.max(34, seg2Len * 0.2));
              const edgeInsetT = Math.max(0, Math.min(0.42, edgeInsetPx / seg2Len));
              const nLess = link.lessonIds.length;
              const tAt = (idx: number) => {
                const baseT = nLess === 1 ? 0.5 : idx / (nLess - 1);
                return edgeInsetT + baseT * (1 - edgeInsetT * 2);
              };
              const effectiveLen = Math.max(1, seg2Len * (1 - edgeInsetT * 2));
              const minChildSpacingPx = 200; // tang khoang cach giua cac cum node con
              const baseSpacingPx = nLess <= 1 ? effectiveLen : effectiveLen / (nLess - 1);
              const laneCount = Math.max(1, Math.ceil(minChildSpacingPx / Math.max(1, baseSpacingPx)));
              const laneGapPx = 34;

              const pointAlongSeg2 = (t: number, laneOffsetPx: number) => {
                const px = link.x1o + ddx * t;
                const py = link.y1o + ddy * t;
                return {
                  x: px + nx * (perpOff * side + laneOffsetPx),
                  y: py + ny * (perpOff * side + laneOffsetPx),
                };
              };
              return (
                <g key={link.key}>
                  {link.lessonIds.map((lessonId, pointIdx) => {
                    const t = tAt(pointIdx);
                    const laneIdx = laneCount <= 1 ? 0 : pointIdx % laneCount;
                    const laneCenter = (laneCount - 1) / 2;
                    const laneOffsetPx = (laneIdx - laneCenter) * laneGapPx * side;
                    const p = pointAlongSeg2(t, laneOffsetPx);
                    const done = completedSet.has(lessonId);
                    const warning = isWarningLesson(lessonId);
                    const focus = lessonId === processingLessonId || lessonId === nextLessonId;
                    const canClick = canOpenLesson(link.moduleId, lessonId);
                    const title = lessonId ? lessonTitleById.get(lessonId) || "Bài học" : "Chương";
                    const rVis = done ? 10.5 : 9;
                    const onLessonPointer = (e: MouseEvent<SVGElement> | KeyboardEvent<SVGElement>) => {
                      if (!canClick || !lessonId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setAssessmentQuickPick(null);
                      const assessmentKinds = lessonAssessmentKindsById.get(lessonId) || [];
                      const hasQuiz = assessmentKinds.includes("quiz");
                      const hasAssignment = assessmentKinds.includes("assignment");
                      const lessonType = lessonById.get(lessonId)?.lesson_type;
                      const isStandaloneAssessment = lessonType === "quiz" || lessonType === "assignment";
                      const submitted = assessmentSubmittedByLessonId[lessonId];
                      setAssessmentQuickPick({
                        moduleId: link.moduleId,
                        lessonId,
                        x: p.x,
                        y: p.y,
                        options: isStandaloneAssessment
                          ? [
                              {
                                kind: lessonType === "quiz" ? "quiz" : "assignment",
                                disabled: false,
                                completed: lessonType === "quiz" ? Boolean(submitted?.quiz) : Boolean(submitted?.assignment),
                              },
                            ]
                          : [
                              { kind: "lesson", completed: done },
                              { kind: "quiz", disabled: !hasQuiz, completed: Boolean(submitted?.quiz) },
                              { kind: "assignment", disabled: !hasAssignment, completed: Boolean(submitted?.assignment) },
                            ],
                      });
                    };
                    return (
                      <g key={`${link.key}-cp-${pointIdx}`}>
                        <circle
                          className={`learningPage__lessonHit ${canClick && lessonId ? "" : "learningPage__lessonHit--disabled"}`}
                          cx={p.x}
                          cy={p.y}
                          r={22}
                          fill="rgba(15, 23, 42, 0.001)"
                          stroke="none"
                          pointerEvents="all"
                          tabIndex={canClick && lessonId ? 0 : -1}
                          role={lessonId ? "button" : undefined}
                          aria-label={lessonId ? `Mở bài: ${title}` : undefined}
                          aria-disabled={!canClick || !lessonId ? "true" : "false"}
                          onClick={onLessonPointer}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onLessonPointer(e);
                          }}
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={rVis}
                          className={
                            [
                              "learningPage__lessonNode",
                              done ? "learningPage__lessonNode--done" : "learningPage__lessonNode--todo",
                              warning ? "learningPage__lessonNode--warning" : "",
                              focus ? "learningPage__lessonNode--focus" : "",
                              lessonId === processingLessonId ? "learningPage__lessonNode--processing" : "",
                              lessonId === nextLessonId ? "learningPage__lessonNode--next" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")
                          }
                          pointerEvents="none"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
          {assessmentQuickPick ? (
            <div
              className="learningPage__assessmentQuickPick"
              style={{ left: `${assessmentQuickPick.x}px`, top: `${assessmentQuickPick.y}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              {assessmentQuickPick.options.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  className={[
                    "learningPage__assessmentPickBtn",
                    opt.completed ? "learningPage__assessmentPickBtn--completed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={Boolean(opt.disabled)}
                  onClick={() => {
                    if (opt.disabled) return;
                    if (opt.kind === "lesson") {
                      setLessonModalNavPick(null);
                      setLessonModal({
                        moduleId: assessmentQuickPick.moduleId,
                        lessonId: assessmentQuickPick.lessonId,
                      });
                    } else {
                      openLearnerAssessmentInNewTab(
                        opt.kind,
                        assessmentQuickPick.lessonId,
                        lessonTitleById.get(assessmentQuickPick.lessonId) || ""
                      );
                    }
                    setAssessmentQuickPick(null);
                  }}
                >
                  {opt.completed ? "✓ " : ""}
                  {opt.kind === "lesson" ? "Bài học" : opt.kind === "quiz" ? "Quizz" : "Bài tập"}
                </button>
              ))}
            </div>
          ) : null}
          <div className="learningPage__nodes">
            {modules.length ? (
              modules.map((m: ModuleItem, idx) => {
                const scatterPattern = [8, 58, 24, 72, 14, 64, 32, 54];
                const scatterBase = scatterPattern[idx % scatterPattern.length];
                const lessonIds = (m.lessons || []).map(l => l.id);
                const allCompleted = lessonIds.length ? lessonIds.every(id => completedSet.has(id)) : false;
                const quizCount = (m.lessons || []).filter(
                  (l) => l.lesson_type === "quiz" || ((l.lesson_type === "video" || l.lesson_type === "text") && Boolean(l.has_quiz))
                ).length;
                const asgCount = (m.lessons || []).filter(
                  (l) => l.lesson_type === "assignment" || ((l.lesson_type === "video" || l.lesson_type === "text") && Boolean(l.has_assignment))
                ).length;
                const childCount = (m.lessons || []).length + quizCount + asgCount;
                const scatterExtra = Math.min(16, Math.max(0, childCount * 0.9));
                const scatter = Math.max(
                  2,
                  Math.min(98, scatterBase + (idx % 2 === 0 ? -scatterExtra : scatterExtra))
                );
                const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
                const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();
                const anyUnlocked = lessonIds.some(id => unlockedSet.has(id));
                const moduleUnlocked = progress ? anyUnlocked : idx === 0;
                const canClick = moduleUnlocked && !moduleNotOpenedYet;
                const isAnimated = animatedModules.has(m.id);

                let status: 'locked' | 'unlocked' | 'completed' = 'locked';
                if (allCompleted) status = 'completed';
                else if (moduleUnlocked && !moduleNotOpenedYet) status = 'unlocked';
                else if (moduleNotOpenedYet) status = 'locked';

                const tooltipText = moduleNotOpenedYet && moduleOpenAt
                  ? `Mở lúc ${formatTimeVi(moduleOpenAt)}`
                  : allCompleted
                    ? "Hoàn thành"
                    : moduleUnlocked
                      ? "Đã mở"
                      : "Chưa mở";

                return (
                  <div
                    key={m.id}
                    className={`learningPage__node ${idx % 2 === 0 ? 'learningPage__node--left' : 'learningPage__node--right'} ${isAnimated ? 'learningPage__node--animate' : ''} ${idx === modules.length - 1 ? 'learningPage__node--last' : ''}`}
                    data-status={status}
                    style={{
                      ["--idx" as any]: idx,
                      ["--scatter-x" as any]: `${scatter}%`,
                      ["--child-count" as any]: childCount,
                    }}
                  >
                    <button
                      ref={(el) => {
                        nodeRefs.current[m.id] = el;
                      }}
                      type="button"
                      className={`learningPage__milestone ${status === 'completed' ? 'learningPage__milestone--completed' : ''} ${status === 'unlocked' ? 'learningPage__milestone--unlocked' : ''} ${status === 'locked' ? 'learningPage__milestone--locked' : ''}`}
                      onClick={() => { if (canClick) navigate(`/learning/${courseId}/${slug}/modules/${m.id}`); }}
                      disabled={!canClick}
                      aria-label={`Chương ${idx + 1}: ${m.title}. ${tooltipText}. ${(m.lessons || []).length} bài học`}
                    >
                      <span className="learningPage__milestoneCore">
                        <span className="learningPage__milestoneNumber">{idx + 1}</span>
                      </span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="learningPage__empty">Chưa có chương nào.</div>
            )}
          </div>
        </div>
      </div>
      {lessonModal ? (
        <div
          className="learningPage__lessonModalBackdrop"
          onClick={() => {
            setLessonModalNavPick(null);
            setLessonModal(null);
            void fetchProgress();
          }}
        >
          <div className="learningPage__lessonModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="learningPage__lessonModalClose"
              onClick={() => {
                setLessonModalNavPick(null);
                setLessonModal(null);
                void fetchProgress();
              }}
              aria-label="Dong"
            >
              ×
            </button>

            <div className="learningPage__lessonModalHeader">
              <div className="learningPage__lessonModalTitle">{modalLesson?.title || "Bài học"}</div>
              <div className="learningPage__lessonModalActions">
                {(() => {
                  const kinds = lessonModal ? lessonAssessmentKindsById.get(lessonModal.lessonId) || [] : [];
                  return kinds.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="learningPage__lessonModalActBtn"
                      onClick={() => {
                        openLearnerAssessmentInNewTab(k, lessonModal.lessonId, modalLesson?.title || "");
                        setLessonModalNavPick(null);
                        setLessonModal(null);
                        void fetchProgress();
                      }}
                    >
                      {k === "quiz" ? "Quizz" : "Bài tập"}
                    </button>
                  ));
                })()}
              </div>
            </div>

            <div className="learningPage__lessonModalBody">
              {lessonModalLoading ? (
                <div className="learningPage__lessonModalEmpty">Đang tải tài nguyên...</div>
              ) : lessonModalError ? (
                <div className="learningPage__lessonModalEmpty">{lessonModalError}</div>
              ) : lessonModalResource ? (
                (() => {
                  const ytId = parseYoutubeVideoId(lessonModalResource.url);
                  if (ytId) {
                    return (
                      <iframe
                        className="learningPage__lessonModalFrame"
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title="Video lesson"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  const mime = (lessonModalResource.mime || "").toLowerCase();
                  if (mime.startsWith("image/")) {
                    return <img className="learningPage__lessonModalImage" src={lessonModalResource.url} alt={lessonModalResource.filename} />;
                  }
                  if (mime.startsWith("video/")) {
                    return <video className="learningPage__lessonModalVideo" src={lessonModalResource.url} controls />;
                  }
                  if (mime.includes("pdf") || mime.startsWith("text/")) {
                    return <iframe className="learningPage__lessonModalFrame" src={lessonModalResource.url} title="Lesson resource" />;
                  }
                  return (
                    <div className="learningPage__lessonModalEmpty">
                      Không thể hiển thị trực tiếp tệp này.{" "}
                      <a href={lessonModalResource.url} target="_blank" rel="noreferrer">
                        Mở tệp
                      </a>
                    </div>
                  );
                })()
              ) : modalLesson?.description ? (
                <div className="learningPage__lessonModalText">{modalLesson.description}</div>
              ) : (
                <div className="learningPage__lessonModalEmpty">Bài học chưa có tài nguyên.</div>
              )}
            </div>

            <div className="learningPage__lessonModalNav">
              <button
                type="button"
                className="learningPage__lessonModalNavBtn"
                disabled={!modalCanGoPrev}
                onClick={() => {
                  openLessonFromModalNav(modalPrevLessonId);
                }}
              >
                ← Previous
              </button>
              {lessonModalNavPick ? (
                <div className="learningPage__lessonModalNavPick">
                  <span className="learningPage__lessonModalNavPickLabel">Chọn đích:</span>
                  {lessonModalNavPick.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="learningPage__lessonModalNavPickBtn"
                      onClick={() => {
                        openLearnerAssessmentInNewTab(
                          opt,
                          lessonModalNavPick.lessonId,
                          lessonById.get(lessonModalNavPick.lessonId)?.title || ""
                        );
                        setLessonModalNavPick(null);
                        setLessonModal(null);
                        void fetchProgress();
                      }}
                    >
                      {opt === "quiz" ? "Quizz" : "Bài tập"}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="learningPage__lessonModalNavBtn"
                disabled={!modalCanGoNext}
                onClick={() => {
                  openLessonFromModalNav(modalNextLessonId);
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {lessonModal && heartbeat && heartbeat.required_seconds > 0 ? (
        <div
          className={`learningPage__countdown ${heartbeat.can_complete ? "learningPage__countdown--ready" : ""}`}
          aria-hidden="true"
          style={{ ["--pct" as any]: countdownRemainingPct }}
        >
          <svg className="learningPage__countdownSvg" viewBox="0 0 48 48">
            <circle className="learningPage__countdownTrack" cx="24" cy="24" r="20" />
            <circle className="learningPage__countdownRing" cx="24" cy="24" r="20" />
            <path className="learningPage__countdownTick" d="M16.5 24.5l5.2 5.4L32.5 18.6" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}