/* LearningPage.tsx */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, BookOpen, AlertCircle, FileQuestion, ChevronLeft, ChevronRight, CheckSquare, BrainCircuit } from "lucide-react";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { useAuth } from "../../contexts/Auth";
import type { ModuleItem } from "../../components/LearnerCourseContentTree";
import { isLikelyVideoResource, parseYoutubeVideoId } from "../courseManager/lesson-studio/utils";
import "../../components/CourseContentSimpleTree.css";
import "./LearningPage.css";

function normalizeLearnerErrorMessage(raw: unknown): string {
  const msg = String(raw || "").trim();
  const lower = msg.toLowerCase();
  if (!msg) return "Đã xảy ra lỗi. Vui lòng thử lại.";
  if (lower.includes("ghi danh hợp lệ") || lower.includes("chưa đăng ký khóa học này")) {
    return "Bạn không còn quyền học khóa này (có thể đã dừng hoặc hết hạn).";
  }
  if (lower.includes("không thể truy cập bài học") || lower.includes("chưa mở theo lịch")) {
    return "Bài học chưa mở hoặc bạn chưa đủ điều kiện truy cập.";
  }
  return msg;
}

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

type QuizInfoPreview = {
  lessonId: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  attempts_used: number;
  questions_count: number;
};

type LessonSummaryData = {
  lesson_id: number;
  status: "pending" | "processing" | "succeeded" | "failed";
  source_type: "text" | "youtube";
  source_ready: boolean;
  model: string | null;
  source_hash: string | null;
  overall_summary: string | null;
  key_points: string[];
  error_message: string | null;
  requested_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
  segments: Array<{
    segment_index: number;
    start_sec: number | null;
    end_sec: number | null;
    raw_text: string;
    summary_text: string;
    keywords: string[];
  }>;
};

// Storage keys for pane state
const STORAGE_KEYS = {
  TREE_WIDTH: "learningPage_treeWidth",
  SUMMARY_WIDTH: "learningPage_summaryWidth",
  TREE_COLLAPSED: "learningPage_treeCollapsed",
  SUMMARY_COLLAPSED: "learningPage_summaryCollapsed",
};

interface TabItem {
  key: string;
  label: string;
}


// Helper to get/set localStorage values
function getStoredNumber(key: string, defaultValue: number, min: number, max: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val >= min && val <= max) return val;
    }
  } catch (e) {}
  return defaultValue;
}

function setStoredNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {}
}

function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return stored === "true";
  } catch (e) {}
  return defaultValue;
}

function setStoredBoolean(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {}
}

