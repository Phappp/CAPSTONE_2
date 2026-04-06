import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import "./AssignmentEditor.css";
import "./ManualQuizEditor.css";

type CourseBrief = { id: number; title: string };

type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  lesson_type: string;
  order_index: number;
};

type CourseContentTree = {
  course_id: number;
  modules: {
    id: number;
    title: string;
    description?: string | null;
    lessons: LessonItem[];
  }[];
};

type OptRow = { option_text: string; is_correct: boolean };

type QuestionRow = {
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  explanation: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  options: OptRow[];
};

function defaultQuestion(): QuestionRow {
  return {
    question_text: "",
    question_type: "multiple_choice",
    explanation: "",
    points: 1,
    difficulty: "medium",
    options: [
      { option_text: "", is_correct: true },
      { option_text: "", is_correct: false },
    ],
  };
}

function mapApiToRows(
  questions: {
    question_text: string;
    question_type: string;
    explanation: string | null;
    points: number;
    difficulty: string;
    options: { option_text: string; is_correct: boolean; order_index: number }[];
  }[]
): QuestionRow[] {
  return questions.map((q) => ({
    question_text: q.question_text,
    question_type: q.question_type === "true_false" ? "true_false" : "multiple_choice",
    explanation: q.explanation ?? "",
    points: Number(q.points) || 1,
    difficulty: q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium",
    options: (q.options || []).map((o) => ({
      option_text: o.option_text,
      is_correct: o.is_correct,
    })),
  }));
}

