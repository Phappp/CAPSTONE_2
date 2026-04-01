import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchQuiz, fetchLatestAttempt, createQuizAttempt } from "../api/quizzes";
import AvatarMenu from "../components/AvatarMenu";

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
  description: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  passing_score: number | null;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  questions_count: number;
  total_points: number;
  attempts_done: number;
  attempts_remaining: number;
  questions: QuizQuestionDetail[];
};

type AttemptDetails = {
  attempt_id: number;
  quiz_id: number;
  started_at: string;
  time_limit_minutes: number;
  attempt_number: number;
};

export default function StudentQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!quizId) return;
      setLoading(true);
      setError(null);
      try {
        const q = await fetchQuiz(Number(quizId));
        setQuiz(q);
        const latest = await fetchLatestAttempt(Number(quizId));
        if (latest) {
          setAttempt(latest);
        }
      } catch (err: any) {
        setError(err?.message || "Không thể tải quiz");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [quizId]);

  const startAttempt = async () => {
    if (!quizId) return;
    try {
      const created = await createQuizAttempt(Number(quizId));
      navigate(`/quizzes/${quizId}/attempts/${created.attempt_id}`);
    } catch (err: any) {
      setError(err?.message || "Không thể bắt đầu attempt");
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Đang tải quiz...</div>;
  if (error) return <div style={{ padding: 24, color: "#c53030" }}>Lỗi: {error}</div>;
  if (!quiz) return <div style={{ padding: 24 }}>Không tìm thấy quiz.</div>;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Quiz: {quiz.title}</h1>
        <AvatarMenu />
      </div>
      <p>{quiz.description || "Không có mô tả"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, margin: "16px 0" }}>
        <div><strong>Câu hỏi:</strong> {quiz.questions_count}</div>
        <div><strong>Tổng điểm:</strong> {quiz.total_points}</div>
        <div><strong>Giới hạn thời gian:</strong> {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} phút` : "Không giới hạn"}</div>
        <div><strong>Số lần đã làm:</strong> {quiz.attempts_done}</div>
        <div><strong>Số lần còn lại:</strong> {quiz.attempts_remaining}</div>
      </div>
      {attempt ? (
        <div style={{ marginBottom: 20, padding: 16, border: "1px solid #d1d5db", borderRadius: 10 }}>
          <p><strong>Attempt đang làm:</strong> #{attempt.attempt_number} (bắt đầu {new Date(attempt.started_at).toLocaleString()})</p>
          <button className="btn btn--primary" onClick={() => navigate(`/quizzes/${quiz.quiz_id}/attempts/${attempt.attempt_id}`)}>
            Tiếp tục làm bài
          </button>
        </div>
      ) : null}
      <button className="btn btn--primary" onClick={startAttempt} disabled={quiz.attempts_remaining <= 0}>
        {quiz.attempts_remaining <= 0 ? "Hết lượt" : attempt ? "Bắt đầu lượt mới" : "Bắt đầu làm bài"}
      </button>

      <div style={{ marginTop: 24 }}>
        <h2>Danh sách câu hỏi</h2>
        <ol>
          {quiz.questions.map((q) => (
            <li key={q.id} style={{marginBottom:6}}>
              {q.question_text} ({q.question_type}, {q.points} điểm)
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
