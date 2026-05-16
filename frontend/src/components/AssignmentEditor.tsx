import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { ASSIGNMENTS_API } from "../api/assignments";
import { QUESTION_BANKS_API } from "../api/questionBanks";
import LessonRichTextEditor from "./LessonRichTextEditor";
import "./AssignmentEditor.css";

type CourseBrief = { id: number; title: string };

type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: string;
  order_index: number;
};

type CourseContentTree = {
  course_id: number;
  modules: {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    order_index: number;
    lessons: LessonItem[];
  }[];
};

type AssignmentKind = "file_prompt" | "short_answer";

type AssignmentPreview = {
  assignment_id: number;
  lesson_id: number;
  title: string;
  description: string;
  due_date: string | null;
  max_score: number;
  passing_score: number | null;
  allow_late_submission: boolean;
  late_submission_days: number;
  late_penalty_percent: number;
  allow_resubmission: boolean;
  max_resubmissions: number;
  allowed_formats: string[];
  attachments: { file_name: string; file_path: string; signed_url: string }[];
  created_at: string;
  assignment_kind?: AssignmentKind;
  short_answer_questions?: { id: string; question_text: string; order_index: number }[];
  time_limit_minutes?: number | null;
};

const DEFAULT_ALLOWED_FORMATS = [
  "pdf",
  "docx",
  "doc",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "zip",
  "rar",
  "7z",
];

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToIso(localValue: string): string {
  // Input from `datetime-local` is local time (no timezone). Convert to ISO for backend parsing.
  return new Date(localValue).toISOString();
}

function splitDueDateLocal(localValue: string): {
  day: string;
  month: string;
  year: string;
  hour12: string;
  minute: string;
  meridiem: "AM" | "PM";
} {
  if (!localValue) {
    return { day: "01", month: "01", year: String(new Date().getFullYear()), hour12: "12", minute: "00", meridiem: "AM" };
  }
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) {
    return { day: "01", month: "01", year: String(new Date().getFullYear()), hour12: "12", minute: "00", meridiem: "AM" };
  }
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const h24 = d.getHours();
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return {
    day: pad2(d.getDate()),
    month: pad2(d.getMonth() + 1),
    year: String(d.getFullYear()),
    hour12: String(h12).padStart(2, "0"),
    minute: pad2(d.getMinutes()),
    meridiem,
  };
}

