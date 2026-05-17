import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { useAuth } from "../../contexts/Auth";
import TeacherShell from "../../components/TeacherShell";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";

type LessonRow = {
  id: number;
  title: string;
  moduleId: number;
  moduleTitle: string;
  has_assignment: boolean;
  has_quiz: boolean;
};

type SubmissionItem = {
  submission_id: number;
  status: string;
  submitted_at: string | null;
  is_late: boolean;
  graded_score: number | null;
  feedback_text: string | null;
  content_preview: string;
  attachment_count: number;
  attachment_files?: { file_name: string; file_path: string }[];
  submission_short_answers?: { question_id: string; answer_text: string }[];
};

type RosterLearner = {
  user_id: number;
  email: string;
  full_name: string;
  has_submitted: boolean;
  submission: SubmissionItem | null;
};

type AssignmentRosterPayload = {
  assignment: { id: number; title: string; max_score: number } | null;
  learners: RosterLearner[];
};

type QuizAttempt = {
  attempt_id: number;
  attempt_number: number;
  score: number | null;
  is_passed: boolean | null;
  submitted_at: string | null;
  status: string;
};

type QuizLearner = {
  user_id: number;
  email: string;
  full_name: string;
  attempts: QuizAttempt[];
};

type QuizScoresPayload = {
  quiz: {
    id: number;
    title: string;
    passing_score: number | null;
    max_attempts: number;
  } | null;
  learners: QuizLearner[];
};

type QuizAttemptDetailPayload = {
  attempt_id: number;
  attempt_number: number;
  user_id: number;
  user_full_name: string;
  user_email: string;
  score: number | null;
  is_passed: boolean | null;
  submitted_at: string | null;
  status: string;
  show_correct_answers: boolean;
  questions: {
    quiz_question_id: number;
    order_index: number;
    question_text: string;
    points: number;
    selected_option_id: number | null;
    selected_option_text: string | null;
    is_correct: boolean | null;
    options: {
      id: number;
      option_text: string;
      is_correct: boolean;
      is_selected: boolean;
    }[];
  }[];
};

type QueueItem = {
  kind: "assignment" | "quiz";
  keyId: number;
  lessonId: number;
  lessonTitle: string;
  moduleTitle: string;
  title: string;
  maxScore: number | null;
  learnerName: string;
  learnerEmail: string;
  assignmentSubmission?: SubmissionItem;
  quizAttempts?: QuizAttempt[];
  quizPassingScore?: number | null;
};

type GradeFilter = "all" | "ungraded" | "graded" | "late";
type ContentTypeFilter = "all" | "assignment" | "quiz";

