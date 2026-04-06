import { useCallback, useEffect, useMemo, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import "./LearnerQuizTake.css";

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
      setError(e?.message || "Lỗi tải quiz.");
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
      setError(e?.message || "Nộp bài thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const detailByQq = useMemo(() => {
    if (!result?.details) return new Map<number, SubmitResult["details"][0]>();
    return new Map(result.details.map((d) => [d.quiz_question_id, d]));
  }, [result]);

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
          </div>
        ) : null}

        {!loading && quiz && attemptsLeft > 0 && !result ? (
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
            <div className="learner-quiz-footer" style={{ borderTop: "none", justifyContent: "center" }}>
              <button type="button" className="learner-quiz-btn-primary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
