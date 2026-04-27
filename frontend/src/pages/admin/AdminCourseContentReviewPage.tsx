import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { useAuth } from "../../contexts/Auth";

type LessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  resource_kind: "pdf" | "word" | "video" | "youtube" | "other";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  review_status: "pending" | "approved" | "rejected";
  review_reason: string | null;
  created_at: string;
  is_resubmitted?: boolean;
  last_review_decision?: "submit" | "approve" | "reject" | "resubmit" | null;
  last_review_note?: string | null;
  last_reviewed_at?: string | null;
  previous_rejected_reason?: string | null;
};

type PreviewState = {
  resource: LessonResource | null;
  viewUrl: string | null;
  blobUrl: string | null;
  externalViewUrl: string | null;
  loading: boolean;
  error: string | null;
};

type AssignmentFilePreviewState = {
  loading: boolean;
  error: string | null;
  blobUrl: string | null;
  externalViewUrl: string | null;
};

type ContentTree = {
  modules: Array<{
    id: number;
    title: string;
    lessons: Array<{
      id: number;
      title: string;
      description?: string | null;
      lesson_type: "video" | "text" | "quiz" | "assignment";
      is_published?: boolean;
    }>;
  }>;
};

type ManualQuizDetail = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  questions: Array<{
    order_index: number;
    points: number;
    question_type: string;
    question_text: string;
    options: Array<{ option_text: string; is_correct: boolean }>;
  }>;
};

type AssignmentPreviewData = {
  assignment_id: number;
  lesson_id: number;
  title: string;
  description: string;
  due_date: string | null;
  max_score: number;
  passing_score: number | null;
  assignment_kind: "file_prompt" | "short_answer";
  short_answer_questions: Array<{ id: string; question_text: string }>;
  time_limit_minutes: number | null;
  attachments: Array<{ file_name: string; signed_url: string }>;
};

type AssignmentResourceItem = {
  key: string;
  label: string;
  type: "html" | "file";
  html?: string;
  url?: string;
  reviewResource?: LessonResource | null;
};

type RejectReasonOption = {
  code: string;
  label: string;
};

const parseAssignmentReviewUrl = (
  lessonId: number,
  resourceUrl?: string | null
): { kind: "description" | "attachment"; attachmentIndex?: number } | null => {
  const urlText = String(resourceUrl || "");
  if (!urlText.startsWith(`internal://lesson/${lessonId}/assignment/`)) return null;
  const suffix = urlText.slice(`internal://lesson/${lessonId}/assignment/`.length);
  if (suffix === "description") return { kind: "description" };
  if (suffix.startsWith("attachment/")) {
    const idx = Number(suffix.split("/")[1]);
    if (Number.isInteger(idx) && idx >= 0) return { kind: "attachment", attachmentIndex: idx };
  }
  return null;
};

const getYoutubeEmbedUrl = (input: string): string => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return id ? `https://www.youtube.com/embed/${id}` : raw;
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx >= 0 && parts[idx + 1]) {
        return `https://www.youtube.com/embed/${parts[idx + 1]}`;
      }
    }
    return raw;
  } catch {
    return raw;
  }
};

const isYoutubeUrl = (input: string): boolean => {
  const raw = String(input || "").toLowerCase();
  return raw.includes("youtube.com") || raw.includes("youtu.be");
};

const REJECT_REASON_COMMON_OPTIONS: RejectReasonOption[] = [
  { code: "invalid_scope", label: "Nội dung không đúng phạm vi bài học" },
  { code: "content_quality_low", label: "Chất lượng nội dung chưa đạt" },
  { code: "unclear_filename", label: "Tên tài nguyên chưa rõ ràng" },
];

const REJECT_REASON_LESSON_OPTIONS: RejectReasonOption[] = [
  { code: "invalid_file_format", label: "Tệp/định dạng không hợp lệ" },
  { code: "video_unavailable", label: "Video/link không mở được" },
  { code: "insufficient_content", label: "Nội dung còn thiếu hoặc quá ngắn" },
];

const REJECT_REASON_QUIZ_OPTIONS: RejectReasonOption[] = [
  { code: "quiz_invalid", label: "Quiz chưa hợp lệ (câu hỏi/đáp án)" },
  { code: "quiz_missing_questions", label: "Quiz chưa đủ số câu hỏi tối thiểu" },
  { code: "quiz_answer_invalid", label: "Đáp án quiz chưa đúng chuẩn (trống/trùng/sai)" },
];

const REJECT_REASON_ASSIGNMENT_OPTIONS: RejectReasonOption[] = [
  { code: "assignment_invalid", label: "Assignment chưa rõ yêu cầu/tiêu chí" },
  { code: "assignment_missing_criteria", label: "Thiếu tiêu chí nộp/chấm bài" },
  { code: "assignment_kind_invalid", label: "Cấu hình assignment chưa hợp lệ" },
];

const REJECT_REASON_OTHER_OPTION: RejectReasonOption = { code: "other", label: "Khác" };

const truncateKeepExtension = (input: string, maxChars: number = 36): string => {
  const text = String(input || "").trim();
  if (!text || text.length <= maxChars) return text;
  const dotIdx = text.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx >= text.length - 1) return `${text.slice(0, Math.max(1, maxChars - 3))}...`;
  const ext = text.slice(dotIdx);
  const extLen = Math.min(ext.length, Math.max(4, Math.floor(maxChars * 0.4)));
  const extPart = ext.slice(-extLen);
  const headLen = Math.max(1, maxChars - 3 - extPart.length);
  return `${text.slice(0, headLen)}...${extPart}`;
};

