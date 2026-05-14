import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { QUESTION_BANKS_API } from "../api/questionBanks";
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

type QuestionBank = {
  id: number;
  name: string;
};

type BankQuestion = {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank";
  explanation?: string | null;
  points?: number;
  difficulty?: "easy" | "medium" | "hard";
  options?: Array<{ option_text: string; is_correct: boolean }>;
};

type QuizPreviewConfig = {
  time_limit_minutes: number | null;
  passing_score: number | null;
};

function normalizeQuestionKey(question: { question_text?: string | null; question_type?: string | null }): string {
  const text = String(question?.question_text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  const type = String(question?.question_type || "multiple_choice").toLowerCase();
  return `${type}::${text}`;
}

type QuestionBankPickMessage = {
  source: "question-bank-pick";
  courseId: number;
  bankId: number;
  questions: Array<{
    id: number;
    question_text: string;
    question_type: "multiple_choice" | "true_false";
    explanation?: string;
    points?: number;
    difficulty?: "easy" | "medium" | "hard";
    options: Array<{ option_text: string; is_correct: boolean }>;
  }>;
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
  embeddedMode?: boolean;
  embeddedQuizTitle?: string;
  showSavedQuestionsSection?: boolean;
  onSavedQuestionsChange?: (questions: QuestionRow[]) => void;
  onQuizConfigChange?: (config: QuizPreviewConfig) => void;
  onDirtyChange?: (dirty: boolean) => void;
  hideSaveButton?: boolean;
  externalSaveSignal?: number;
  questionsOverride?: QuestionRow[] | null;
}) {
  const {
    courses,
    token,
    loading,
    selectedCourseId,
    onSelectedCourseIdChange,
    pickedLessonId,
    embeddedMode = false,
    embeddedQuizTitle,
    showSavedQuestionsSection = true,
    onSavedQuestionsChange,
    onQuizConfigChange,
    onDirtyChange,
    hideSaveButton = false,
    externalSaveSignal = 0,
    questionsOverride = null,
  } = props;
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
  const [savedQuestions, setSavedQuestions] = useState<QuestionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | "">("");
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [pickedBankQuestionIds, setPickedBankQuestionIds] = useState<number[]>([]);
  const [pendingBankImportedQuestions, setPendingBankImportedQuestions] = useState<QuestionRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);
  const [quizCreateMode, setQuizCreateMode] = useState<"manual" | "question_bank" | "csv" | "ai">("manual");
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiQuestionType, setAiQuestionType] = useState<"multiple_choice" | "true_false" | "mixed">("mixed");
  const [aiExtraInstructions, setAiExtraInstructions] = useState("");
  const [aiAttachments, setAiAttachments] = useState<Array<{ name: string; text: string }>>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState("");
  const [manualOptionCount, setManualOptionCount] = useState(4);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const manualMaxOptionCount = useMemo(() => {
    const maxFromRows = questions.reduce((max, q) => Math.max(max, q.options.length || 0), 0);
    return Math.max(2, manualOptionCount, maxFromRows);
  }, [manualOptionCount, questions]);

  useEffect(() => {
    const maxFromRows = questions.reduce((max, q) => Math.max(max, q.options.length || 0), 0);
    setManualOptionCount((prev) => Math.max(2, prev, maxFromRows));
  }, [questions]);

  const selectedLessonTitle = useMemo(() => {
    if (!lessonTree) return "";
    const id = typeof lessonId === "number" ? lessonId : null;
    if (!id) return "";
    for (const mod of lessonTree.modules ?? []) {
      for (const l of mod.lessons ?? []) {
        if (l.id === id) return String(l.title || "");
      }
    }
    return "";
  }, [lessonId, lessonTree]);

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
    if (!selectedCourseId) {
      setQuestionBanks([]);
      setSelectedBankId("");
      return;
    }
    (async () => {
      try {
        const q = new URLSearchParams({ course_id: String(selectedCourseId) });
        const res = await fetch(`${url}${QUESTION_BANKS_API.list}?${q.toString()}`, {
          headers: { "Content-Type": "application/json", ...authHeaders },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Không tải được Question Bank.");
        const banks = (Array.isArray(data.data) ? data.data : []) as QuestionBank[];
        setQuestionBanks(banks);
        setSelectedBankId((prev) => {
          if (prev !== "" && banks.some((item) => item.id === prev)) return prev;
          return banks[0]?.id ?? "";
        });
      } catch {
        setQuestionBanks([]);
        setSelectedBankId("");
      }
    })();
  }, [authHeaders, selectedCourseId]);

  useEffect(() => {
    if (selectedLessonTitle) {
      setAiTopic(selectedLessonTitle);
    }
  }, [selectedLessonTitle]);

  useEffect(() => {
    if (!selectedBankId) {
      setBankQuestions([]);
      setPickedBankQuestionIds([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${url}${QUESTION_BANKS_API.listQuestions(selectedBankId)}`, {
          headers: { "Content-Type": "application/json", ...authHeaders },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Không tải được câu hỏi ngân hàng.");
        const questionsRaw = (Array.isArray(data.data) ? data.data : []) as BankQuestion[];
        const usable = questionsRaw.filter(
          (item) => item.question_type === "multiple_choice" || item.question_type === "true_false"
        );
        setBankQuestions(usable);
        setPickedBankQuestionIds([]);
      } catch {
        setBankQuestions([]);
        setPickedBankQuestionIds([]);
      }
    })();
  }, [authHeaders, selectedBankId]);

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
      setSavedQuestions([]);
      setLastSavedFingerprint("");
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
      const rows = mapApiToRows(quiz.questions);
      setSavedQuestions(rows);
      setLastSavedFingerprint(
        JSON.stringify({
          title: quiz.title ?? "",
          description: quiz.description ?? "",
          timeLimit: quiz.time_limit_minutes != null ? String(quiz.time_limit_minutes) : "",
          passingScore: quiz.passing_score != null ? String(quiz.passing_score) : "",
          maxAttempts: Number(quiz.max_attempts ?? 1) || 1,
          shuffleQuestions: Boolean(quiz.shuffle_questions),
          shuffleOptions: Boolean(quiz.shuffle_options),
          showResults: quiz.show_results_immediately !== false,
          showCorrect: quiz.show_correct_answers !== false,
          questions: quizCreateMode === "manual" ? [] : rows,
        })
      );
    } else {
      setSavedQuestions([]);
      setLastSavedFingerprint(
        JSON.stringify({
          title: quiz.title ?? "",
          description: quiz.description ?? "",
          timeLimit: quiz.time_limit_minutes != null ? String(quiz.time_limit_minutes) : "",
          passingScore: quiz.passing_score != null ? String(quiz.passing_score) : "",
          maxAttempts: Number(quiz.max_attempts ?? 1) || 1,
          shuffleQuestions: Boolean(quiz.shuffle_questions),
          shuffleOptions: Boolean(quiz.shuffle_options),
          showResults: quiz.show_results_immediately !== false,
          showCorrect: quiz.show_correct_answers !== false,
          questions: quizCreateMode === "manual" ? [] : [defaultQuestion()],
        })
      );
    }
  }, [authHeaders, lessonId, selectedCourseId]);

  useEffect(() => {
    loadExistingQuiz().catch(() => {
      /* im lặng — chưa có quiz */
    });
  }, [loadExistingQuiz]);

  useEffect(() => {
    onSavedQuestionsChange?.(savedQuestions);
  }, [onSavedQuestionsChange, savedQuestions]);

  useEffect(() => {
    const nextConfig: QuizPreviewConfig = {
      time_limit_minutes: timeLimit.trim() ? Number(timeLimit) : null,
      passing_score: passingScore.trim() ? Number(passingScore) : null,
    };
    onQuizConfigChange?.(nextConfig);
  }, [onQuizConfigChange, passingScore, timeLimit]);

  useEffect(() => {
    if (!questionsOverride) return;
    if (quizCreateMode === "manual") return;
    setQuestions((prev) => {
      const next = JSON.stringify(questionsOverride);
      const curr = JSON.stringify(prev);
      if (next === curr) return prev;
      return questionsOverride;
    });
  }, [questionsOverride, quizCreateMode]);

  useEffect(() => {
    const onPickMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as Partial<QuestionBankPickMessage> | null;
      if (!payload || payload.source !== "question-bank-pick") return;
      if (selectedCourseId && Number(payload.courseId) !== Number(selectedCourseId)) return;
      const importedRaw = Array.isArray(payload.questions) ? payload.questions : [];
      if (!importedRaw.length) return;
      const mapped: QuestionRow[] = importedRaw.map((item) => {
        const qType = item.question_type === "true_false" ? "true_false" : "multiple_choice";
        const options =
          Array.isArray(item.options) && item.options.length >= 2
            ? item.options.map((o) => ({
                option_text: String(o.option_text || ""),
                is_correct: Boolean(o.is_correct),
              }))
            : defaultQuestion().options;
        return {
          question_text: String(item.question_text || ""),
          question_type: qType,
          explanation: String(item.explanation || ""),
          points: Number(item.points) > 0 ? Number(item.points) : 1,
          difficulty: item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium",
          options,
        };
      });
      setQuizCreateMode("question_bank");
      setPendingBankImportedQuestions((prev) => [...prev, ...mapped]);
      toast.success(`Đã nhận ${mapped.length} câu hỏi từ Question Bank (tạm).`);
    };
    window.addEventListener("message", onPickMessage);
    return () => window.removeEventListener("message", onPickMessage);
  }, [selectedCourseId]);

  useEffect(() => {
    if (!externalSaveSignal) return;
    void handleSaveQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSaveSignal]);

  useEffect(() => {
    const fingerprintQuestions = quizCreateMode === "manual" ? [] : questions;
    const currentFingerprint = JSON.stringify({
      title,
      description,
      timeLimit,
      passingScore,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      showCorrect,
      questions: fingerprintQuestions,
      pendingBankImportedQuestions,
    });
    onDirtyChange?.(Boolean(lastSavedFingerprint) && currentFingerprint !== lastSavedFingerprint);
  }, [
    description,
    lastSavedFingerprint,
    maxAttempts,
    onDirtyChange,
    passingScore,
    questions,
    showCorrect,
    showResults,
    shuffleOptions,
    shuffleQuestions,
    timeLimit,
    title,
    quizCreateMode,
    pendingBankImportedQuestions,
  ]);

  useEffect(() => {
    if (!embeddedMode) return;
    const fallback = String(embeddedQuizTitle || "").trim();
    if (!fallback) return;
    setTitle((prev) => (prev.trim() ? prev : fallback));
  }, [embeddedMode, embeddedQuizTitle]);

  const handleSaveQuiz = async () => {
    if (loading || saving) return;
    if (selectedCourseId == null || lessonId === "") {
      toast.error("Chọn khóa học và bài học.");
      return;
    }
    const resolvedTitle = title.trim() || String(embeddedQuizTitle || "").trim();
    if (!resolvedTitle) {
      toast.error("Nhập tiêu đề Quizz.");
      return;
    }
    const effectiveQuestions =
      quizCreateMode === "manual"
        ? [
            ...savedQuestions,
            ...questions.filter(
              (q) => q.question_text.trim() || q.options.some((opt) => opt.option_text.trim())
            ),
          ]
        : [...questions, ...pendingBankImportedQuestions];

    const payload = {
      title: resolvedTitle,
      description: description.trim() || null,
      time_limit_minutes: timeLimit.trim() ? Number(timeLimit) : null,
      passing_score: passingScore.trim() ? Number(passingScore) : null,
      max_attempts: maxAttempts,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      show_results_immediately: showResults,
      show_correct_answers: showCorrect,
      questions: effectiveQuestions.map((q) => ({
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
      const savedRows: QuestionRow[] = payload.questions.map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type === "true_false" ? "true_false" : "multiple_choice",
        explanation: q.explanation ?? "",
        points: Number(q.points) || 1,
        difficulty: q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium",
        options: q.options.map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      }));
      setSavedQuestions(savedRows);
      setLastSavedFingerprint(
        JSON.stringify({
          title,
          description,
          timeLimit,
          passingScore,
          maxAttempts,
          shuffleQuestions,
          shuffleOptions,
          showResults,
          showCorrect,
          questions: savedRows,
        })
      );
      if (quizCreateMode === "manual") {
        setQuestions([defaultQuestion()]);
        setManualOptionCount(4);
      } else {
        setQuestions(savedRows);
      }
      setPendingBankImportedQuestions([]);
      toast.success("Đã lưu Quizz.");
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

  const importSelectedBankQuestions = () => {
    if (!pickedBankQuestionIds.length) {
      toast.error("Chọn ít nhất 1 câu hỏi để import.");
      return;
    }
    const picked = bankQuestions.filter((item) => pickedBankQuestionIds.includes(item.id));
    if (!picked.length) {
      toast.error("Không tìm thấy câu hỏi đã chọn.");
      return;
    }

    const mapped: QuestionRow[] = picked.map((item) => {
      const qType = item.question_type === "true_false" ? "true_false" : "multiple_choice";
      let options: OptRow[] =
        (item.options ?? []).map((o) => ({
          option_text: String(o.option_text ?? ""),
          is_correct: Boolean(o.is_correct),
        })) || [];

      if (qType === "true_false") {
        const hasTrue = options.some((o) => o.option_text.toLowerCase() === "đúng" || o.option_text.toLowerCase() === "true");
        const hasFalse = options.some((o) => o.option_text.toLowerCase() === "sai" || o.option_text.toLowerCase() === "false");
        if (!hasTrue || !hasFalse) {
          const firstCorrect = Boolean(options.find((o) => o.is_correct));
          options = [
            { option_text: "Đúng", is_correct: firstCorrect },
            { option_text: "Sai", is_correct: !firstCorrect },
          ];
        }
      }
      if (options.length < 2) {
        options = defaultQuestion().options;
      }

      return {
        question_text: item.question_text ?? "",
        question_type: qType,
        explanation: item.explanation ?? "",
        points: Number(item.points) || 1,
        difficulty: item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium",
        options,
      };
    });

    setQuestions((prev) => [...prev, ...mapped]);
    setPickedBankQuestionIds([]);
    toast.success(`Đã import ${mapped.length} câu hỏi.`);
  };

  const generateByAi = async () => {
    if (!selectedCourseId || lessonId === "") {
      toast.error("Chọn khóa học và bài học trước khi tạo bằng AI.");
      return;
    }
    if (!aiTopic.trim()) {
      toast.error("Nhập chủ đề để AI tạo câu hỏi.");
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch(`${url}${COURSES_API.manualQuizAiGenerate(selectedCourseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          question_count: aiQuestionCount,
          difficulty: aiDifficulty,
          question_type: aiQuestionType,
          extra_instructions: aiExtraInstructions.trim() || undefined,
          attachment_name: aiAttachments.length ? aiAttachments.map((item) => item.name).join(", ") : undefined,
          attachment_text: aiAttachments.length ? aiAttachments.map((item) => `--- ${item.name} ---\n${item.text}`).join("\n\n") : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "Tạo quiz bằng AI thất bại.");
      }

      const generated = (Array.isArray(data?.data?.questions) ? data.data.questions : []) as QuestionRow[];
      if (!generated.length) {
        throw new Error("AI không tạo được câu hỏi hợp lệ.");
      }
      setQuestions((prev) => [...prev, ...generated]);
      toast.success(`AI đã tạo ${generated.length} câu hỏi.`);
    } catch (e: any) {
      toast.error(e?.message || "Lỗi tạo quiz bằng AI.");
    } finally {
      setAiGenerating(false);
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const output: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        output.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    output.push(current.trim());
    return output;
  };

  const importFromCsvFile = async (file: File) => {
    const raw = await file.text();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      toast.error("File CSV đang trống.");
      return;
    }

    // Header format:
    // question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation
    const startIndex = lines[0].toLowerCase().includes("question_text") ? 1 : 0;
    const parsed: QuestionRow[] = [];
    const errors: string[] = [];

    for (let i = startIndex; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const lineNo = i + 1;
      if (cols.length < 3) {
        errors.push(`Dòng ${lineNo}: thiếu cột (cần ít nhất question + 2 đáp án).`);
        continue;
      }

      const questionText = cols[0]?.trim();
      const correctOption = cols[1]?.trim();
      const wrongOptions = cols.slice(2, 5).map((c) => c?.trim()).filter(Boolean);
      const difficultyRaw = cols[5]?.trim().toLowerCase();
      const pointsRaw = cols[6]?.trim();
      const explanation = cols[7]?.trim() ?? "";

      if (!questionText) {
        errors.push(`Dòng ${lineNo}: thiếu question_text.`);
        continue;
      }
      if (!correctOption) {
        errors.push(`Dòng ${lineNo}: thiếu correct_option.`);
        continue;
      }

      const options: OptRow[] = [
        { option_text: correctOption, is_correct: true },
        ...wrongOptions.map((opt) => ({ option_text: opt, is_correct: false })),
      ];
      if (options.length < 2) {
        errors.push(`Dòng ${lineNo}: cần tối thiểu 2 đáp án.`);
        continue;
      }

      const difficulty: QuestionRow["difficulty"] =
        difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";
      const points = Number(pointsRaw);

      parsed.push({
        question_text: questionText,
        question_type: "multiple_choice",
        explanation,
        points: Number.isFinite(points) && points > 0 ? points : 1,
        difficulty,
        options,
      });
    }

    if (!parsed.length) {
      toast.error("Không parse được câu hỏi từ CSV. Kiểm tra lại format.");
      setCsvImportErrors(errors.length ? errors : ["Không có dòng dữ liệu hợp lệ."]);
      return;
    }

    setQuestions((prev) => [...prev, ...parsed]);
    setCsvImportErrors(errors);
    if (errors.length) {
      toast.success(`Đã import ${parsed.length} câu, bỏ qua ${errors.length} dòng lỗi.`);
      return;
    }
    toast.success(`Đã import ${parsed.length} câu hỏi từ CSV.`);
  };

  const downloadCsvTemplate = () => {
    const rows = [
      "question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation",
      '"2 + 2 bằng mấy?","4","3","5","6","easy","1","Câu hỏi cộng cơ bản"',
      '"Thủ đô của Việt Nam là?","Hà Nội","Đà Nẵng","Huế","Cần Thơ","medium","1","Kiến thức địa lý cơ bản"',
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", "quiz-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(fileUrl);
  };

  return (
    <div className="assignment-editor manual-quiz-editor">
      <Toaster position="top-right" />
      {!embeddedMode && (
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
      )}

      {!embeddedMode && (
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
      )}

      {lessonsError && <div className="error-box">{lessonsError}</div>}

      <div className="assignment-form">
        {!embeddedMode && <p className="mq-section-title">Nội dung Quizz</p>}
        {!embeddedMode && <h3>Tiêu đề và cấu hình</h3>}
        <div className="form-grid">
          {!embeddedMode && (
            <div className="field">
              <label>Tiêu đề Quizz *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>
          )}
          {!embeddedMode && (
            <div className="field">
              <label>Mô tả</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={saving} />
            </div>
          )}
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

        <div className="mq-question-card" style={{ marginTop: 12 }}>
          <div className="mq-question-head">
            <strong>Tùy chọn</strong>
          </div>
          <div className="policy-grid mq-check-grid" style={{ marginTop: 8 }}>
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
        </div>

        <p className="mq-section-title" style={{ marginTop: 16 }}>
          Câu hỏi
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            className={quizCreateMode === "manual" ? "btn-primary" : "btn-secondary"}
            style={{ width: "auto" }}
            onClick={() => setQuizCreateMode("manual")}
          >
            Thủ công
          </button>
          <button
            type="button"
            className={quizCreateMode === "question_bank" ? "btn-primary" : "btn-secondary"}
            style={{ width: "auto" }}
            onClick={() => setQuizCreateMode("question_bank")}
          >
            Question Bank
          </button>
          <button
            type="button"
            className={quizCreateMode === "csv" ? "btn-primary" : "btn-secondary"}
            style={{ width: "auto" }}
            onClick={() => setQuizCreateMode("csv")}
          >
            Import CSV
          </button>
          <button
            type="button"
            className={quizCreateMode === "ai" ? "btn-primary" : "btn-secondary"}
            style={{ width: "auto" }}
            onClick={() => setQuizCreateMode("ai")}
          >
            Tạo bằng AI
          </button>
        </div>

        {quizCreateMode === "question_bank" && (
          <>
            <div className="mq-question-card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "auto" }}
                  onClick={() => {
                    if (!selectedCourseId) return;
                    const params = new URLSearchParams({ mode: "pick" });
                    if (selectedBankId) params.set("bankId", String(selectedBankId));
                    if (lessonId !== "") params.set("lessonId", String(lessonId));
                    const contextKey = `qb-pick-context:${selectedCourseId}:${lessonId === "" ? "na" : String(lessonId)}`;
                    const existingKeys = [
                      ...savedQuestions,
                      ...questions,
                      ...pendingBankImportedQuestions,
                    ]
                      .map((q) => normalizeQuestionKey(q))
                      .filter(Boolean);
                    const uniqueKeys = Array.from(new Set(existingKeys));
                    try {
                      window.localStorage.setItem(
                        contextKey,
                        JSON.stringify({
                          questionKeys: uniqueKeys,
                          updatedAt: Date.now(),
                        })
                      );
                      params.set("contextKey", contextKey);
                    } catch {
                      // no-op: nếu localStorage không khả dụng thì vẫn mở tab pick bình thường
                    }
                    window.open(
                      `/teacher/courses/${selectedCourseId}/question-banks?${params.toString()}`,
                      "_blank"
                    );
                  }}
                  disabled={!selectedCourseId}
                >
                  Mở Bank để import câu hỏi
                </button>
              </div>
              <div style={{ marginTop: 10, border: "1px dashed #cbd5e1", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Danh sách câu hỏi tạm từ Question Bank</strong>
                  {!!pendingBankImportedQuestions.length && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 8px" }}
                      onClick={() => setPendingBankImportedQuestions([])}
                    >
                      Xóa danh sách tạm
                    </button>
                  )}
                </div>
                {!pendingBankImportedQuestions.length ? (
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Chưa có câu hỏi tạm. Mở Bank để chọn câu hỏi, sau đó bấm Lưu Quiz để chèn vào danh sách chính.
                  </p>
                ) : (
                  <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
                    {pendingBankImportedQuestions.map((q, idx) => (
                      <div
                        key={`pending-bank-q-${idx}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          background: "#f8fafc",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                            {q.question_text || "(trống)"}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {q.question_type === "true_false" ? "Đúng/Sai" : "Trắc nghiệm"} · {q.points} điểm
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ width: "auto", padding: "4px 8px", flexShrink: 0 }}
                          onClick={() =>
                            setPendingBankImportedQuestions((prev) => prev.filter((_, qIdx) => qIdx !== idx))
                          }
                        >
                          Bỏ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {quizCreateMode === "ai" && (
          <div className="mq-question-card" style={{ marginBottom: 12 }}>
            <div className="mq-question-head">
              <strong>Tạo câu hỏi bằng AI</strong>
            </div>
            <div className="form-grid" style={{ marginTop: 8 }}>
              <div className="field">
                <label>Chủ đề *</label>
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ví dụ: Thì hiện tại đơn trong tiếng Anh"
                  disabled={aiGenerating}
                />
              </div>
              <div className="field">
                <label>Số câu</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={aiQuestionCount}
                  onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  disabled={aiGenerating}
                />
              </div>
              <div className="field">
                <label>Độ khó</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  disabled={aiGenerating}
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>
              <div className="field">
                <label>Loại câu</label>
                <select
                  value={aiQuestionType}
                  onChange={(e) =>
                    setAiQuestionType(e.target.value as "multiple_choice" | "true_false" | "mixed")
                  }
                  disabled={aiGenerating}
                >
                  <option value="mixed">Trộn</option>
                  <option value="multiple_choice">Trắc nghiệm</option>
                  <option value="true_false">Đúng / Sai</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Yêu cầu bổ sung (tuỳ chọn)</label>
              <textarea
                rows={2}
                value={aiExtraInstructions}
                onChange={(e) => setAiExtraInstructions(e.target.value)}
                placeholder="Ví dụ: ưu tiên tình huống thực tế, tránh câu quá dài"
                disabled={aiGenerating}
              />
            </div>
            <div className="field">
              <label>Đính kèm file ngữ cảnh (txt/md/csv/json)</label>
              <input
                type="file"
                accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"
                disabled={aiGenerating}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const trimmed = String(text || "").trim();
                    if (!trimmed) {
                      toast.error("File đính kèm đang trống.");
                      return;
                    }
                    setAiAttachments((prev) => {
                      const next = [...prev, { name: file.name, text: trimmed.slice(0, 12000) }];
                      return next.slice(0, 5);
                    });
                    toast.success("Đã đính kèm file cho AI.");
                  } catch {
                    toast.error("Không đọc được file đính kèm.");
                  } finally {
                    e.currentTarget.value = "";
                  }
                }}
              />
              {aiAttachments.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {aiAttachments.map((item, idx) => (
                    <div key={`${item.name}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#475569" }}>
                        {item.name} ({Math.min(item.text.length, 12000)} ký tự)
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setAiAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={aiGenerating}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={generateByAi} disabled={aiGenerating}>
              {aiGenerating ? "AI đang tạo..." : "Tạo bằng AI"}
            </button>
          </div>
        )}

        {quizCreateMode === "csv" && (
          <div className="mq-question-card" style={{ marginBottom: 12 }}>
            <div className="mq-question-head">
              <strong>Import từ CSV</strong>
            </div>
            <p style={{ margin: "8px 0", color: "#64748b", fontSize: 13 }}>
              Header gợi ý: <code>question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation</code>
            </p>
            <button type="button" className="btn-secondary" style={{ marginBottom: 8 }} onClick={downloadCsvTemplate}>
              Tải file CSV mẫu
            </button>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCsvFileName(file.name);
                try {
                  await importFromCsvFile(file);
                } catch (err: any) {
                  toast.error(err?.message || "Import CSV thất bại.");
                } finally {
                  e.currentTarget.value = "";
                }
              }}
            />
            {csvFileName ? <p style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>File gần nhất: {csvFileName}</p> : null}
            {csvImportErrors.length ? (
              <div style={{ marginTop: 8, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, padding: 8 }}>
                <strong style={{ fontSize: 13 }}>Dòng CSV bị bỏ qua:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {csvImportErrors.slice(0, 8).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                {csvImportErrors.length > 8 ? (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9a3412" }}>
                    ...và {csvImportErrors.length - 8} lỗi khác.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {quizCreateMode === "manual" ? (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
            <table style={{ minWidth: 1320, width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>STT</div>
                  </th>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>question_text</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Ví dụ: 2 + 2 bằng mấy?</div>
                  </th>
                  {Array.from({ length: manualMaxOptionCount }).map((_, optIdx) => (
                    <th key={`manual-opt-head-${optIdx}`} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {optIdx === 0 ? "Đáp án đúng" : `Đáp án ${optIdx + 1}`}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        {optIdx === 0 ? "Ví dụ: 4" : `Ví dụ: phương án ${optIdx + 1}`}
                      </div>
                    </th>
                  ))}
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "center", width: 72 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 8px", marginRight: 4 }}
                      title="Thêm cột đáp án"
                      onClick={() => {
                        setManualOptionCount((prev) => prev + 1);
                        setQuestions((prev) =>
                          prev.map((row) => ({
                            ...row,
                            options: [...row.options, { option_text: "", is_correct: false }],
                          }))
                        );
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 8px" }}
                      title="Hủy cột đáp án cuối"
                      disabled={manualOptionCount <= 2}
                      onClick={() => {
                        const nextCount = Math.max(2, manualOptionCount - 1);
                        setManualOptionCount(nextCount);
                        setQuestions((prev) =>
                          prev.map((row) => ({
                            ...row,
                            options: row.options.slice(0, nextCount).map((opt, idx) => ({
                              ...opt,
                              is_correct: idx === 0,
                            })),
                          }))
                        );
                      }}
                    >
                      -
                    </button>
                  </th>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>difficulty</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>easy / medium / hard</div>
                  </th>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>points</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Ví dụ: 1</div>
                  </th>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>explanation</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Tuỳ chọn</div>
                  </th>
                  <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Thao tác</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, qi) => {
                  const setOptionAt = (idx: number, value: string) => {
                    setQuestions((prev) =>
                      prev.map((row, rIdx) => {
                        if (rIdx !== qi) return row;
                        const normalized = Array.from({ length: manualMaxOptionCount }).map((__, optIdx) => ({
                          option_text: row.options[optIdx]?.option_text ?? "",
                          is_correct: optIdx === 0,
                        }));
                        normalized[idx] = {
                          option_text: value,
                          is_correct: idx === 0,
                        };
                        return {
                          ...row,
                          question_type: "multiple_choice",
                          options: normalized,
                        };
                      })
                    );
                  };
                  const normalizedOptions = Array.from({ length: manualMaxOptionCount }).map(
                    (_, optIdx) => q.options[optIdx]?.option_text ?? ""
                  );
                  const duplicateExists = (() => {
                    const cleaned = normalizedOptions.map((x) => x.trim().toLowerCase()).filter(Boolean);
                    return new Set(cleaned).size !== cleaned.length;
                  })();
                  return (
                    <tr key={qi}>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{qi + 1}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        <input value={q.question_text} onChange={(e) => updateQuestion(qi, { question_text: e.target.value })} disabled={saving} />
                      </td>
                      {normalizedOptions.map((optVal, optIdx) => (
                        <td key={`manual-row-${qi}-opt-${optIdx}`} style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                          <input value={optVal} onChange={(e) => setOptionAt(optIdx, e.target.value)} disabled={saving} />
                        </td>
                      ))}
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }} />
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        <select value={q.difficulty} onChange={(e) => updateQuestion(qi, { difficulty: e.target.value as QuestionRow["difficulty"] })} disabled={saving}>
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        <input type="number" min={0.01} step={0.5} value={q.points} onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })} disabled={saving} />
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        <input value={q.explanation} onChange={(e) => updateQuestion(qi, { explanation: e.target.value })} disabled={saving} />
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        <button type="button" className="btn-secondary" disabled={saving || questions.length <= 1} onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}>
                          Xóa
                        </button>
                        {duplicateExists && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                            Cảnh báo: có đáp án bị trùng nhau.
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        
        {quizCreateMode === "manual" && (
          <button
            type="button"
            className="btn-secondary"
            disabled={saving}
            onClick={() => setQuestions((prev) => [...prev, defaultQuestion()])}
          >
            + Thêm dòng
          </button>
        )}

        {!hideSaveButton && (
          <div className="actions-row" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={handleSaveQuiz} disabled={saving || loading}>
              {saving ? "Đang lưu..." : "Lưu Quizz"}
            </button>
            {/* <button
              type="button"
              className="btn-secondary"
              disabled={saving || lessonId === ""}
              onClick={() => loadExistingQuiz().then(() => toast.success("Đã tải lại")).catch((e) => toast.error(e?.message))}
            >
              Tải lại từ server
            </button> */}
          </div>
        )}

        {showSavedQuestionsSection && (
          <div className="mq-question-card" style={{ marginTop: 12 }}>
            <div className="mq-question-head">
              <strong>Danh sách câu hỏi</strong>
            </div>
            {!savedQuestions.length ? (
              <p style={{ marginTop: 8, color: "#64748b" }}>
                Chưa có câu hỏi đã lưu. Nhập ở phần Thủ công và bấm "Lưu Quizz" để nạp xuống danh sách này.
              </p>
            ) : (
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {savedQuestions.map((item, idx) => {
                  const correct = item.options.find((o) => o.is_correct)?.option_text || "(chưa có)";
                  return (
                    <div
                      key={`saved-${idx}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        Câu {idx + 1}: {item.question_text || "(trống)"}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>Đáp án đúng: {correct}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