export default function TeacherGradingCenterPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const { accessToken: token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [rostersByLesson, setRostersByLesson] = useState<Record<number, AssignmentRosterPayload>>({});
  const [quizScoresByLesson, setQuizScoresByLesson] = useState<Record<number, QuizScoresPayload>>({});

  const [q, setQ] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>("all");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [lessonFilter, setLessonFilter] = useState<number | "all">("all");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("ungraded");
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null);
  const [selectedQuizAttemptId, setSelectedQuizAttemptId] = useState<number | null>(null);
  const [quizAttemptDetail, setQuizAttemptDetail] = useState<QuizAttemptDetailPayload | null>(null);
  const [quizAttemptDetailLoading, setQuizAttemptDetailLoading] = useState(false);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadLessonRoster = useCallback(
    async (lesson: LessonRow): Promise<[number, AssignmentRosterPayload | null]> => {
      if (!lesson.has_assignment) return [lesson.id, null];
      const res = await fetch(`${url}${ASSIGNMENTS_API.assignmentLearnerRoster(lesson.id)}`, {
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không tải được danh sách bài nộp.");
      const data = (((json as any)?.data ?? json) || null) as AssignmentRosterPayload | null;
      return [lesson.id, data];
    },
    [authHeaders]
  );

  const loadLessonQuizScores = useCallback(
    async (lesson: LessonRow): Promise<[number, QuizScoresPayload | null]> => {
      if (!lesson.has_quiz) return [lesson.id, null];
      const res = await fetch(`${url}${COURSES_API.quizLearnerScores(courseId, lesson.id)}`, {
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không tải được điểm quiz.");
      const data = (((json as any)?.data ?? json) || null) as QuizScoresPayload | null;
      return [lesson.id, data];
    },
    [authHeaders, courseId]
  );

  const load = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const [detRes, treeRes] = await Promise.all([
        fetch(`${url}${COURSES_API.detail(courseId)}`, { headers: authHeaders }),
        fetch(`${url}${COURSES_API.contentTree(courseId)}`, { headers: authHeaders }),
      ]);
      const det = await detRes.json().catch(() => ({}));
      const tree = await treeRes.json().catch(() => ({}));
      if (!detRes.ok) throw new Error((det as any)?.message || "Không tải được khóa học.");
      if (!treeRes.ok) throw new Error((tree as any)?.message || "Không tải được cây nội dung.");
      setCourseTitle(String((det as any)?.title || ""));

      const parsedLessons: LessonRow[] = [];
      ((tree as any)?.modules || []).forEach((m: any) => {
        ((m?.lessons as any[]) || []).forEach((l: any) => {
          parsedLessons.push({
            id: Number(l.id),
            title: String(l.title || `Bài ${l.id}`),
            moduleId: Number(m.id),
            moduleTitle: String(m.title || `Chương ${m.id}`),
            has_assignment: Boolean(l.has_assignment),
            has_quiz: Boolean(l.has_quiz),
          });
        });
      });
      setLessons(parsedLessons);

      const rosterEntries = await Promise.all(parsedLessons.filter((x) => x.has_assignment).map((lesson) => loadLessonRoster(lesson)));
      const rosterMap: Record<number, AssignmentRosterPayload> = {};
      rosterEntries.forEach(([lessonId, payload]) => {
        if (payload) rosterMap[lessonId] = payload;
      });
      setRostersByLesson(rosterMap);

      const quizEntries = await Promise.all(parsedLessons.filter((x) => x.has_quiz).map((lesson) => loadLessonQuizScores(lesson)));
      const quizMap: Record<number, QuizScoresPayload> = {};
      quizEntries.forEach(([lessonId, payload]) => {
        if (payload) quizMap[lessonId] = payload;
      });
      setQuizScoresByLesson(quizMap);
    } catch (e: any) {
      setError(e?.message || "Không thể tải trung tâm chấm điểm.");
      setLessons([]);
      setRostersByLesson({});
      setQuizScoresByLesson({});
    } finally {
      setLoading(false);
    }
  }, [authHeaders, courseId, loadLessonQuizScores, loadLessonRoster]);

  useEffect(() => {
    void load();
  }, [load]);

  const queue = useMemo<QueueItem[]>(() => {
    const all: QueueItem[] = [];
    for (const lesson of lessons) {
      if (lesson.has_assignment) {
        const roster = rostersByLesson[lesson.id];
        const assignment = roster?.assignment;
        if (roster && assignment) {
          for (const learner of roster.learners || []) {
            const sub = learner.submission;
            if (!learner.has_submitted || !sub) continue;
            all.push({
              kind: "assignment",
              keyId: Number(sub.submission_id),
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              moduleTitle: lesson.moduleTitle,
              title: String(assignment.title || "Bài tập"),
              maxScore: Number(assignment.max_score || 10),
              learnerName: String(learner.full_name || ""),
              learnerEmail: String(learner.email || ""),
              assignmentSubmission: sub,
            });
          }
        }
      }
      if (lesson.has_quiz) {
        const quizData = quizScoresByLesson[lesson.id];
        const quiz = quizData?.quiz;
        if (quizData && quiz) {
          for (const learner of quizData.learners || []) {
            if (!Array.isArray(learner.attempts) || learner.attempts.length === 0) continue;
            const sorted = [...learner.attempts].sort(
              (a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
            );
            all.push({
              kind: "quiz",
              keyId: Number(sorted[0].attempt_id),
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              moduleTitle: lesson.moduleTitle,
              title: String(quiz.title || "Quiz"),
              maxScore: 100,
              learnerName: String(learner.full_name || ""),
              learnerEmail: String(learner.email || ""),
              quizAttempts: sorted,
              quizPassingScore: quiz.passing_score,
            });
          }
        }
      }
    }
    return all.sort((a, b) => {
      const aUngraded = a.kind === "assignment" && a.assignmentSubmission?.graded_score == null ? 0 : 1;
      const bUngraded = b.kind === "assignment" && b.assignmentSubmission?.graded_score == null ? 0 : 1;
      if (aUngraded !== bUngraded) return aUngraded - bUngraded;
      const aDate = a.kind === "assignment"
        ? new Date(a.assignmentSubmission?.submitted_at || 0).getTime()
        : new Date(a.quizAttempts?.[0]?.submitted_at || 0).getTime();
      const bDate = b.kind === "assignment"
        ? new Date(b.assignmentSubmission?.submitted_at || 0).getTime()
        : new Date(b.quizAttempts?.[0]?.submitted_at || 0).getTime();
      return bDate - aDate;
    });
  }, [lessons, quizScoresByLesson, rostersByLesson]);

  const filteredQueue = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return queue.filter((item) => {
      if (contentTypeFilter !== "all" && item.kind !== contentTypeFilter) return false;
      if (moduleFilter !== "all") {
        const lesson = lessons.find((x) => x.id === item.lessonId);
        if (!lesson || lesson.moduleId !== moduleFilter) return false;
      }
      if (lessonFilter !== "all" && item.lessonId !== lessonFilter) return false;
      if (item.kind === "assignment") {
        if (gradeFilter === "ungraded" && item.assignmentSubmission?.graded_score != null) return false;
        if (gradeFilter === "graded" && item.assignmentSubmission?.graded_score == null) return false;
        if (gradeFilter === "late" && !item.assignmentSubmission?.is_late) return false;
      } else {
        if (gradeFilter === "ungraded" || gradeFilter === "late") return false;
      }
      if (!keyword) return true;
      return (
        item.learnerName.toLowerCase().includes(keyword) ||
        item.learnerEmail.toLowerCase().includes(keyword) ||
        item.lessonTitle.toLowerCase().includes(keyword) ||
        item.title.toLowerCase().includes(keyword)
      );
    });
  }, [contentTypeFilter, gradeFilter, lessonFilter, lessons, moduleFilter, q, queue]);

  useEffect(() => {
    if (!filteredQueue.length) {
      setSelectedItemKey(null);
      return;
    }
    if (selectedItemKey && filteredQueue.some((x) => `${x.kind}:${x.keyId}` === selectedItemKey)) return;
    setSelectedItemKey(`${filteredQueue[0].kind}:${filteredQueue[0].keyId}`);
  }, [filteredQueue, selectedItemKey]);

  const selectedItem = useMemo(
    () => filteredQueue.find((item) => `${item.kind}:${item.keyId}` === selectedItemKey) || null,
    [filteredQueue, selectedItemKey]
  );

  useEffect(() => {
    if (!selectedItem || selectedItem.kind !== "assignment" || !selectedItem.assignmentSubmission) {
      setScoreDraft("");
      setFeedbackDraft("");
      return;
    }
    setScoreDraft(
      selectedItem.assignmentSubmission.graded_score != null
        ? String(selectedItem.assignmentSubmission.graded_score)
        : ""
    );
    setFeedbackDraft(selectedItem.assignmentSubmission.feedback_text || "");
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem || selectedItem.kind !== "quiz") {
      setSelectedQuizAttemptId(null);
      setQuizAttemptDetail(null);
      return;
    }
    const firstAttemptId = selectedItem.quizAttempts?.[0]?.attempt_id ?? null;
    setSelectedQuizAttemptId(firstAttemptId);
    setQuizAttemptDetail(null);
  }, [selectedItem]);

  useEffect(() => {
    const loadQuizAttemptDetail = async () => {
      if (!selectedItem || selectedItem.kind !== "quiz" || !selectedQuizAttemptId) {
        setQuizAttemptDetail(null);
        return;
      }
      setQuizAttemptDetailLoading(true);
      try {
        const res = await fetch(`${url}${COURSES_API.quizAttemptDetail(courseId, selectedItem.lessonId, selectedQuizAttemptId)}`, {
          headers: authHeaders,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as any)?.message || "Không tải được chi tiết lần làm quiz.");
        const data = (((json as any)?.data ?? json) || null) as QuizAttemptDetailPayload | null;
        setQuizAttemptDetail(data);
      } catch (e: any) {
        setQuizAttemptDetail(null);
        toast.error(e?.message || "Không tải được chi tiết lần làm.");
      } finally {
        setQuizAttemptDetailLoading(false);
      }
    };
    void loadQuizAttemptDetail();
  }, [authHeaders, courseId, selectedItem, selectedQuizAttemptId]);

  const moduleOptions = useMemo(() => {
    const map = new Map<number, string>();
    lessons.forEach((l) => map.set(l.moduleId, l.moduleTitle));
    return Array.from(map.entries()).map(([idValue, title]) => ({ id: idValue, title }));
  }, [lessons]);

  const lessonOptions = useMemo(() => {
    const base = lessons.filter((x) =>
      contentTypeFilter === "all" ? x.has_assignment || x.has_quiz : contentTypeFilter === "assignment" ? x.has_assignment : x.has_quiz
    );
    return moduleFilter === "all" ? base : base.filter((x) => x.moduleId === moduleFilter);
  }, [contentTypeFilter, lessons, moduleFilter]);

  const resolveAttachmentUrl = (path: string): string => {
    if (!path) return "#";
    if (/^https?:\/\//i.test(path)) return path;
    return `${url}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const gradeCurrent = async (moveNext: boolean) => {
    if (!selectedItem || selectedItem.kind !== "assignment" || !selectedItem.assignmentSubmission) {
      toast.error("Quiz chỉ hỗ trợ xem điểm trong màn này.");
      return;
    }
    const submissionId = selectedItem.assignmentSubmission.submission_id;
    const raw = scoreDraft.trim();
    if (raw === "" || Number.isNaN(Number(raw))) {
      toast.error("Vui lòng nhập điểm hợp lệ.");
      return;
    }
    const score = Number(raw);
    const maxScore = Number(selectedItem.maxScore || 10);
    if (score < 0 || score > maxScore) {
      toast.error(`Điểm phải từ 0 đến ${maxScore}.`);
      return;
    }

    setGradingSubmissionId(submissionId);
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.gradeSubmission(submissionId)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          score,
          feedbackText: feedbackDraft.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Chấm điểm thất bại.");

      const lesson = lessons.find((x) => x.id === selectedItem.lessonId && x.has_assignment);
      if (lesson) {
        const [lessonId, payload] = await loadLessonRoster(lesson);
        setRostersByLesson((prev) => {
          const next = { ...prev };
          if (payload) next[lessonId] = payload;
          return next;
        });
      }

      toast.success("Đã lưu điểm.");
      if (moveNext) {
        const idx = filteredQueue.findIndex((x) => `${x.kind}:${x.keyId}` === `${selectedItem.kind}:${selectedItem.keyId}`);
        if (idx >= 0 && idx + 1 < filteredQueue.length) {
          const next = filteredQueue[idx + 1];
          setSelectedItemKey(`${next.kind}:${next.keyId}`);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Không thể lưu điểm.");
    } finally {
      setGradingSubmissionId(null);
    }
  };

  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="teacher-dashboard course-overview-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-title-section">
            <div className="back-nav">
              <button type="button" className="back-btn" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
                <span className="material-symbols-outlined">arrow_back</span>
                Quay lại tổng quan
              </button>
            </div>
            <h1 className="dashboard-title">Trung tâm chấm điểm</h1>
            <p className="dashboard-subtitle">{courseTitle || `Khóa học #${courseId}`} · {filteredQueue.length} mục theo bộ lọc</p>
          </div>
          <AvatarMenu />
        </div>

        {error ? <div className="warning-message">{error}</div> : null}
        {loading ? <div className="loading-state"><p>Đang tải dữ liệu chấm điểm...</p></div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(320px, 420px) minmax(0, 1fr)", gap: 14 }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-icon material-symbols-outlined">filter_alt</span>
              <h3 className="chart-card-title">Bộ lọc</h3>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="Tìm học viên/bài học..." value={q} onChange={(e) => setQ(e.target.value)} />
              <select
                className="search-input"
                value={contentTypeFilter}
                onChange={(e) => {
                  const nextType = e.target.value as ContentTypeFilter;
                  setContentTypeFilter(nextType);
                  setLessonFilter("all");
                  if (nextType === "quiz" && (gradeFilter === "ungraded" || gradeFilter === "late")) {
                    setGradeFilter("all");
                  }
                }}
              >
                <option value="all">Assignment + Quiz</option>
                <option value="assignment">Chỉ Assignment</option>
                <option value="quiz">Chỉ Quiz</option>
              </select>
              <select className="search-input" value={String(moduleFilter)} onChange={(e) => {
                const v = e.target.value;
                setModuleFilter(v === "all" ? "all" : Number(v));
                setLessonFilter("all");
              }}>
                <option value="all">Tất cả chương</option>
                {moduleOptions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <select className="search-input" value={String(lessonFilter)} onChange={(e) => {
                const v = e.target.value;
                setLessonFilter(v === "all" ? "all" : Number(v));
              }}>
                <option value="all">Tất cả bài học</option>
                {lessonOptions.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              <select className="search-input" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as GradeFilter)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="ungraded">Chưa chấm (assignment)</option>
                <option value="graded">Đã có điểm</option>
                <option value="late">Nộp muộn (assignment)</option>
              </select>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-icon material-symbols-outlined">format_list_bulleted</span>
              <h3 className="chart-card-title">Hàng đợi</h3>
            </div>
            <div style={{ display: "grid", gap: 8, maxHeight: 560, overflow: "auto" }}>
              {filteredQueue.map((item) => {
                const itemKey = `${item.kind}:${item.keyId}`;
                const isSelected = itemKey === selectedItemKey;
                const graded = item.kind === "assignment"
                  ? item.assignmentSubmission?.graded_score != null
                  : (item.quizAttempts || []).length > 0;
                const displayTime = item.kind === "assignment"
                  ? item.assignmentSubmission?.submitted_at
                  : item.quizAttempts?.[0]?.submitted_at;
                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => setSelectedItemKey(itemKey)}
                    style={{
                      border: isSelected ? "1px solid #334155" : "1px solid #e2e8f0",
                      background: isSelected ? "#f8fafc" : "#fff",
                      borderRadius: 10,
                      padding: "10px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.learnerName || "Học viên"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.learnerEmail}</div>
                    <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>{item.moduleTitle} / {item.lessonTitle}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span>{displayTime ? new Date(displayTime).toLocaleString("vi-VN") : "—"}</span>
                      <span className={`status-badge ${graded ? "status-badge--published" : "status-badge--draft"}`}>
                        {item.kind === "assignment"
                          ? graded ? `Đã chấm (${item.assignmentSubmission?.graded_score})` : "Chưa chấm"
                          : `Quiz (${item.quizAttempts?.length || 0} lần làm)`}
                      </span>
                      {item.kind === "assignment" && item.assignmentSubmission?.is_late ? <span className="status-badge status-badge--archived">Muộn</span> : null}
                    </div>
                  </button>
                );
              })}
              {!filteredQueue.length ? <div className="warning-message">Không có mục phù hợp bộ lọc.</div> : null}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-icon material-symbols-outlined">assignment_turned_in</span>
              <h3 className="chart-card-title">Chi tiết</h3>
            </div>
            {!selectedItem ? (
              <div className="warning-message">Chọn một mục ở danh sách bên trái.</div>
            ) : selectedItem.kind === "assignment" && selectedItem.assignmentSubmission ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedItem.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{selectedItem.moduleTitle} / {selectedItem.lessonTitle}</div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Nội dung nộp (tóm tắt)</div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>{selectedItem.assignmentSubmission.content_preview || "—"}</div>
                  {selectedItem.assignmentSubmission.submission_short_answers?.length ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Trả lời ngắn</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {selectedItem.assignmentSubmission.submission_short_answers.map((ans, idx) => (
                          <div key={`${ans.question_id}-${idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                            <div style={{ fontSize: 12, color: "#64748b" }}>Câu {idx + 1}</div>
                            <div>{ans.answer_text || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedItem.assignmentSubmission.attachment_files?.length ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>File đính kèm</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {selectedItem.assignmentSubmission.attachment_files.map((file, idx) => (
                          <li key={`${file.file_path}-${idx}`}>
                            <a href={resolveAttachmentUrl(file.file_path)} target="_blank" rel="noreferrer">{file.file_name || `Tệp ${idx + 1}`}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Điểm (0 - {selectedItem.maxScore || 10})</span>
                    <input
                      type="number"
                      min={0}
                      max={selectedItem.maxScore || 10}
                      step={0.01}
                      className="search-input"
                      value={scoreDraft}
                      onChange={(e) => setScoreDraft(e.target.value)}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Nhận xét</span>
                    <textarea
                      rows={4}
                      className="search-input"
                      value={feedbackDraft}
                      onChange={(e) => setFeedbackDraft(e.target.value)}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={gradingSubmissionId === selectedItem.assignmentSubmission.submission_id}
                      onClick={() => void gradeCurrent(false)}
                    >
                      {gradingSubmissionId === selectedItem.assignmentSubmission.submission_id ? "Đang lưu..." : "Lưu điểm"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={gradingSubmissionId === selectedItem.assignmentSubmission.submission_id}
                      onClick={() => void gradeCurrent(true)}
                    >
                      Lưu & mục tiếp theo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedItem.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{selectedItem.moduleTitle} / {selectedItem.lessonTitle}</div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Điểm Quiz theo các lần làm</div>
                  {!selectedItem.quizAttempts?.length ? (
                    <div className="warning-message">Học viên chưa có lần làm quiz.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {selectedItem.quizAttempts.map((attempt) => (
                        <div key={attempt.attempt_id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                          <div style={{ fontWeight: 600 }}>Lần {attempt.attempt_number}</div>
                          <div style={{ fontSize: 13, color: "#475569" }}>
                            Điểm: <strong>{attempt.score != null ? `${attempt.score}%` : "—"}</strong>
                            {attempt.is_passed != null ? (attempt.is_passed ? " · Đạt" : " · Chưa đạt") : ""}
                            {selectedItem.quizPassingScore != null ? ` (Mốc đạt ${selectedItem.quizPassingScore}%)` : ""}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString("vi-VN") : "Chưa nộp"}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setSelectedQuizAttemptId(attempt.attempt_id)}
                              style={{ padding: "6px 10px" }}
                            >
                              {selectedQuizAttemptId === attempt.attempt_id ? "Đang xem chi tiết" : "Xem chi tiết đáp án"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Chi tiết lựa chọn của học viên</div>
                  {quizAttemptDetailLoading ? (
                    <div style={{ color: "#64748b" }}>Đang tải chi tiết attempt...</div>
                  ) : !quizAttemptDetail ? (
                    <div className="warning-message">Chọn một lần làm để xem học viên đã chọn đáp án nào.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "#475569" }}>
                        Lần {quizAttemptDetail.attempt_number}
                        {quizAttemptDetail.submitted_at ? ` · ${new Date(quizAttemptDetail.submitted_at).toLocaleString("vi-VN")}` : ""}
                        {quizAttemptDetail.score != null ? ` · Điểm ${quizAttemptDetail.score}%` : ""}
                      </div>
                      {quizAttemptDetail.questions.map((q, idx) => (
                        <div key={q.quiz_question_id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Câu {idx + 1}: {q.question_text}</div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {q.options.map((opt) => (
                              (() => {
                                const isSelected = Boolean(opt.is_selected);
                                const isCorrect = Boolean(opt.is_correct);
                                const isSelectedCorrect = isSelected && isCorrect;
                                const isSelectedWrong = isSelected && !isCorrect;
                                const isCorrectAnswer = isCorrect;
                                const borderColor = isSelectedWrong ? "#ef4444" : isCorrectAnswer ? "#22c55e" : "#e2e8f0";
                                const bgColor = isSelectedWrong ? "#fef2f2" : isCorrectAnswer ? "#f0fdf4" : "#fff";
                                const tagColor = isSelectedWrong ? "#b91c1c" : isCorrectAnswer ? "#15803d" : "#94a3b8";
                                return (
                              <div
                                key={opt.id}
                                style={{
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 6,
                                  padding: "6px 8px",
                                  background: bgColor,
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                  <span>{opt.option_text}</span>
                                  <span style={{ fontSize: 12, color: tagColor }}>
                                    {isSelectedWrong
                                      ? "Học viên chọn sai"
                                      : isSelectedCorrect
                                        ? "Học viên chọn đúng"
                                        : isSelected
                                          ? "Học viên đã chọn"
                                          : isCorrectAnswer
                                            ? "Đáp án đúng"
                                            : ""}
                                  </span>
                                </div>
                              </div>
                                );
                              })()
                            ))}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                            {q.selected_option_text ? `Đáp án chọn: ${q.selected_option_text}` : "Học viên chưa chọn đáp án."}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

