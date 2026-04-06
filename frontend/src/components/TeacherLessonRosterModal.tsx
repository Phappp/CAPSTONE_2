import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { url } from "../baseUrl";
import { ASSIGNMENTS_API } from "../api/assignments";
import { COURSES_API } from "../api/courses";
import "./TeacherLessonRosterModal.css";

type AssignmentRosterPayload = {
  assignment: { id: number; title: string; max_score: number } | null;
  learners: {
    user_id: number;
    email: string;
    full_name: string;
    has_submitted: boolean;
    submission: {
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
    } | null;
  }[];
};

type QuizScoresPayload = {
  quiz: {
    id: number;
    title: string;
    passing_score: number | null;
    max_attempts: number;
  } | null;
  learners: {
    user_id: number;
    email: string;
    full_name: string;
    attempts: {
      attempt_id: number;
      attempt_number: number;
      score: number | null;
      is_passed: boolean | null;
      submitted_at: string | null;
      status: string;
    }[];
  }[];
};

type Tab = "assignment" | "quiz";

export default function TeacherLessonRosterModal(props: {
  open: boolean;
  onClose: () => void;
  courseId: number;
  lessonId: number;
  lessonTitle: string;
  hasAssignment: boolean;
  hasQuiz: boolean;
  token: string | null;
}) {
  const { open, onClose, courseId, lessonId, lessonTitle, hasAssignment, hasQuiz, token } = props;

  const [tab, setTab] = useState<Tab>("assignment");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingQ, setLoadingQ] = useState(false);
  const [errA, setErrA] = useState<string | null>(null);
  const [errQ, setErrQ] = useState<string | null>(null);
  const [roster, setRoster] = useState<AssignmentRosterPayload | null>(null);
  const [quizData, setQuizData] = useState<QuizScoresPayload | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<number, string>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    if (!open) return;
    if (hasAssignment) setTab("assignment");
    else if (hasQuiz) setTab("quiz");
  }, [open, hasAssignment, hasQuiz]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const loadAssignment = useCallback(async () => {
    setLoadingA(true);
    setErrA(null);
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.assignmentLearnerRoster(lessonId)}`, {
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không tải được danh sách bài tập.");
      const d = (json as any)?.data ?? json;
      setRoster(d as AssignmentRosterPayload);
      const s: Record<number, string> = {};
      const f: Record<number, string> = {};
      (d?.learners ?? []).forEach((row: AssignmentRosterPayload["learners"][0]) => {
        const sub = row.submission;
        if (!sub) return;
        s[sub.submission_id] =
          sub.graded_score != null && !Number.isNaN(Number(sub.graded_score)) ? String(sub.graded_score) : "";
        f[sub.submission_id] = sub.feedback_text ?? "";
      });
      setScoreDraft(s);
      setFeedbackDraft(f);
    } catch (e: any) {
      setErrA(e?.message || "Lỗi tải dữ liệu.");
      setRoster(null);
    } finally {
      setLoadingA(false);
    }
  }, [authHeaders, lessonId]);

  const loadQuiz = useCallback(async () => {
    setLoadingQ(true);
    setErrQ(null);
    try {
      const res = await fetch(`${url}${COURSES_API.quizLearnerScores(courseId, lessonId)}`, {
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không tải được điểm quiz.");
      const d = (json as any)?.data ?? json;
      setQuizData(d as QuizScoresPayload);
    } catch (e: any) {
      setErrQ(e?.message || "Lỗi tải dữ liệu.");
      setQuizData(null);
    } finally {
      setLoadingQ(false);
    }
  }, [authHeaders, courseId, lessonId]);

  useEffect(() => {
    if (!open) return;
    if (tab === "assignment" && hasAssignment) void loadAssignment();
    if (tab === "quiz" && hasQuiz) void loadQuiz();
  }, [open, tab, hasAssignment, hasQuiz, loadAssignment, loadQuiz]);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setRoster(null);
      setQuizData(null);
      setErrA(null);
      setErrQ(null);
    }
  }, [open]);

  const submitGrade = async (submissionId: number, maxScore: number) => {
    const raw = scoreDraft[submissionId]?.trim();
    if (raw === "" || Number.isNaN(Number(raw))) {
      toast.error("Vui lòng nhập điểm hợp lệ.");
      return;
    }
    const sc = Number(raw);
    if (sc < 0 || sc > maxScore) {
      toast.error(`Điểm phải từ 0 đến ${maxScore}.`);
      return;
    }
    setGradingId(submissionId);
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.gradeSubmission(submissionId)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          score: sc,
          feedbackText: feedbackDraft[submissionId] ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Chấm điểm thất bại.");
      toast.success("Đã lưu điểm.");
      await loadAssignment();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi chấm điểm.");
    } finally {
      setGradingId(null);
    }
  };

  if (!open) return null;

  const maxScore = roster?.assignment?.max_score ?? 10;
  const showTabs = hasAssignment || hasQuiz;
  const submittedCount = roster?.learners?.filter((x) => x.has_submitted).length ?? 0;
  const totalLearners = roster?.learners?.length ?? 0;

  const resolveAttachmentUrl = (path: string): string => {
    if (!path) return "#";
    if (/^https?:\/\//i.test(path)) return path;
    return `${url}${path.startsWith("/") ? path : `/${path}`}`;
  };
  const normalizedSearch = searchText.trim().toLowerCase();
  const assignmentLearners = useMemo(() => {
    const list = roster?.learners ?? [];
    if (!normalizedSearch) return list;
    return list.filter((row) => {
      const name = String(row.full_name || "").toLowerCase();
      const email = String(row.email || "").toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [roster?.learners, normalizedSearch]);
  const quizLearners = useMemo(() => {
    const list = quizData?.learners ?? [];
    if (!normalizedSearch) return list;
    return list.filter((row) => {
      const name = String(row.full_name || "").toLowerCase();
      const email = String(row.email || "").toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [quizData?.learners, normalizedSearch]);

  return (
    <div className="tlr-overlay" role="presentation" onClick={onClose}>
      <div
        className="tlr-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tlr-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tlr-head">
          <div>
            <h2 id="tlr-title">Theo dõi bài học: {lessonTitle}</h2>
            <p className="tlr-sub">Danh sách học viên đã ghi danh · bài tập &amp; điểm quiz</p>
          </div>
          <button type="button" className="tlr-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {showTabs ? (
          <>
            <div className="tlr-tabs" role="tablist">
              {hasAssignment ? (
                <button
                  type="button"
                  role="tab"
                  className={`tlr-tab ${tab === "assignment" ? "is-on" : ""}`}
                  onClick={() => setTab("assignment")}
                >
                  Bài tập
                </button>
              ) : null}
              {hasQuiz ? (
                <button
                  type="button"
                  role="tab"
                  className={`tlr-tab ${tab === "quiz" ? "is-on" : ""}`}
                  onClick={() => setTab("quiz")}
                >
                  Quiz
                </button>
              ) : null}
            </div>

            <div className="tlr-body">
          {tab === "assignment" && hasAssignment ? (
            <>
              {loadingA ? <p className="tlr-muted">Đang tải…</p> : null}
              {errA ? <div className="tlr-error">{errA}</div> : null}
              {!loadingA && roster && !roster.assignment ? (
                <p className="tlr-muted">Bài học chưa có bài tập.</p>
              ) : null}
              {!loadingA && roster?.assignment ? (
                <div>
                  <p className="tlr-meta">
                    <strong>{roster.assignment.title}</strong> · Thang điểm: {roster.assignment.max_score}
                  </p>
                  <div className="tlr-searchRow">
                    <input
                      className="tlr-searchInput"
                      type="text"
                      placeholder="Tìm theo tên hoặc email..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                  <div className="tlr-summary-cards">
                    <div className="tlr-summary-card">
                      <span>Đã nộp</span>
                      <strong>{submittedCount}/{totalLearners}</strong>
                    </div>
                    <div className="tlr-summary-card">
                      <span>Chưa nộp</span>
                      <strong>{Math.max(0, totalLearners - submittedCount)}/{totalLearners}</strong>
                    </div>
                  </div>
                  <table className="tlr-table">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}>STT</th>
                        <th>Học viên</th>
                        <th>Email</th>
                        <th>Trạng thái nộp</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentLearners.map((row, idx) => {
                        const sub = row.submission;
                        const key = row.user_id;
                        const openRow = expanded === key;
                        return (
                          <Fragment key={key}>
                            <tr>
                              <td>{idx + 1}</td>
                              <td>{row.full_name || "—"}</td>
                              <td className="tlr-nowrap">{row.email}</td>
                              <td>
                                {row.has_submitted ? (
                                  <span className="tlr-badge tlr-badge--ok tlr-badge--submitted">Đã nộp</span>
                                ) : (
                                  <span className="tlr-badge tlr-badge--no">Chưa nộp</span>
                                )}
                                {sub?.is_late ? <span className="tlr-late"> · Muộn</span> : null}
                                {sub?.graded_score != null || sub?.status === "graded" ? (
                                  <span className="tlr-badge tlr-badge--graded">Đã chấm</span>
                                ) : null}
                              </td>
                              <td>
                                {row.has_submitted && sub ? (
                                  <button
                                    type="button"
                                    className="tlr-linkbtn"
                                    onClick={() => setExpanded(openRow ? null : key)}
                                  >
                                    {openRow ? "Thu gọn" : "Xem và chấm"}
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                            {openRow && sub ? (
                              <tr key={`d-${key}`} className="tlr-detail-row">
                                <td colSpan={5}>
                                  <div className="tlr-detail">
                                    <div className="tlr-preview">
                                      <strong>Nội dung nộp (tóm tắt)</strong>
                                      <div>{sub.content_preview}</div>
                                      {sub.submission_short_answers && sub.submission_short_answers.length > 0 ? (
                                        <div style={{ marginTop: 10 }}>
                                          <strong>Đáp án trả lời ngắn</strong>
                                          <div className="tlr-shortanswers">
                                            {sub.submission_short_answers.map((ans, idx) => (
                                              <div key={`${ans.question_id}-${idx}`} className="tlr-shortanswers__item">
                                                <div className="tlr-shortanswers__q">Câu {idx + 1}</div>
                                                <div className="tlr-shortanswers__a">{ans.answer_text || "—"}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                      {sub.attachment_count > 0 ? (
                                        <div className="tlr-muted" style={{ marginTop: 8 }}>
                                          Có {sub.attachment_count} file đính kèm.
                                        </div>
                                      ) : null}
                                      {sub.attachment_files && sub.attachment_files.length > 0 ? (
                                        <div style={{ marginTop: 8 }}>
                                          <strong>File đã nộp</strong>
                                          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                            {sub.attachment_files.map((a, idx) => (
                                              <li key={`${a.file_path}-${idx}`} style={{ marginBottom: 4 }}>
                                                <a href={resolveAttachmentUrl(a.file_path)} target="_blank" rel="noreferrer">
                                                  {a.file_name || `Tệp ${idx + 1}`}
                                                </a>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="tlr-grade">
                                      <label>
                                        Điểm (0–{maxScore})
                                        <input
                                          type="number"
                                          min={0}
                                          max={maxScore}
                                          step={0.01}
                                          value={scoreDraft[sub.submission_id] ?? ""}
                                          onChange={(e) =>
                                            setScoreDraft((p) => ({ ...p, [sub.submission_id]: e.target.value }))
                                          }
                                        />
                                      </label>
                                      <label>
                                        Nhận xét
                                        <textarea
                                          rows={3}
                                          value={feedbackDraft[sub.submission_id] ?? ""}
                                          onChange={(e) =>
                                            setFeedbackDraft((p) => ({ ...p, [sub.submission_id]: e.target.value }))
                                          }
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        className="tlr-primary"
                                        disabled={gradingId === sub.submission_id}
                                        onClick={() => void submitGrade(sub.submission_id, maxScore)}
                                      >
                                        {gradingId === sub.submission_id ? "Đang lưu…" : "Lưu điểm"}
                                      </button>
                                      {sub.graded_score != null ? (
                                        <p className="tlr-muted" style={{ marginTop: 8 }}>
                                          Đã chấm trước đó: <strong>{sub.graded_score}</strong>
                                          {sub.status === "graded" ? " · Đã duyệt" : ""}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "quiz" && hasQuiz ? (
            <>
              {loadingQ ? <p className="tlr-muted">Đang tải…</p> : null}
              {errQ ? <div className="tlr-error">{errQ}</div> : null}
              {!loadingQ && quizData && !quizData.quiz ? (
                <p className="tlr-muted">Bài học chưa có quiz.</p>
              ) : null}
              {!loadingQ && quizData?.quiz ? (
                <div>
                  <p className="tlr-meta">
                    <strong>{quizData.quiz.title}</strong>
                    {quizData.quiz.passing_score != null ? ` · Điểm đạt: ${quizData.quiz.passing_score}%` : ""}
                    {` · Tối đa ${quizData.quiz.max_attempts} lần làm`}
                  </p>
                  <div className="tlr-searchRow">
                    <input
                      className="tlr-searchInput"
                      type="text"
                      placeholder="Tìm theo tên hoặc email..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                  <table className="tlr-table">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}>STT</th>
                        <th>Học viên</th>
                        <th>Email</th>
                        <th>Điểm các lần làm (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizLearners.map((row, idx) => (
                        <tr key={row.user_id}>
                          <td>{idx + 1}</td>
                          <td>{row.full_name || "—"}</td>
                          <td className="tlr-nowrap">{row.email}</td>
                          <td>
                            {row.attempts.length === 0 ? (
                              <span className="tlr-muted">Chưa làm</span>
                            ) : (
                              <ul className="tlr-attempts">
                                {row.attempts.map((a) => (
                                  <li key={a.attempt_id}>
                                    Lần {a.attempt_number}:{" "}
                                    <strong>{a.score != null ? `${a.score}%` : "—"}</strong>
                                    {a.is_passed != null ? (
                                      <span className={a.is_passed ? "tlr-pass" : "tlr-fail"}>
                                        {a.is_passed ? " · Đạt" : " · Chưa đạt"}
                                      </span>
                                    ) : null}
                                    {a.submitted_at ? (
                                      <span className="tlr-muted">
                                        {" "}
                                        · {new Date(a.submitted_at).toLocaleString("vi-VN")}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
            </div>
          </>
        ) : (
          <div className="tlr-body" style={{ paddingTop: 8 }}>
            <p className="tlr-muted">
              Bài học chưa gắn quiz hoặc bài tập trên cây nội dung. Hãy dùng &quot;Soạn Quizz&quot; / &quot;Soạn bài tập&quot; trước,
              rồi mở lại để xem danh sách học viên và điểm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
