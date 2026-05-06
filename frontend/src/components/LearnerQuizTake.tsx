import { useCallback, useEffect, useMemo, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import "./LearnerQuizTake.css";

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

type QuizPayload = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  attempts_used: number;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  recent_attempts: {
    attempt_id: number;
    attempt_number: number;
    submitted_at: string | null;
    score_percent: number | null;
    is_passed: boolean | null;
    status: string;
    answers: {
      quiz_question_id: number;
      question_text: string;
      selected_option_id: number | null;
      selected_option_text: string | null;
      correct_option_ids: number[];
    }[];
  }[];
  questions: {
    quiz_question_id: number;
    question_text: string;
    question_type: string;
    points: number;
    options: { id: number; option_text: string }[];
  }[];
};

type SubmitResult = {
  score_percent: number;
  earned_points: number;
  max_points: number;
  is_passed: boolean;
  show_correct_answers: boolean;
  details: {
    quiz_question_id: number;
    is_correct: boolean;
    correct_option_ids: number[];
    selected_option_id: number | null;
  }[];
};

export default function LearnerQuizTake(props: {
  courseId: number;
  lessonId: number;
  lessonTitle: string;
  token: string | null;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { courseId, lessonId, lessonTitle, token, onClose, onCompleted } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelections({});
    try {
      const res = await fetch(`${url}${COURSES_API.learnerQuizTake(courseId, lessonId)}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không tải được quiz.");
      const q = (data as any)?.quiz as QuizPayload | null;
      if (!q || !q.questions?.length) {
        throw new Error(
          "Chưa có nội dung quiz hợp lệ. Giáo viên cần lưu lại quiz (để đồng bộ câu hỏi) trong Dashboard."
        );
      }
      setQuiz(q);
    } catch (e: any) {
      setError(normalizeLearnerErrorMessage(e?.message || "Lỗi tải quiz."));
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, headers, lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const attemptsLeft = quiz ? Math.max(0, quiz.max_attempts - quiz.attempts_used) : 0;
  const allAnswered =
    quiz &&
    quiz.questions.length > 0 &&
    quiz.questions.every((q) => typeof selections[q.quiz_question_id] === "number");

  const handleSubmit = async () => {
    if (!quiz || !allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const answers = quiz.questions.map((q) => ({
        quiz_question_id: q.quiz_question_id,
        selected_option_id: selections[q.quiz_question_id],
      }));
      const res = await fetch(`${url}${COURSES_API.learnerQuizSubmit(courseId, lessonId)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Nộp bài thất bại.");
      setResult(data as SubmitResult);
      if ((data as SubmitResult)?.is_passed) onCompleted();
    } catch (e: any) {
      setError(normalizeLearnerErrorMessage(e?.message || "Nộp bài thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  const detailByQq = useMemo(() => {
    if (!result?.details) return new Map<number, SubmitResult["details"][0]>();
    return new Map(result.details.map((d) => [d.quiz_question_id, d]));
  }, [result]);
  const questionByQq = useMemo(() => {
    if (!quiz?.questions?.length) return new Map<number, QuizPayload["questions"][number]>();
    return new Map(quiz.questions.map((q) => [q.quiz_question_id, q]));
  }, [quiz]);

  return (
    <div className="learner-quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="learner-quiz-title">
      <div className="learner-quiz-modal">
        <div className="learner-quiz-header">
          <div>
            <h2 id="learner-quiz-title">{quiz?.title || lessonTitle}</h2>
            {quiz?.description ? <p>{quiz.description}</p> : <p>Quizz trắc nghiệm</p>}
          </div>
          <button type="button" className="learner-quiz-close" onClick={onClose}>
            Đóng
          </button>
        </div>

        {quiz ? (
          <div className="learner-quiz-meta">
            <span>
              Lượt còn: <strong>{attemptsLeft}</strong> / {quiz.max_attempts}
            </span>
            {quiz.passing_score != null ? (
              <span>
                Điểm đạt: <strong>{quiz.passing_score}%</strong>
              </span>
            ) : null}
            {quiz.time_limit_minutes != null ? (
              <span>
                Thời gian: <strong>{quiz.time_limit_minutes} phút</strong> (gợi ý — hãy tự quản lý thời gian)
              </span>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="learner-quiz-body" style={{ textAlign: "center", color: "#64748b" }}>
            Đang tải quiz…
          </div>
        ) : null}

        {error && !loading ? <div className="learner-quiz-error">{error}</div> : null}

        {!loading && quiz && quiz.recent_attempts?.length ? (
          <div className="learner-quiz-body" style={{ paddingTop: 6, paddingBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Lịch sử bài đã nộp</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quiz.recent_attempts.map((att) => (
                <details
                  key={att.attempt_id}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}
                >
                  <summary style={{ cursor: "pointer", color: "#334155", fontWeight: 600 }}>
                    Lần {att.attempt_number}
                    {att.score_percent != null ? ` · ${att.score_percent}%` : ""}
                    {att.is_passed != null ? ` · ${att.is_passed ? "Đạt" : "Chưa đạt"}` : ""}
                    {att.submitted_at ? ` · ${new Date(att.submitted_at).toLocaleString("vi-VN")}` : ""}
                  </summary>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {att.answers?.length ? (
                      att.answers.map((ans, idx) => (
                        <div
                          key={`${att.attempt_id}-${ans.quiz_question_id}-${idx}`}
                          style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            Câu {idx + 1}: {ans.question_text}
                          </div>
                          <div className="learner-quiz-history-options">
                            {(questionByQq.get(ans.quiz_question_id)?.options || []).map((opt) => {
                              const selected = ans.selected_option_id != null && Number(ans.selected_option_id) === Number(opt.id);
                              const correct = (ans.correct_option_ids || []).some((id) => Number(id) === Number(opt.id));
                              const showCorrect = Boolean(quiz?.show_correct_answers);
                              const isCorrectChoice = selected && correct;
                              const isWrongChoice = selected && showCorrect && !correct;
                              const isCorrectReveal = showCorrect && correct;
                              return (
                                <div
                                  key={`${att.attempt_id}-${ans.quiz_question_id}-${opt.id}`}
                                  className={[
                                    "learner-quiz-history-option",
                                    selected ? "is-selected" : "",
                                    isCorrectChoice ? "is-correct-choice" : "",
                                    isWrongChoice ? "is-wrong-choice" : "",
                                    isCorrectReveal ? "is-correct-answer" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <span className="learner-quiz-history-option__label">{opt.option_text}</span>
                                  <span className="learner-quiz-history-option__state">
                                    {isCorrectChoice
                                      ? "Ban chon (Dung)"
                                      : isWrongChoice
                                        ? "Ban chon"
                                        : isCorrectReveal
                                          ? "Dap an dung"
                                          : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#64748b" }}>Không có dữ liệu câu trả lời.</span>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && quiz && attemptsLeft <= 0 && !result ? (
          <div className="learner-quiz-body" style={{ textAlign: "center", color: "#b45309" }}>
            Bạn đã dùng hết số lần làm bài cho quiz này.
          </div>
        ) : null}

        {!loading && quiz && attemptsLeft > 0 && !result ? (
          <div className="learner-quiz-body">
            {quiz.questions.map((q, idx) => (
              <div key={q.quiz_question_id} className="learner-quiz-q">
                <div className="learner-quiz-q__badge">
                  Câu {idx + 1} · {q.points} điểm
                </div>
                <p className="learner-quiz-q__text">{q.question_text}</p>
                {q.options.map((o) => {
                  const sel = selections[q.quiz_question_id] === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`learner-quiz-opt${sel ? " learner-quiz-opt--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`qq-${q.quiz_question_id}`}
                        checked={sel}
                        onChange={() =>
                          setSelections((prev) => ({ ...prev, [q.quiz_question_id]: o.id }))
                        }
                      />
                      <span>{o.option_text}</span>
                    </label>
                  );
                })}
              </div>
            ))}
            <div className="learner-quiz-footer">
              <button type="button" className="learner-quiz-btn-ghost" onClick={onClose}>
                Hủy
              </button>
              <button
                type="button"
                className="learner-quiz-btn-primary"
                disabled={!allAnswered || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Đang nộp…" : "Nộp bài"}
              </button>
            </div>
          </div>
        ) : null}

        {result ? (
          <div
            className={`learner-quiz-result${result.is_passed ? " learner-quiz-result--pass" : " learner-quiz-result--fail"}`}
          >
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Kết quả lần làm</p>
            <div className="learner-quiz-result__score">{result.score_percent}%</div>
            <p style={{ margin: "0 0 8px", color: "#334155" }}>
              {result.earned_points} / {result.max_points} điểm —{" "}
              <strong>{result.is_passed ? "Đạt" : "Chưa đạt"}</strong>
            </p>
            {quiz?.show_correct_answers && result.show_correct_answers ? (
              <div style={{ marginTop: 12 }}>
                {quiz.questions.map((q, idx) => {
                  const d = detailByQq.get(q.quiz_question_id);
                  const ok = d?.is_correct;
                  return (
                    <div
                      key={q.quiz_question_id}
                      className={`learner-quiz-detail ${ok ? "ok" : "bad"}`}
                    >
                      <strong>
                        Câu {idx + 1}: {ok ? "Đúng" : "Sai"}
                      </strong>
                      <div style={{ marginTop: 4, color: "#475569" }}>{q.question_text}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {/* <div className="learner-quiz-footer" style={{ borderTop: "none", justifyContent: "center" }}>
              <button type="button" className="learner-quiz-btn-primary" onClick={onClose}>
                Đóng
              </button>
            </div> */}
          </div>
        ) : null}
      </div>
    </div>
  );
}
