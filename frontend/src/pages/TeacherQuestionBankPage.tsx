import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { QUESTION_BANKS_API } from "../api/questionBanks";
import { getAccessToken } from "../utils/authStorage";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";

type QuestionBank = {
  id: number;
  course_id: number;
  name: string;
  description?: string;
  is_shared: boolean;
};

type QuestionOption = {
  id?: number;
  option_text: string;
  is_correct: boolean;
  explanation?: string;
};

type BankQuestion = {
  id: number;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank";
  question_text: string;
  difficulty: "easy" | "medium" | "hard";
  category?: string;
  tags?: string[];
  points?: number;
  explanation?: string;
  options?: QuestionOption[];
};

const QUESTION_TYPES: Array<BankQuestion["question_type"]> = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "essay",
  "fill_blank",
];

const DIFFICULTIES: Array<BankQuestion["difficulty"]> = ["easy", "medium", "hard"];

export default function TeacherQuestionBankPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);
  const token = getAccessToken();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bankName, setBankName] = useState("");
  const [bankDescription, setBankDescription] = useState("");
  const [bankShared, setBankShared] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  const [questionType, setQuestionType] = useState<BankQuestion["question_type"]>("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [difficulty, setDifficulty] = useState<BankQuestion["difficulty"]>("medium");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [points, setPoints] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ]);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiQuestionType, setAiQuestionType] = useState<"multiple_choice" | "true_false" | "mixed">("mixed");
  const [aiExtraInstructions, setAiExtraInstructions] = useState("");
  const [aiAttachments, setAiAttachments] = useState<Array<{ name: string; text: string }>>([]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const loadBanks = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    const query = new URLSearchParams({ course_id: String(courseId) });
    const res = await fetch(`${url}${QUESTION_BANKS_API.list}?${query.toString()}`, {
      headers: authHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Không tải được question bank.");
    }
    const nextBanks = Array.isArray(data.data) ? data.data : [];
    setBanks(nextBanks);
    if (!selectedBankId && nextBanks.length) {
      setSelectedBankId(nextBanks[0].id);
    } else if (selectedBankId && !nextBanks.some((item: QuestionBank) => item.id === selectedBankId)) {
      setSelectedBankId(nextBanks.length ? nextBanks[0].id : null);
    }
  }, [authHeaders, courseId, selectedBankId]);

  const loadQuestions = useCallback(async () => {
    if (!selectedBankId) {
      setQuestions([]);
      return;
    }
    const res = await fetch(`${url}${QUESTION_BANKS_API.listQuestions(selectedBankId)}`, {
      headers: authHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Không tải được câu hỏi.");
    }
    setQuestions(Array.isArray(data.data) ? data.data : []);
  }, [authHeaders, selectedBankId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadBanks();
    } catch (err: any) {
      setError(err?.message || "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [loadBanks]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setError(null);
    void loadQuestions().catch((err: any) => setError(err?.message || "Không tải được câu hỏi."));
  }, [loadQuestions]);

  const resetBankForm = () => {
    setBankName("");
    setBankDescription("");
    setBankShared(false);
    setEditingBank(null);
  };

  const resetQuestionForm = () => {
    setQuestionType("multiple_choice");
    setQuestionText("");
    setDifficulty("medium");
    setCategory("");
    setTagsInput("");
    setPoints("1");
    setExplanation("");
    setOptions([
      { option_text: "", is_correct: false },
      { option_text: "", is_correct: false },
    ]);
    setEditingQuestion(null);
  };

  const startEditBank = (bank: QuestionBank) => {
    setEditingBank(bank);
    setBankName(bank.name);
    setBankDescription(bank.description ?? "");
    setBankShared(Boolean(bank.is_shared));
  };

  const startEditQuestion = (question: BankQuestion) => {
    setEditingQuestion(question);
    setQuestionType(question.question_type);
    setQuestionText(question.question_text);
    setDifficulty(question.difficulty);
    setCategory(question.category ?? "");
    setTagsInput((question.tags ?? []).join(", "));
    setPoints(String(question.points ?? 1));
    setExplanation(question.explanation ?? "");
    setOptions(question.options?.length ? question.options.map((item) => ({ ...item })) : [
      { option_text: "", is_correct: false },
      { option_text: "", is_correct: false },
    ]);
  };

  const handleSaveBank = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        course_id: courseId,
        name: bankName.trim(),
        description: bankDescription.trim(),
        is_shared: bankShared,
      };
      if (!payload.name) throw new Error("Tên ngân hàng câu hỏi không được để trống.");

      const endpoint = editingBank
        ? QUESTION_BANKS_API.updateBank(editingBank.id)
        : QUESTION_BANKS_API.create;
      const method = editingBank ? "PATCH" : "POST";

      const res = await fetch(`${url}${endpoint}`, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data?.success === false)) {
        throw new Error(data?.message || "Không lưu được question bank.");
      }

      await loadBanks();
      resetBankForm();
    } catch (err: any) {
      setError(err?.message || "Lỗi lưu ngân hàng.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (bankId: number) => {
    if (!window.confirm("Xóa ngân hàng câu hỏi này?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${QUESTION_BANKS_API.deleteBank(bankId)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Không thể xóa question bank.");
      }
      if (selectedBankId === bankId) {
        setSelectedBankId(null);
        setQuestions([]);
      }
      await loadBanks();
      resetBankForm();
    } catch (err: any) {
      setError(err?.message || "Lỗi xóa ngân hàng.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBankId) {
      setError("Vui lòng chọn ngân hàng câu hỏi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const payload: any = {
        question_type: questionType,
        question_text: questionText.trim(),
        difficulty,
        category: category.trim() || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        points: Number(points),
        explanation: explanation.trim() || undefined,
      };

      if (!payload.question_text) throw new Error("Nội dung câu hỏi không được để trống.");
      if (Number.isNaN(payload.points) || payload.points <= 0) {
        throw new Error("Điểm phải là số > 0.");
      }

      if (questionType === "multiple_choice" || questionType === "true_false") {
        const normalizedOptions = options
          .map((item) => ({
            option_text: item.option_text.trim(),
            is_correct: Boolean(item.is_correct),
            explanation: item.explanation?.trim() || undefined,
          }))
          .filter((item) => item.option_text.length > 0);
        payload.options = normalizedOptions;
      }

      const endpoint = editingQuestion
        ? QUESTION_BANKS_API.updateQuestion(selectedBankId, editingQuestion.id)
        : QUESTION_BANKS_API.addQuestion(selectedBankId);
      const method = editingQuestion ? "PATCH" : "POST";

      const res = await fetch(`${url}${endpoint}`, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Không lưu được câu hỏi.");
      }
      await loadQuestions();
      resetQuestionForm();
    } catch (err: any) {
      setError(err?.message || "Lỗi lưu câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedBankId) return;
    if (!window.confirm("Xóa câu hỏi này?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${QUESTION_BANKS_API.deleteQuestion(selectedBankId, questionId)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Không xóa được câu hỏi.");
      }
      await loadQuestions();
      if (editingQuestion?.id === questionId) resetQuestionForm();
    } catch (err: any) {
      setError(err?.message || "Lỗi xóa câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (index: number, patch: Partial<QuestionOption>) => {
    setOptions((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
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

  const createQuestionPayloadFromRow = (row: {
    questionText: string;
    correctOption: string;
    wrongOptions: string[];
    difficultyRaw?: string;
    pointsRaw?: string;
    explanation?: string;
  }) => {
    const questionDifficulty: BankQuestion["difficulty"] =
      row.difficultyRaw === "easy" || row.difficultyRaw === "hard" ? row.difficultyRaw : "medium";
    const parsedPoints = Number(row.pointsRaw);

    return {
      question_type: "multiple_choice",
      question_text: row.questionText,
      difficulty: questionDifficulty,
      points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
      explanation: row.explanation || undefined,
      options: [
        { option_text: row.correctOption, is_correct: true },
        ...row.wrongOptions.map((item) => ({ option_text: item, is_correct: false })),
      ],
    };
  };

  const bulkCreateQuestions = async (payloads: any[]) => {
    if (!selectedBankId) throw new Error("Vui lòng chọn ngân hàng câu hỏi.");
    const res = await fetch(`${url}${QUESTION_BANKS_API.addQuestionsBatch(selectedBankId)}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ questions: payloads }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Có lỗi khi thêm câu hỏi hàng loạt.");
    }
  };

  const generateQuestionsByAi = async () => {
    if (!selectedBankId) {
      setError("Vui lòng chọn ngân hàng câu hỏi.");
      return;
    }
    if (!aiTopic.trim()) {
      setError("Vui lòng nhập chủ đề để AI tạo câu hỏi.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${QUESTION_BANKS_API.generateQuestionsAi(selectedBankId)}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          topic: aiTopic.trim(),
          question_count: aiQuestionCount,
          difficulty: aiDifficulty,
          question_type: aiQuestionType,
          extra_instructions: aiExtraInstructions.trim() || undefined,
          attachment_name: aiAttachments.length ? aiAttachments.map((item) => item.name).join(", ") : undefined,
          attachment_text: aiAttachments.length
            ? aiAttachments.map((item) => `--- ${item.name} ---\n${item.text}`).join("\n\n")
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Không thể tạo câu hỏi bằng AI.");
      }
      const generated = Array.isArray(data?.data) ? data.data : [];
      if (!generated.length) throw new Error("AI không tạo được câu hỏi hợp lệ.");
      await bulkCreateQuestions(generated);
      await loadQuestions();
    } catch (err: any) {
      setError(err?.message || "Lỗi tạo câu hỏi bằng AI.");
    } finally {
      setLoading(false);
    }
  };

  const importQuestionsFromBulkText = async () => {
    if (!selectedBankId) {
      setError("Vui lòng chọn ngân hàng câu hỏi.");
      return;
    }
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setError("Nhập dữ liệu trước khi tạo nhanh.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payloads: any[] = [];
      for (const line of lines) {
        const parts = line
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean);
        if (parts.length < 3) continue;

        const questionText = parts[0];
        const rawOptions = parts.slice(1);
        const normalized = rawOptions.map((opt) => ({
          text: opt.startsWith("*") ? opt.slice(1).trim() : opt,
          correct: opt.startsWith("*"),
        }));
        if (!normalized.some((item) => item.correct) && normalized.length > 0) {
          normalized[0].correct = true;
        }
        const correct = normalized.find((item) => item.correct)?.text ?? "";
        const wrong = normalized.filter((item) => !item.correct).map((item) => item.text).filter(Boolean);
        if (!questionText || !correct || wrong.length < 1) continue;

        payloads.push(
          createQuestionPayloadFromRow({
            questionText,
            correctOption: correct,
            wrongOptions: wrong,
          })
        );
      }

      if (!payloads.length) throw new Error("Không parse được dữ liệu bulk text.");
      await bulkCreateQuestions(payloads);
      await loadQuestions();
      setBulkText("");
    } catch (err: any) {
      setError(err?.message || "Lỗi import nhanh.");
    } finally {
      setLoading(false);
    }
  };

  const importQuestionsFromCsv = async (file: File) => {
    if (!selectedBankId) throw new Error("Vui lòng chọn ngân hàng câu hỏi.");
    const raw = await file.text();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error("File CSV đang trống.");

    const startIndex = lines[0].toLowerCase().includes("question_text") ? 1 : 0;
    const payloads: any[] = [];
    const errors: string[] = [];

    for (let i = startIndex; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const lineNo = i + 1;
      if (cols.length < 3) {
        errors.push(`Dòng ${lineNo}: thiếu cột dữ liệu.`);
        continue;
      }

      const questionText = cols[0]?.trim();
      const correctOption = cols[1]?.trim();
      const wrongOptions = cols.slice(2, 5).map((item) => item.trim()).filter(Boolean);
      const difficultyRaw = cols[5]?.trim().toLowerCase();
      const pointsRaw = cols[6]?.trim();
      const explanation = cols[7]?.trim();

      if (!questionText) {
        errors.push(`Dòng ${lineNo}: thiếu question_text.`);
        continue;
      }
      if (!correctOption) {
        errors.push(`Dòng ${lineNo}: thiếu correct_option.`);
        continue;
      }
      if (wrongOptions.length < 1) {
        errors.push(`Dòng ${lineNo}: cần ít nhất 1 đáp án sai.`);
        continue;
      }

      payloads.push(
        createQuestionPayloadFromRow({
          questionText,
          correctOption,
          wrongOptions,
          difficultyRaw,
          pointsRaw,
          explanation,
        })
      );
    }

    setCsvImportErrors(errors);
    if (!payloads.length) {
      throw new Error("Không parse được dòng hợp lệ từ CSV.");
    }

    await bulkCreateQuestions(payloads);
    await loadQuestions();
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
    link.setAttribute("download", "question-bank-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(fileUrl);
  };

  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="dashboard-page teacher-course-overview">
      <div className="dashboard-container">
        <div className="dashboard-header teacher-course-overview__top">
          <div className="teacher-course-overview__topLeft" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="secondary-button back-button" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
              ← Tổng quan khóa học
            </button>
            <button type="button" className="secondary-button back-button" onClick={() => navigate(`/teacher/courses/${courseId}/assessments`)}>
              Quản lý Quizz & bài tập
            </button>
          </div>
          <AvatarMenu />
        </div>

        <div className="chart-card" style={{ marginBottom: 16 }}>
          <h1 className="teacher-course-overview__title" style={{ margin: "0 0 8px" }}>
            Question Bank
          </h1>
          <p className="course-stats" style={{ margin: 0 }}>
            Quản lý ngân hàng câu hỏi theo khóa học để tái sử dụng khi soạn quiz/bài tập.
          </p>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) 2fr", gap: 16 }}>
          <div className="chart-card">
            <div className="chart-card-title" style={{ marginBottom: 12 }}>
              {editingBank ? "Cập nhật ngân hàng" : "Tạo ngân hàng mới"}
            </div>
            <form onSubmit={handleSaveBank} style={{ display: "grid", gap: 10 }}>
              <input className="form-input" placeholder="Tên ngân hàng" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              <textarea className="form-input" placeholder="Mô tả (tuỳ chọn)" rows={3} value={bankDescription} onChange={(e) => setBankDescription(e.target.value)} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox" checked={bankShared} onChange={(e) => setBankShared(e.target.checked)} />
                Cho phép chia sẻ
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="primary-button" type="submit" disabled={loading}>
                  {editingBank ? "Lưu cập nhật" : "Tạo ngân hàng"}
                </button>
                {editingBank ? (
                  <button className="secondary-button" type="button" onClick={resetBankForm}>
                    Hủy sửa
                  </button>
                ) : null}
              </div>
            </form>

            <div className="chart-card-title" style={{ marginTop: 18, marginBottom: 10 }}>
              Danh sách ngân hàng
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {banks.map((bank) => (
                <div
                  key={bank.id}
                  style={{
                    border: selectedBankId === bank.id ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedBankId(bank.id)}
                    style={{ border: "none", background: "transparent", width: "100%", textAlign: "left", cursor: "pointer" }}
                  >
                    <strong>{bank.name}</strong>
                    <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{bank.description || "Không có mô tả"}</p>
                  </button>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="secondary-button" type="button" onClick={() => startEditBank(bank)}>
                      Sửa
                    </button>
                    <button className="secondary-button" type="button" onClick={() => void handleDeleteBank(bank.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
              {!banks.length && !loading ? <p className="course-stats">Chưa có question bank.</p> : null}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-title" style={{ marginBottom: 12 }}>
              {selectedBank ? `Câu hỏi - ${selectedBank.name}` : "Câu hỏi"}
            </div>
            {selectedBank ? (
              <>
                <form onSubmit={handleSaveQuestion} style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  <select className="form-input" value={questionType} onChange={(e) => setQuestionType(e.target.value as BankQuestion["question_type"])}>
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <textarea className="form-input" rows={3} placeholder="Nội dung câu hỏi" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <select className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as BankQuestion["difficulty"])}>
                      {DIFFICULTIES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <input className="form-input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
                    <input className="form-input" placeholder="Points" value={points} onChange={(e) => setPoints(e.target.value)} />
                  </div>
                  <input className="form-input" placeholder="Tags (phân tách dấu phẩy)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
                  <textarea className="form-input" rows={2} placeholder="Giải thích (tuỳ chọn)" value={explanation} onChange={(e) => setExplanation(e.target.value)} />

                  {(questionType === "multiple_choice" || questionType === "true_false") ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {options.map((opt, idx) => (
                        <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
                          <input
                            className="form-input"
                            placeholder={`Lựa chọn ${idx + 1}`}
                            value={opt.option_text}
                            onChange={(e) => updateOption(idx, { option_text: e.target.value })}
                          />
                          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={opt.is_correct}
                              onChange={(e) => updateOption(idx, { is_correct: e.target.checked })}
                            />
                            Đúng
                          </label>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setOptions((prev) => prev.filter((_, index) => index !== idx))}
                            disabled={options.length <= 2}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                      <button className="secondary-button" type="button" onClick={() => setOptions((prev) => [...prev, { option_text: "", is_correct: false }])}>
                        + Thêm lựa chọn
                      </button>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="primary-button" type="submit" disabled={loading}>
                      {editingQuestion ? "Lưu câu hỏi" : "Thêm câu hỏi"}
                    </button>
                    {editingQuestion ? (
                      <button className="secondary-button" type="button" onClick={resetQuestionForm}>
                        Hủy sửa
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="mq-question-card" style={{ marginBottom: 12 }}>
                  <div className="mq-question-head">
                    <strong>Tạo nhanh bằng dán văn bản</strong>
                  </div>
                  <p style={{ margin: "8px 0", color: "#64748b", fontSize: 13 }}>
                    Mỗi dòng 1 câu theo mẫu: <code>Câu hỏi | *Đáp án đúng | Đáp án sai | Đáp án sai</code>
                  </p>
                  <textarea
                    className="form-input"
                    rows={5}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"2+2=? | *4 | 3 | 5\nThủ đô Việt Nam? | *Hà Nội | Đà Nẵng | Cần Thơ"}
                  />
                  <button className="secondary-button" type="button" style={{ marginTop: 8 }} onClick={() => void importQuestionsFromBulkText()}>
                    Tạo nhanh từ văn bản
                  </button>
                </div>

                <div className="mq-question-card" style={{ marginBottom: 12 }}>
                  <div className="mq-question-head">
                    <strong>Import từ CSV</strong>
                  </div>
                  <p style={{ margin: "8px 0", color: "#64748b", fontSize: 13 }}>
                    Header gợi ý: <code>question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation</code>
                  </p>
                  <button className="secondary-button" type="button" style={{ marginBottom: 8 }} onClick={downloadCsvTemplate}>
                    Tải file CSV mẫu
                  </button>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCsvFileName(file.name);
                      setLoading(true);
                      setError(null);
                      try {
                        await importQuestionsFromCsv(file);
                        if (csvImportErrors.length > 0) {
                          setError(`Import thành công nhưng có ${csvImportErrors.length} dòng CSV bị bỏ qua.`);
                        }
                      } catch (err: any) {
                        setError(err?.message || "Import CSV thất bại.");
                      } finally {
                        setLoading(false);
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

                <div className="mq-question-card" style={{ marginBottom: 12 }}>
                  <div className="mq-question-head">
                    <strong>Tạo câu hỏi bằng AI</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Chủ đề (ví dụ: thì hiện tại đơn)"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      max={20}
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    />
                    <select className="form-input" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as any)}>
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                    <select className="form-input" value={aiQuestionType} onChange={(e) => setAiQuestionType(e.target.value as any)}>
                      <option value="mixed">mixed</option>
                      <option value="multiple_choice">multiple_choice</option>
                      <option value="true_false">true_false</option>
                    </select>
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    style={{ marginTop: 8 }}
                    placeholder="Yêu cầu bổ sung (tuỳ chọn)"
                    value={aiExtraInstructions}
                    onChange={(e) => setAiExtraInstructions(e.target.value)}
                  />
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"
                    style={{ marginTop: 8 }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = (await file.text()).trim();
                        if (!text) throw new Error("File đính kèm đang trống.");
                        setAiAttachments((prev) => [...prev, { name: file.name, text: text.slice(0, 12000) }].slice(0, 5));
                      } catch (err: any) {
                        setError(err?.message || "Không đọc được file đính kèm.");
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
                            {item.name} ({item.text.length} ký tự)
                          </span>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setAiAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    className="secondary-button"
                    type="button"
                    style={{ marginTop: 8 }}
                    onClick={() => void generateQuestionsByAi()}
                    disabled={loading}
                  >
                    {loading ? "Đang tạo..." : "Tạo câu hỏi bằng AI"}
                  </button>
                  {loading ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Đang gọi OpenRouter...</p> : null}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {questions.map((question) => (
                    <div key={question.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <strong>{question.question_text}</strong>
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                            {question.question_type} · {question.difficulty} · {question.points ?? 1} điểm
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="secondary-button" type="button" onClick={() => startEditQuestion(question)}>Sửa</button>
                          <button className="secondary-button" type="button" onClick={() => void handleDeleteQuestion(question.id)}>Xóa</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!questions.length && !loading ? <p className="course-stats">Chưa có câu hỏi trong ngân hàng này.</p> : null}
                </div>
              </>
            ) : (
              <p className="course-stats">Hãy chọn hoặc tạo một ngân hàng câu hỏi trước.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