export default function LearningPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const slug = String(params.slug || "");

  const { accessToken: token } = useAuth();

  // ============================================
  // ALL useState declarations
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [animatedModules, setAnimatedModules] = useState<Set<number>>(new Set());
  const [assessmentSubmittedByLessonId, setAssessmentSubmittedByLessonId] = useState<
    Record<number, { quiz: boolean; assignment: boolean }>
  >({});
  const [assessmentQuickPick, setAssessmentQuickPick] = useState<{
    moduleId: number;
    lessonId: number;
    x: number;
    y: number;
    options: { kind: "lesson" | "quiz" | "assignment"; disabled?: boolean; completed?: boolean }[];
  } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ moduleId: number; lessonId: number } | null>(null);
  const autoSelectedRef = useRef(false);
  const [lessonModalNavPick, setLessonModalNavPick] = useState<{
    moduleId: number;
    lessonId: number;
    options: ("quiz" | "assignment")[];
  } | null>(null);
  const [lessonModalLoading, setLessonModalLoading] = useState(false);
  const [lessonModalError, setLessonModalError] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null);
  const [quizStartConfirm, setQuizStartConfirm] = useState<{ lessonId: number; title: string } | null>(null);
  const [quizInfoLoading, setQuizInfoLoading] = useState(false);
  const [quizInfoError, setQuizInfoError] = useState<string | null>(null);
  const [quizInfoPreview, setQuizInfoPreview] = useState<QuizInfoPreview | null>(null);
  const [lessonModalResources, setLessonModalResources] = useState<Array<{
    url: string;
    filename: string;
    mime: string;
    resourceType: string;
    resourceKind: string;
    resourceId?: number;
  }>>([]);
  const [lessonHtmlContent, setLessonHtmlContent] = useState<string | null>(null);
  const [lessonHtmlLoading, setLessonHtmlLoading] = useState(false);
  const [heartbeat, setHeartbeat] = useState<LessonHeartbeatDto | null>(null);
  const [lessonSummary, setLessonSummary] = useState<LessonSummaryData | null>(null);
  const [lessonSummaryLoading, setLessonSummaryLoading] = useState(false);
  const [lessonSummaryMutating, setLessonSummaryMutating] = useState(false);
  const [lessonSummaryError, setLessonSummaryError] = useState<string | null>(null);
  const [lessonSummaryErrorShownAt, setLessonSummaryErrorShownAt] = useState<number | null>(null);
  const [lessonSummarySegmentsExpanded, setLessonSummarySegmentsExpanded] = useState(false);
  const [countdownRemainingPct, setCountdownRemainingPct] = useState<number>(100);
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

  // Pane state for resizing and collapse
  const [treeWidth, setTreeWidth] = useState(() =>
    getStoredNumber(STORAGE_KEYS.TREE_WIDTH, 320, 240, 500)
  );
  const [summaryWidth, setSummaryWidth] = useState(() =>
    getStoredNumber(STORAGE_KEYS.SUMMARY_WIDTH, 360, 260, 500)
  );
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.TREE_COLLAPSED, false)
  );
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.SUMMARY_COLLAPSED, false)
  );
  const [isResizingTree, setIsResizingTree] = useState(false);
  const [isResizingSummary, setIsResizingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [currentLessonType, setCurrentLessonType] = useState<string | null>(null);

  // Track lesson type when modal opens
  useEffect(() => {
    if (!lessonModal || !course?.modules) {
      setCurrentLessonType(null);
      return;
    }
    const lesson = course.modules
      .flatMap((m) => m.lessons || [])
      .find((l) => l.id === lessonModal.lessonId);
    setCurrentLessonType(lesson?.lesson_type || null);
  }, [lessonModal, course]);

  // Reset activeTab when lesson type changes (Quiz/Assignment have no content tab)
  useEffect(() => {
    if (currentLessonType === "quiz" || currentLessonType === "assignment") {
      setActiveTab("resources");
    } else if (currentLessonType === "video" || currentLessonType === "text") {
      setActiveTab("content");
    }
  }, [currentLessonType]);

  // ============================================
  // ALL useRef declarations
  // ============================================
  const roadmapRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const heartbeatTimerRef = useRef<number | null>(null);
  const completedAttemptedRef = useRef<Set<number>>(new Set());
  const countdownRequiredSecondsRef = useRef<number>(0);
  const countdownBaselineTimeSpentRef = useRef<number>(0);
  const countdownBaselineAtMsRef = useRef<number>(0);
  const countdownAnimTimerRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const summaryMutatingAtRef = useRef<number>(0);

  // ============================================
  // ALL useMemo hooks (before conditional returns)
  // ============================================
  const treePaneStyle: React.CSSProperties = useMemo(() => {
    if (isTreeCollapsed) {
      return {
        width: "48px",
        minWidth: "48px",
        maxWidth: "48px",
        overflow: "hidden",
        padding: "12px 8px",
      };
    }
    return {
      width: `${treeWidth}px`,
      minWidth: `${treeWidth}px`,
      maxWidth: `${treeWidth}px`,
    };
  }, [treeWidth, isTreeCollapsed]);

  const summaryPaneStyle: React.CSSProperties = useMemo(() => {
    if (isSummaryCollapsed) {
      return {
        width: "48px",
        minWidth: "48px",
        maxWidth: "48px",
        overflow: "hidden",
        padding: "12px 8px",
      };
    }
    return {
      width: `${summaryWidth}px`,
      minWidth: `${summaryWidth}px`,
      maxWidth: `${summaryWidth}px`,
    };
  }, [summaryWidth, isSummaryCollapsed]);

  const tabs: TabItem[] = useMemo(() => {
    const items: TabItem[] = [];
    // Only show tabs for video/text lessons
    if (currentLessonType === "video" || currentLessonType === "text") {
      items.push({ key: "content", label: "Lesson Content" });
      items.push({ key: "resources", label: `Resources (${Math.max(0, lessonModalResources.length - 1)})` });
      items.push({ key: "discussion", label: "Discussion" });
    }
    // Quiz/Assignment - no tabs (content opens in new tab)
    return items;
  }, [currentLessonType, lessonModalResources.length]);

  // ============================================
  // ALL useCallback hooks
  // ============================================
  const fetchLearning = useCallback(async () => {
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
      setError(normalizeLearnerErrorMessage(e?.message || "Đã xảy ra lỗi."));
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  const fetchProgress = useCallback(async () => {
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
  }, [courseId, token]);

  const fetchLessonSummary = useCallback(async (lessonId: number) => {
    setLessonSummaryLoading(true);
    setLessonSummaryError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.lessonSummary(courseId, lessonId)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể tải tóm tắt bài học.");
      const data = json as LessonSummaryData;
      setLessonSummary(data);
      if (
        data.status === "failed" &&
        data.error_message &&
        Date.now() - summaryMutatingAtRef.current < 30_000
      ) {
        setLessonSummaryErrorShownAt(Date.now());
      }
    } catch (e: any) {
      setLessonSummary(null);
      setLessonSummaryError(normalizeLearnerErrorMessage(e?.message || "Không thể tải tóm tắt."));
    } finally {
      setLessonSummaryLoading(false);
    }
  }, [courseId, token]);

  const requestLessonSummary = useCallback(async (lessonId: number, regenerate = false) => {
    setLessonSummaryMutating(true);
    setLessonSummaryError(null);
    setLessonSummaryErrorShownAt(null);
    summaryMutatingAtRef.current = Date.now();
    try {
      const endpoint = regenerate
        ? COURSES_API.regenerateLessonSummary(courseId, lessonId)
        : COURSES_API.requestLessonSummary(courseId, lessonId);
      const res = await fetch(`${url}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể tạo tóm tắt.");
      setLessonSummary(json as LessonSummaryData);
    } catch (e: any) {
      setLessonSummaryError(normalizeLearnerErrorMessage(e?.message || "Không thể tạo tóm tắt."));
    } finally {
      setLessonSummaryMutating(false);
    }
  }, [courseId, token]);

  const syncCountdownBaseline = useCallback((data: LessonHeartbeatDto) => {
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
  }, []);

  const postHeartbeat = useCallback(async (lessonId: number, deltaSeconds: number) => {
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
  }, [courseId, token]);

  const tryCompleteLesson = useCallback(async (lessonId: number) => {
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
  }, [courseId, token, fetchProgress]);

  const startResizeTree = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTree(true);
    startXRef.current = e.clientX;
    startWidthRef.current = treeWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [treeWidth]);

  const startResizeSummary = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSummary(true);
    startXRef.current = e.clientX;
    startWidthRef.current = summaryWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [summaryWidth]);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (isResizingTree) {
      const delta = e.clientX - startXRef.current;
      let newWidth = startWidthRef.current + delta;
      newWidth = Math.min(500, Math.max(240, newWidth));
      setTreeWidth(newWidth);
    } else if (isResizingSummary) {
      const delta = startXRef.current - e.clientX;
      let newWidth = startWidthRef.current + delta;
      newWidth = Math.min(500, Math.max(260, newWidth));
      setSummaryWidth(newWidth);
    }
  }, [isResizingTree, isResizingSummary]);

  const handleMouseUp = useCallback(() => {
    setIsResizingTree(false);
    setIsResizingSummary(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const toggleTreeCollapse = useCallback(() => setIsTreeCollapsed(prev => !prev), []);
  const toggleSummaryCollapse = useCallback(() => setIsSummaryCollapsed(prev => !prev), []);

  // ============================================
  // ALL useEffect hooks
  // ============================================
  
  // localStorage save effects
  useEffect(() => {
    setStoredNumber(STORAGE_KEYS.TREE_WIDTH, treeWidth);
  }, [treeWidth]);

  useEffect(() => {
    setStoredNumber(STORAGE_KEYS.SUMMARY_WIDTH, summaryWidth);
  }, [summaryWidth]);

  useEffect(() => {
    setStoredBoolean(STORAGE_KEYS.TREE_COLLAPSED, isTreeCollapsed);
  }, [isTreeCollapsed]);

  useEffect(() => {
    setStoredBoolean(STORAGE_KEYS.SUMMARY_COLLAPSED, isSummaryCollapsed);
  }, [isSummaryCollapsed]);

  // Resize event handlers
  useEffect(() => {
    if (isResizingTree || isResizingSummary) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingTree, isResizingSummary, handleMouseMove, handleMouseUp]);

  // Fetch initial data
  useEffect(() => {
    void fetchLearning();
    void fetchProgress();
  }, [fetchLearning, fetchProgress]);

  // Refresh progress when user returns from other tabs (e.g., after completing Quiz/Assignment)
  useEffect(() => {
    const handleFocus = () => {
      void fetchProgress();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchProgress]);

  // Auto-select the first unlocked lesson on initial load
  useEffect(() => {
    if (!course?.modules?.length || !progress?.unlocked_lesson_ids || lessonModal || autoSelectedRef.current) return;
    autoSelectedRef.current = true;
    const firstModule = course.modules[0];
    if (!firstModule?.lessons?.length) return;
    const firstLesson = firstModule.lessons[0];
    if (!firstLesson) return;
    const firstLessonId = Number(firstLesson.id);
    if (!progress.unlocked_lesson_ids.includes(firstLessonId)) return;
    const assessmentKinds = lessonAssessmentKindsById.get(firstLessonId) || [];
    if (assessmentKinds.length === 1 && assessmentKinds[0] === "quiz") {
      requestStartQuiz(firstLessonId, firstLesson.title || "");
      return;
    }
    openLessonDetail(firstModule.id, firstLessonId);
  }, [course, progress, lessonModal]);

  // Assessment submitted status effect
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

  // Lesson modal resource loading effect
  useEffect(() => {
    if (!lessonModal) {
      setLessonModalLoading(false);
      setLessonModalError(null);
      setLessonModalResources([]);
      setLessonHtmlContent(null);
      setLessonHtmlLoading(false);
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
      setLessonHtmlContent(null);
      setLessonHtmlLoading(false);
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

        if (!alive) return;

        if (Array.isArray(items) && items.length > 0) {
          const sortedItems = [...items].sort((a, b) => {
            const aMime = (a.mime_type || "").toLowerCase();
            const bMime = (b.mime_type || "").toLowerCase();
            const aKind = (a as any).resource_kind || "";
            const bKind = (b as any).resource_kind || "";
            const aType = (a as any).resource_type || "";
            const bType = (b as any).resource_type || "";

            const aIsVideo = aMime.startsWith("video/") || aKind === "video" || aKind === "youtube" || aType === "video";
            const bIsVideo = bMime.startsWith("video/") || bKind === "video" || bKind === "youtube" || bType === "video";
            const aIsPdfOrWord = aMime.includes("pdf") || aKind === "pdf" || aMime.includes("word") || aKind === "word" || aMime.includes("document");
            const bIsPdfOrWord = bMime.includes("pdf") || bKind === "pdf" || bMime.includes("word") || bKind === "word" || bMime.includes("document");
            const aIsHtml = aMime.includes("text/html") || (a.filename || "").toLowerCase().endsWith(".html");
            const bIsHtml = bMime.includes("text/html") || (b.filename || "").toLowerCase().endsWith(".html");

            if (aIsVideo && !bIsVideo) return -1;
            if (!aIsVideo && bIsVideo) return 1;
            if (aIsPdfOrWord && !bIsPdfOrWord && !bIsVideo) return -1;
            if (!aIsPdfOrWord && bIsPdfOrWord && !aIsVideo) return 1;
            if (aIsHtml && !bIsHtml && !aIsPdfOrWord && !bIsPdfOrWord) return -1;
            if (!aIsHtml && bIsHtml && !aIsPdfOrWord && !bIsPdfOrWord) return 1;
            return 0;
          });

          const resources = sortedItems.map((item) => ({
            url: item.url || "",
            filename: item.filename || modalTitle,
            mime: item.mime_type || "",
            resourceType: (item as any).resource_type || "",
            resourceKind: (item as any).resource_kind || "",
            resourceId: Number(item.id) || undefined,
          }));
          setLessonModalResources(resources);

          const htmlItem = sortedItems.find((item) => {
            const mime = (item.mime_type || "").toLowerCase();
            return mime.includes("text/html") || (item.filename || "").toLowerCase().endsWith(".html");
          });
          if (htmlItem) {
            if (alive) setLessonHtmlLoading(true);
            try {
              const viewRes = await fetch(`${url}${COURSES_API.viewLessonResource(courseId, Number(htmlItem.id))}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (viewRes.ok) {
                const htmlText = await viewRes.text().catch(() => "");
                if (alive) setLessonHtmlContent(htmlText || null);
              }
            } catch {
              // ignore
            }
            if (alive) setLessonHtmlLoading(false);
          }
        } else {
          setLessonModalResources([]);
        }
      } catch (e: any) {
        if (!alive) return;
        setLessonModalError(normalizeLearnerErrorMessage(e?.message || "Không tải được tài nguyên."));
        setLessonModalResources([]);
      } finally {
        if (alive) setLessonModalLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [lessonModal, courseId, token, course]);

  // Lesson summary polling effect
  useEffect(() => {
    if (!lessonModal) {
      setLessonSummary(null);
      setLessonSummaryError(null);
      setLessonSummaryErrorShownAt(null);
      setLessonSummaryLoading(false);
      setLessonSummaryMutating(false);
      return;
    }
    void fetchLessonSummary(lessonModal.lessonId);
  }, [lessonModal, fetchLessonSummary]);

  // Lesson summary polling timer
  useEffect(() => {
    if (!lessonModal || !lessonSummary) return;
    if (lessonSummary.status !== "pending" && lessonSummary.status !== "processing") return;
    const timer = window.setTimeout(() => {
      void fetchLessonSummary(lessonModal.lessonId);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [lessonSummary, lessonModal, fetchLessonSummary]);

  // Auto-dismiss error banner after 5 seconds
  useEffect(() => {
    if (!lessonSummaryErrorShownAt) return;
    const DISMISS_AFTER_MS = 5000;
    if (Date.now() - lessonSummaryErrorShownAt < DISMISS_AFTER_MS) {
      const remaining = DISMISS_AFTER_MS - (Date.now() - lessonSummaryErrorShownAt);
      const timer = window.setTimeout(() => {
        setLessonSummaryErrorShownAt(null);
      }, remaining);
      return () => window.clearTimeout(timer);
    } else {
      setLessonSummaryErrorShownAt(null);
    }
  }, [lessonSummaryErrorShownAt]);

  // Heartbeat effect for video/text lessons
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
  }, [lessonModal, courseId, token, progress, course, postHeartbeat, syncCountdownBaseline, tryCompleteLesson]);

  // Countdown animation effect
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
  }, [lessonModal]);

  // Animated modules effect
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

  // Link geometries effect
  useLayoutEffect(() => {
    if (!course?.modules?.length || !roadmapRef.current) {
      setLinkGeoms([]);
      return;
    }

    const compute = () => {
      const host = roadmapRef.current;
      if (!host) return;
      const dirFromClockwiseDeg = (deg: number) => {
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
        const isOddToEvenPair = i % 2 === 0;
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

  // Quiz preview effect
  useEffect(() => {
    if (!quizStartConfirm) {
      setQuizInfoPreview(null);
      setQuizInfoError(null);
      setQuizInfoLoading(false);
      return;
    }
    let alive = true;
    const loadQuizPreview = async () => {
      setQuizInfoLoading(true);
      setQuizInfoError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.learnerQuizTake(courseId, quizStartConfirm.lessonId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as any)?.message || "Không tải được thông tin quizz.");
        const quiz = (json as any)?.quiz;
        if (!alive) return;
        setQuizInfoPreview({
          lessonId: quizStartConfirm.lessonId,
          title: String(quiz?.title || quizStartConfirm.title || "Quizz"),
          description: quiz?.description || null,
          time_limit_minutes: typeof quiz?.time_limit_minutes === "number" ? quiz.time_limit_minutes : null,
          passing_score: typeof quiz?.passing_score === "number" ? quiz.passing_score : null,
          max_attempts: Number(quiz?.max_attempts || 0),
          attempts_used: Number(quiz?.attempts_used || 0),
          questions_count: Array.isArray(quiz?.questions) ? quiz.questions.length : 0,
        });
      } catch (e: any) {
        if (!alive) return;
        setQuizInfoPreview(null);
        setQuizInfoError(normalizeLearnerErrorMessage(e?.message || "Không tải được thông tin quizz."));
      } finally {
        if (alive) setQuizInfoLoading(false);
      }
    };
    void loadQuizPreview();
    return () => {
      alive = false;
    };
  }, [quizStartConfirm, courseId, token]);

  // ============================================
  // Keyboard shortcuts for navigation (before conditional returns)
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!lessonModal) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape' && lessonModalNavPick) {
        e.preventDefault();
        setLessonModalNavPick(null);
        return;
      }

      const lessonModalNav = lessonModalNavPick ?? lessonModal;
      if (!lessonModalNav) return;

      const courseModules = course?.modules;
      if (!courseModules?.length) return;

      const modules = courseModules;
      const progressUnlocked = progress?.unlocked_lesson_ids ?? [];
      const unlockedSet = new Set<number>(progressUnlocked.map((id: number) => Number(id)));

      const orderedIds: number[] = [];
      const moduleIdByLessonId = new Map<number, number>();
      for (const mod of modules) {
        const sortedLessons = [...(mod.lessons || [])].sort((a, b) => {
          const oa = Number(a.order_index ?? 0);
          const ob = Number(b.order_index ?? 0);
          if (oa !== ob) return oa - ob;
          return Number(a.id) - Number(b.id);
        });
        for (const le of sortedLessons) {
          orderedIds.push(le.id);
          moduleIdByLessonId.set(le.id, mod.id);
        }
      }

      const currentIndex = orderedIds.indexOf(lessonModalNav.lessonId);
      if (currentIndex < 0) return;

      const prevId = currentIndex > 0 ? orderedIds[currentIndex - 1] : null;
      const nextId = currentIndex < orderedIds.length - 1 ? orderedIds[currentIndex + 1] : null;
      const prevModuleId = prevId ? moduleIdByLessonId.get(prevId) ?? null : null;
      const nextModuleId = nextId ? moduleIdByLessonId.get(nextId) ?? null : null;

      const checkCanOpen = (mId: number, lId: number | null): boolean => {
        if (!lId) return false;
        const m = modules.find((x) => x.id === mId);
        if (!m) return false;
        const idx = modules.findIndex((x) => x.id === mId);
        const lids = (m.lessons || []).map((l) => l.id);
        const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
        const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();
        const anyUnlocked = lids.some((id) => unlockedSet.has(id));
        const moduleUnlocked = progress ? anyUnlocked : idx === 0;
        if (!moduleUnlocked || moduleNotOpenedYet) return false;
        if (progress && !unlockedSet.has(lId)) return false;
        return true;
      };

      const completedIds = new Set<number>((progress?.completed_lesson_ids || []).map((x) => Number(x)));

      const canGoPrev = Boolean(prevId && prevModuleId);
      const canGoNext = Boolean(nextId && nextModuleId && (completedIds.has(nextId) || checkCanOpen(nextModuleId, nextId)));

      if (e.key === 'ArrowLeft' && canGoPrev && !lessonModalNavPick) {
        e.preventDefault();
        const targetModuleId = moduleIdByLessonId.get(prevId!) ?? null;
        if (prevId && targetModuleId) {
          setLessonModal({ moduleId: targetModuleId, lessonId: prevId });
          setCurrentLessonId(prevId);
        }
      } else if (e.key === 'ArrowRight' && canGoNext && !lessonModalNavPick) {
        e.preventDefault();
        const targetModuleId = moduleIdByLessonId.get(nextId!) ?? null;
        if (nextId && targetModuleId) {
          setLessonModal({ moduleId: targetModuleId, lessonId: nextId });
          setCurrentLessonId(nextId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonModal, lessonModalNavPick, setLessonModal, setCurrentLessonId, course, progress]);

  // ============================================
  // CONDITIONAL RETURNS (after all hooks)
  // ============================================
  if (loading && !course) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button" disabled>
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          {/* <AvatarMenu /> */}
        </div>
        <div className="learningPage__loading">Đang tải bản đồ lộ trình...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learningPage">
        <div className="learningPage__topbar">
          <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          {/* <AvatarMenu /> */}
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

  // ============================================
  // COMPUTED VALUES (after conditional returns)
  // ============================================
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
  const nextLessonIdVal = actionableOrdered[1] ?? null;
  const modalLessonIndex = currentLessonId ? orderedLessonIds.indexOf(currentLessonId) : -1;
  const modalPrevLessonId = modalLessonIndex > 0 ? orderedLessonIds[modalLessonIndex - 1] : null;
  const modalNextLessonId = modalLessonIndex >= 0 && modalLessonIndex < orderedLessonIds.length - 1 ? orderedLessonIds[modalLessonIndex + 1] : null;
  const modalPrevModuleId = modalPrevLessonId ? lessonModuleIdById.get(modalPrevLessonId) ?? null : null;
  const modalNextModuleId = modalNextLessonId ? lessonModuleIdById.get(modalNextLessonId) ?? null : null;
  const modalCanGoPrev = Boolean(modalPrevLessonId != null);
  const modalCanGoNext = Boolean(modalNextLessonId && modalNextModuleId && (completedSet.has(modalNextLessonId) || canOpenLesson(modalNextModuleId, modalNextLessonId)));
  const modalLesson = lessonModal ? lessonById.get(lessonModal.lessonId) || null : null;

  const formatSeconds = (input: number): string => {
    const sec = Math.max(0, Number(input || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
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

  const progressPercent2 = typeof progress?.progress_percent === "number"
    ? progress.progress_percent
    : typeof course.enrollment?.progress_percent === "number"
      ? course.enrollment.progress_percent
      : 0;

  const watchedLessons2 = progress?.completed_lessons ?? 0;
  const totalLessons2 = progress?.total_lessons ?? 0;

  function formatTimeVi(date: Date): string {
    try {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

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

  const requestStartQuiz = (lessonId: number, lessonTitle: string) => {
    setQuizStartConfirm({ lessonId, title: lessonTitle || "" });
  };

  const openLessonDetail = (moduleId: number, lessonId: number) => {
    setQuizStartConfirm(null);
    setLessonModalNavPick(null);
    setLessonModal({ moduleId, lessonId });
  };

  const navigateToPrevLesson = (targetLessonId: number | null) => {
    if (!targetLessonId) return;
    const targetModuleId = lessonModuleIdById.get(targetLessonId);
    if (!targetModuleId) return;
    setLessonModalNavPick(null);
    setCurrentLessonId(targetLessonId);
    const le = lessonById.get(targetLessonId);
    const assessmentKinds = lessonAssessmentKindsById.get(targetLessonId) || [];
    if (!assessmentKinds.length) {
      openLessonDetail(targetModuleId, targetLessonId);
      return;
    }
    if (assessmentKinds.length === 1) {
      if (assessmentKinds[0] === "quiz") {
        requestStartQuiz(targetLessonId, le?.title || "");
        setLessonModal(null);
      } else {
        openLearnerAssessmentInNewTab("assignment", targetLessonId, le?.title || "");
        setLessonModal(null);
        void fetchProgress();
      }
      return;
    }
    setLessonModalNavPick({
      moduleId: targetModuleId,
      lessonId: targetLessonId,
      options: assessmentKinds,
    });
  };

  const navigateToNextLesson = (targetLessonId: number | null) => {
    if (!targetLessonId) return;
    const targetModuleId = lessonModuleIdById.get(targetLessonId);
    if (!targetModuleId) return;
    const isCompleted = completedSet.has(targetLessonId);
    if (!isCompleted && !canOpenLesson(targetModuleId, targetLessonId)) return;
    setLessonModalNavPick(null);
    setCurrentLessonId(targetLessonId);
    const le = lessonById.get(targetLessonId);
    const assessmentKinds = lessonAssessmentKindsById.get(targetLessonId) || [];
    if (!assessmentKinds.length) {
      openLessonDetail(targetModuleId, targetLessonId);
      return;
    }
    if (assessmentKinds.length === 1) {
      if (assessmentKinds[0] === "quiz") {
        requestStartQuiz(targetLessonId, le?.title || "");
        setLessonModal(null);
      } else {
        openLearnerAssessmentInNewTab("assignment", targetLessonId, le?.title || "");
        setLessonModal(null);
        void fetchProgress();
      }
      return;
    }
    setLessonModalNavPick({
      moduleId: targetModuleId,
      lessonId: targetLessonId,
      options: assessmentKinds,
    });
  };

  // EmptyState component for better UX
  const EmptyState = ({
    icon,
    title,
    description,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }) => (
    <div className="learningPage__emptyState">
      <div className="learningPage__emptyStateIcon">{icon}</div>
      <h3 className="learningPage__emptyStateTitle">{title}</h3>
      <p className="learningPage__emptyStateDescription">{description}</p>
    </div>
  );

  // Skeleton loader for loading states
  const SkeletonLoader = () => (
    <div className="learningPage__lessonModalEmpty">
      <div className="learningPage__skeleton learningPage__skeletonTitle" />
      <div className="learningPage__skeleton learningPage__skeletonText" />
      <div className="learningPage__skeleton learningPage__skeletonText" />
      <div className="learningPage__skeleton learningPage__skeletonText" />
    </div>
  );

  // Render AI Summary content component
  const renderAISummary = () => {
    if (isSummaryCollapsed) return null;
    
    if (!modalLesson || modalLesson.lesson_type === "quiz" || modalLesson.lesson_type === "assignment") {
      return (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Tóm tắt AI"
          description="Tính năng tóm tắt AI chỉ khả dụng cho bài học video hoặc văn bản."
        />
      );
    }

    const summaryStatusClass = lessonSummary?.status === "pending" || lessonSummary?.status === "processing"
      ? "learningPage__aiSummary--processing"
      : lessonSummary?.status === "succeeded" && lessonSummary?.overall_summary
        ? "learningPage__aiSummary--ready"
        : "";

    return (
      <div className={`learningPage__aiSummary ${summaryStatusClass}`}>
        <div className="learningPage__aiSummaryHeader">
          <div className="learningPage__aiSummaryTitle">
            Tóm tắt AI
            <span
              className={`learningPage__aiSummaryDot ${
                lessonSummaryErrorShownAt
                  ? "is-error"
                  : lessonSummary?.status === "pending" || lessonSummary?.status === "processing"
                  ? "is-processing"
                  : lessonSummary?.source_ready
                  ? "is-ready"
                  : "is-not-ready"
              }`}
              title={
                lessonSummaryErrorShownAt
                  ? `Lỗi: ${lessonSummary?.error_message || "Không rõ"}`
                  : lessonSummary?.status === "pending" || lessonSummary?.status === "processing"
                  ? "Hệ thống đang trích xuất nguồn text"
                  : lessonSummary?.source_ready
                  ? "Nguồn text đã sẵn sàng cho LLM"
                  : "Nguồn text chưa sẵn sàng cho LLM"
              }
              aria-label={
                lessonSummaryErrorShownAt
                  ? `Lỗi: ${lessonSummary?.error_message || "Không rõ"}`
                  : lessonSummary?.status === "pending" || lessonSummary?.status === "processing"
                  ? "Hệ thống đang trích xuất nguồn text"
                  : lessonSummary?.source_ready
                  ? "Nguồn text đã sẵn sàng cho LLM"
                  : "Nguồn text chưa sẵn sàng cho LLM"
              }
            />
          </div>
          <div className="learningPage__aiSummaryActions">
            <button
              type="button"
              className="learningPage__lessonModalActBtn"
              disabled={
                !lessonModal ||
                lessonSummaryMutating ||
                lessonSummary?.status === "processing" ||
                lessonSummary?.status === "pending"
              }
              onClick={() => {
                if (!lessonModal) return;
                const hasExisting =
                  (lessonSummary?.status === "succeeded" || lessonSummary?.status === "failed") &&
                  Boolean(lessonSummary?.overall_summary);
                void requestLessonSummary(lessonModal.lessonId, hasExisting);
              }}
            >
              {lessonSummaryMutating ? (
                <span className="learningPage__aiSummaryLoading">
                  <Loader2 size={14} className="learningPage__aiSummarySpinner" />
                  Đang tạo...
                </span>
              ) : lessonSummary?.status === "succeeded" && lessonSummary?.overall_summary ? (
                "Tạo lại"
              ) : (
                "Tạo tóm tắt"
              )}
            </button>
          </div>
        </div>

        {lessonSummary?.status === "pending" || lessonSummary?.status === "processing" ? (
          <div className="learningPage__aiSummaryStatus">
            <Loader2 size={16} className="learningPage__aiSummarySpinner" />
            <span>
              {lessonSummary?.status === "pending" && !lessonSummary?.source_ready
                ? "Đang transcript video, vui lòng đợi..."
                : lessonSummary?.status === "pending" && lessonSummary?.source_ready
                ? "Đang chờ tạo tóm tắt..."
                : "Đang tạo tóm tắt bằng AI..."}
            </span>
          </div>
        ) : null}

        {lessonSummary?.status !== "pending" &&
        lessonSummary?.status !== "processing" &&
        !lessonSummary?.overall_summary &&
        lessonSummary?.source_ready &&
        !lessonSummaryErrorShownAt ? (
          <div className="learningPage__aiSummaryStatus learningPage__aiSummaryStatus--ready">
            <span className="material-symbols-outlined">check_circle</span>
            <span>Transcript đã sẵn sàng. Nhấn "Tạo tóm tắt" để bắt đầu.</span>
          </div>
        ) : null}

        {lessonSummary?.status === "failed" && lessonSummaryErrorShownAt ? (
          <div className="learningPage__aiSummaryError">
            <span className="material-symbols-outlined">error</span>
            <span>
              {lessonSummary.error_message?.toLowerCase().includes("fetch failed") ||
              lessonSummary.error_message?.toLowerCase().includes("all model") ||
              lessonSummary.error_message?.toLowerCase().includes("key đều thất bại") ||
              lessonSummary.error_message?.toLowerCase().includes("model/key")
                ? "Hệ thống lỗi, vui lòng thử lại sau ít phút nữa."
                : lessonSummary.error_message || "Đã xảy ra lỗi. Vui lòng thử lại."}
            </span>
          </div>
        ) : null}

        {lessonSummary?.status === "succeeded" && lessonSummary.overall_summary ? (
          <div className="learningPage__aiSummaryResult">
            {lessonSummary.overall_summary && (
              <div className="learningPage__aiSummarySection">
                <div className="learningPage__aiSummarySectionTitle">
                  <span className="material-symbols-outlined">article</span>
                  Tóm tắt tổng quát
                </div>
                <p className="learningPage__aiSummaryText">{lessonSummary.overall_summary}</p>
              </div>
            )}

            {lessonSummary.key_points && lessonSummary.key_points.length > 0 && (
              <div className="learningPage__aiSummarySection">
                <div className="learningPage__aiSummarySectionTitle">
                  <span className="material-symbols-outlined">lightbulb</span>
                  Điểm chính
                </div>
                <ul className="learningPage__aiSummaryList">
                  {lessonSummary.key_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {lessonSummary.segments && lessonSummary.segments.length > 0 && (
              <div className="learningPage__aiSummarySection">
                <button
                  className="learningPage__segmentsToggle"
                  onClick={() => setLessonSummarySegmentsExpanded((v) => !v)}
                  aria-expanded={lessonSummarySegmentsExpanded}
                  type="button"
                >
                  <div className="learningPage__aiSummarySectionTitle">
                    <span className="material-symbols-outlined">format_list_numbered</span>
                    Chi tiết theo phần
                  </div>
                  <span className={`learningPage__segmentsChevron ${lessonSummarySegmentsExpanded ? "learningPage__segmentsChevron--open" : ""}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>
                <div className={`learningPage__aiSummarySegments ${lessonSummarySegmentsExpanded ? "learningPage__aiSummarySegments--expanded" : ""}`}>
                  {lessonSummary.segments.map((segment) => (
                    <div key={segment.segment_index} className="learningPage__aiSummarySegment">
                      <div className="learningPage__aiSummarySegmentHeader">
                        <span className="learningPage__aiSummarySegmentIndex">
                          Phần {segment.segment_index}
                        </span>
                        {segment.start_sec !== null && segment.end_sec !== null && (
                          <span className="learningPage__aiSummarySegmentTime">
                            {Math.floor(segment.start_sec / 60)}:
                            {String(segment.start_sec % 60).padStart(2, "0")} -{" "}
                            {Math.floor(segment.end_sec / 60)}:
                            {String(segment.end_sec % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      {segment.summary_text && (
                        <p className="learningPage__aiSummarySegmentText">
                          {segment.summary_text}
                        </p>
                      )}
                      {segment.keywords && segment.keywords.length > 0 && (
                        <div className="learningPage__aiSummaryKeywords">
                          {segment.keywords.map((kw, i) => (
                            <span key={i} className="learningPage__aiSummaryKeyword">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          lessonSummary?.status !== "pending" &&
          lessonSummary?.status !== "processing" &&
          !lessonSummary?.error_message &&
          !lessonSummary?.source_ready && (
            <div className="learningPage__aiSummaryMuted">
              Transcript chưa sẵn sàng. Vui lòng chờ video được xử lý.
            </div>
          )
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RETURN with JSX
  // ============================================
  // Breadcrumb data
  const courseTitle = course?.title ?? "";
  const currentModule = modules.find((m) => lessonModal && lessonModuleIdById.get(lessonModal.lessonId) === m.id);
  const moduleLabel = currentModule ? `Chương ${(modules.indexOf(currentModule) + 1)}: ${currentModule.title}` : "";
  const lessonTitle = modalLesson?.title ?? "";
  // ============================================
  return (
    <div className="learningPage">
      <div className="learningPage__topbar">
        <button className="learningPage__back" onClick={() => navigate(`/my-courses/${courseId}/${slug || ""}`)} type="button">
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>
        <div className="learningPage__topbarCenter">
          <div className="learningPage__title">{course.title}</div>
          <div className="learningPage__meta">
            Đã hoàn thành <b>{completedLessons}</b>/<b>{totalLessons}</b> bài học · Tiến độ tổng <b>{progressPercent}%</b>
          </div>
          <div className="learningPage__progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <div className="learningPage__progressFill" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
          </div>
        </div>
        {/* <AvatarMenu /> */}
      </div>

      <div className="learningPage__body">
          {/* <div className="lw-crumbs">
            <span className="lw-crumb">{courseTitle}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="lw-crumb-sep" />
            <span className="lw-crumb">{moduleLabel}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="lw-crumb-sep" />
            <span className="lw-crumb lw-crumb--active">{lessonTitle}</span>
          </div> */}

        <section className="learningPage__split">
          {/* Left Pane - Tree */}
          <aside className={`learningPage__treePane ${isTreeCollapsed ? "learningPage__treePane--collapsed" : ""}`} style={treePaneStyle}>
            <div className="learningPage__treeHeader">
              {!isTreeCollapsed && <div className="learningPage__treeTitle">Cây nội dung</div>}
              <button
                className="learningPage__toggleBtn learningPage__toggleBtn--tree"
                onClick={toggleTreeCollapse}
                title={isTreeCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                <span className="material-symbols-outlined">
                  {isTreeCollapsed ? "chevron_right" : "chevron_left"}
                </span>
              </button>
            </div>
            <div className={`learningPage__treeContent ${isTreeCollapsed ? "learningPage__treeContent--collapsed" : ""}`}>
              <div className="content-simple-tree learningPage__treeLike">
                <ul className="tree-root">
                  {modules.map((m, moduleIdx) => {
                    const sortedLessons = [...(m.lessons || [])].sort((a, b) => {
                      const oa = Number(a.order_index ?? 0);
                      const ob = Number(b.order_index ?? 0);
                      if (oa !== ob) return oa - ob;
                      return Number(a.id) - Number(b.id);
                    });
                    return (
                      <li key={m.id} className="tree-node module-node">
                        <div className="tree-title-row">
                          <span className="tree-review-status-wrap">
                            <span className="material-symbols-outlined review-status-icon empty" title="Chương">folder</span>
                          </span>
                          <div className="tree-title">Chương {moduleIdx + 1}: {m.title}</div>
                        </div>
                        <ul className="tree-children">
                          {sortedLessons.map((le) => {
                            const canClick = canOpenLesson(m.id, le.id);
                            const isActive = lessonModal?.lessonId === le.id;
                            const lessonTypeBadge =
                              le.lesson_type === "quiz"
                                ? { icon: "quiz", className: "is-quiz", title: "Quizz" }
                                : le.lesson_type === "assignment"
                                  ? { icon: "assignment", className: "is-assignment", title: "Bài tập" }
                                  : { icon: "menu_book", className: "is-content", title: "Bài học" };
                            return (
                              <li key={le.id} className="tree-node lesson-node">
                                <div className="tree-title-row">
                                  <span className="tree-review-status-wrap">
                                    <span
                                      className={`tree-lesson-type-icon ${lessonTypeBadge.className}`}
                                      title={lessonTypeBadge.title}
                                    >
                                      <span className="material-symbols-outlined">{lessonTypeBadge.icon}</span>
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className={`tree-title lesson-link learningPage__treeLessonBtn ${isActive ? "learningPage__treeLessonBtn--active" : ""}`}
                                    disabled={!canClick}
                                    onClick={() => {
                                      setLessonModalNavPick(null);
                                      setCurrentLessonId(le.id);
                                      if (le.lesson_type === "quiz") {
                                        requestStartQuiz(le.id, le.title || "");
                                        setLessonModal(null);
                                        return;
                                      }
                                      if (le.lesson_type === "assignment") {
                                        openLearnerAssessmentInNewTab("assignment", le.id, le.title || "");
                                        setLessonModal(null);
                                        void fetchProgress();
                                        return;
                                      }
                                      openLessonDetail(m.id, le.id);
                                    }}
                                    title={canClick ? le.title : "Bài học chưa mở"}
                                  >
                                    {le.title}
                                  </button>
                                  {!canClick ? (
                                    <span className="tree-schedule-chip">Bị khóa</span>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>

          {/* Resizer between Tree and Content */}
          <div
            className={`learningPage__resizer ${isResizingTree ? "learningPage__resizer--active" : ""}`}
            onMouseDown={startResizeTree}
          />

          {/* Center Pane - Content */}
          <article className="learningPage__contentPane">
            {/* Header */}
            <div className="learningPage__lessonModalHeader">
              {/* <div className="learningPage__lessonModalTitle">
                {modalLesson?.title || "Chọn một mục từ cây nội dung"}
              </div> */}
              <div className="learningPage__lessonModalActions">
                {(() => {
                  const kinds = lessonModal ? lessonAssessmentKindsById.get(lessonModal.lessonId) || [] : [];
                  return kinds.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="learningPage__lessonModalActBtn"
                      onClick={() => {
                        if (!lessonModal) return;
                        if (k === "quiz") {
                          requestStartQuiz(lessonModal.lessonId, modalLesson?.title || "");
                        } else {
                          openLearnerAssessmentInNewTab("assignment", lessonModal.lessonId, modalLesson?.title || "");
                          void fetchProgress();
                        }
                      }}
                    >
                      {k === "quiz" ? "Quizz" : "Bài tập"}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Video Player */}
            {lessonModal && lessonModalResources.some(r => {
              const ytId = parseYoutubeVideoId(r.url);
              const mime = (r.mime || "").toLowerCase();
              const isVideo = mime.startsWith("video/") || r.resourceKind === "video" || r.resourceKind === "youtube" || r.resourceType === "video";
              return ytId || isVideo;
            }) && (
              <div className="learningPage__video">
                {( () => {
                  const ytResource = lessonModalResources.find(r => parseYoutubeVideoId(r.url));
                  const videoResource = lessonModalResources.find(r => {
                    const mime = (r.mime || "").toLowerCase();
                    return mime.startsWith("video/") || r.resourceKind === "video" || r.resourceType === "video";
                  });
                  const videoSrc = videoResource?.url || null;
                  const ytId = ytResource ? parseYoutubeVideoId(ytResource.url) : null;
                  return { videoSrc, ytId, ytResource };
                })().ytId ? (
                  <iframe
                    className="learningPage__lessonModalFrame learningPage__lessonModalFrame--youtube"
                    src={`https://www.youtube.com/embed/${( () => {
                      const ytResource = lessonModalResources.find(r => parseYoutubeVideoId(r.url));
                      const ytId = ytResource ? parseYoutubeVideoId(ytResource.url) : null;
                      return ytId;
                    })()}?autoplay=1&rel=0`}
                    title={modalLesson?.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : ( () => {
                  const videoResource = lessonModalResources.find(r => {
                    const mime = (r.mime || "").toLowerCase();
                    return mime.startsWith("video/") || r.resourceKind === "video" || r.resourceType === "video";
                  });
                  return videoResource?.url || null;
                })() ? (
                  <video
                    className="learningPage__lessonModalVideo"
                    src={(() => {
                      const videoResource = lessonModalResources.find(r => {
                        const mime = (r.mime || "").toLowerCase();
                        return mime.startsWith("video/") || r.resourceKind === "video" || r.resourceType === "video";
                      });
                      return videoResource?.url ?? undefined;
                    })()}
                    controls
                    autoPlay
                  />
                ) : null}
              </div>
            )}

            {/* Tabs */}
            <div className="learningPage__tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`learningPage__tab ${activeTab === tab.key ? "learningPage__tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="learningPage__tabs-body">
              {/* Quiz Start Confirm — show above content regardless of tab */}
              {quizStartConfirm && (
                <div className="learningPage__quizSideCard">
                  <div className="learningPage__quizSideTitle">Thông tin Quizz</div>
                  {quizInfoLoading ? (
                    <div className="learningPage__quizSideMsg">Đang tải thông tin...</div>
                  ) : quizInfoError ? (
                    <div className="learningPage__quizSideMsg learningPage__quizSideMsg--error">{quizInfoError}</div>
                  ) : quizInfoPreview ? (
                    <>
                      <div className="learningPage__quizSideName">{quizInfoPreview.title}</div>
                      {quizInfoPreview.description ? (
                        <div className="learningPage__quizSideDesc">{quizInfoPreview.description}</div>
                      ) : null}
                      <div className="learningPage__quizSideMeta">
                        <div>Số câu hỏi: <b>{quizInfoPreview.questions_count}</b></div>
                        <div>Thời gian: <b>{quizInfoPreview.time_limit_minutes != null ? `${quizInfoPreview.time_limit_minutes} phút` : "Không giới hạn"}</b></div>
                        <div>Điểm đạt: <b>{quizInfoPreview.passing_score != null ? `${quizInfoPreview.passing_score}%` : "Không yêu cầu"}</b></div>
                        <div>Số lượt còn lại: <b>{Math.max(0, quizInfoPreview.max_attempts - quizInfoPreview.attempts_used)}</b>/{quizInfoPreview.max_attempts}</div>
                      </div>
                      <div className="learningPage__quizSideActions">
                        <button type="button" className="learningPage__lessonModalNavBtn" onClick={() => setQuizStartConfirm(null)}>Hủy</button>
                        <button
                          type="button"
                          className="learningPage__lessonModalActBtn learningPage__lessonModalActBtn--primary"
                          onClick={() => {
                            openLearnerAssessmentInNewTab("quiz", quizInfoPreview.lessonId, quizInfoPreview.title || "");
                            setQuizStartConfirm(null);
                            void fetchProgress();
                          }}
                        >
                          {quizInfoPreview.attempts_used >= quizInfoPreview.max_attempts ? "Xem kết quả" : "Bắt đầu làm bài"}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Lesson Content tab */}
              {activeTab === "content" && currentLessonType && (currentLessonType === "video" || currentLessonType === "text") && (
                <div className="learningPage__lessonContentGrid">
                  <div className="learningPage__lesson">
                    <h1 className="learningPage__lessonTitle">{modalLesson?.title}</h1>
                    {lessonHtmlLoading ? (
                      <SkeletonLoader />
                    ) : modalLesson?.description || lessonHtmlContent ? (
                      <div className="learningPage__lessonBody">
                        {modalLesson?.description ? (
                          <p>{modalLesson.description}</p>
                        ) : null}
                        {lessonHtmlContent ? (
                          <div className="learningPage__richPreview" dangerouslySetInnerHTML={{ __html: lessonHtmlContent }} />
                        ) : null}
                      </div>
                    ) : (
                      <div className="learningPage__lessonBody">
                        <EmptyState
                          icon={<FileQuestion size={40} />}
                          title="Chưa có mô tả"
                          description="Bài học này chưa có nội dung mô tả."
                        />
                      </div>
                    )}
                    <div className="learningPage__tags">
                      <span className="learningPage__tag">
                        {modalLesson?.lesson_type === "video" ? "Video" : "Văn bản"}
                      </span>
                    </div>
                  </div>
                  {/* <aside className="learningPage__lessonProgressCard">
                    <h4 className="learningPage__lessonProgressTitle">Tiến độ bài học</h4>
                    <div className="learningPage__lessonProgressRow">
                      <span>Hoàn thành khóa học</span>
                      <span className="learningPage__lessonProgressValue">{progressPercent}%</span>
                    </div>
                    <div className="learningPage__lessonProgressTrack">
                      <div className="learningPage__lessonProgressFill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="learningPage__lessonProgressHint">
                      {progressPercent >= 100
                        ? "Bạn đã hoàn thành khóa học!"
                        : "Hoàn thành mỗi bài học để mở khóa bài kiểm tra cuối khóa."}
                    </p>
                  </aside> */}
                </div>
              )}

              {/* Resources tab */}
              {activeTab === "resources" && (
                <div className="learningPage__tabPanel">
                  {lessonModalResources.length > 0 ? (
                    <div className="learningPage__lessonModalResources">
                      {lessonModalResources.map((resource, index) => {
                        const ytId = parseYoutubeVideoId(resource.url);
                        const mime = (resource.mime || "").toLowerCase();
                        const isVideo = mime.startsWith("video/") || resource.resourceKind === "video" || resource.resourceKind === "youtube" || resource.resourceType === "video";
                        const isPdfOrWord = mime.includes("pdf") || mime.includes("word") || mime.includes("document") || resource.resourceKind === "pdf" || resource.resourceKind === "word";

                        if (ytId || isVideo) return null;

                        if (isPdfOrWord) {
                          return (
                            <div key={resource.resourceId || index} className="learningPage__lessonModalResourceItem learningPage__lessonModalResourceItem--download">
                              <span className="material-symbols-outlined">description</span>
                              <span className="learningPage__lessonModalFileName">{resource.filename}</span>
                              <a href={resource.url} target="_blank" rel="noreferrer" className="learningPage__lessonModalDownloadBtn">
                                <span className="material-symbols-outlined">download</span>
                              </a>
                            </div>
                          );
                        }

                        return (
                          <div key={resource.resourceId || index} className="learningPage__lessonModalResourceItem learningPage__lessonModalResourceItem--download">
                            <span className="material-symbols-outlined">attach_file</span>
                            <span className="learningPage__lessonModalFileName">{resource.filename}</span>
                            <a href={resource.url} target="_blank" rel="noreferrer" className="learningPage__lessonModalDownloadBtn">
                              <span className="material-symbols-outlined">download</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FileQuestion size={40} />}
                      title="Chưa có tài nguyên"
                      description="Bài học này chưa có tài liệu đính kèm."
                    />
                  )}
                </div>
              )}

              {/* Discussion tab */}
              {activeTab === "discussion" && (
                <div className="learningPage__tabPanel">
                  <EmptyState
                    icon={<BrainCircuit size={40} />}
                    title="Thảo luận bài học"
                    description="Tính năng thảo luận đang được phát triển. Hãy quay lại sau!"
                  />
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="learningPage__lessonModalNav">
              <button
                type="button"
                className="learningPage__lessonModalNavBtn"
                disabled={!modalCanGoPrev}
                onClick={() => navigateToPrevLesson(modalPrevLessonId)}
                aria-label="Bài học trước"
              >
                <ChevronLeft size={18} />
                <span>Bài trước</span>
              </button>
              <span className="learningPage__lessonModalNavPosition">
                {modalLessonIndex >= 0 ? `${modalLessonIndex + 1} / ${orderedLessonIds.length}` : ''}
              </span>
              {lessonModalNavPick ? (
                <div className="learningPage__lessonModalNavPick">
                  <span className="learningPage__lessonModalNavPickLabel">Chọn đích:</span>
                  {lessonModalNavPick.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="learningPage__lessonModalNavPickBtn"
                      onClick={() => {
                        if (opt === "quiz") {
                          requestStartQuiz(lessonModalNavPick.lessonId, lessonById.get(lessonModalNavPick.lessonId)?.title || "");
                        } else {
                          openLearnerAssessmentInNewTab("assignment", lessonModalNavPick.lessonId, lessonById.get(lessonModalNavPick.lessonId)?.title || "");
                        }
                        setLessonModalNavPick(null);
                        if (opt !== "quiz") void fetchProgress();
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
                onClick={() => navigateToNextLesson(modalNextLessonId)}
                aria-label="Bài học tiếp theo"
              >
                <span>Bài tiếp</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </article>

          {/* Resizer between Content and Summary */}
          <div
            className={`learningPage__resizer ${isResizingSummary ? "learningPage__resizer--active" : ""}`}
            onMouseDown={startResizeSummary}
          />

          {/* Right Pane - AI Summary */}
          <aside className={`learningPage__aiSummaryPane ${isSummaryCollapsed ? "learningPage__aiSummaryPane--collapsed" : ""}`} style={summaryPaneStyle}>
            <div className="learningPage__aiSummaryPaneTitle">
              {!isSummaryCollapsed && (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Tóm tắt thông minh
                </>
              )}
              <button
                className="learningPage__toggleBtn learningPage__toggleBtn--summary"
                onClick={toggleSummaryCollapse}
                title={isSummaryCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                <span className="material-symbols-outlined">
                  {isSummaryCollapsed ? "chevron_left" : "chevron_right"}
                </span>
              </button>
            </div>
            <div className={`learningPage__aiSummaryContent ${isSummaryCollapsed ? "learningPage__aiSummaryContent--collapsed" : ""}`}>
              {renderAISummary()}
            </div>
          </aside>
        </section>
      </div>

      {lessonModal && heartbeat && heartbeat.required_seconds > 0 ? (
        <div
          className={`learningPage__countdown ${heartbeat.can_complete ? "learningPage__countdown--ready" : ""}`}
          aria-hidden="true"
          // data-tooltip={heartbeat.can_complete ? "Bài học hoàn thành!" : `Tiến độ xem: ${Math.round(100 - countdownRemainingPct)}%`}
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