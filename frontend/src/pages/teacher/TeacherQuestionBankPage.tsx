// TeacherQuestionBankPage.tsx
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { QUESTION_BANKS_API } from "../../api/questionBanks";
import { getAccessToken } from "../../utils/authStorage";
import "./TeacherDashboard.css";
import "./TeacherQuestionBankPage.css";

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

const TYPE_LABELS: Record<BankQuestion["question_type"], string> = {
  multiple_choice: "Trắc nghiệm",
  true_false: "Đúng/Sai",
  short_answer: "Trả lời ngắn",
  essay: "Tự luận",
  fill_blank: "Điền vào chỗ trống",
};

const DIFFICULTY_LABELS: Record<BankQuestion["difficulty"], { label: string; color: string }> = {
  easy: { label: "Dễ", color: "#10b981" },
  medium: { label: "Trung bình", color: "#f59e0b" },
  hard: { label: "Khó", color: "#ef4444" },
};

type MainTab = "manual" | "bulk";
type BulkSubTab = "text" | "csv" | "ai";

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

  // UI State
  const [isBankFormExpanded, setIsBankFormExpanded] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("manual");
  const [activeBulkSubTab, setActiveBulkSubTab] = useState<BulkSubTab>("text");

  // Data State
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank form state
  const [bankName, setBankName] = useState("");
  const [bankDescription, setBankDescription] = useState("");
  const [bankShared, setBankShared] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  // Question form state
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

  // Bulk import state - Text
  const [bulkText, setBulkText] = useState("");

  // Bulk import state - CSV
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);

  // Bulk import state - AI
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiQuestionType, setAiQuestionType] = useState<"multiple_choice" | "true_false" | "mixed">("mixed");
  const [aiExtraInstructions, setAiExtraInstructions] = useState("");
  const [aiAttachments, setAiAttachments] = useState<Array<{ name: string; text: string }>>([]);
  const [aiPendingQuestions, setAiPendingQuestions] = useState<BankQuestion[]>([]);

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

  useEffect(() => {
    setAiPendingQuestions([]);
  }, [selectedBankId]);

  const resetBankForm = () => {
    setBankName("");
    setBankDescription("");
    setBankShared(false);
    setEditingBank(null);
    setIsBankFormExpanded(false);
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

  const resetBulkForms = () => {
    setBulkText("");
    setCsvFileName("");
    setCsvImportErrors([]);
    setAiTopic("");
    setAiQuestionCount(5);
    setAiDifficulty("medium");
    setAiQuestionType("mixed");
    setAiExtraInstructions("");
    setAiAttachments([]);
  };

  const startEditBank = (bank: QuestionBank) => {
    setEditingBank(bank);
    setBankName(bank.name);
    setBankDescription(bank.description ?? "");
    setBankShared(Boolean(bank.is_shared));
    setIsBankFormExpanded(true);
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
    setActiveMainTab("manual");
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

  // Text import
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
      setActiveMainTab("manual");
      resetBulkForms();
    } catch (err: any) {
      setError(err?.message || "Lỗi import nhanh.");
    } finally {
      setLoading(false);
    }
  };

  // CSV import
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
    setActiveMainTab("manual");
    resetBulkForms();
  };

  // AI import
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
      setAiPendingQuestions(generated);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Lỗi tạo câu hỏi bằng AI.");
    } finally {
      setLoading(false);
    }
  };

  const confirmAiPendingQuestions = async () => {
    if (!aiPendingQuestions.length) {
      setError("Danh sách tạm đang trống.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await bulkCreateQuestions(aiPendingQuestions);
      await loadQuestions();
      setAiPendingQuestions([]);
      setActiveMainTab("manual");
      resetBulkForms();
    } catch (err: any) {
      setError(err?.message || "Không thể đưa câu hỏi AI vào danh sách chính.");
    } finally {
      setLoading(false);
    }
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

  const handleBulkSubTabChange = (tab: BulkSubTab) => {
    setActiveBulkSubTab(tab);
    // Clear errors when switching tabs
    setError(null);
    setCsvImportErrors([]);
  };

  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="teacher-dashboard question-bank-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <div className="back-nav">
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => navigate(`/teacher/courses/${courseId}`)}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Tổng quan khóa học
              </button>
              {/* <button 
                type="button" 
                className="back-btn" 
                onClick={() => navigate(`/teacher/courses/${courseId}/assessments`)}
              >
                <span className="material-symbols-outlined">quiz</span>
                Quiz & Bài tập
              </button> */}
            </div>
            <h1 className="dashboard-title">Question Bank</h1>
            <p className="dashboard-subtitle">Quản lý ngân hàng câu hỏi để tái sử dụng khi soạn quiz và bài tập</p>
          </div>
          <AvatarMenu />
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Two Column Layout */}
        <div className="question-bank-layout">
          {/* Left Column: Bank Management */}
          <div className="bank-section">
            {/* Expandable Bank Form */}
            <div className="expandable-card">
              <button 
                className="expandable-header"
                onClick={() => setIsBankFormExpanded(!isBankFormExpanded)}
                type="button"
              >
                <div className="expandable-title">
                  <span className="material-symbols-outlined">
                    {editingBank ? "edit" : "add"}
                  </span>
                  <span>{editingBank ? "Sửa ngân hàng" : "Tạo ngân hàng mới"}</span>
                </div>
                <span className="material-symbols-outlined expand-icon">
                  {isBankFormExpanded ? "expand_less" : "expand_more"}
                </span>
              </button>
              
              {isBankFormExpanded && (
                <div className="expandable-content">
                  <form onSubmit={handleSaveBank} className="bank-form">
                    <div className="form-group">
                      <label>Tên ngân hàng <span className="required">*</span></label>
                      <input 
                        className="form-input" 
                        placeholder="VD: Ngân hàng câu hỏi Toán cao cấp" 
                        value={bankName} 
                        onChange={(e) => setBankName(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea 
                        className="form-input" 
                        placeholder="Mô tả ngắn gọn về ngân hàng câu hỏi..." 
                        rows={3} 
                        value={bankDescription} 
                        onChange={(e) => setBankDescription(e.target.value)} 
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={bankShared} onChange={(e) => setBankShared(e.target.checked)} />
                        <span className="material-symbols-outlined">share</span>
                        Cho phép chia sẻ ngân hàng với giảng viên khác
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="btn-primary" style={{ background: "var(--primary-dark)" }} type="submit" disabled={loading}>
                        <span className="material-symbols-outlined">{editingBank ? "save" : "add"}</span>
                        {editingBank ? "Lưu cập nhật" : "Tạo ngân hàng"}
                      </button>
                      <button className="btn-secondary" type="button" onClick={resetBankForm}>
                        <span className="material-symbols-outlined">close</span>
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Bank List */}
            <div className="bank-list-card">
              <h3 className="card-subtitle">
                <span className="material-symbols-outlined">list_alt</span>
                Danh sách ngân hàng
              </h3>
              <div className="bank-list">
                {banks.map((bank) => (
                  <div 
                    key={bank.id} 
                    className={`bank-item ${selectedBankId === bank.id ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      className="bank-select-btn"
                      onClick={() => setSelectedBankId(bank.id)}
                    >
                      <div className="bank-info">
                        <div className="bank-name">
                          <span className="material-symbols-outlined">folder_open</span>
                          <strong>{bank.name}</strong>
                        </div>
                        <p className="bank-description">{bank.description || "Không có mô tả"}</p>
                        {bank.is_shared && (
                          <span className="shared-badge">
                            <span className="material-symbols-outlined">share</span>
                            Chia sẻ
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="bank-actions">
                      <button className="icon-btn" onClick={() => startEditBank(bank)} title="Sửa">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="icon-btn danger" onClick={() => void handleDeleteBank(bank.id)} title="Xóa">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                {!banks.length && !loading && (
                  <div className="empty-state small">
                    <span className="material-symbols-outlined">inbox</span>
                    <p>Chưa có ngân hàng câu hỏi nào</p>
                    <p className="empty-hint">Hãy tạo ngân hàng đầu tiên để bắt đầu</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Questions */}
          <div className="questions-section">
            {selectedBank ? (
              <>
                {/* Selected Bank Header */}
                <div className="selected-bank-header">
                  <div className="selected-bank-info">
                    <span className="material-symbols-outlined">folder</span>
                    <div>
                      <h2 className="selected-bank-name">{selectedBank.name}</h2>
                      <p className="selected-bank-desc">{selectedBank.description || "Chưa có mô tả"}</p>
                    </div>
                  </div>
                  <div className="question-count-badge">
                    <span className="material-symbols-outlined">help</span>
                    {questions.length} câu hỏi
                  </div>
                </div>

                {/* Main Tabs: Add Question vs Bulk Import */}
                <div className="question-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${activeMainTab === "manual" ? "active" : ""}`}
                    onClick={() => {
                      setActiveMainTab("manual");
                      resetQuestionForm();
                    }}
                  >
                    <span className="material-symbols-outlined">edit_note</span>
                    {editingQuestion ? "Sửa câu hỏi" : "Thêm câu hỏi"}
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeMainTab === "bulk" ? "active" : ""}`}
                    onClick={() => {
                      setActiveMainTab("bulk");
                      resetQuestionForm();
                      resetBulkForms();
                    }}
                  >
                    <span className="material-symbols-outlined">upload_file</span>
                    Nhập hàng loạt
                  </button>
                </div>

                {/* Manual Question Form */}
                {activeMainTab === "manual" && (
                  <div className="question-form-card">
                    <form onSubmit={handleSaveQuestion} className="question-form">
                      <div className="form-row-3">
                        <div className="form-group">
                          <label>Loại câu hỏi</label>
                          <select className="form-input" value={questionType} onChange={(e) => setQuestionType(e.target.value as BankQuestion["question_type"])}>
                            {QUESTION_TYPES.map((type) => (
                              <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Độ khó</label>
                          <select className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as BankQuestion["difficulty"])}>
                            {DIFFICULTIES.map((item) => (
                              <option key={item} value={item}>{DIFFICULTY_LABELS[item].label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Điểm số</label>
                          <input className="form-input" type="number" min="0.5" step="0.5" value={points} onChange={(e) => setPoints(e.target.value)} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Nội dung câu hỏi <span className="required">*</span></label>
                        <textarea className="form-input" rows={3} placeholder="Nhập nội dung câu hỏi..." value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
                      </div>

                      <div className="form-row-2">
                        <div className="form-group">
                          <label>Danh mục</label>
                          <input className="form-input" placeholder="VD: Đại số, Giải tích..." value={category} onChange={(e) => setCategory(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Tags (phân cách bằng dấu phẩy)</label>
                          <input className="form-input" placeholder="toán, đại số, cơ bản" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Giải thích (hiển thị sau khi trả lời)</label>
                        <textarea className="form-input" rows={2} placeholder="Giải thích đáp án đúng..." value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                      </div>

                      {(questionType === "multiple_choice" || questionType === "true_false") && (
                        <div className="options-section">
                          <label>Các lựa chọn</label>
                          <div className="options-list">
                            {options.map((opt, idx) => (
                              <div key={idx} className="option-row">
                                <input
                                  className="form-input"
                                  placeholder={`Lựa chọn ${idx + 1}`}
                                  value={opt.option_text}
                                  onChange={(e) => updateOption(idx, { option_text: e.target.value })}
                                />
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={opt.is_correct}
                                    onChange={(e) => updateOption(idx, { is_correct: e.target.checked })}
                                  />
                                  <span className="material-symbols-outlined">check_circle</span>
                                  Đúng
                                </label>
                                <button
                                  className="icon-btn"
                                  type="button"
                                  onClick={() => setOptions((prev) => prev.filter((_, index) => index !== idx))}
                                  disabled={options.length <= 2}
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            ))}
                          </div>
                          <button className="btn-secondary btn-sm" type="button" onClick={() => setOptions((prev) => [...prev, { option_text: "", is_correct: false }])}>
                            <span className="material-symbols-outlined">add</span>
                            Thêm lựa chọn
                          </button>
                        </div>
                      )}

                      <div className="form-actions">
                        <button className="btn-primary" type="submit" disabled={loading}>
                          <span className="material-symbols-outlined">{editingQuestion ? "save" : "add"}</span>
                          {editingQuestion ? "Lưu câu hỏi" : "Thêm câu hỏi"}
                        </button>
                        {editingQuestion && (
                          <button className="btn-secondary" type="button" onClick={resetQuestionForm}>
                            <span className="material-symbols-outlined">close</span>
                            Hủy sửa
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Bulk Import Section with 3 Sub Tabs */}
                {activeMainTab === "bulk" && (
                  <>
                    {/* Sub Tabs for Bulk Import Options */}
                    <div className="bulk-sub-tabs">
                      <button
                        type="button"
                        className={`sub-tab-btn ${activeBulkSubTab === "text" ? "active" : ""}`}
                        onClick={() => handleBulkSubTabChange("text")}
                      >
                        <span className="material-symbols-outlined">text_fields</span>
                        Nhập từ văn bản
                      </button>
                      <button
                        type="button"
                        className={`sub-tab-btn ${activeBulkSubTab === "csv" ? "active" : ""}`}
                        onClick={() => handleBulkSubTabChange("csv")}
                      >
                        <span className="material-symbols-outlined">table_rows</span>
                        Nhập từ CSV
                      </button>
                      <button
                        type="button"
                        className={`sub-tab-btn ${activeBulkSubTab === "ai" ? "active" : ""}`}
                        onClick={() => handleBulkSubTabChange("ai")}
                      >
                        <span className="material-symbols-outlined">auto_awesome</span>
                        Tạo bằng AI
                      </button>
                    </div>

                    <div className="bulk-import-content">
                      {/* Text Import */}
                      {activeBulkSubTab === "text" && (
                        <div className="import-card">
                          <p className="import-hint">
                            Mỗi dòng một câu theo mẫu: <code>Câu hỏi | *Đáp án đúng | Đáp án sai | Đáp án sai</code>
                          </p>
                          <textarea
                            className="form-input"
                            rows={8}
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder="2+2=? | *4 | 3 | 5&#10;Thủ đô Việt Nam? | *Hà Nội | Đà Nẵng | Cần Thơ&#10;Mặt trời mọc hướng nào? | *Đông | Tây | Nam | Bắc"
                          />
                          <button className="btn-primary" type="button" onClick={() => void importQuestionsFromBulkText()} disabled={loading}>
                            <span className="material-symbols-outlined">play_arrow</span>
                            {loading ? "Đang xử lý..." : "Tạo câu hỏi từ văn bản"}
                          </button>
                        </div>
                      )}

                      {/* CSV Import */}
                      {activeBulkSubTab === "csv" && (
                        <div className="import-card">
                          <p className="import-hint">
                            Header mẫu: <code>question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation</code>
                          </p>
                          <button className="btn-secondary btn-sm" type="button" onClick={downloadCsvTemplate}>
                            <span className="material-symbols-outlined">download</span>
                            Tải file CSV mẫu
                          </button>
                          <div className="file-upload">
                            <label className="file-upload-label">
                              <span className="material-symbols-outlined">cloud_upload</span>
                              Chọn file CSV
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
                                    } else {
                                      setError(null);
                                    }
                                  } catch (err: any) {
                                    setError(err?.message || "Import CSV thất bại.");
                                  } finally {
                                    setLoading(false);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {csvFileName && <p className="file-name">Đã chọn: {csvFileName}</p>}
                          {csvImportErrors.length > 0 && (
                            <div className="error-list">
                              <strong>Lỗi CSV:</strong>
                              <ul>
                                {csvImportErrors.slice(0, 5).map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                                {csvImportErrors.length > 5 && <li>...và {csvImportErrors.length - 5} lỗi khác</li>}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Generation */}
                      {activeBulkSubTab === "ai" && (
                        <div className="import-card ai-card">
                          <div className="form-row-2">
                            <input
                              className="form-input"
                              placeholder="Chủ đề (VD: thì hiện tại đơn)"
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
                          </div>
                          <div className="form-row-2">
                            <select className="form-input" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as any)}>
                              <option value="easy">Dễ</option>
                              <option value="medium">Trung bình</option>
                              <option value="hard">Khó</option>
                            </select>
                            <select className="form-input" value={aiQuestionType} onChange={(e) => setAiQuestionType(e.target.value as any)}>
                              <option value="mixed">Hỗn hợp</option>
                              <option value="multiple_choice">Trắc nghiệm</option>
                              <option value="true_false">Đúng/Sai</option>
                            </select>
                          </div>
                          <textarea
                            className="form-input"
                            rows={2}
                            placeholder="Yêu cầu bổ sung (tuỳ chọn)"
                            value={aiExtraInstructions}
                            onChange={(e) => setAiExtraInstructions(e.target.value)}
                          />
                          <div className="file-upload">
                            <label className="file-upload-label">
                              <span className="material-symbols-outlined">attach_file</span>
                              Đính kèm tài liệu
                              <input
                                type="file"
                                accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"
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
                            </label>
                          </div>
                          {aiAttachments.length > 0 && (
                            <div className="attachment-list">
                              {aiAttachments.map((item, idx) => (
                                <div key={idx} className="attachment-item">
                                  <span className="material-symbols-outlined">description</span>
                                  <span>{item.name}</span>
                                  <button type="button" onClick={() => setAiAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                                    <span className="material-symbols-outlined">close</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button className="btn-primary" type="button" onClick={() => void generateQuestionsByAi()} disabled={loading}>
                            <span className="material-symbols-outlined">auto_awesome</span>
                            {loading ? "Đang tạo..." : "Tạo câu hỏi bằng AI"}
                          </button>

                          {aiPendingQuestions.length > 0 && (
                            <div className="ai-pending-section">
                              <div className="ai-pending-header">
                                <span className="material-symbols-outlined">pending_actions</span>
                                <strong>Danh sách tạm từ AI ({aiPendingQuestions.length} câu)</strong>
                              </div>
                              <p className="import-hint">
                                Câu hỏi AI sẽ chỉ được thêm vào ngân hàng khi bạn bấm <strong>OK</strong>.
                              </p>
                              <div className="ai-pending-list">
                                {aiPendingQuestions.map((question, index) => (
                                  <div key={`${question.question_text}-${index}`} className="ai-pending-item">
                                    <span className="ai-pending-index">#{index + 1}</span>
                                    <div className="ai-pending-content">
                                      <div className="ai-pending-text">{question.question_text}</div>
                                      <div className="ai-pending-meta">
                                        <span>{TYPE_LABELS[question.question_type]}</span>
                                        <span>{DIFFICULTY_LABELS[question.difficulty].label}</span>
                                        <span>{question.points ?? 1} điểm</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                      title="Loại khỏi danh sách tạm"
                                      onClick={() =>
                                        setAiPendingQuestions((prev) => prev.filter((_, itemIdx) => itemIdx !== index))
                                      }
                                    >
                                      <span className="material-symbols-outlined">delete</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="form-actions">
                                <button className="btn-primary" type="button" onClick={() => void confirmAiPendingQuestions()} disabled={loading}>
                                  <span className="material-symbols-outlined">check_circle</span>
                                  {loading ? "Đang nhập..." : "OK - Đưa vào danh sách chính"}
                                </button>
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  onClick={() => setAiPendingQuestions([])}
                                  disabled={loading}
                                >
                                  <span className="material-symbols-outlined">close</span>
                                  Xóa danh sách tạm
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Questions List Section */}
                <div className="section-header">
                  <span className="material-symbols-outlined section-icon">list_alt</span>
                  <h2 className="section-title">Danh sách câu hỏi</h2>
                  <span className="question-total">{questions.length} câu hỏi</span>
                </div>

                <div className="questions-list">
                  {questions.map((question) => (
                    <div key={question.id} className="question-item">
                      <div className="question-content">
                        <div className="question-header">
                          <div className="question-badges">
                            <span className={`difficulty-badge difficulty-${question.difficulty}`}>
                              {DIFFICULTY_LABELS[question.difficulty].label}
                            </span>
                            <span className="type-badge">
                              <span className="material-symbols-outlined">
                                {question.question_type === "multiple_choice" ? "quiz" :
                                 question.question_type === "true_false" ? "check" :
                                 "text_fields"}
                              </span>
                              {TYPE_LABELS[question.question_type]}
                            </span>
                            {question.category && (
                              <span className="category-badge">
                                <span className="material-symbols-outlined">folder</span>
                                {question.category}
                              </span>
                            )}
                            <span className="points-badge">
                              <span className="material-symbols-outlined">stars</span>
                              {question.points ?? 1} điểm
                            </span>
                          </div>
                          <div className="question-actions">
                            <button className="icon-btn" onClick={() => startEditQuestion(question)} title="Sửa">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="icon-btn danger" onClick={() => void handleDeleteQuestion(question.id)} title="Xóa">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                        <div className="question-text">{question.question_text}</div>
                        {question.tags && question.tags.length > 0 && (
                          <div className="question-tags">
                            {question.tags.map((tag, idx) => (
                              <span key={idx} className="tag">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {question.explanation && (
                          <div className="question-explanation">
                            <span className="material-symbols-outlined">info</span>
                            {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!questions.length && !loading && (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">help_outline</span>
                      <p>Chưa có câu hỏi nào trong ngân hàng này</p>
                      <p className="empty-hint">Hãy thêm câu hỏi đầu tiên bằng form bên trên hoặc nhập hàng loạt</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state large">
                <span className="material-symbols-outlined">folder_open</span>
                <h3>Chưa chọn ngân hàng câu hỏi</h3>
                <p>Vui lòng chọn hoặc tạo một ngân hàng câu hỏi để bắt đầu quản lý câu hỏi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}