import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { fetchQuiz, getAttemptResponses, saveAttemptResponses, submitAttempt } from "../api/quizzes";

type QuizQuestionOption = {
  id: number;
  option_text: string;
  order_index: number;
};

type QuizQuestionDetail = {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank";
  points: number;
  options: QuizQuestionOption[];
};

type QuizDetails = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  questions: QuizQuestionDetail[];
  time_limit_minutes: number | null;
};

type SpellAnswer = {
  selected_options?: number[];
  text_answer?: string;
};

export default function StudentQuizAttemptPage() {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [answers, setAnswers] = useState<Record<number, SpellAnswer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!quizId || !attemptId) return;
      setLoading(true);
      setError(null);
      try {
        const q = await fetchQuiz(Number(quizId));
        setQuiz(q);

        const existing = await getAttemptResponses(Number(attemptId));
        const answersMap: Record<number, SpellAnswer> = {};
        existing?.forEach((item: any) => {
          answersMap[item.quiz_question_id] = {
            selected_options: Array.isArray(item.selected_options) ? item.selected_options : [],
            text_answer: item.text_answer || "",
          };
        });
        setAnswers(answersMap);
      } catch (err: any) {
        setError(err?.message || "Không thể tải dữ liệu bài làm");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [quizId, attemptId]);

  const setChoice = (questionId: number, optionId: number, questionType: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { selected_options: [], text_answer: "" };
      let nextOptions = Array.isArray(current.selected_options) ? [...current.selected_options] : [];
      if (questionType === "true_false") {
        nextOptions = [optionId];
      } else {
        if (nextOptions.includes(optionId)) {
          nextOptions = nextOptions.filter((id) => id !== optionId);
        } else {
          nextOptions.push(optionId);
        }
      }
      return {
        ...prev,
        [questionId]: {
          ...current,
          selected_options: nextOptions,
        },
      };
    });
  };

  const setTextAnswer = (questionId: number, text: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { selected_options: [], text_answer: "" };
      return {
        ...prev,
        [questionId]: { ...current, text_answer: text },
      };
    });
  };

  const save = async () => {
    if (!attemptId) return;
    setError(null);
    try {
      const payload = (quiz?.questions ?? []).map((q) => ({
        quiz_question_id: q.id,
        selected_options: answers[q.id]?.selected_options ?? [],
        text_answer: answers[q.id]?.text_answer ?? null,
      }));
      await saveAttemptResponses(Number(attemptId), payload);
      setSuccessMsg("Lưu tạm thành công!");
      window.setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setError(err?.message || "Lưu thất bại");
    }
  };

  const submit = async () => {
    if (!attemptId) return;
    setError(null);
    try {
      await save();
      const result = await submitAttempt(Number(attemptId));
      setSuccessMsg(`Nộp bài thành công. Điểm: ${result.score}${result.is_passed !== null ? result.is_passed ? ' (Đạt)' : ' (Không đạt)' : ''}`);
      window.setTimeout(() => {
        navigate(`/quizzes/${quizId}`);
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Nộp thất bại");
    }
  };

  const remainingDisplay = useMemo(() => {
    if (!quiz?.time_limit_minutes) return "Không giới hạn";
    return `${quiz.time_limit_minutes} phút`;
  }, [quiz]);

  if (loading) return <div style={{ padding: 24 }}>Đang tải...</div>;
  if (error) return <div style={{ padding: 24, color: "#c53030" }}>Lỗi: {error}</div>;
  if (!quiz) return <div style={{ padding: 24 }}>Không tìm thấy quiz.</div>;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>{quiz.title}</h1>
        <AvatarMenu />
      </div>
      <div style={{ marginBottom: 16 }}><strong>Giới hạn thời gian:</strong> {remainingDisplay}</div>
      <div style={{ marginBottom: 16 }}><strong>Số câu:</strong> {quiz.questions.length}</div>

      {(quiz.questions || []).map((question, idx) => (
        <section key={question.id} style={{ marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            {idx + 1}. {question.question_text} <span style={{ color: "#6b7280" }}>({question.points} điểm)</span>
          </div>
          {question.question_type === "multiple_choice" || question.question_type === "true_false" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {question.options.map((option) => {
                const selected = (answers[question.id]?.selected_options || []).includes(option.id);
                return (
                  <label key={option.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type={question.question_type === "true_false" ? "radio" : "checkbox"}
                      name={`q_${question.id}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => setChoice(question.id, option.id, question.question_type)}
                    />
                    {option.option_text}
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[question.id]?.text_answer || ""}
              onChange={(e) => setTextAnswer(question.id, e.target.value)}
              rows={4}
              style={{ width: "100%", minHeight: 120, borderRadius: 8, border: "1px solid #d1d5db", padding: 10 }}
              placeholder="Nhập câu trả lời..."
            />
          )}
        </section>
      ))}

      {successMsg ? <div style={{ color: "#16a34a", marginBottom: 12 }}>{successMsg}</div> : null}
      <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
        <button type="button" className="btn btn--primary" onClick={save}>Lưu tạm</button>
        <button type="button" className="btn btn--primary" onClick={submit}>Nộp bài</button>
        <button type="button" className="btn" onClick={() => navigate(`/quizzes/${quizId}`)}>Hủy & Quay lại</button>
      </div>
    </div>
  );
}