export default function AdminCourseContentReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  const { accessToken: token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [resourcesByLesson, setResourcesByLesson] = useState<Record<number, LessonResource[]>>({});
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [previewedIds, setPreviewedIds] = useState<number[]>([]);
  const [preview, setPreview] = useState<PreviewState>({
    resource: null,
    viewUrl: null,
    blobUrl: null,
    externalViewUrl: null,
    loading: false,
    error: null,
  });
  const [submittingCourseReview, setSubmittingCourseReview] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [quizByLesson, setQuizByLesson] = useState<Record<number, ManualQuizDetail | null>>({});
  const [assignmentByLesson, setAssignmentByLesson] = useState<Record<number, AssignmentPreviewData | null>>({});
  const [lessonExtraLoading, setLessonExtraLoading] = useState<Record<number, boolean>>({});
  const [selectedAssignmentResourceByLesson, setSelectedAssignmentResourceByLesson] = useState<Record<number, string>>({});
  const [assignmentFilePreview, setAssignmentFilePreview] = useState<AssignmentFilePreviewState>({
    loading: false,
    error: null,
    blobUrl: null,
    externalViewUrl: null,
  });
  const [resubmittedFirstOnly, setResubmittedFirstOnly] = useState(false);
  const [rejectModalResource, setRejectModalResource] = useState<LessonResource | null>(null);
  const [rejectReasonCode, setRejectReasonCode] = useState<string>("");
  const [rejectExtraNote, setRejectExtraNote] = useState<string>("");
  const getFileExt = (name?: string) => {
    const raw = String(name || "").trim().toLowerCase();
    const idx = raw.lastIndexOf(".");
    if (idx < 0) return "";
    return raw.slice(idx + 1);
  };

  const getPreviewModeByExt = (ext: string): "blob" | "office_viewer" | "unsupported" => {
    if (!ext) return "blob";
    if (["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", "csv", "mp4", "webm", "mp3", "wav"].includes(ext)) {
      return "blob";
    }
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      return "office_viewer";
    }
    if (["zip", "rar", "7z"].includes(ext)) {
      return "unsupported";
    }
    return "blob";
  };

  const assignmentBlobUrlRef = useRef<string | null>(null);

  const releasePreviewBlob = useCallback(() => {
    if (preview.blobUrl) {
      URL.revokeObjectURL(preview.blobUrl);
    }
  }, [preview.blobUrl]);

  const releaseAssignmentFileBlob = useCallback(() => {
    if (assignmentBlobUrlRef.current) {
      URL.revokeObjectURL(assignmentBlobUrlRef.current);
      assignmentBlobUrlRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const treeRes = await fetch(`${url}${COURSES_API.contentTree(courseId)}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const treeJson = (await treeRes.json().catch(() => ({}))) as ContentTree & { message?: string };
      if (!treeRes.ok) throw new Error(treeJson?.message || "Không thể tải cấu trúc nội dung.");
      const t = { modules: Array.isArray(treeJson.modules) ? treeJson.modules : [] };
      setTree(t);

      const lessonIds = t.modules.flatMap((m) => (m.lessons || []).map((l) => l.id));
      const entries = await Promise.all(
        lessonIds.map(async (lessonId) => {
          const res = await fetch(`${url}${COURSES_API.listLessonResources(courseId, lessonId)}`, {
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const json = (await res.json().catch(() => ({}))) as { items?: LessonResource[]; message?: string };
          if (!res.ok) throw new Error(json?.message || "Không thể tải tài nguyên bài học.");
          return [lessonId, Array.isArray(json.items) ? json.items : []] as const;
        })
      );
      const map: Record<number, LessonResource[]> = {};
      for (const [lessonId, items] of entries) map[lessonId] = items;
      setResourcesByLesson(map);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
      setTree(null);
      setResourcesByLesson({});
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const lessonIds = (tree?.modules || []).flatMap((m) => (m.lessons || []).map((l) => Number(l.id)));
    if (lessonIds.length === 0) {
      setSelectedLessonId(null);
      return;
    }
    if (selectedLessonId && lessonIds.includes(selectedLessonId)) return;
    setSelectedLessonId(lessonIds[0]);
  }, [tree, selectedLessonId]);

  useEffect(() => {
    return () => {
      releasePreviewBlob();
      releaseAssignmentFileBlob();
    };
  }, [releaseAssignmentFileBlob, releasePreviewBlob]);

  const allResources = useMemo(() => Object.values(resourcesByLesson).flat(), [resourcesByLesson]);
  const pendingResources = useMemo(() => allResources.filter((r) => r.review_status === "pending"), [allResources]);
  const approvedCount = useMemo(() => allResources.filter((r) => r.review_status === "approved").length, [allResources]);
  const rejectedCount = useMemo(() => allResources.filter((r) => r.review_status === "rejected").length, [allResources]);

  const canApprove = useCallback(
    (resource: LessonResource) =>
      resource.review_status === "pending" && previewedIds.includes(resource.id) && actionLoadingId !== resource.id,
    [actionLoadingId, previewedIds]
  );

  const canApproveFromStructuredBlock = useCallback(
    (resource: LessonResource) => resource.review_status === "pending" && actionLoadingId !== resource.id,
    [actionLoadingId]
  );

  const openPreview = async (resource: LessonResource) => {
    releasePreviewBlob();
    setPreview({ resource, viewUrl: null, blobUrl: null, externalViewUrl: null, loading: true, error: null });
    try {
      const res = await fetch(`${url}${COURSES_API.viewLessonResource(courseId, resource.id)}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Không thể mở nội dung.");
      }
      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const json = await res.json().catch(() => ({}));
        const viewUrl = String((json as any)?.url || "");
        if (!viewUrl) throw new Error("Không nhận được URL xem nội dung.");
        const ext = getFileExt(resource.filename || viewUrl);
        const mode = getPreviewModeByExt(ext);
        if (mode === "office_viewer") {
          setPreview({
            resource,
            viewUrl,
            blobUrl: null,
            externalViewUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`,
            loading: false,
            error: null,
          });
        } else {
          setPreview({ resource, viewUrl, blobUrl: null, externalViewUrl: null, loading: false, error: null });
        }
      } else {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreview({ resource, viewUrl: null, blobUrl, externalViewUrl: null, loading: false, error: null });
      }
      setPreviewedIds((prev) => (prev.includes(resource.id) ? prev : [...prev, resource.id]));
    } catch (e: any) {
      setPreview({
        resource,
        viewUrl: null,
        blobUrl: null,
        externalViewUrl: null,
        loading: false,
        error: e?.message || "Không thể mở nội dung.",
      });
    }
  };

  const clearPreview = () => {
    releasePreviewBlob();
    setPreview({ resource: null, viewUrl: null, blobUrl: null, externalViewUrl: null, loading: false, error: null });
  };

  const pickFirstResourceToReview = useCallback((resources: LessonResource[]): LessonResource | null => {
    if (!resources.length) return null;
    const pending = resources.find((x) => x.review_status === "pending");
    return pending || resources[0];
  }, []);

  const pickNextResourceToReview = useCallback(
    (lessonId: number, currentResourceId: number): LessonResource | null => {
      const resources = resourcesByLesson[lessonId] || [];
      if (!resources.length) return null;
      const pending = resources.filter((x) => x.review_status === "pending");
      if (pending.length === 0) return null;
      const idx = pending.findIndex((x) => x.id === currentResourceId);
      if (idx >= 0 && idx + 1 < pending.length) return pending[idx + 1];
      const nextAny = pending.find((x) => x.id !== currentResourceId);
      return nextAny || null;
    },
    [resourcesByLesson]
  );

  const viewLessonAsLearner = async (lessonId: number) => {
    setSelectedLessonId(lessonId);
    const lessonType = (tree?.modules || [])
      .flatMap((m) => m.lessons || [])
      .find((l) => l.id === lessonId)?.lesson_type;
    const resources = resourcesByLesson[lessonId] || [];
    const first = pickFirstResourceToReview(resources);
    if (!first) {
      clearPreview();
      setSelectedResourceId(null);
      setError(null);
      return;
    }
    setError(null);
    setSelectedResourceId(first.id);
    if (lessonType === "assignment") {
      clearPreview();
      return;
    }
    await openPreview(first);
  };

  const executeReviewResource = async (
    resource: LessonResource,
    decision: "approve" | "reject",
    note?: string,
    options?: { bypassPreviewRequirement?: boolean; skipConfirm?: boolean }
  ) => {
    if (decision === "approve" && !options?.bypassPreviewRequirement && !previewedIds.includes(resource.id)) {
      setError("Vui lòng xem nội dung trước khi duyệt tài nguyên.");
      return;
    }
    if (!options?.skipConfirm) {
      if (!window.confirm(`${decision === "approve" ? "Duyệt" : "Từ chối"} tài nguyên "${resource.filename || "Không tên"}"?`)) return;
    }
    setActionLoadingId(resource.id);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.adminReviewLessonResource(resource.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ decision, note: note?.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể duyệt tài nguyên.");
      const next = pickNextResourceToReview(resource.lesson_id, resource.id);
      await load();
      if (next) {
        setSelectedLessonId(resource.lesson_id);
        setSelectedResourceId(next.id);
        await openPreview(next);
      } else {
        clearPreview();
        setSelectedResourceId(null);
      }
    } catch (e: any) {
      setError(e?.message || "Không thể duyệt tài nguyên.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const reviewResource = async (
    resource: LessonResource,
    decision: "approve" | "reject",
    options?: { bypassPreviewRequirement?: boolean }
  ) => {
    if (decision === "reject") {
      setRejectModalResource(resource);
      setRejectReasonCode("");
      setRejectExtraNote("");
      return;
    }
    const approveNote = window.prompt("Ghi chú duyệt (tùy chọn):", "");
    await executeReviewResource(resource, decision, approveNote || undefined, options);
  };

  const submitRejectReview = async () => {
    if (!rejectModalResource) return;
    const selected = rejectReasonOptions.find((opt) => opt.code === rejectReasonCode);
    if (!selected) {
      setError("Vui lòng chọn lý do từ chối.");
      return;
    }
    const extra = rejectExtraNote.trim();
    if (selected.code === "other" && !extra) {
      setError("Vui lòng nhập mô tả chi tiết cho lý do 'Khác'.");
      return;
    }
    const note = extra ? `[${selected.code}] ${selected.label}. ${extra}` : `[${selected.code}] ${selected.label}.`;
    const target = rejectModalResource;
    setRejectModalResource(null);
    await executeReviewResource(target, "reject", note, { skipConfirm: true });
  };
  const canSubmitReject =
    rejectReasonCode !== "" && (rejectReasonCode !== "other" || rejectExtraNote.trim().length > 0);

  const finalizeCourseReview = async () => {
    if (pendingResources.length > 0) {
      const lessonIds = Array.from(new Set(pendingResources.map((x) => x.lesson_id)));
      setError(`Còn ${pendingResources.length} tài nguyên chờ duyệt ở ${lessonIds.length} bài học. Vui lòng duyệt hết trước.`);
      return;
    }
    if (rejectedCount > 0) {
      setError(`Còn ${rejectedCount} tài nguyên bị từ chối. Vui lòng yêu cầu giảng viên cập nhật trước khi hoàn tất.`);
      return;
    }
    if (!window.confirm("Hoàn tất duyệt khóa học này?")) return;
    setSubmittingCourseReview(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.adminReview(courseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ decision: "approve" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể hoàn tất duyệt khóa học.");
      window.alert("Đã hoàn tất duyệt khóa học.");
      navigate("/admin");
    } catch (e: any) {
      setError(e?.message || "Không thể hoàn tất duyệt khóa học.");
    } finally {
      setSubmittingCourseReview(false);
    }
  };

  if (!courseId || Number.isNaN(courseId)) return null;

  const resourceKindLabel: Record<LessonResource["resource_kind"], string> = {
    pdf: "PDF",
    word: "Word",
    video: "Video",
    youtube: "YouTube",
    other: "Khác",
  };

  const lessonTypeLabel = (lessonType?: string) => {
    if (lessonType === "quiz") return "Quiz";
    if (lessonType === "assignment") return "Assignment";
    return "Lesson";
  };

  const selectedModule = (tree?.modules || []).find((m) => (m.lessons || []).some((l) => l.id === selectedLessonId)) || null;
  const selectedLesson = selectedModule?.lessons.find((l) => l.id === selectedLessonId) || null;
  const rejectReasonOptions = useMemo(() => {
    const lessonType = selectedLesson?.lesson_type;
    const scoped =
      lessonType === "quiz"
        ? REJECT_REASON_QUIZ_OPTIONS
        : lessonType === "assignment"
        ? REJECT_REASON_ASSIGNMENT_OPTIONS
        : REJECT_REASON_LESSON_OPTIONS;
    return [...REJECT_REASON_COMMON_OPTIONS, ...scoped, REJECT_REASON_OTHER_OPTION];
  }, [selectedLesson?.lesson_type]);
  const selectedResourcesRaw = selectedLessonId ? resourcesByLesson[selectedLessonId] || [] : [];
  const selectedResources = useMemo(() => {
    const sorted = [...selectedResourcesRaw].sort((a, b) => {
      const aResubmit = a.is_resubmitted ? 1 : 0;
      const bResubmit = b.is_resubmitted ? 1 : 0;
      if (aResubmit !== bResubmit) return bResubmit - aResubmit;
      return new Date(b.last_reviewed_at || b.created_at).getTime() - new Date(a.last_reviewed_at || a.created_at).getTime();
    });
    if (!resubmittedFirstOnly) return sorted;
    return sorted.filter((item) => item.is_resubmitted);
  }, [resubmittedFirstOnly, selectedResourcesRaw]);
  const selectedLessonReviewTarget = useMemo(() => {
    if (!selectedLessonId) return null;
    const resources = selectedResources;
    if (!resources.length) return null;
    const pending = resources.find((x) => x.review_status === "pending");
    if (pending) return pending;
    if (selectedResourceId) {
      const selected = resources.find((x) => x.id === selectedResourceId);
      if (selected) return selected;
    }
    return resources[0] || null;
  }, [selectedResources, selectedLessonId, selectedResourceId]);
  const selectedAssignment = selectedLessonId ? assignmentByLesson[selectedLessonId] || null : null;
  const assignmentResources: AssignmentResourceItem[] = useMemo(() => {
    if (!selectedAssignment) return [];
    const assignmentReviewByKey = new Map<string, LessonResource>();
    for (const resource of selectedResourcesRaw) {
      const parsed = parseAssignmentReviewUrl(selectedLessonId || 0, resource.url);
      if (!parsed) continue;
      if (parsed.kind === "description") {
        assignmentReviewByKey.set("assignment-html", resource);
      } else if (typeof parsed.attachmentIndex === "number") {
        assignmentReviewByKey.set(`assignment-file-${parsed.attachmentIndex}`, resource);
      }
    }
    const items: AssignmentResourceItem[] = [];
    if (String(selectedAssignment.description || "").trim()) {
      items.push({
        key: "assignment-html",
        label: "Đề bài (HTML)",
        type: "html",
        html: String(selectedAssignment.description || ""),
        reviewResource: assignmentReviewByKey.get("assignment-html") || null,
      });
    }
    (selectedAssignment.attachments || []).forEach((att, idx) => {
      items.push({
        key: `assignment-file-${idx}`,
        label: att.file_name || `Tệp đính kèm #${idx + 1}`,
        type: "file",
        url: att.signed_url,
        reviewResource: assignmentReviewByKey.get(`assignment-file-${idx}`) || null,
      });
    });
    return items;
  }, [selectedAssignment, selectedLessonId, selectedResourcesRaw]);

  const selectedAssignmentResource = useMemo(() => {
    if (!selectedLessonId || !assignmentResources.length) return null;
    const selectedKey = selectedAssignmentResourceByLesson[selectedLessonId];
    return assignmentResources.find((item) => item.key === selectedKey) || assignmentResources[0];
  }, [assignmentResources, selectedAssignmentResourceByLesson, selectedLessonId]);
  const selectedAssignmentReviewResource = selectedAssignmentResource?.reviewResource || null;
  const activeReviewTarget =
    selectedLesson?.lesson_type === "assignment"
      ? selectedAssignmentReviewResource
      : selectedLessonReviewTarget;

  useEffect(() => {
    if (!selectedLessonId || !selectedLesson) return;
    const lessonId = selectedLessonId;
    const fetchExtra = async () => {
      setLessonExtraLoading((prev) => ({ ...prev, [lessonId]: true }));
      try {
        if (selectedLesson.lesson_type === "quiz" && !(lessonId in quizByLesson)) {
          const res = await fetch(`${url}${COURSES_API.manualQuiz(courseId, lessonId)}`, {
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((json as any)?.message || "Không thể tải dữ liệu quiz.");
          setQuizByLesson((prev) => ({ ...prev, [lessonId]: ((json as any)?.quiz || null) as ManualQuizDetail | null }));
        }

        if (selectedLesson.lesson_type === "assignment" && !(lessonId in assignmentByLesson)) {
          const rosterRes = await fetch(`${url}${ASSIGNMENTS_API.assignmentLearnerRoster(lessonId)}`, {
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const rosterJson = await rosterRes.json().catch(() => ({}));
          if (!rosterRes.ok) throw new Error((rosterJson as any)?.message || "Không thể tải assignment của bài học.");
          const assignmentId = Number((rosterJson as any)?.data?.assignment?.id || 0);
          if (!assignmentId) {
            setAssignmentByLesson((prev) => ({ ...prev, [lessonId]: null }));
            return;
          }
          const previewRes = await fetch(`${url}${ASSIGNMENTS_API.previewAssignment(lessonId, assignmentId)}`, {
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const previewJson = await previewRes.json().catch(() => ({}));
          if (!previewRes.ok) throw new Error((previewJson as any)?.message || "Không thể tải preview assignment.");
          setAssignmentByLesson((prev) => ({ ...prev, [lessonId]: previewJson as AssignmentPreviewData }));
        }
      } catch (e: any) {
        setError(e?.message || "Không thể tải dữ liệu quiz/assignment.");
      } finally {
        setLessonExtraLoading((prev) => ({ ...prev, [lessonId]: false }));
      }
    };
    void fetchExtra();
  }, [assignmentByLesson, courseId, quizByLesson, selectedLesson, selectedLessonId, token]);

  useEffect(() => {
    if (!selectedLessonId) {
      setSelectedResourceId(null);
      return;
    }
    const resources = selectedResources;
    if (!resources.length) {
      setSelectedResourceId(null);
      return;
    }
    if (selectedResourceId && resources.some((x) => x.id === selectedResourceId)) return;
    const first = pickFirstResourceToReview(resources);
    setSelectedResourceId(first?.id ?? null);
  }, [selectedLessonId, selectedResources, selectedResourceId, pickFirstResourceToReview]);

  useEffect(() => {
    if (!selectedLessonId) return;
    if (!assignmentResources.length) return;
    setSelectedAssignmentResourceByLesson((prev) => {
      if (prev[selectedLessonId]) return prev;
      return { ...prev, [selectedLessonId]: assignmentResources[0].key };
    });
  }, [assignmentResources, selectedLessonId]);

  useEffect(() => {
    if (!selectedAssignmentResource || selectedAssignmentResource.type !== "file" || !selectedAssignmentResource.url) {
      releaseAssignmentFileBlob();
      setAssignmentFilePreview({ loading: false, error: null, blobUrl: null, externalViewUrl: null });
      return;
    }
    const fileUrl = selectedAssignmentResource.url;
    const ext = getFileExt(selectedAssignmentResource.label);
    const mode = getPreviewModeByExt(ext);

    if (mode === "unsupported") {
      releaseAssignmentFileBlob();
      setAssignmentFilePreview({
        loading: false,
        error: `Định dạng .${ext || "unknown"} chưa hỗ trợ preview trực tiếp trong trang.`,
        blobUrl: null,
        externalViewUrl: null,
      });
      return;
    }
    if (mode === "office_viewer") {
      releaseAssignmentFileBlob();
      setAssignmentFilePreview({
        loading: false,
        error: null,
        blobUrl: null,
        externalViewUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`,
      });
      return;
    }

    let cancelled = false;
    const loadAssignmentFilePreview = async () => {
      releaseAssignmentFileBlob();
      setAssignmentFilePreview({ loading: true, error: null, blobUrl: null, externalViewUrl: null });
      try {
        const res = await fetch(fileUrl, {
          method: "GET",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) {
          throw new Error("Không thể tải file để preview.");
        }
        const blob = await res.blob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        assignmentBlobUrlRef.current = blobUrl;
        setAssignmentFilePreview({ loading: false, error: null, blobUrl, externalViewUrl: null });
      } catch (e: any) {
        if (cancelled) return;
        setAssignmentFilePreview({ loading: false, error: e?.message || "Không thể preview file.", blobUrl: null, externalViewUrl: null });
      }
    };

    void loadAssignmentFilePreview();
    return () => {
      cancelled = true;
    };
  }, [selectedAssignmentResource, token, releaseAssignmentFileBlob]);

  const getLessonReviewStats = (lessonId: number) => {
    const items = resourcesByLesson[lessonId] || [];
    return {
      total: items.length,
      pending: items.filter((x) => x.review_status === "pending").length,
      approved: items.filter((x) => x.review_status === "approved").length,
      rejected: items.filter((x) => x.review_status === "rejected").length,
    };
  };

  const getModuleReviewStats = (moduleLessons: ContentTree["modules"][number]["lessons"]) => {
    const lessonIds = (moduleLessons || []).map((x) => Number(x.id));
    const items = lessonIds.flatMap((id) => resourcesByLesson[id] || []);
    return {
      total: items.length,
      pending: items.filter((x) => x.review_status === "pending").length,
      rejected: items.filter((x) => x.review_status === "rejected").length,
    };
  };

  const getLessonReviewState = (lessonId: number): "approved" | "rejected" | "pending" | "empty" => {
    const items = resourcesByLesson[lessonId] || [];
    if (!items.length) return "empty";
    if (items.some((x) => x.review_status === "rejected")) return "rejected";
    if (items.some((x) => x.review_status === "pending")) return "pending";
    return "approved";
  };

  const getModuleReviewState = (moduleLessons: ContentTree["modules"][number]["lessons"]): "approved" | "rejected" | "pending" | "empty" => {
    const lessonIds = (moduleLessons || []).map((x) => Number(x.id));
    const items = lessonIds.flatMap((id) => resourcesByLesson[id] || []);
    if (!items.length) return "empty";
    if (items.some((x) => x.review_status === "rejected")) return "rejected";
    if (items.some((x) => x.review_status === "pending")) return "pending";
    return "approved";
  };

  const renderReviewBadge = (state: "approved" | "rejected" | "pending" | "empty") => {
    if (state === "approved") {
      return <span className="status-badge-text success">Đã duyệt</span>;
    }
    if (state === "rejected") {
      return <span className="status-badge-text rejected">Từ chối</span>;
    }
    if (state === "pending") {
      return <span className="status-badge-text warning">Chờ duyệt</span>;
    }
    return <span className="status-badge-text deleted">Chưa có tài nguyên</span>;
  };

  const getReviewStateFromStatus = (status?: string): "approved" | "rejected" | "pending" | "empty" => {
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    if (status === "pending") return "pending";
    return "empty";
  };

  const renderReviewIcon = (state: "approved" | "rejected" | "pending" | "empty") => {
    if (state === "approved") {
      return <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#16a34a" }} title="Đã duyệt">check_circle</span>;
    }
    if (state === "rejected") {
      return <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#dc2626" }} title="Từ chối">cancel</span>;
    }
    if (state === "pending") {
      return <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#b45309" }} title="Chờ duyệt">hourglass_top</span>;
    }
    return <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }} title="Chưa có tài nguyên">help</span>;
  };

  return (
    <div className="admin-dashboard">
      <main className="admin-main" style={{ padding: 16 }}>
        <div className="main-header">
          <h1 className="main-title">Duyệt nội dung khóa học </h1>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className="btn-secondary" onClick={() => navigate("/admin")}>Quay về admin</button>
          <button className="btn-secondary" onClick={() => void load()} disabled={loading}>Tải lại</button>
          <button
            className="btn-primary"
            onClick={() => void finalizeCourseReview()}
            disabled={loading || submittingCourseReview || pendingResources.length > 0 || rejectedCount > 0}
            title={
              pendingResources.length > 0
                ? "Cần duyệt hết tài nguyên pending trước khi hoàn tất."
                : rejectedCount > 0
                ? "Còn tài nguyên bị từ chối, chưa thể hoàn tất duyệt khóa học."
                : ""
            }
          >
            {submittingCourseReview ? "Đang hoàn tất..." : "Hoàn tất duyệt khóa học"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
          <div className="stat-card"><div className="stat-label">Tổng tài nguyên</div><div className="stat-value">{allResources.length}</div></div>
          <div className="stat-card"><div className="stat-label">Chờ duyệt</div><div className="stat-value">{pendingResources.length}</div></div>
          <div className="stat-card"><div className="stat-label">Đã duyệt</div><div className="stat-value">{approvedCount}</div></div>
          <div className="stat-card"><div className="stat-label">Từ chối</div><div className="stat-value">{rejectedCount}</div></div>
          <div className="stat-card">
            <div className="stat-label">Tái nộp</div>
            <div className="stat-value">{pendingResources.filter((x) => x.is_resubmitted).length}</div>
          </div>
        </div>
        <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
          <button type="button" className={resubmittedFirstOnly ? "btn-primary" : "btn-secondary"} onClick={() => setResubmittedFirstOnly((v) => !v)}>
            {resubmittedFirstOnly ? "Đang lọc: chỉ tái nộp" : "Filter: ưu tiên mục tái nộp"}
          </button>
        </div>

        {error && <div className="table-empty" style={{ justifyContent: "flex-start" }}>{error}</div>}
        {loading && <div className="table-empty">Đang tải...</div>}

        {!loading && tree && (
          <div style={{ display: "grid", gridTemplateColumns: "45% minmax(0, 1fr)", gap: 12 }}>
            <div className="panel review-tree-panel" style={{ padding: 12, maxHeight: "75vh", overflow: "auto" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Cây nội dung khóa học</div>
              <ul className="review-tree-root">
                {(tree.modules || []).map((m) => {
                  const moduleStats = getModuleReviewStats(m.lessons || []);
                  const moduleState = getModuleReviewState(m.lessons || []);
                  return (
                    <li key={m.id} className="review-tree-node review-module-node">
                      <div className="review-tree-card">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span>{renderReviewIcon(moduleState)}</span>
                            <div style={{ fontWeight: 700 }}>{m.title}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {moduleStats.total} tài nguyên · P:{moduleStats.pending} · R:{moduleStats.rejected}
                          </div>
                        </div>
                        <ul className="review-tree-children">
                          {(m.lessons || []).map((l) => {
                            const stats = getLessonReviewStats(l.id);
                            const lessonState = getLessonReviewState(l.id);
                            const active = selectedLessonId === l.id;
                            return (
                              <li
                                key={l.id}
                                className="review-tree-node review-lesson-node"
                                role="button"
                                tabIndex={0}
                                onClick={() => void viewLessonAsLearner(l.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    void viewLessonAsLearner(l.id);
                                  }
                                }}
                              >
                                <div
                                  className={`review-tree-lesson-card ${active ? "is-active" : ""}`}
                                  style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    marginBottom: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                    <div style={{ textAlign: "left", fontWeight: 600, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 8 }}>
                                      <span>{renderReviewIcon(lessonState)}</span>
                                      <span>{l.title}</span>
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                                    {lessonTypeLabel(l.lesson_type)} · Tổng:{stats.total} · Chờ:{stats.pending} · Duyệt:{stats.approved} · Từ chối:{stats.rejected}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="panel" style={{ padding: 12, display: "grid", gap: 12 }}>
              {!selectedLesson ? (
                <div className="table-empty">Chọn một bài học ở cây nội dung để bắt đầu duyệt.</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedLesson.title}</div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        Chương: {selectedModule?.title || "--"} · Loại bài: {lessonTypeLabel(selectedLesson.lesson_type)}
                      </div>
                    </div>
                    
                  </div>

                 
                  {activeReviewTarget && (
                      <div style={{ marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Timeline & diff nhanh</div>
                        <div style={{ fontSize: 13, color: "#334155" }}>
                          Quyết định gần nhất: {activeReviewTarget.last_review_decision || "N/A"}{" "}
                          {activeReviewTarget.last_reviewed_at ? `(${new Date(activeReviewTarget.last_reviewed_at).toLocaleString("vi-VN")})` : ""}
                        </div>
                        {activeReviewTarget.is_resubmitted && (
                          <div style={{ fontSize: 13, color: "#854d0e", marginTop: 4 }}>
                            Đây là bản gửi lại sau khi bị từ chối. Lý do reject trước:{" "}
                            {activeReviewTarget.previous_rejected_reason || "Không có ghi chú."}
                          </div>
                        )}
                        {activeReviewTarget.last_review_note && (
                          <div style={{ fontSize: 13, color: "#1e293b", marginTop: 4 }}>
                            Ghi chú lần duyệt gần nhất: {activeReviewTarget.last_review_note}
                          </div>
                        )}
                      </div>
                    )}  
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minHeight: 360, position: "relative" }}>
                    {selectedLesson.lesson_type === "quiz" && (
                      <div style={{ marginBottom: 12, padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            marginBottom: 8,
                            background: "#ffffff",
                            padding: "6px 8px",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-small"
                              title="Duyệt tài nguyên của Quiz"
                              disabled={!selectedLessonReviewTarget || !canApproveFromStructuredBlock(selectedLessonReviewTarget)}
                              onClick={() =>
                                selectedLessonReviewTarget
                                  ? void reviewResource(selectedLessonReviewTarget, "approve", { bypassPreviewRequirement: true })
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                            </button>
                            <button
                              type="button"
                              className="btn-small btn-danger"
                              title="Từ chối tài nguyên của Quiz"
                              disabled={!selectedLessonReviewTarget || actionLoadingId === selectedLessonReviewTarget.id}
                              onClick={() =>
                                selectedLessonReviewTarget
                                  ? void reviewResource(selectedLessonReviewTarget, "reject")
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                            </button>
                          </div>
                        </div>
                        {lessonExtraLoading[selectedLesson.id] ? (
                          <div>Đang tải dữ liệu Quiz...</div>
                        ) : quizByLesson[selectedLesson.id] ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div><strong>Quiz:</strong> {quizByLesson[selectedLesson.id]?.title || "Không tiêu đề"}</div>
                            <div style={{ fontSize: 13, color: "#475569" }}>{quizByLesson[selectedLesson.id]?.description || "Không có mô tả."}</div>
                            <div style={{ fontSize: 13, color: "#334155" }}>
                              Câu hỏi: {quizByLesson[selectedLesson.id]?.questions?.length || 0}
                              {" · "}Thời gian: {quizByLesson[selectedLesson.id]?.time_limit_minutes ?? "—"} phút
                              {" · "}Điểm đạt: {quizByLesson[selectedLesson.id]?.passing_score ?? "—"}
                            </div>
                            {!!quizByLesson[selectedLesson.id]?.questions?.length && (
                              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                {quizByLesson[selectedLesson.id]?.questions.map((q, qIdx) => (
                                  <div
                                    key={`${qIdx}-${q.order_index}`}
                                    style={{
                                      border: "1px solid #dbeafe",
                                      background: "#ffffff",
                                      borderRadius: 8,
                                      padding: 8,
                                      display: "grid",
                                      gap: 6,
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, color: "#1e3a8a", fontSize: 13 }}>
                                      Câu {qIdx + 1} ({q.points || 1} điểm) - {q.question_type === "true_false" ? "Đúng/Sai" : "Trắc nghiệm"}
                                    </div>
                                    <div style={{ fontSize: 14, color: "#0f172a" }}>{q.question_text || "Không có nội dung câu hỏi."}</div>
                                    <div style={{ display: "grid", gap: 4 }}>
                                      {(q.options || []).map((opt, optIdx) => (
                                        <div
                                          key={`${qIdx}-${optIdx}`}
                                          style={{
                                            fontSize: 13,
                                            color: opt.is_correct ? "#166534" : "#334155",
                                            background: opt.is_correct ? "#dcfce7" : "#f8fafc",
                                            border: `1px solid ${opt.is_correct ? "#86efac" : "#e2e8f0"}`,
                                            borderRadius: 6,
                                            padding: "4px 8px",
                                          }}
                                        >
                                          {String.fromCharCode(65 + optIdx)}. {opt.option_text || "(trống)"} {opt.is_correct ? " - Đáp án đúng" : ""}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: "#64748b" }}>Lesson quiz này chưa có dữ liệu quiz để duyệt.</div>
                        )}
                      </div>
                    )}

                    {selectedLesson.lesson_type === "assignment" && (
                      <div style={{ marginBottom: 12, padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            marginBottom: 8,
                            background: "#ffffff",
                            padding: "6px 8px",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-small"
                              title="Duyệt tài nguyên của Assignment"
                              disabled={!activeReviewTarget || !canApproveFromStructuredBlock(activeReviewTarget)}
                              onClick={() =>
                                activeReviewTarget
                                  ? void reviewResource(activeReviewTarget, "approve", { bypassPreviewRequirement: true })
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                            </button>
                            <button
                              type="button"
                              className="btn-small btn-danger"
                              title="Từ chối tài nguyên của Assignment"
                              disabled={!activeReviewTarget || actionLoadingId === activeReviewTarget.id}
                              onClick={() =>
                                activeReviewTarget
                                  ? void reviewResource(activeReviewTarget, "reject")
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                            </button>
                          </div>
                        </div>
                        {!activeReviewTarget && (
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                            Mục đang chọn chưa có marker review riêng nên chưa thể duyệt/từ chối trực tiếp.
                          </div>
                        )}
                        {lessonExtraLoading[selectedLesson.id] ? (
                          <div>Đang tải dữ liệu Assignment...</div>
                        ) : assignmentByLesson[selectedLesson.id] ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div><strong>Assignment:</strong> {assignmentByLesson[selectedLesson.id]?.title || "Không tiêu đề"}</div>
                            <div style={{ fontSize: 13, color: "#475569" }}>
                              {String(selectedLesson.description || "").trim() || "Không có mô tả."}
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                                gap: 8,
                                marginTop: 4,
                              }}
                            >
                              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", background: "#ffffff" }}>
                                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>Loại</div>
                                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                                  {assignmentByLesson[selectedLesson.id]?.assignment_kind === "short_answer" ? "Trả lời ngắn" : "Nộp file"}
                                </div>
                              </div>
                              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", background: "#ffffff" }}>
                                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>Điểm tối đa</div>
                                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                                  {assignmentByLesson[selectedLesson.id]?.max_score ?? "—"}
                                </div>
                              </div>
                              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", background: "#ffffff" }}>
                                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>Hạn nộp</div>
                                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                                  {assignmentByLesson[selectedLesson.id]?.due_date
                                    ? new Date(assignmentByLesson[selectedLesson.id]!.due_date!).toLocaleString("vi-VN")
                                    : "—"}
                                </div>
                              </div>
                            </div>
                            {assignmentByLesson[selectedLesson.id]?.assignment_kind === "short_answer" && (
                              <div style={{ fontSize: 13, color: "#334155" }}>
                                Số câu hỏi: {assignmentByLesson[selectedLesson.id]?.short_answer_questions?.length || 0}
                                {" · "}Thời gian làm bài: {assignmentByLesson[selectedLesson.id]?.time_limit_minutes ?? "—"} phút
                              </div>
                            )}
                            {assignmentByLesson[selectedLesson.id]?.assignment_kind === "short_answer" &&
                              !!assignmentByLesson[selectedLesson.id]?.short_answer_questions?.length && (
                                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e3a8a" }}>Danh sách câu hỏi</div>
                                  {assignmentByLesson[selectedLesson.id]?.short_answer_questions.map((q, idx) => (
                                    <div
                                      key={q.id || idx}
                                      style={{
                                        border: "1px solid #e2e8f0",
                                        background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                                        borderRadius: 8,
                                        padding: "8px 10px",
                                        fontSize: 13,
                                        color: "#0f172a",
                                      }}
                                    >
                                      <span style={{ fontWeight: 600, color: "#1e293b" }}>Câu {idx + 1}:</span>{" "}
                                      {q.question_text || "(trống)"}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ) : (
                          <div style={{ color: "#64748b" }}>Lesson assignment này chưa có dữ liệu assignment để duyệt.</div>
                        )}
                      </div>
                    )}

                    {selectedLesson.lesson_type !== "quiz" && selectedLesson.lesson_type !== "assignment" && !!selectedResources.length && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
                        {selectedResources.map((r, idx) => {
                          const active = selectedResourceId === r.id;
                          const state = getReviewStateFromStatus(r.review_status);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              className={active ? "btn-primary" : "btn-secondary"}
                              title={r.filename || `Tài nguyên #${r.id}`}
                              onClick={() => {
                                setSelectedResourceId(r.id);
                                void openPreview(r);
                              }}
                              style={{ width: "100%", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                              <span
                                style={{
                                  maxWidth: 150,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  display: "inline-block",
                                }}
                              >
                                {idx + 1}. {truncateKeepExtension(r.filename || `Tài nguyên #${r.id}`)}
                              </span>
                              {r.is_resubmitted && <span style={{ fontSize: 11, color: "#92400e" }}>Gửi lại</span>}
                              {renderReviewIcon(state)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {selectedLesson.lesson_type === "assignment" && !!assignmentResources.length && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
                        {assignmentResources.map((resource) => (
                          <button
                            key={resource.key}
                            type="button"
                            className={selectedAssignmentResource?.key === resource.key ? "btn-primary" : "btn-secondary"}
                            title={resource.label}
                            onClick={() =>
                              setSelectedAssignmentResourceByLesson((prev) => ({
                                ...prev,
                                [selectedLesson.id]: resource.key,
                              }))
                            }
                            style={{ width: "100%", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <span
                              style={{
                                maxWidth: 150,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                              }}
                            >
                              {truncateKeepExtension(resource.label)}
                            </span>
                            {renderReviewIcon(
                              resource.reviewResource
                                ? getReviewStateFromStatus(resource.reviewResource.review_status)
                                : "empty"
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {preview.loading && <div>Đang tải nội dung...</div>}
                    {/* {preview.error && <div style={{ color: "#b91c1c" }}>{preview.error}</div>} */}
                    {!preview.loading && !preview.error && !(preview.viewUrl || preview.blobUrl) && (
                      <div style={{ color: "#64748b" }}>
                      </div>
                    )}
                    {selectedLesson.lesson_type === "assignment" && selectedAssignmentResource && (
                      <div style={{ marginTop: 10 }}>
                        {selectedAssignmentResource.type === "html" ? (
                          <div
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              padding: 12,
                              background: "#ffffff",
                              color: "#0f172a",
                              lineHeight: 1.6,
                            }}
                            dangerouslySetInnerHTML={{ __html: selectedAssignmentResource.html || "" }}
                          />
                        ) : (
                          <>
                            {assignmentFilePreview.loading && <div>Đang tải file để preview...</div>}
                            {assignmentFilePreview.error && (
                              <div style={{ color: "#b91c1c", marginBottom: 8 }}>{assignmentFilePreview.error}</div>
                            )}
                            {!assignmentFilePreview.loading && !assignmentFilePreview.error && assignmentFilePreview.externalViewUrl && (
                              <iframe
                                src={assignmentFilePreview.externalViewUrl}
                                title="assignment-resource-preview-external"
                                style={{ width: "100%", height: 620, border: "1px solid #e2e8f0", borderRadius: 8 }}
                              />
                            )}
                            {!assignmentFilePreview.loading && assignmentFilePreview.blobUrl && (
                              <iframe
                                src={assignmentFilePreview.blobUrl}
                                title="assignment-resource-preview"
                                style={{ width: "100%", height: 620, border: "1px solid #e2e8f0", borderRadius: 8 }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {!preview.loading && !preview.error && (preview.viewUrl || preview.blobUrl || preview.externalViewUrl) && preview.resource && (
                      <>
                        {preview.externalViewUrl ? (
                          <iframe
                            src={preview.externalViewUrl}
                            title="resource-preview-external"
                            style={{ width: "100%", height: 620, border: "1px solid #e2e8f0", borderRadius: 8 }}
                          />
                        ) : preview.resource.resource_kind === "youtube" || isYoutubeUrl(preview.viewUrl || "") ? (
                          <iframe
                            src={getYoutubeEmbedUrl(preview.viewUrl || "")}
                            title="youtube-preview"
                            style={{ width: "100%", height: 480, border: "none", borderRadius: 8 }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : preview.resource.resource_kind === "video" ? (
                          <video controls style={{ width: "100%", maxHeight: "64vh", borderRadius: 8 }}>
                            <source src={preview.blobUrl || preview.viewUrl || ""} type={preview.resource.mime_type || "video/mp4"} />
                          </video>
                        ) : preview.resource.resource_kind === "pdf" ? (
                          <iframe src={preview.blobUrl || preview.viewUrl || ""} title="pdf-preview" style={{ width: "100%", height: 620, border: "1px solid #e2e8f0", borderRadius: 8 }} />
                        ) : (
                          <iframe
                            src={preview.blobUrl || preview.viewUrl || ""}
                            title="resource-preview"
                            style={{ width: "100%", height: 620, border: "1px solid #e2e8f0", borderRadius: 8 }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {rejectModalResource && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              zIndex: 1000,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div style={{ width: "min(640px, 100%)", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Từ chối tài nguyên</div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
                Chọn lý do mẫu cho: <strong>{rejectModalResource.filename || `Tài nguyên #${rejectModalResource.id}`}</strong>
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {rejectReasonOptions.map((option) => (
                  <label key={option.code} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a" }}>
                    <input
                      type="radio"
                      name="reject-reason"
                      value={option.code}
                      checked={rejectReasonCode === option.code}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRejectReasonCode(next);
                        if (next !== "other") setRejectExtraNote("");
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {rejectReasonCode === "other" && (
                <textarea
                  value={rejectExtraNote}
                  onChange={(e) => setRejectExtraNote(e.target.value)}
                  rows={4}
                  placeholder="Nhập lý do cụ thể."
                  style={{ width: "100%", resize: "vertical", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, fontFamily: "inherit" }}
                />
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (actionLoadingId != null) return;
                    setRejectModalResource(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-small btn-danger"
                  disabled={actionLoadingId != null || !canSubmitReject}
                  aria-disabled={actionLoadingId != null || !canSubmitReject}
                  onClick={() => {
                    if (actionLoadingId != null || !canSubmitReject) return;
                    void submitRejectReview();
                  }}
                  style={{
                    opacity: actionLoadingId != null || !canSubmitReject ? 0.55 : 1,
                    cursor: actionLoadingId != null || !canSubmitReject ? "not-allowed" : "pointer",
                  }}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