export default function ManualQuizEditor(props: {
  courses: CourseBrief[];
  token: string | null;
  loading: boolean;
  selectedCourseId: number | null;
  onSelectedCourseIdChange: (id: number | null) => void;
  pickedLessonId?: number | null;
}) {
  const { courses, token, loading, selectedCourseId, onSelectedCourseIdChange, pickedLessonId } = props;
  const navigate = useNavigate();

  const [lessonTree, setLessonTree] = useState<CourseContentTree | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const [lessonId, setLessonId] = useState<number | "">("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [passingScore, setPassingScore] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showCorrect, setShowCorrect] = useState(true);

  const [questions, setQuestions] = useState<QuestionRow[]>([defaultQuestion()]);
  const [saving, setSaving] = useState(false);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    const first = courses?.[0]?.id;
    if (selectedCourseId == null && typeof first === "number") {
      onSelectedCourseIdChange(first);
    }
  }, [courses, selectedCourseId, onSelectedCourseIdChange]);

  useEffect(() => {
    if (selectedCourseId == null) return;
    (async () => {
      setLessonsLoading(true);
      setLessonsError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.contentTree(selectedCourseId)}`, {
          headers: { "Content-Type": "application/json", ...authHeaders },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Không thể tải cây bài học.");
        setLessonTree(data as CourseContentTree);
        const flat = (data?.modules ?? []).flatMap((m: any) => m.lessons ?? []) as LessonItem[];
        if (flat.length && lessonId === "") {
          setLessonId(flat[0].id);
        }
      } catch (e: any) {
        setLessonsError(e?.message || "Đã xảy ra lỗi.");
        setLessonTree(null);
        setLessonId("");
      } finally {
        setLessonsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, authHeaders]);

  useEffect(() => {
    if (pickedLessonId == null || !Number.isFinite(Number(pickedLessonId))) return;
    if (!lessonTree) return;
    const ok = (lessonTree.modules ?? []).some((mod) =>
      (mod.lessons ?? []).some((l) => l.id === pickedLessonId)
    );
    if (ok) setLessonId(pickedLessonId);
  }, [pickedLessonId, lessonTree]);

  const loadExistingQuiz = useCallback(async () => {
    if (!selectedCourseId || lessonId === "") return;
    const res = await fetch(`${url}${COURSES_API.manualQuiz(selectedCourseId, lessonId)}`, {
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không tải được Quizz.");
    const quiz = data?.quiz;
    if (!quiz) {
      setTitle("");
      setDescription("");
      setTimeLimit("");
      setPassingScore("");
      setMaxAttempts(1);
      setShuffleQuestions(false);
      setShuffleOptions(false);
      setShowResults(true);
      setShowCorrect(true);
      setQuestions([defaultQuestion()]);
      return;
    }
    setTitle(quiz.title ?? "");
    setDescription(quiz.description ?? "");
    setTimeLimit(quiz.time_limit_minutes != null ? String(quiz.time_limit_minutes) : "");
    setPassingScore(quiz.passing_score != null ? String(quiz.passing_score) : "");
    setMaxAttempts(Number(quiz.max_attempts ?? 1) || 1);
    setShuffleQuestions(Boolean(quiz.shuffle_questions));
    setShuffleOptions(Boolean(quiz.shuffle_options));
    setShowResults(quiz.show_results_immediately !== false);
    setShowCorrect(quiz.show_correct_answers !== false);
    if (Array.isArray(quiz.questions) && quiz.questions.length) {
      setQuestions(mapApiToRows(quiz.questions));
    } else {
      setQuestions([defaultQuestion()]);
    }
  }, [authHeaders, lessonId, selectedCourseId]);

  useEffect(() => {
    loadExistingQuiz().catch(() => {
      /* im lặng — chưa có quiz */
    });
  }, [loadExistingQuiz]);

  const handleSaveQuiz = async () => {
    if (loading || saving) return;
    if (selectedCourseId == null || lessonId === "") {
      toast.error("Chọn khóa học và bài học.");
      return;
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề Quizz.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      time_limit_minutes: timeLimit.trim() ? Number(timeLimit) : null,
      passing_score: passingScore.trim() ? Number(passingScore) : null,
      max_attempts: maxAttempts,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      show_results_immediately: showResults,
      show_correct_answers: showCorrect,
      questions: questions.map((q) => ({
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        explanation: q.explanation.trim() || null,
        points: q.points,
        difficulty: q.difficulty,
        options: q.options.map((o) => ({
          option_text: o.option_text.trim(),
          is_correct: o.is_correct,
        })),
      })),
    };

    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.manualQuiz(selectedCourseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Lưu Quizz thất bại.");
      toast.success("Đã lưu Quizz.");
      await loadExistingQuiz();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionRow>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOption = (qi: number, oi: number, patch: Partial<OptRow>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const opts = q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o));
        return { ...q, options: opts };
      })
    );
  };

  return (
    <div className="assignment-editor manual-quiz-editor">
      <Toaster position="top-right" />
      <div className="editor-row" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label className="editor-label">Khóa học</label>
          <select
            value={selectedCourseId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onSelectedCourseIdChange(v ? Number(v) : null);
              setLessonId("");
            }}
            disabled={loading || lessonsLoading || courses.length === 0}
            style={{ width: "100%" }}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="section-tab active"
          style={{ padding: "10px 20px" }}
          onClick={() => {
            if (selectedCourseId == null) return;
            navigate(`/teacher/courses/${selectedCourseId}/content`);
          }}
          disabled={selectedCourseId == null}
        >
          Mở Content Builder →
        </button>
      </div>

      <div className="editor-row">
        <label className="editor-label">Bài học</label>
        <select
          value={lessonId}
          onChange={(e) => setLessonId(Number(e.target.value))}
          disabled={!lessonTree || lessonsLoading || courses.length === 0}
          style={{ width: "100%" }}
        >
          {(lessonTree?.modules ?? []).map((mod, mi) => (
            <optgroup key={mod.id} label={`Chương ${mi + 1}: ${mod.title || "Không tên"}`}>
              {(mod.lessons ?? []).map((l, li) => (
                <option key={l.id} value={l.id}>
                  Bài {li + 1}: {l.title} · {l.lesson_type}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {lessonsError && <div className="error-box">{lessonsError}</div>}

      <div className="assignment-form">
        <p className="mq-section-title">Nội dung Quizz</p>
        <h3>Tiêu đề và cấu hình</h3>
        <div className="form-grid">
          <div className="field">
            <label>Tiêu đề Quizz *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
          </div>
          <div className="field">
            <label>Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={saving} />
          </div>
          <div className="field">
            <label>Thời giới hạn (phút)</label>
            <input
              type="number"
              min={0}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              disabled={saving}
              placeholder="Để trống = không giới hạn"
            />
          </div>
          <div className="field">
            <label>Điểm đạt (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              disabled={saving}
              placeholder="Ví dụ: 50"
            />
          </div>
          <div className="field">
            <label>Số lần làm tối đa</label>
            <input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
              disabled={saving}
            />
          </div>
        </div>

        <div className="policy-grid mq-check-grid" style={{ marginTop: 12 }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} disabled={saving} />
            Trộn câu hỏi
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} disabled={saving} />
            Trộn đáp án
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} disabled={saving} />
            Hiện kết quả ngay
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={showCorrect} onChange={(e) => setShowCorrect(e.target.checked)} disabled={saving} />
            Hiện đáp án đúng
          </label>
        </div>

        <p className="mq-section-title" style={{ marginTop: 16 }}>
          Câu hỏi
        </p>
        {questions.map((q, qi) => (
          <div key={qi} className="mq-question-card">
            <div className="mq-question-head">
              <strong>Câu {qi + 1}</strong>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving || questions.length <= 1}
                onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
              >
                Xóa câu
              </button>
            </div>
            <div className="field mq-field-select" style={{ marginTop: 8 }}>
              <label>Loại</label>
              <select
                className="mq-question-meta-select mq-question-meta-select--kind"
                value={q.question_type}
                onChange={(e) => {
                  const t = e.target.value === "true_false" ? "true_false" : "multiple_choice";
                  updateQuestion(qi, {
                    question_type: t,
                    options:
                      t === "true_false"
                        ? [
                            { option_text: "Đúng", is_correct: true },
                            { option_text: "Sai", is_correct: false },
                          ]
                        : defaultQuestion().options,
                  });
                }}
                disabled={saving}
              >
                <option value="multiple_choice">Trắc nghiệm nhiều lựa chọn</option>
                <option value="true_false">Đúng / Sai</option>
              </select>
            </div>
            <div className="field">
              <label>Nội dung câu hỏi</label>
              <textarea
                rows={2}
                value={q.question_text}
                onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Điểm</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.5}
                  value={q.points}
                  onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })}
                  disabled={saving}
                />
              </div>
              <div className="field mq-field-select">
                <label>Độ khó</label>
                <select
                  className="mq-question-meta-select mq-question-meta-select--difficulty"
                  value={q.difficulty}
                  onChange={(e) =>
                    updateQuestion(qi, {
                      difficulty: e.target.value as QuestionRow["difficulty"],
                    })
                  }
                  disabled={saving}
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Giải thích (tuỳ chọn)</label>
              <input
                value={q.explanation}
                onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                disabled={saving}
              />
            </div>
            {q.question_type === "multiple_choice" && (
              <>
                <label style={{ display: "block", marginTop: 8, fontWeight: 600 }}>Đáp án</label>
                {q.options.map((o, oi) => (
                  <div key={oi} className="mq-option-row">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={o.is_correct}
                      onChange={() => {
                        setQuestions((prev) =>
                          prev.map((qq, i) => {
                            if (i !== qi) return qq;
                            return {
                              ...qq,
                              options: qq.options.map((x, j) => ({ ...x, is_correct: j === oi })),
                            };
                          })
                        );
                      }}
                      disabled={saving}
                    />
                    <input
                      style={{ flex: 1 }}
                      value={o.option_text}
                      onChange={(e) => updateOption(qi, oi, { option_text: e.target.value })}
                      disabled={saving}
                      placeholder={`Lựa chọn ${oi + 1}`}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={saving || q.options.length <= 2}
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((qq, i) =>
                            i === qi ? { ...qq, options: qq.options.filter((_, j) => j !== oi) } : qq
                          )
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  disabled={saving}
                  onClick={() =>
                    setQuestions((prev) =>
                      prev.map((qq, i) =>
                        i === qi
                          ? { ...qq, options: [...qq.options, { option_text: "", is_correct: false }] }
                          : qq
                      )
                    )
                  }
                >
                  + Thêm đáp án
                </button>
              </>
            )}
            {q.question_type === "true_false" && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontWeight: 600, marginRight: 12 }}>Đáp án đúng:</span>
                <label style={{ marginRight: 16 }}>
                  <input
                    type="radio"
                    name={`tf-correct-${qi}`}
                    checked={Boolean(q.options[0]?.is_correct)}
                    onChange={() =>
                      updateQuestion(qi, {
                        options: [
                          { option_text: "Đúng", is_correct: true },
                          { option_text: "Sai", is_correct: false },
                        ],
                      })
                    }
                    disabled={saving}
                  />{" "}
                  Đúng
                </label>
                <label>
                  <input
                    type="radio"
                    name={`tf-correct-${qi}`}
                    checked={Boolean(q.options[1]?.is_correct)}
                    onChange={() =>
                      updateQuestion(qi, {
                        options: [
                          { option_text: "Đúng", is_correct: false },
                          { option_text: "Sai", is_correct: true },
                        ],
                      })
                    }
                    disabled={saving}
                  />{" "}
                  Sai
                </label>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => setQuestions((prev) => [...prev, defaultQuestion()])}
        >
          + Thêm câu hỏi
        </button>

        <div className="actions-row" style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={handleSaveQuiz} disabled={saving || loading}>
            {saving ? "Đang lưu..." : "Lưu Quizz"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={saving || lessonId === ""}
            onClick={() => loadExistingQuiz().then(() => toast.success("Đã tải lại")).catch((e) => toast.error(e?.message))}
          >
            Tải lại từ server
          </button>
        </div>
      </div>
    </div>
  );
}