function buildDueDateLocalFromParts(parts: {
  day: string;
  month: string;
  year: string;
  hour12: string;
  minute: string;
  meridiem: "AM" | "PM";
}): string {
  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);
  const hour12 = Number(parts.hour12);
  const minute = Number(parts.minute);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour12) ||
    !Number.isFinite(minute)
  ) {
    return "";
  }
  const h24 = (hour12 % 12) + (parts.meridiem === "PM" ? 12 : 0);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDateTimeAmPm(isoLike: string | null | undefined): string {
  if (!isoLike) return "Không có";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "Không có";
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const hh24 = d.getHours();
  const meridiem = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 || 12;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(hh12)}:${pad2(d.getMinutes())} ${meridiem}`;
}

export default function AssignmentEditor(props: {
  courses: CourseBrief[];
  token: string | null;
  loading: boolean;
  /** Đồng bộ từ cây nội dung (menu ⋯ hoặc nút chương). */
  pickedLessonId?: number | null;
  embeddedMode?: boolean;
  hidePreviewSections?: boolean;
  onShortAnswerQuestionsChange?: (questions: Array<{ id: string; question_text: string; order_index: number }>) => void;
  onAssignmentPreviewChange?: (preview: AssignmentPreview | null) => void;
  saveSignal?: number;
  editSignal?: number;
  cancelEditSignal?: number;
  forceReadOnly?: boolean;
  hidePrimarySaveButton?: boolean;
  hideInlineEditButton?: boolean;
  onSavedSuccessfully?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  forcedAssignmentKind?: AssignmentKind | null;
  hideAssignmentKindSwitch?: boolean;
  autoSaveOnForcedKindSwitch?: boolean;
}) {
  const {
    courses,
    token,
    loading,
    pickedLessonId,
    embeddedMode = false,
    hidePreviewSections = false,
    onShortAnswerQuestionsChange,
    onAssignmentPreviewChange,
    saveSignal = 0,
    editSignal = 0,
    cancelEditSignal = 0,
    forceReadOnly = false,
    hidePrimarySaveButton = false,
    hideInlineEditButton = false,
    onSavedSuccessfully,
    onDirtyChange,
    forcedAssignmentKind = null,
    hideAssignmentKindSwitch = false,
    autoSaveOnForcedKindSwitch = false,
  } = props;

  const [selectedCourseId, setSelectedCourseId] = useState<number | "">(courses?.[0]?.id ?? "");
  const [lessonTree, setLessonTree] = useState<CourseContentTree | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const [lessonId, setLessonId] = useState<number | "">("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState<number>(10);
  const [passingScore, setPassingScore] = useState<string>(""); // empty => null
  const [dueDate, setDueDate] = useState<string>("");

  const [allowLate, setAllowLate] = useState<boolean>(false);
  const [lateDays, setLateDays] = useState<number>(0);
  const [latePenalty, setLatePenalty] = useState<number>(0);

  const [allowResubmission, setAllowResubmission] = useState<boolean>(false);
  const [maxResubmissions, setMaxResubmissions] = useState<number>(1);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<number | null>(null);

  /** Dạng 1: đề file + HV nộp file/văn bản. Dạng 2: câu trả lời ngắn. */
  const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>("file_prompt");
  const [shortAnswerLines, setShortAnswerLines] = useState<string[]>([""]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(30);

  /** Các chế độ tạo câu hỏi trả lời ngắn */
  const [shortAnswerCreateMode, setShortAnswerCreateMode] = useState<"manual" | "question_bank" | "csv" | "ai">("manual");
  const [shortAnswerBanks, setShortAnswerBanks] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedShortAnswerBankId, setSelectedShortAnswerBankId] = useState<number | "">("");
  const [shortAnswerBankQuestions, setShortAnswerBankQuestions] = useState<Array<{ id: number; question_text: string }>>([]);
  const [pickedShortAnswerBankQuestionIds, setPickedShortAnswerBankQuestionIds] = useState<number[]>([]);
  const [pendingShortAnswerFromBank, setPendingShortAnswerFromBank] = useState<string[]>([]);
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiExtraInstructions, setAiExtraInstructions] = useState("");

  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingAutoSaveKind, setPendingAutoSaveKind] = useState<AssignmentKind | null>(null);

  type SubmissionRow = {
    submission_id: number;
    user_email: string;
    user_full_name: string;
    status: string;
    submitted_at: string | null;
    is_late: boolean;
    graded_score: number | null;
    feedback_text: string | null;
    content_preview: string;
    attachment_count: number;
  };

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<number, string>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<number, string>>({});

  const readOnly = (Boolean(preview) && !editing) || forceReadOnly;
  const isFilePrompt = assignmentKind === "file_prompt";
  const dueDateParts = useMemo(() => splitDueDateLocal(dueDate), [dueDate]);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => String(current - 2 + i));
  }, []);
  const assignmentDirty = useMemo(() => {
    if (!preview) {
      if (embeddedMode) return true;
      return (
        title.trim() !== "" ||
        description.trim() !== "" ||
        Number(maxScore) !== 10 ||
        passingScore.trim() !== "" ||
        dueDate.trim() !== "" ||
        allowLate ||
        lateDays !== 0 ||
        allowResubmission ||
        maxResubmissions !== 1 ||
        assignmentKind !== "file_prompt" ||
        selectedFiles.length > 0 ||
        shortAnswerLines.some((x) => x.trim() !== "") ||
        Number(timeLimitMinutes) !== 30
      );
    }
    const normalizedPreviewKind: AssignmentKind = preview.assignment_kind === "short_answer" ? "short_answer" : "file_prompt";
    const previewShort = (preview.short_answer_questions || [])
      .slice()
      .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
      .map((q) => String(q.question_text || "").trim())
      .filter(Boolean);
    const draftShort = shortAnswerLines.map((x) => x.trim()).filter(Boolean);
    const previewPassing = preview.passing_score != null ? String(preview.passing_score) : "";
    const draftPassing = passingScore.trim();
    return (
      assignmentKind !== normalizedPreviewKind ||
      description.trim() !== String(preview.description || "").trim() ||
      Number(maxScore) !== Number(preview.max_score || 0) ||
      draftPassing !== previewPassing ||
      dueDate !== isoToDatetimeLocal(preview.due_date) ||
      allowLate !== Boolean(preview.allow_late_submission) ||
      Number(lateDays) !== Number(preview.late_submission_days || 0) ||
      allowResubmission !== Boolean(preview.allow_resubmission) ||
      Number(maxResubmissions) !== Number(preview.max_resubmissions || 1) ||
      selectedFiles.length > 0 ||
      JSON.stringify(draftShort) !== JSON.stringify(previewShort) ||
      Number(timeLimitMinutes) !== Number(preview.time_limit_minutes ?? 30)
    );
  }, [
    preview,
    embeddedMode,
    title,
    description,
    maxScore,
    passingScore,
    dueDate,
    allowLate,
    lateDays,
    allowResubmission,
    maxResubmissions,
    assignmentKind,
    selectedFiles.length,
    shortAnswerLines,
    timeLimitMinutes,
  ]);

  const authHeaders = useMemo<Record<string, string>>(() => {
    if (!token) return {} as Record<string, string>;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const selectedLessonTitle = useMemo(() => {
    if (!lessonTree || !lessonId) return "";
    const lid = Number(lessonId);
    if (!Number.isFinite(lid)) return "";
    for (const mod of lessonTree.modules ?? []) {
      for (const l of mod.lessons ?? []) {
        if (Number(l.id) === lid) return String(l.title || "").trim();
      }
    }
    return "";
  }, [lessonId, lessonTree]);

  const selectedLessonDescription = useMemo(() => {
    if (!lessonTree || !lessonId) return "";
    const lid = Number(lessonId);
    if (!Number.isFinite(lid)) return "";
    for (const mod of lessonTree.modules ?? []) {
      for (const l of mod.lessons ?? []) {
        if (Number(l.id) === lid) return String(l.description || "").trim();
      }
    }
    return "";
  }, [lessonId, lessonTree]);

  const effectiveAssignmentTitle = useMemo(() => {
    const typed = title.trim();
    if (typed) return typed;
    if (embeddedMode) return selectedLessonTitle;
    return "";
  }, [embeddedMode, selectedLessonTitle, title]);

  const effectiveAssignmentDescription = useMemo(() => {
    const typed = description.trim();
    if (typed) return typed;
    if (embeddedMode) return selectedLessonDescription;
    return "";
  }, [description, embeddedMode, selectedLessonDescription]);

  useEffect(() => {
    const firstCourseId = courses?.[0]?.id;
    if (selectedCourseId === "" && typeof firstCourseId === "number") {
      setSelectedCourseId(firstCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      setLessonsLoading(true);
      setLessonsError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.contentTree(selectedCourseId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Không thể tải cây bài học.");
        setLessonTree(data as CourseContentTree);

        const allLessons = (data?.modules ?? []).flatMap((m: any) => m.lessons ?? []) as LessonItem[];
        const firstLessonId = allLessons[0]?.id;
        if (typeof firstLessonId === "number") setLessonId(firstLessonId);
      } catch (e: any) {
        setLessonsError(e?.message || "Đã xảy ra lỗi.");
        setLessonTree(null);
        setLessonId("");
      } finally {
        setLessonsLoading(false);
      }
    })();
  }, [selectedCourseId, authHeaders]);

  useEffect(() => {
    if (pickedLessonId == null || !Number.isFinite(Number(pickedLessonId))) return;
    if (!lessonTree) return;
    const ok = (lessonTree.modules ?? []).some((mod) =>
      (mod.lessons ?? []).some((l) => l.id === pickedLessonId)
    );
    if (ok) setLessonId(pickedLessonId);
  }, [pickedLessonId, lessonTree]);

  useEffect(() => {
    // Reset state when switching lesson (avoid editing wrong assignment).
    setPreview(null);
    setCurrentAssignmentId(null);
    setEditing(false);
    setAssignmentKind(forcedAssignmentKind ?? "file_prompt");
    setShortAnswerLines([""]);
    setTimeLimitMinutes(30);
    setSubmissions([]);
    setSubmissionsError(null);
    setScoreDraft({});
    setFeedbackDraft({});
  }, [lessonId, forcedAssignmentKind]);

  useEffect(() => {
    if (!forcedAssignmentKind) return;
    if (assignmentKind !== forcedAssignmentKind) {
      setAssignmentKind(forcedAssignmentKind);
    }
  }, [forcedAssignmentKind, assignmentKind]);

  useEffect(() => {
    if (!autoSaveOnForcedKindSwitch) return;
    if (!forcedAssignmentKind || !preview || !currentAssignmentId || !lessonId) return;
    const previewKind: AssignmentKind = preview.assignment_kind === "short_answer" ? "short_answer" : "file_prompt";
    if (previewKind === forcedAssignmentKind) return;

    if (forcedAssignmentKind === "short_answer") {
      setAssignmentKind("short_answer");
      setShortAnswerLines(["Câu hỏi 1"]);
      setTimeLimitMinutes((prev) => (Number.isFinite(Number(prev)) && Number(prev) > 0 ? Number(prev) : 30));
      setSelectedFiles([]);
    } else {
      setAssignmentKind("file_prompt");
      setShortAnswerLines([""]);
      setTimeLimitMinutes(30);
      setSelectedFiles([]);
    }
    setPendingAutoSaveKind(forcedAssignmentKind);
  }, [autoSaveOnForcedKindSwitch, forcedAssignmentKind, preview, currentAssignmentId, lessonId]);

  useEffect(() => {
    if (!pendingAutoSaveKind) return;
    if (saving || loading) return;
    if (!preview || !currentAssignmentId || !lessonId) return;
    if (assignmentKind !== pendingAutoSaveKind) return;
    setPendingAutoSaveKind(null);
    void handleSaveEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSaveKind, assignmentKind, saving, loading, preview, currentAssignmentId, lessonId]);

  useEffect(() => {
    onDirtyChange?.(assignmentDirty);
  }, [assignmentDirty, onDirtyChange]);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;

    const loadExistingAssignmentForLesson = async () => {
      try {
        const rosterRes = await fetch(`${url}${ASSIGNMENTS_API.assignmentLearnerRoster(lessonId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });
        const rosterJson = await rosterRes.json().catch(() => ({}));
        if (!rosterRes.ok) return;

        const existingAssignmentId = Number(
          (rosterJson as any)?.data?.assignment?.id ??
            (rosterJson as any)?.assignment?.id ??
            0
        );
        if (!existingAssignmentId) return;

        const previewRes = await fetch(`${url}${ASSIGNMENTS_API.previewAssignment(lessonId, existingAssignmentId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });
        const previewJson = await previewRes.json().catch(() => ({}));
        if (!previewRes.ok) return;
        if (cancelled) return;

        setCurrentAssignmentId(existingAssignmentId);
        setPreview(previewJson as AssignmentPreview);
      } catch {
        // Không chặn UX nếu chưa có assignment hoặc lỗi mạng tạm thời.
      }
    };

    void loadExistingAssignmentForLesson();
    return () => {
      cancelled = true;
    };
  }, [lessonId, authHeaders]);

  useEffect(() => {
    if (!preview || !currentAssignmentId || !lessonId) {
      setSubmissions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const res = await fetch(
          `${url}${ASSIGNMENTS_API.assignmentSubmissions(lessonId, currentAssignmentId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Không tải được danh sách bài nộp.");
        const list = (json?.data?.submissions ?? []) as SubmissionRow[];
        if (cancelled) return;
        setSubmissions(Array.isArray(list) ? list : []);
        const sInit: Record<number, string> = {};
        const fInit: Record<number, string> = {};
        list.forEach((r) => {
          sInit[r.submission_id] =
            r.graded_score != null && !Number.isNaN(Number(r.graded_score)) ? String(r.graded_score) : "";
          fInit[r.submission_id] = r.feedback_text ?? "";
        });
        setScoreDraft(sInit);
        setFeedbackDraft(fInit);
      } catch (e: any) {
        if (!cancelled) {
          setSubmissionsError(e?.message || "Lỗi tải bài nộp.");
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) setSubmissionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, currentAssignmentId, lessonId, authHeaders]);

  useEffect(() => {
    const list = (preview?.short_answer_questions || []).map((q) => ({
      id: String(q.id),
      question_text: String(q.question_text || ""),
      order_index: Number(q.order_index || 0),
    }));
    onShortAnswerQuestionsChange?.(list);
  }, [onShortAnswerQuestionsChange, preview]);

  useEffect(() => {
    onAssignmentPreviewChange?.(preview);
  }, [onAssignmentPreviewChange, preview]);

  useEffect(() => {
    if (assignmentKind === "short_answer" && selectedFiles.length > 0) {
      setSelectedFiles([]);
    }
  }, [assignmentKind, selectedFiles.length]);

  // Load question banks when in short_answer mode with question_bank mode
  useEffect(() => {
    if (assignmentKind !== "short_answer" || shortAnswerCreateMode !== "question_bank") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${url}${QUESTION_BANKS_API.list}`, { headers: authHeaders });
        if (cancelled) return;
        if (!res.ok) throw new Error("Lỗi tải ngân hàng câu hỏi.");
        const data = await res.json();
        const banks: Array<{ id: number; name: string }> = (data.rows || data || []).map((b: any) => ({
          id: Number(b.id),
          name: String(b.name || ""),
        }));
        if (!cancelled) setShortAnswerBanks(banks);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Lỗi tải ngân hàng câu hỏi.");
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentKind, shortAnswerCreateMode, authHeaders]);

  // Load questions from selected bank
  useEffect(() => {
    if (assignmentKind !== "short_answer" || shortAnswerCreateMode !== "question_bank") return;
    if (!selectedShortAnswerBankId) {
      setShortAnswerBankQuestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${url}${QUESTION_BANKS_API.listQuestions(Number(selectedShortAnswerBankId))}`, { headers: authHeaders });
        if (cancelled) return;
        if (!res.ok) throw new Error("Lỗi tải câu hỏi.");
        const data = await res.json();
        const questions: Array<{ id: number; question_text: string }> = (data.questions || data || []).map((q: any) => ({
          id: Number(q.id),
          question_text: String(q.question_text || ""),
        }));
        if (!cancelled) setShortAnswerBankQuestions(questions);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Lỗi tải câu hỏi.");
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentKind, shortAnswerCreateMode, selectedShortAnswerBankId, authHeaders]);

  // Listen for question bank pick messages (similar to ManualQuizEditor)
  useEffect(() => {
    if (assignmentKind !== "short_answer" || shortAnswerCreateMode !== "question_bank") return;
    const onPickMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== "question-bank-pick") return;
      const questions: string[] = (data.questions || []).map((q: any) => String(q.question_text || "").trim()).filter(Boolean);
      if (!questions.length) return;
      setPendingShortAnswerFromBank((prev) => [...prev, ...questions]);
      toast.success(`Đã nhận ${questions.length} câu hỏi từ Question Bank (tạm).`);
    };
    window.addEventListener("message", onPickMessage);
    return () => window.removeEventListener("message", onPickMessage);
  }, [assignmentKind, shortAnswerCreateMode]);

  useEffect(() => {
    if (!preview) return;
    if (editing) return;
    loadIntoEditor(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, editing]);

  const submitGrade = async (submissionId: number) => {
    const raw = scoreDraft[submissionId]?.trim();
    if (raw === "" || Number.isNaN(Number(raw))) {
      toast.error("Vui lòng nhập điểm hợp lệ.");
      return;
    }
    const max = Number(preview?.max_score ?? 10);
    const sc = Number(raw);
    if (sc < 0 || sc > max) {
      toast.error(`Điểm phải từ 0 đến ${max}.`);
      return;
    }
    setGradingId(submissionId);
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.gradeSubmission(submissionId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          submissionId,
          score: sc,
          feedbackText: feedbackDraft[submissionId] ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Chấm điểm thất bại.");
      toast.success("Đã lưu điểm và nhận xét.");
      setSubmissions((prev) =>
        prev.map((r) =>
          r.submission_id === submissionId
            ? { ...r, status: "graded", graded_score: sc, feedback_text: feedbackDraft[submissionId] ?? "" }
            : r
        )
      );
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi chấm điểm.");
    } finally {
      setGradingId(null);
    }
  };

  const buildShortAnswerPayload = () => {
    const texts = shortAnswerLines.map((s) => s.trim()).filter(Boolean);
    return texts.map((question_text) => ({ question_text }));
  };

  const importShortAnswerFromBank = () => {
    const picked = shortAnswerBankQuestions.filter((q) => pickedShortAnswerBankQuestionIds.includes(q.id));
    if (!picked.length) {
      toast.error("Vui lòng chọn ít nhất một câu hỏi.");
      return;
    }
    setShortAnswerLines(picked.map((q) => q.question_text));
    toast.success(`Đã thêm ${picked.length} câu hỏi từ ngân hàng.`);
    setShortAnswerCreateMode("manual");
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvImportErrors([]);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const errors: string[] = [];
      const parsed: string[] = [];
      lines.forEach((line, idx) => {
        if (!line) return;
        parsed.push(line);
      });
      if (!parsed.length) {
        errors.push("File CSV trống hoặc không hợp lệ.");
      }
      setCsvImportErrors(errors);
      if (parsed.length) {
        setShortAnswerLines(parsed);
        toast.success(`Đã nhập ${parsed.length} câu hỏi từ CSV.`);
        setShortAnswerCreateMode("manual");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const generateShortAnswerByAI = async () => {
    if (!aiTopic.trim()) {
      toast.error("Vui lòng nhập chủ đề/tiêu đề.");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch(`${url}/api/v1/ai/generate-short-answer-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: Number(aiQuestionCount) || 5,
          extra_instructions: aiExtraInstructions.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || "Lỗi khi tạo câu hỏi.");
      const questions: string[] = json.questions || json.data || [];
      if (!questions.length) throw new Error("Không nhận được câu hỏi nào từ AI.");
      setShortAnswerLines(questions);
      toast.success(`Đã tạo ${questions.length} câu hỏi bằng AI.`);
      setShortAnswerCreateMode("manual");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi tạo câu hỏi bằng AI.");
    } finally {
      setAiGenerating(false);
    }
  };

  const buildCreatePayload = () => {
    const passing = passingScore.trim() ? Number(passingScore) : null;
    return {
      title: effectiveAssignmentTitle,
      description: effectiveAssignmentDescription,
      max_score: Number(maxScore),
      passing_score: passing,
      due_date: dueDate ? datetimeLocalToIso(dueDate) : "",
      allow_late_submission: isFilePrompt ? allowLate : false,
      late_submission_days: isFilePrompt && allowLate ? Number(lateDays) : 0,
      late_penalty_percent: 0,
      allow_resubmission: isFilePrompt ? allowResubmission : false,
      max_resubmissions: isFilePrompt && allowResubmission ? Number(maxResubmissions) : 1,
      allowed_formats: DEFAULT_ALLOWED_FORMATS,
      assignment_kind: assignmentKind,
      short_answer_questions: assignmentKind === "short_answer" ? buildShortAnswerPayload() : null,
      time_limit_minutes: assignmentKind === "short_answer" ? Number(timeLimitMinutes) : null,
    };
  };

  const refreshPreview = async (aid: number, lid: number) => {
    const res = await fetch(`${url}${ASSIGNMENTS_API.previewAssignment(lid, aid)}`, {
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải preview.");
    setPreview(data as AssignmentPreview);
  };

  const handleSelectFiles = (files: FileList | null) => {
    setSelectedFiles(files ? Array.from(files) : []);
  };

  const handleCreate = async () => {
    if (loading || saving) return;
    if (!lessonId) {
      toast.error("Vui lòng chọn bài học.");
      return;
    }
    if (!effectiveAssignmentTitle) {
      toast.error(
        embeddedMode ? "Không tìm thấy tiêu đề bài học ở khối 1 để dùng làm tiêu đề bài tập." : "Vui lòng nhập tiêu đề bài tập."
      );
      return;
    }
    if (!effectiveAssignmentDescription && isFilePrompt) {
      toast.error(
        embeddedMode
          ? "Không tìm thấy mô tả bài học ở khối 1 để dùng làm mô tả/yêu cầu."
          : "Vui lòng nhập mô tả/yêu cầu."
      );
      return;
    }
    if (!dueDate) {
      toast.error("Vui lòng chọn hạn nộp.");
      return;
    }
    if (assignmentKind === "short_answer") {
      if (!Number.isFinite(Number(timeLimitMinutes)) || Number(timeLimitMinutes) < 1) {
        toast.error("Vui lòng nhập thời gian làm bài hợp lệ (>= 1 phút).");
        return;
      }
      const n = shortAnswerLines.map((s) => s.trim()).filter(Boolean).length;
      if (n < 1) {
        toast.error("Dạng trả lời ngắn cần ít nhất một câu hỏi.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = buildCreatePayload();
      const createRes = await fetch(`${url}${ASSIGNMENTS_API.createAssignment(lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createData?.message || "Tạo bài tập thất bại.");

      const assignmentId = Number(createData?.data?.assignment_id ?? createData?.assignment_id);
      if (!assignmentId) throw new Error("Không lấy được assignment_id.");

      setCurrentAssignmentId(assignmentId);
      setEditing(false);

      if (selectedFiles.length > 0) {
        const form = new FormData();
        for (const f of selectedFiles) form.append("files", f);
        const uploadRes = await fetch(
          `${url}${ASSIGNMENTS_API.uploadAttachments(lessonId, assignmentId)}`,
          {
            method: "POST",
            headers: { ...authHeaders },
            body: form,
          }
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.message || "Upload file thất bại.");
      }

      await refreshPreview(assignmentId, Number(lessonId));
      toast.success("Tạo bài tập thành công!");
      setSelectedFiles([]);
      onSavedSuccessfully?.();
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewNow = async () => {
    if (!currentAssignmentId || !lessonId) return;
    try {
      await refreshPreview(currentAssignmentId, Number(lessonId));
    } catch (e: any) {
      toast.error(e?.message || "Không thể tải preview.");
    }
  };

  const loadIntoEditor = (p: AssignmentPreview) => {
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setMaxScore(Number(p.max_score ?? 10));
    setPassingScore(p.passing_score != null ? String(p.passing_score) : "");
    setDueDate(isoToDatetimeLocal(p.due_date));

    setAllowLate(Boolean(p.allow_late_submission));
    setLateDays(Number(p.late_submission_days ?? 0));
    setLatePenalty(Number(p.late_penalty_percent ?? 0));

    setAllowResubmission(Boolean(p.allow_resubmission));
    setMaxResubmissions(Number(p.max_resubmissions ?? 1));

    const k = p.assignment_kind === "short_answer" ? "short_answer" : "file_prompt";
    setAssignmentKind(k);
    const qs = (p.short_answer_questions || []).map((q) => q.question_text).filter(Boolean);
    setShortAnswerLines(qs.length ? qs : [""]);
    setTimeLimitMinutes(Number(p.time_limit_minutes ?? 30));
  };

  const handleEditToggle = () => {
    if (!preview) return;
    if (!editing) loadIntoEditor(preview);
    setEditing((v) => !v);
  };

  const handleSaveEdit = async () => {
    if (!preview || !currentAssignmentId || !lessonId) return;
    if (assignmentKind === "short_answer") {
      if (!Number.isFinite(Number(timeLimitMinutes)) || Number(timeLimitMinutes) < 1) {
        toast.error("Vui lòng nhập thời gian làm bài hợp lệ (>= 1 phút).");
        return;
      }
      const n = shortAnswerLines.map((s) => s.trim()).filter(Boolean).length;
      if (n < 1) {
        toast.error("Dạng trả lời ngắn cần ít nhất một câu hỏi.");
        return;
      }
    }
    setSaving(true);
    try {
      const passing = passingScore.trim() ? Number(passingScore) : null;
      const payload = {
        title: effectiveAssignmentTitle,
        description: effectiveAssignmentDescription,
        max_score: Number(maxScore),
        passing_score: passing,
        due_date: dueDate ? datetimeLocalToIso(dueDate) : null,
        allow_late_submission: isFilePrompt ? allowLate : false,
        late_submission_days: isFilePrompt && allowLate ? Number(lateDays) : 0,
        late_penalty_percent: 0,
        allow_resubmission: isFilePrompt ? allowResubmission : false,
        max_resubmissions: isFilePrompt && allowResubmission ? Number(maxResubmissions) : 1,
        assignment_kind: assignmentKind,
        short_answer_questions: assignmentKind === "short_answer" ? buildShortAnswerPayload() : null,
        time_limit_minutes: assignmentKind === "short_answer" ? Number(timeLimitMinutes) : null,
        // allowed_formats: omitted so BE giữ nguyên cấu hình đã lưu
      };

      const res = await fetch(`${url}${ASSIGNMENTS_API.updateAssignment(lessonId, currentAssignmentId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Cập nhật thất bại.");
      }

      if (selectedFiles.length > 0) {
        const form = new FormData();
        for (const f of selectedFiles) form.append("files", f);
        const uploadRes = await fetch(
          `${url}${ASSIGNMENTS_API.uploadAttachments(lessonId, currentAssignmentId)}`,
          {
            method: "POST",
            headers: { ...authHeaders },
            body: form,
          }
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.message || "Upload file thất bại.");
        setSelectedFiles([]);
      }

      await refreshPreview(currentAssignmentId, Number(lessonId));
      setEditing(false);
      toast.success("Cập nhật thành công!");
      onSavedSuccessfully?.();
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi khi cập nhật.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrimarySave = () => {
    if (preview) {
      void handleSaveEdit();
      return;
    }
    void handleCreate();
  };

  useEffect(() => {
    if (!saveSignal) return;
    if (saving || loading) return;
    if (preview) {
      void handleSaveEdit();
      return;
    }
    void handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  useEffect(() => {
    if (!editSignal) return;
    if (saving || loading || forceReadOnly) return;
    if (!preview || editing) return;
    loadIntoEditor(preview);
    setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSignal, forceReadOnly, saving, loading, preview, editing]);

  useEffect(() => {
    if (!cancelEditSignal) return;
    if (editing) setEditing(false);
  }, [cancelEditSignal, editing]);

  useEffect(() => {
    if (forceReadOnly && editing) {
      setEditing(false);
    }
  }, [forceReadOnly, editing]);

  return (
    <div className="assignment-editor">
      <Toaster position="top-right" />
      {!embeddedMode && (
      <div className="editor-row">
        <label className="editor-label">Khóa học</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(Number(e.target.value))}
          disabled={loading || lessonsLoading || courses.length === 0}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      )}

      {!embeddedMode && (
      <div className="editor-row">
        <label className="editor-label">Bài học</label>
        <select
          value={lessonId}
          onChange={(e) => setLessonId(Number(e.target.value))}
          disabled={!lessonTree || lessonsLoading || courses.length === 0}
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

      {!embeddedMode && (
      <p className="editor-hint" style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
        Mở khóa theo thứ tự bài trong khóa: học viên cần hoàn thành các bài đứng trước (trong chương và toàn khóa) trước khi
        làm bài tập.
      </p>
      )}

      <div className="assignment-form">
        <div className="editor-row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          {!embeddedMode ? <h3 style={{ margin: 0 }}>Thông tin bài tập</h3> : <span />}
          {!hidePrimarySaveButton && (
            <button className="btn-primary" onClick={handlePrimarySave} disabled={saving || loading || !lessonId}>
              {saving ? "Đang xử lý..." : "Lưu"}
            </button>
          )}
        </div>

        <div className="form-grid">
          {!embeddedMode && (
            <div className="field">
              <label>Tiêu đề *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving || readOnly} />
            </div>
          )}

          {!embeddedMode && assignmentKind !== "file_prompt" && (
            <div className="field">
              <label>Mô tả/yêu cầu *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={saving || readOnly} />
            </div>
          )}
        
          <div className="field">
            <label>Thang điểm</label>
            <input
              type="number"
              min={0}
              step={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              disabled={saving || readOnly}
            />
          </div>

          <div className="field">
            <label>Điểm đạt (optional)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              disabled={saving || readOnly}
              placeholder="Ví dụ: 6"
            />
          </div>
          <div className="field" style={{ minWidth: 520 }}>
          <hr style={{ margin: "16px 0" }} />
            <label>Hạn nộp *</label>
            <div className="asg-datetime-editor" style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#64748b", minWidth: 150 }}>
                Ngày
                <input
                  type="date"
                  className="asg-datetime-input asg-date-input"
                  value={`${dueDateParts.year}-${dueDateParts.month}-${dueDateParts.day}`}
                  min={`${yearOptions[0]}-01-01`}
                  max={`${yearOptions[yearOptions.length - 1]}-12-31`}
                  onChange={(e) => {
                    const [nextYear, nextMonth, nextDay] = String(e.target.value || "").split("-");
                    if (!nextYear || !nextMonth || !nextDay) return;
                    setDueDate(
                      buildDueDateLocalFromParts({
                        ...dueDateParts,
                        year: nextYear,
                        month: nextMonth,
                        day: nextDay,
                      })
                    );
                  }}
                  disabled={saving || readOnly}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#64748b", minWidth: 78 }}>
                Giờ
                <select
                  className="asg-datetime-input asg-time-input"
                  value={dueDateParts.hour12}
                  onChange={(e) => setDueDate(buildDueDateLocalFromParts({ ...dueDateParts, hour12: e.target.value }))}
                  disabled={saving || readOnly}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                    <option key={`due-hour-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#64748b", minWidth: 78 }}>
                Phút
                <select
                  className="asg-datetime-input asg-time-input"
                  value={dueDateParts.minute}
                  onChange={(e) => setDueDate(buildDueDateLocalFromParts({ ...dueDateParts, minute: e.target.value }))}
                  disabled={saving || readOnly}
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                    <option key={`due-minute-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#64748b", minWidth: 88 }}>
                AM/PM
                <select
                  className="asg-datetime-input asg-period-input"
                  value={dueDateParts.meridiem}
                  onChange={(e) =>
                    setDueDate(
                      buildDueDateLocalFromParts({
                        ...dueDateParts,
                        meridiem: (e.target.value as "AM" | "PM") || "AM",
                      })
                    )
                  }
                  disabled={saving || readOnly}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        {/* <hr style={{ margin: "16px 0" }} /> */}
        {isFilePrompt ? (
          <div className="field" style={{ marginBottom: 16 }}>
        <hr style={{ margin: "16px 0" }} />

            <label>Tùy chọn</label>
            <div className="policy-grid" style={{ marginTop: 8 }}>
              <div className="policy">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={allowLate}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAllowLate(checked);
                      if (checked && lateDays <= 0) setLateDays(1);
                    }}
                    disabled={saving || readOnly}
                  />
                  Cho phép nộp muộn
                </label>

                <div className="subfields">
                  <div className="field">
                    <label>Số ngày nộp trễ</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={lateDays}
                      onChange={(e) => setLateDays(Number(e.target.value))}
                      disabled={saving || readOnly || !allowLate}
                    />
                  </div>
                </div>
              </div>

              <div className="policy">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={allowResubmission}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAllowResubmission(checked);
                      if (checked && maxResubmissions < 1) setMaxResubmissions(1);
                    }}
                    disabled={saving || readOnly}
                  />
                  Cho phép nộp lại
                </label>

                <div className="subfields">
                  <div className="field">
                    <label>Số lần nộp lại tối đa</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={maxResubmissions}
                      onChange={(e) => setMaxResubmissions(Number(e.target.value))}
                      disabled={saving || readOnly || !allowResubmission}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!hideAssignmentKindSwitch && (
          <div className="field" style={{ marginBottom: 16 }}>
            {/* <label>Dạng bài tập</label>
            <div className="assignment-kind-switch" role="group" aria-label="Chọn dạng bài tập">
              <button
                type="button"
                className={`assignment-kind-btn ${assignmentKind === "file_prompt" ? "active" : ""}`}
                onClick={() => setAssignmentKind("file_prompt")}
                disabled={saving || readOnly}
                aria-pressed={assignmentKind === "file_prompt"}
              >
                File / văn bản
              </button>
              <button
                type="button"
                className={`assignment-kind-btn ${assignmentKind === "short_answer" ? "active" : ""}`}
                onClick={() => setAssignmentKind("short_answer")}
                disabled={saving || readOnly}
                aria-pressed={assignmentKind === "short_answer"}
              >
                Trả lời ngắn
              </button>
            </div> */}
            {/* <div className="assignment-kind-help">
              {assignmentKind === "file_prompt"
                ? "Tải đề kèm file; học viên nộp file đáp án và/hoặc ghi text."
                : "Bạn tạo từng câu hỏi; học viên điền đáp án cho mỗi câu."}
            </div> */}
          </div>
        )}
        <hr style={{ margin: "16px 0" }} />

        {isFilePrompt ? (
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Nội dung</label>
            <LessonRichTextEditor value={description} onChange={setDescription} disabled={saving || readOnly} compact />
            <div className="editor-hint" style={{ marginTop: 6 }}>
              Có thể định dạng văn bản, chèn hình, bảng, import/export DOCX như khối 3 của Bài học.
            </div>
          </div>
        ) : null}

        

        {assignmentKind === "short_answer" ? (
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Thời gian làm bài (phút) *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
              disabled={saving || readOnly}
              style={{ marginBottom: 10, maxWidth: 220 }}
            />
            <hr style={{ margin: "16px 0" }} />
            <label>Câu hỏi trả lời ngắn *</label>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 10px" }}>
              Ít nhất một câu. Hệ thống sẽ gán id q1, q2, … theo thứ tự khi lưu.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button type="button" className={`assignment-kind-btn ${shortAnswerCreateMode === "manual" ? "active" : ""}`} onClick={() => setShortAnswerCreateMode("manual")} disabled={saving || readOnly}>Thủ công</button>
              <button type="button" className={`assignment-kind-btn ${shortAnswerCreateMode === "question_bank" ? "active" : ""}`} onClick={() => setShortAnswerCreateMode("question_bank")} disabled={saving || readOnly}>Từ Question Bank</button>
              <button type="button" className={`assignment-kind-btn ${shortAnswerCreateMode === "csv" ? "active" : ""}`} onClick={() => setShortAnswerCreateMode("csv")} disabled={saving || readOnly}>Import CSV</button>
              <button type="button" className={`assignment-kind-btn ${shortAnswerCreateMode === "ai" ? "active" : ""}`} onClick={() => setShortAnswerCreateMode("ai")} disabled={saving || readOnly}>Tạo bằng AI</button>
            </div>

            {/* Manual mode */}
            {shortAnswerCreateMode === "manual" && (
              <>
                {shortAnswerLines.map((line, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ minWidth: 28, paddingTop: 8, color: "#6b7280" }}>{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={line}
                      onChange={(e) => setShortAnswerLines((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))}
                      disabled={saving || readOnly}
                      placeholder="Nội dung câu hỏi"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn-secondary" disabled={saving || readOnly || shortAnswerLines.length <= 1} onClick={() => setShortAnswerLines((prev) => prev.filter((_, i) => i !== idx))} style={{ marginTop: 4 }}>Xóa</button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" disabled={saving || readOnly} onClick={() => setShortAnswerLines((prev) => [...prev, ""])}>Thêm câu</button>
              </>
            )}

            {/* Question Bank mode */}
            {shortAnswerCreateMode === "question_bank" && (
              <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 16, background: "#f8fafc" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn-secondary" disabled={!selectedCourseId} onClick={() => {
                    if (!selectedCourseId) return;
                    const params = new URLSearchParams({ mode: "pick", question_type: "short_answer" });
                    const contextKey = `qb-pick-sa:${selectedCourseId}:${lessonId || "na"}`;
                    try {
                      window.localStorage.setItem(contextKey, JSON.stringify({ questionKeys: shortAnswerLines.filter(Boolean), updatedAt: Date.now() }));
                      params.set("contextKey", contextKey);
                    } catch { /* noop */ }
                    window.open(`/teacher/courses/${selectedCourseId}/question-banks?${params.toString()}`, "_blank");
                  }}>
                    Mở Question Bank để import câu hỏi
                  </button>
                </div>
                {pendingShortAnswerFromBank.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong>Danh sách câu hỏi tạm ({pendingShortAnswerFromBank.length})</strong>
                      <button type="button" className="btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setPendingShortAnswerFromBank([])}>Xóa danh sách tạm</button>
                    </div>
                    <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                      {pendingShortAnswerFromBank.map((q, idx) => (
                        <div key={`pending-sa-${idx}`} style={{ padding: "6px 4px", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                          {idx + 1}. {q}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => {
                      setShortAnswerLines((prev) => [...prev.filter(Boolean), ...pendingShortAnswerFromBank]);
                      setPendingShortAnswerFromBank([]);
                      toast.success("Đã thêm câu hỏi tạm vào danh sách.");
                      setShortAnswerCreateMode("manual");
                    }}>
                      Chèn vào danh sách
                    </button>
                  </div>
                )}
                <hr style={{ margin: "16px 0" }} />
                {/* <div className="field">
                  <label>Hoặc chọn trực tiếp từ ngân hàng có sẵn</label>
                  <select value={selectedShortAnswerBankId} onChange={(e) => { setSelectedShortAnswerBankId(e.target.value ? Number(e.target.value) : ""); setPickedShortAnswerBankQuestionIds([]); }} disabled={saving || readOnly}>
                    <option value="">-- Chọn ngân hàng câu hỏi --</option>
                    {shortAnswerBanks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div> */}
                {shortAnswerBankQuestions.length > 0 && (
                  <div className="field" style={{ marginTop: 12 }}>
                    <label>Chọn câu hỏi</label>
                    <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginTop: 6 }}>
                      {shortAnswerBankQuestions.map((q) => (
                        <label key={q.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 4px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                          <input type="checkbox" checked={pickedShortAnswerBankQuestionIds.includes(q.id)} onChange={(e) => {
                            setPickedShortAnswerBankQuestionIds((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id));
                          }} style={{ marginTop: 3 }} />
                          <span style={{ fontSize: 13 }}>{q.question_text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {csvImportErrors.length > 0 && csvImportErrors.map((err, i) => <p key={i} style={{ color: "#ef4444", fontSize: 13 }}>{err}</p>)}
                {/* <button type="button" className="btn-primary" style={{ marginTop: 12 }} disabled={saving || readOnly || !selectedShortAnswerBankId || !pickedShortAnswerBankQuestionIds.length} onClick={importShortAnswerFromBank}>Thêm vào danh sách</button> */}
              </div>
            )}

            {/* CSV mode */}
            {shortAnswerCreateMode === "csv" && (
              <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 16, background: "#f8fafc" }}>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Mỗi dòng trong file CSV là một câu hỏi. Mỗi dòng nên chỉ chứa nội dung câu hỏi (không có tiêu đề cột).</p>
                <input type="file" accept=".csv,.txt" onChange={handleCsvImport} disabled={saving || readOnly} />
                {csvImportErrors.length > 0 && csvImportErrors.map((err, i) => <p key={i} style={{ color: "#ef4444", fontSize: 13 }}>{err}</p>)}
              </div>
            )}

            {/* AI mode */}
            {shortAnswerCreateMode === "ai" && (
              <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 16, background: "#f8fafc" }}>
                <div className="field">
                  <label>Chủ đề / Tiêu đề *</label>
                  <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="VD: Toán lớp 4 - Phép cộng phân số" disabled={saving || readOnly || aiGenerating} />
                </div>
                <div className="field">
                  <label>Số câu hỏi</label>
                  <input type="number" min={1} max={20} value={aiQuestionCount} onChange={(e) => setAiQuestionCount(Number(e.target.value))} disabled={saving || readOnly || aiGenerating} style={{ maxWidth: 120 }} />
                </div>
                <div className="field">
                  <label>Hướng dẫn thêm (tùy chọn)</label>
                  <textarea rows={2} value={aiExtraInstructions} onChange={(e) => setAiExtraInstructions(e.target.value)} placeholder="VD: Câu hỏi mức độ dễ, có công thức toán" disabled={saving || readOnly || aiGenerating} />
                </div>
                <button type="button" className="btn-primary" disabled={saving || readOnly || aiGenerating || !aiTopic.trim()} onClick={generateShortAnswerByAI}>
                  {aiGenerating ? "Đang tạo..." : "Tạo câu hỏi"}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {assignmentKind === "short_answer" ? (
          <div className="attachments-block">
         </div>
        ) : (
          <div className="attachments-block">
            <h3>File đính kèm (Tùy chọn)</h3>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar,.7z"
              onChange={(e) => handleSelectFiles(e.target.files)}
              disabled={saving || readOnly}
            />
            {selectedFiles.length > 0 && (
              <div className="file-list">
                {selectedFiles.map((f) => (
                  <div key={f.name} className="file-item">
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">{Math.round(f.size / 1024)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="actions-row">
          {/* <button className="btn-secondary" onClick={handlePreviewNow} disabled={saving || !currentAssignmentId || !lessonId}>
            Xem preview
          </button> */}

          {preview && !hideInlineEditButton && (
            <button className="btn-secondary" onClick={handleEditToggle} disabled={saving}>
              {editing ? "Hủy chỉnh sửa" : "Chỉnh sửa"}
            </button>
          )}
        </div>

        {preview && !hidePreviewSections && (
          <div className="preview-box">
            <h3>Preview bài tập</h3>
            <div className="preview-meta">
              <div>
                <b>Title:</b> {preview.title}
              </div>
              <div>
                <b>Due:</b> {formatDateTimeAmPm(preview.due_date)}
              </div>
              <div>
                <b>Điểm:</b> {preview.max_score}
                {preview.passing_score != null ? ` (đạt: ${preview.passing_score})` : ""}
              </div>
              <div>
                <b>Muộn:</b> {preview.allow_late_submission ? `${preview.late_submission_days} ngày` : "Không"}
              </div>
              <div>
                <b>Nộp lại:</b> {preview.allow_resubmission ? `tối đa ${preview.max_resubmissions} lần` : "Không"}
              </div>
              <div>
                <b>Dạng:</b>{" "}
                {preview.assignment_kind === "short_answer" ? "Trả lời ngắn" : "File / văn bản"}
              </div>
              {preview.assignment_kind === "short_answer" ? (
                <div>
                  <b>Thời gian làm bài:</b>{" "}
                  {preview.time_limit_minutes != null ? `${preview.time_limit_minutes} phút` : "Chưa cấu hình"}
                </div>
              ) : null}
            </div>

            {preview.assignment_kind === "short_answer" && (preview.short_answer_questions?.length ?? 0) > 0 ? (
              <div className="preview-meta" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                <div style={{ width: "100%" }}>
                  <b>Câu hỏi:</b>
                  <ol style={{ margin: "8px 0 0 18px" }}>
                    {(preview.short_answer_questions || []).map((q) => (
                      <li key={q.id}>{q.question_text}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}

            <div className="preview-attachments">
              <h4>Đính kèm ({preview.attachments?.length ?? 0})</h4>
              {preview.attachments?.length ? (
                <div className="attachments-grid">
                  {preview.attachments.map((a) => {
                    const lower = a.file_name.toLowerCase();
                    const isImage = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif");
                    return (
                      <div key={a.file_path} className="attachment-card">
                        {isImage ? (
                          <img src={a.signed_url} alt={a.file_name} className="attachment-image" />
                        ) : (
                          <div className="attachment-placeholder">File</div>
                        )}
                        <div className="attachment-name" title={a.file_name}>
                          {a.file_name}
                        </div>
                        <a className="attachment-link" href={a.signed_url} target="_blank" rel="noreferrer">
                          Mở file
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">Chưa có file đính kèm.</div>
              )}
            </div>

            {editing && (
              <div className="edit-save-row">
                <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            )}
          </div>
        )}

        {preview && currentAssignmentId && lessonId && !hidePreviewSections ? (
          <div className="preview-box" style={{ marginTop: 16 }}>
            <h3>Bài nộp &amp; chấm điểm</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
              Xem nội dung tóm tắt, nhập điểm (0–{preview.max_score}) và nhận xét, rồi bấm Lưu điểm. Học viên xem kết quả trong màn hình làm bài tập.
            </p>
            {submissionsLoading ? <div style={{ color: "#64748b" }}>Đang tải danh sách…</div> : null}
            {submissionsError ? <div className="error-box">{submissionsError}</div> : null}
            {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
              <div className="muted">Chưa có học viên nộp bài.</div>
            ) : null}

            {submissions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {submissions.map((row) => (
                  <div
                    key={row.submission_id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {row.user_full_name || "Học viên"}{" "}
                      <span style={{ fontWeight: 400, color: "#64748b", fontSize: 13 }}>({row.user_email})</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                      Nộp: {row.submitted_at ? new Date(row.submitted_at).toLocaleString("vi-VN") : "—"} · Trạng thái:{" "}
                      <strong>{row.status}</strong>
                      {row.is_late ? " · Nộp muộn" : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#334155",
                        whiteSpace: "pre-wrap",
                        marginBottom: 10,
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {row.content_preview}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Điểm (max {preview.max_score})
                        <input
                          type="number"
                          min={0}
                          max={preview.max_score}
                          step={0.01}
                          value={scoreDraft[row.submission_id] ?? ""}
                          onChange={(e) =>
                            setScoreDraft((prev) => ({ ...prev, [row.submission_id]: e.target.value }))
                          }
                          style={{ width: 100, padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, flex: "1 1 220px" }}>
                        Nhận xét
                        <textarea
                          rows={2}
                          value={feedbackDraft[row.submission_id] ?? ""}
                          onChange={(e) =>
                            setFeedbackDraft((prev) => ({ ...prev, [row.submission_id]: e.target.value }))
                          }
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={gradingId === row.submission_id}
                        onClick={() => void submitGrade(row.submission_id)}
                        style={{ marginBottom: 2 }}
                      >
                        {gradingId === row.submission_id ? "Đang lưu…" : "Lưu điểm"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

