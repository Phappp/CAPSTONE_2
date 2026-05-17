// TeacherLessonStudioPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Video,
  FileText,
  Upload,
  Youtube,
  Trash2,
  Eye,
  File,
  Image,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Timer,
} from "lucide-react";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { COURSES_API } from "../../api/courses";
import { url } from "../../baseUrl";
import { useAuth } from "../../contexts/Auth";
import TeacherShell from "../../components/TeacherShell";
import type {
  AssignmentKind,
  AssignmentShortAnswerQuestion,
  AssignmentStudioPreview,
  ContentTree,
  LessonItem,
  LessonResource,
  ModuleItem,
  QuizPreviewConfig,
  SavedQuizQuestion,
} from "./lesson-studio/types";
import {
  buildLessonHtmlPayload,
  formatFileSize,
  getReviewStatusLabel,
  isLikelyVideoFile,
  isLikelyVideoResource,
  parseYoutubeVideoId,
  shuffleBySeed,
  truncateLabel,
} from "./lesson-studio/utils";
import {
  AssignmentEditorSection,
  ContentEditorSection,
  LessonInfoCard,
  QuizEditorSection,
} from "./lesson-studio/EditorSections";
import "./TeacherLessonStudioPage.css";

export default function TeacherLessonStudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const courseId = Number(params.id);
  const lessonId = Number(params.lessonId);
  const { accessToken: token } = useAuth();
  const isQuickNewMode = useMemo(() => new URLSearchParams(location.search).get("new") === "1", [location.search]);
  const quickModuleId = useMemo(() => Number(new URLSearchParams(location.search).get("moduleId")), [location.search]);
  const shouldPickLessonType = useMemo(() => new URLSearchParams(location.search).get("pickType") === "1", [location.search]);
  const shouldPickAssignmentKind = useMemo(
    () => new URLSearchParams(location.search).get("pickAssignmentKind") === "1",
    [location.search]
  );
  const requestedSection = useMemo(() => new URLSearchParams(location.search).get("section"), [location.search]);
  const requestedAssignmentKind = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("assignmentKind");
    if (raw === "short_answer" || raw === "file_prompt") return raw;
    return null;
  }, [location.search]);
  const autoSaveKindSwitch = useMemo(
    () => new URLSearchParams(location.search).get("autoSaveKindSwitch") === "1",
    [location.search]
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("Khóa học");
  const [courseStatus, setCourseStatus] = useState<string>("draft");
  const [lesson, setLesson] = useState<LessonItem | null>(null);
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [lessonDescription, setLessonDescription] = useState<string>("");
  const [moduleOptions, setModuleOptions] = useState<ModuleItem[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [pendingNewModuleTitle, setPendingNewModuleTitle] = useState<string>("");
  const [showNewModuleInput, setShowNewModuleInput] = useState(false);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [richHtml, setRichHtml] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreviewUrl, setPendingFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<"file" | "youtube">("file");
  const [selectingLessonType, setSelectingLessonType] = useState(false);
  const [savedQuizQuestions, setSavedQuizQuestions] = useState<SavedQuizQuestion[]>([]);
  const [quizQuestionsDraft, setQuizQuestionsDraft] = useState<SavedQuizQuestion[]>([]);
  const [expandedSavedQuestions, setExpandedSavedQuestions] = useState<number[]>([]);
  const [editingSavedQuestions, setEditingSavedQuestions] = useState<number[]>([]);
  const [editingBuffers, setEditingBuffers] = useState<Record<number, SavedQuizQuestion>>({});
  const [quizSaveSignal, setQuizSaveSignal] = useState(0);
  const [quizPreviewConfig, setQuizPreviewConfig] = useState<QuizPreviewConfig>({
    time_limit_minutes: null,
    passing_score: null,
  });
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState<number | null>(null);
  const [assignmentShortQuestions, setAssignmentShortQuestions] = useState<AssignmentShortAnswerQuestion[]>([]);
  const [assignmentPreview, setAssignmentPreview] = useState<AssignmentStudioPreview | null>(null);
  const [assignmentSaveSignal, setAssignmentSaveSignal] = useState(0);
  const [assignmentEditSignal, setAssignmentEditSignal] = useState(0);
  const [assignmentCancelEditSignal, setAssignmentCancelEditSignal] = useState(0);
  const [assignmentLocked, setAssignmentLocked] = useState(false);
  const [assignmentEditing, setAssignmentEditing] = useState(false);
  const [assignmentDirty, setAssignmentDirty] = useState(false);
  const [pendingAssignmentFiles, setPendingAssignmentFiles] = useState<File[]>([]);
  const [initialLessonTitle, setInitialLessonTitle] = useState<string>("");
  const [initialLessonDescription, setInitialLessonDescription] = useState<string>("");
  const [initialModuleId, setInitialModuleId] = useState<number | null>(null);
  const [initialRichHtml, setInitialRichHtml] = useState<string>("");

  // Auto clear messages
  useEffect(() => {
    if (!successMessage && !error) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, error]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingFile]);

  const load = async () => {
    if (!courseId || !lessonId || Number.isNaN(courseId) || Number.isNaN(lessonId)) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, treeRes, resourcesRes] = await Promise.all([
        fetch(`${url}${COURSES_API.detail(courseId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`${url}${COURSES_API.contentTree(courseId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`${url}${COURSES_API.listLessonResources(courseId, lessonId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      const detailJson = await detailRes.json().catch(() => ({}));
      const treeJson = (await treeRes.json().catch(() => ({}))) as ContentTree;
      const resourcesJson = (await resourcesRes.json().catch(() => ({}))) as { items?: LessonResource[] };

      if (!detailRes.ok) throw new Error((detailJson as any)?.message || "Không thể tải khóa học.");
      if (!treeRes.ok) throw new Error((treeJson as any)?.message || "Không thể tải nội dung khóa học.");
      if (!resourcesRes.ok) throw new Error((resourcesJson as any)?.message || "Không thể tải tài nguyên bài học.");

      setCourseTitle(String((detailJson as any)?.title || "Khóa học"));
      setCourseStatus(String((detailJson as any)?.status || "draft"));

      const foundLesson = (treeJson.modules || [])
        .flatMap((m) => m.lessons || [])
        .find((l) => l.id === lessonId) || null;
      setModuleOptions(Array.isArray(treeJson.modules) ? treeJson.modules : []);
      setLesson(foundLesson);
      setLessonTitle(isQuickNewMode ? "" : foundLesson?.title || "");
      setLessonDescription(isQuickNewMode ? "" : foundLesson?.description || "");
      setInitialLessonTitle(isQuickNewMode ? "" : foundLesson?.title || "");
      setInitialLessonDescription(isQuickNewMode ? "" : foundLesson?.description || "");
      setSelectedModuleId((prev) => {
        if (isQuickNewMode && quickModuleId && treeJson.modules?.some((m) => m.id === quickModuleId)) return quickModuleId;
        if (prev && treeJson.modules?.some((m) => m.id === prev)) return prev;
        const lastModule = (treeJson.modules || [])[Math.max(0, (treeJson.modules || []).length - 1)];
        return foundLesson?.module_id ?? lastModule?.id ?? null;
      });
      setInitialModuleId(isQuickNewMode ? (quickModuleId || null) : (foundLesson?.module_id ?? null));

      const list = Array.isArray(resourcesJson.items) ? resourcesJson.items : [];
      setResources(list);
      const htmlRes = list.find((r) => (r.mime_type || "").includes("text/html")) ||
        list.find((r) => (r.filename || "").toLowerCase().endsWith(".html")) ||
        list.find((r) => (r.url || "").toLowerCase().endsWith(".html"));
      if (isQuickNewMode) {
        setRichHtml("");
        setInitialRichHtml("");
        return;
      }
      if (htmlRes) {
        const viewRes = await fetch(`${url}${COURSES_API.viewLessonResource(courseId, htmlRes.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (viewRes.ok) {
          const contentType = viewRes.headers.get("content-type") || "";
          let htmlText = "";
          if (contentType.includes("application/json") || contentType.includes("text/json")) {
            const json = await viewRes.json().catch(() => null);
            if (json) {
              htmlText = json.content || json.html || json.data || json.text || json.body || JSON.stringify(json);
            }
          } else {
            htmlText = await viewRes.text().catch(() => "");
          }
          let cleanHtml = htmlText;
          const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch && bodyMatch[1]) {
            cleanHtml = bodyMatch[1].trim();
          }
          setRichHtml(cleanHtml || "");
          setInitialRichHtml(cleanHtml || "");
        }
      } else {
        setRichHtml("");
        setInitialRichHtml("");
      }
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [courseId, lessonId, isQuickNewMode, quickModuleId]);

  const addYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const existingVideoResources = resources.filter((r) => isLikelyVideoResource(r));
      for (const r of existingVideoResources) {
        await fetch(`${url}${COURSES_API.deleteLessonResource(courseId, r.id)}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      }
      const res = await fetch(`${url}${COURSES_API.createYoutubeLessonResource(courseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim(), title: "YouTube" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể gắn YouTube.");
      setYoutubeUrl("");
      setSuccessMessage("Đã thêm video YouTube thành công!");
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể gắn YouTube.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async () => {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);
    setUploadProgress(0);
    try {
      if (isLikelyVideoFile(pendingFile)) {
        const existingVideoResources = resources.filter((r) => isLikelyVideoResource(r));
        for (const r of existingVideoResources) {
          await fetch(`${url}${COURSES_API.deleteLessonResource(courseId, r.id)}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        }
      }
      const form = new FormData();
      form.append("file", pendingFile);
      const res = await fetch(`${url}${COURSES_API.uploadLessonResource(courseId, lessonId)}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể upload tài nguyên.");
      setPendingFile(null);
      setUploadProgress(null);
      setSuccessMessage(`Đã upload thành công: ${pendingFile.name}`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể upload tài nguyên.");
      setUploadProgress(null);
    } finally {
      setSaving(false);
    }
  };

  const removeResource = async (resourceId: number, resourceName?: string) => {
    const targetResource = resources.find((r) => r.id === resourceId) || null;
    if (
      courseStatus === "pending_review" &&
      targetResource &&
      targetResource.review_status === "rejected"
    ) {
      setError("Không thể xóa tài nguyên đang bị từ chối khi khóa học chờ duyệt. Vui lòng sửa và gửi lại.");
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa tài nguyên "${resourceName || "này"}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteLessonResource(courseId, resourceId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể xóa tài nguyên.");
      setSuccessMessage("Đã xóa tài nguyên thành công!");
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa tài nguyên.");
    } finally {
      setSaving(false);
    }
  };

  const saveLessonMeta = async () => {
    if (!lessonTitle.trim()) {
      setError("Tên bài học không được để trống.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let targetModuleId = selectedModuleId;

      if (showNewModuleInput && pendingNewModuleTitle.trim()) {
        const createModuleRes = await fetch(`${url}${COURSES_API.createModule(courseId)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title: pendingNewModuleTitle.trim(), description: null, open_at: null }),
        });
        const createModuleData = await createModuleRes.json().catch(() => ({}));
        if (!createModuleRes.ok) throw new Error((createModuleData as any)?.message || "Không thể tạo chương mới.");
        targetModuleId = Number((createModuleData as any)?.id) || targetModuleId;
        setPendingNewModuleTitle("");
        setShowNewModuleInput(false);
        if (targetModuleId) setSelectedModuleId(targetModuleId);
      }

      const res = await fetch(`${url}${COURSES_API.updateLesson(courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể lưu thông tin bài học.");

      if (targetModuleId && lesson && targetModuleId !== lesson.module_id) {
        const nextModules = moduleOptions.map((m) => ({ ...m, lessons: [...(m.lessons || [])] }));
        const fromIdx = nextModules.findIndex((m) => m.id === lesson.module_id);
        const toIdx = nextModules.findIndex((m) => m.id === targetModuleId);
        if (toIdx < 0 && showNewModuleInput && pendingNewModuleTitle.trim() && targetModuleId) {
          nextModules.push({ id: targetModuleId, title: pendingNewModuleTitle.trim(), lessons: [] });
        }
        const resolvedToIdx = nextModules.findIndex((m) => m.id === targetModuleId);
        if (fromIdx >= 0 && resolvedToIdx >= 0) {
          const lessonIdx = nextModules[fromIdx].lessons.findIndex((x) => x.id === lesson.id);
          if (lessonIdx >= 0) {
            const [moved] = nextModules[fromIdx].lessons.splice(lessonIdx, 1);
            nextModules[resolvedToIdx].lessons.push({ ...moved, module_id: targetModuleId });
            const modulesPayload = nextModules.map((m, idx) => ({ id: m.id, order_index: idx + 1 }));
            const lessonsPayload = nextModules.flatMap((m) =>
              m.lessons.map((l, idx) => ({ id: l.id, module_id: m.id, order_index: idx + 1 }))
            );
            const reorderRes = await fetch(`${url}${COURSES_API.reorderContent(courseId)}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ modules: modulesPayload, lessons: lessonsPayload }),
            });
            const reorderData = await reorderRes.json().catch(() => ({}));
            if (!reorderRes.ok) throw new Error((reorderData as any)?.message || "Không thể chuyển bài sang chương đã chọn.");
          }
        }
      }
      setSuccessMessage("Đã lưu thông tin bài học!");
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể lưu thông tin bài học.");
    } finally {
      setSaving(false);
    }
  };

  const createModuleFromStudio = async () => {
    setShowNewModuleInput(true);
    setPendingNewModuleTitle((prev) => prev || "Chương mới");
  };

  const saveStudio = async () => {
    if (!lesson) return;
    setSaving(true);
    setError(null);
    try {
      if (richHtml.trim()) {
        const htmlPayload = buildLessonHtmlPayload(lessonTitle || lesson.title, richHtml);
        const form = new FormData();
        form.append("file", htmlPayload.blob, htmlPayload.filename);
        const res = await fetch(`${url}${COURSES_API.uploadLessonResource(courseId, lessonId)}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Không thể lưu nội dung bài học.");
      }
      const lessonType = /youtube\.com|youtu\.be|<video|video\//i.test(richHtml) || resources.some((r) => (r.mime_type || "").startsWith("video/"))
        ? "video"
        : "text";
      await fetch(`${url}${COURSES_API.updateLesson(courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lesson_type: lessonType }),
      });
      setSuccessMessage("Đã lưu nội dung bài học!");
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể lưu studio.");
    } finally {
      setSaving(false);
    }
  };

  const chooseNewLessonType = async (lessonType: "text" | "quiz" | "assignment") => {
    setSelectingLessonType(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.updateLesson(courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lesson_type: lessonType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể chọn loại bài học.");

      setLesson((prev) => (prev ? { ...prev, lesson_type: lessonType } : prev));
      const params = new URLSearchParams(location.search);
      params.delete("pickType");
      if (lessonType === "quiz") params.set("section", "quiz");
      else if (lessonType === "assignment") {
        params.set("section", "assignment");
        params.set("pickAssignmentKind", "1");
      }
      else params.delete("section");
      const query = params.toString();
      navigate(
        query
          ? `/teacher/courses/${courseId}/lessons/${lessonId}/studio?${query}`
          : `/teacher/courses/${courseId}/lessons/${lessonId}/studio`,
        { replace: true }
      );
    } catch (e: any) {
      setError(e?.message || "Không thể chọn loại bài học.");
    } finally {
      setSelectingLessonType(false);
    }
  };

  const chooseAssignmentKind = (kind: AssignmentKind, autoSaveAfterSwitch = false) => {
    const params = new URLSearchParams(location.search);
    params.delete("pickAssignmentKind");
    params.set("section", "assignment");
    params.set("assignmentKind", kind);
    if (autoSaveAfterSwitch) params.set("autoSaveKindSwitch", "1");
    else params.delete("autoSaveKindSwitch");
    const query = params.toString();
    navigate(
      query
        ? `/teacher/courses/${courseId}/lessons/${lessonId}/studio?${query}`
        : `/teacher/courses/${courseId}/lessons/${lessonId}/studio`,
      { replace: true }
    );
  };

  const switchAssignmentKindWithConfirm = () => {
    const currentKind: AssignmentKind =
      requestedAssignmentKind || (assignmentPreview?.assignment_kind === "short_answer" ? "short_answer" : "file_prompt");
    const nextKind: AssignmentKind = currentKind === "short_answer" ? "file_prompt" : "short_answer";
    const nextLabel = nextKind === "short_answer" ? "Trả lời ngắn" : "Tự luận";
    const ok = window.confirm(
      `Bạn có chắc muốn chuyển dạng bài tập sang "${nextLabel}"?\nNhững chỉnh sửa chưa lưu ở khối 2 có thể bị thay đổi.`
    );
    if (!ok) return;
    setAssignmentEditing(false);
    setAssignmentLocked(false);
    chooseAssignmentKind(nextKind, true);
  };

  const removeAssignmentAttachment = async (filePath: string) => {
    if (!assignmentPreview?.assignment_id) {
      setError("Không tìm thấy mã bài tập để xóa file đính kèm.");
      return;
    }
    const target = assignmentPreview.attachments?.find((item) => item.file_path === filePath);
    if (!target) return;
    const ok = window.confirm(`Bạn có chắc muốn xóa file "${target.file_name || "Tệp đính kèm"}" không?`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const nextAttachments = (assignmentPreview.attachments || []).filter((item) => item.file_path !== filePath);
      const res = await fetch(`${url}${ASSIGNMENTS_API.updateAssignment(lessonId, assignmentPreview.assignment_id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ attachments: nextAttachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Không thể xóa file đính kèm.");
      }
      setAssignmentPreview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: (prev.attachments || []).filter((item) => item.file_path !== filePath),
        };
      });
      setSuccessMessage("Đã xóa file đính kèm.");
    } catch (e: any) {
      setError(e?.message || "Không thể xóa file đính kèm.");
    } finally {
      setSaving(false);
    }
  };

  const appendAssignmentAttachments = async () => {
    if (!assignmentPreview?.assignment_id) {
      setError("Không tìm thấy mã bài tập để thêm file đính kèm.");
      return;
    }
    if (!pendingAssignmentFiles.length) {
      setError("Vui lòng chọn ít nhất một file để thêm.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const currentAttachments = assignmentPreview.attachments || [];
      const form = new FormData();
      pendingAssignmentFiles.forEach((file) => form.append("files", file));
      const uploadRes = await fetch(
        `${url}${ASSIGNMENTS_API.uploadAttachments(lessonId, assignmentPreview.assignment_id)}`,
        {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: form,
        }
      );
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || "Không thể upload file đính kèm.");
      }

      const uploadedAttachments: AssignmentStudioPreview["attachments"] =
        uploadData?.data?.attachments || uploadData?.attachments || [];
      const mergedAttachmentMap = new Map<string, AssignmentStudioPreview["attachments"][number]>();
      [...currentAttachments, ...uploadedAttachments].forEach((attachment) => {
        if (!attachment?.file_path) return;
        mergedAttachmentMap.set(attachment.file_path, attachment);
      });
      const mergedAttachments = Array.from(mergedAttachmentMap.values());

      const patchRes = await fetch(`${url}${ASSIGNMENTS_API.updateAssignment(lessonId, assignmentPreview.assignment_id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ attachments: mergedAttachments }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        throw new Error(patchData?.message || "Không thể cập nhật danh sách file đính kèm.");
      }

      setAssignmentPreview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: mergedAttachments,
        };
      });
      setPendingAssignmentFiles([]);
      setSuccessMessage("Đã thêm file đính kèm.");
    } catch (e: any) {
      setError(e?.message || "Không thể thêm file đính kèm.");
    } finally {
      setSaving(false);
    }
  };

  const currentVideoResource = resources.find((r) => isLikelyVideoResource(r)) || null;
  const currentYoutubeId = currentVideoResource ? parseYoutubeVideoId(currentVideoResource.url || "") : null;
  const contentHtmlResource = resources.find((r) =>
    (r.mime_type || "").includes("text/html") ||
    (r.filename || "").toLowerCase().endsWith(".html") ||
    (r.url || "").toLowerCase().endsWith(".html")
  ) || null;
  const quizReviewResource =
    resources.find(
      (r) =>
        String(r.url || "").includes(`/lesson/${lessonId}/quiz`) ||
        String(r.filename || "").toUpperCase().startsWith("[QUIZ]")
    ) || null;
  const assignmentReviewResources = resources.filter(
    (r) =>
      String(r.url || "").includes(`/lesson/${lessonId}/assignment`) ||
      String(r.filename || "").toUpperCase().startsWith("[ASSIGNMENT]")
  );
  const isContentRejectedContext = resources.some(
    (r) =>
      r.review_status === "rejected" &&
      !String(r.url || "").includes(`/lesson/${lessonId}/quiz`) &&
      !String(r.url || "").includes(`/lesson/${lessonId}/assignment`) &&
      !String(r.filename || "").toUpperCase().startsWith("[QUIZ]") &&
      !String(r.filename || "").toUpperCase().startsWith("[ASSIGNMENT]")
  );
  const isQuizRejectedContext = quizReviewResource?.review_status === "rejected";
  const isAssignmentRejectedContext = assignmentReviewResources.some((r) => r.review_status === "rejected");
  const otherResources = resources.filter((r) => {
    const isVideo = isLikelyVideoResource(r);
    const isHtml = (r.mime_type || "").includes("text/html") ||
      (r.filename || "").toLowerCase().endsWith(".html") ||
      (r.url || "").toLowerCase().endsWith(".html");
    return !isVideo && !isHtml;
  });
  const pendingAttachmentFile = pendingFile && !isLikelyVideoFile(pendingFile) ? pendingFile : null;
  const hasLessonDescription = Boolean(lessonDescription?.trim());
  const assignmentDescriptionHtml = assignmentPreview?.description?.trim() || "";
  const hasAssignmentAttachments = Boolean(assignmentPreview?.attachments?.length);
  const hasAssignmentShortQuestions = assignmentShortQuestions.length > 0;
  const hasPreviewVideo = Boolean(
    (pendingFile && pendingFilePreviewUrl && isLikelyVideoFile(pendingFile)) || currentVideoResource
  );
  const hasPreviewAttachments = Boolean(pendingAttachmentFile || otherResources.length > 0);
  const hasRichContent = useMemo(() => {
    const plainText = String(richHtml || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return plainText.length > 0;
  }, [richHtml]);
  const hasRejectedResources = useMemo(
    () => resources.some((item) => item.review_status === "rejected"),
    [resources]
  );
  const canDeleteResource = useCallback(
    (resource: LessonResource | null | undefined) => {
      if (!resource) return false;
      if (courseStatus === "pending_review" && resource.review_status === "rejected") return false;
      return true;
    },
    [courseStatus]
  );
  const isReadOnlyByReview = courseStatus === "pending_review" && !hasRejectedResources;
  const isAssessmentLesson = lesson?.lesson_type === "quiz" || lesson?.lesson_type === "assignment";
  const activeSection: "content" | "quiz" | "assignment" = (() => {
    if (requestedSection === "quiz" || requestedSection === "assignment") return requestedSection;
    if (isAssessmentLesson) return lesson?.lesson_type === "assignment" ? "assignment" : "quiz";
    return "content";
  })();
  const currentAssignmentKind: AssignmentKind =
    requestedAssignmentKind || (assignmentPreview?.assignment_kind === "short_answer" ? "short_answer" : "file_prompt");
  const selectedModuleTitle = useMemo(
    () => moduleOptions.find((m) => m.id === selectedModuleId)?.title || "Chưa chọn chương",
    [moduleOptions, selectedModuleId]
  );
  const lessonDisplayLabel = useMemo(() => {
    if (activeSection === "quiz") return lessonTitle || lesson?.title || "Quizz";
    if (activeSection === "assignment") return lessonTitle || lesson?.title || "Bài tập";
    return lessonTitle || lesson?.title || `Bài học #${lessonId}`;
  }, [activeSection, lessonTitle, lesson?.title, lessonId]);
  const fixedCourses = useMemo(() => [{ id: courseId, title: courseTitle || `Khóa học #${courseId}` }], [courseId, courseTitle]);

  useEffect(() => {
    const minutes = quizPreviewConfig.time_limit_minutes;
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) {
      setQuizRemainingSeconds(null);
      return;
    }
    setQuizRemainingSeconds(Math.max(0, Math.floor(minutes * 60)));
  }, [quizPreviewConfig.time_limit_minutes]);

  useEffect(() => {
    if (quizRemainingSeconds == null || quizRemainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setQuizRemainingSeconds((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quizRemainingSeconds]);

  useEffect(() => {
    setQuizQuestionsDraft(savedQuizQuestions);
    setEditingSavedQuestions([]);
    setEditingBuffers({});
  }, [savedQuizQuestions]);

  useEffect(() => {
    if (!assignmentPreview) {
      setAssignmentLocked(false);
      setAssignmentEditing(false);
    }
  }, [assignmentPreview]);

  if (!courseId || !lessonId || Number.isNaN(courseId) || Number.isNaN(lessonId)) return null;

  return (
    <TeacherShell activeNav="courses" showFab={false}>
      <div className="ls-page">
        <div className="ls-container">
          {/* Back navigation */}
          <div className="ls-back-nav">
            <button
              type="button"
              className="ls-back-btn"
              onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}
            >
              <ArrowLeft size={16} />
              Nội dung khóa học
            </button>
          </div>

          {/* Error / Success / Warning messages */}
          {error && (
            <div className="ls-error-box">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="ls-success-box">
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}
          {isReadOnlyByReview && (
            <div className="ls-warning">
              Khóa học đang chờ duyệt. Bạn chỉ có thể chỉnh sửa những mục đang bị từ chối.
            </div>
          )}

          {/* Type picker screen */}
          {shouldPickLessonType ? (
            <div className="ls-type-picker">
              <div className="ls-type-picker__title">Chọn loại nội dung cho bài học mới</div>
              <div className="ls-type-picker__actions">
                <button
                  type="button"
                  className="ls-type-choice-btn ls-type-choice-btn--content"
                  disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                  onClick={() => void chooseNewLessonType("text")}
                >
                  Bài học
                </button>
                <button
                  type="button"
                  className="ls-type-choice-btn ls-type-choice-btn--quiz"
                  disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                  onClick={() => void chooseNewLessonType("quiz")}
                >
                  Quizz
                </button>
                <button
                  type="button"
                  className="ls-type-choice-btn ls-type-choice-btn--assignment"
                  disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                  onClick={() => void chooseNewLessonType("assignment")}
                >
                  Bài tập
                </button>
              </div>
            </div>
          ) : shouldPickAssignmentKind ? (
            <div className="ls-type-picker">
              <div className="ls-type-picker__title">Chọn dạng bài tập</div>
              <div className="ls-type-picker__actions">
                <button
                  type="button"
                  className="ls-type-choice-btn ls-type-choice-btn--assignment"
                  disabled={isReadOnlyByReview || saving || loading}
                  onClick={() => chooseAssignmentKind("file_prompt")}
                >
                  Tự luận
                </button>
                <button
                  type="button"
                  className="ls-type-choice-btn ls-type-choice-btn--quiz"
                  disabled={isReadOnlyByReview || saving || loading}
                  onClick={() => chooseAssignmentKind("short_answer")}
                >
                  Trả lời ngắn
                </button>
              </div>
            </div>
          ) : (
            /* Two-column layout */
            <div className="ls-studio-two-column">
              {/* Left column — Editor */}
              <div className="ls-editor-col">
                <LessonInfoCard
                  activeSection={activeSection}
                  lessonTitle={lessonTitle}
                  setLessonTitle={setLessonTitle}
                  lessonDescription={lessonDescription}
                  setLessonDescription={setLessonDescription}
                  moduleOptions={moduleOptions}
                  selectedModuleId={selectedModuleId}
                  setSelectedModuleId={setSelectedModuleId}
                  showNewModuleInput={showNewModuleInput}
                  setShowNewModuleInput={setShowNewModuleInput}
                  pendingNewModuleTitle={pendingNewModuleTitle}
                  setPendingNewModuleTitle={setPendingNewModuleTitle}
                  saving={saving}
                  loading={loading}
                  saveLessonMeta={saveLessonMeta}
                  createModuleFromStudio={createModuleFromStudio}
                  readOnly={isReadOnlyByReview}
                />

                <ContentEditorSection
                  activeSection={activeSection}
                  isAssessmentLesson={isAssessmentLesson}
                  videoInputMode={videoInputMode}
                  setVideoInputMode={setVideoInputMode}
                  saving={saving}
                  loading={loading}
                  setPendingFile={setPendingFile}
                  pendingFile={pendingFile}
                  uploadFile={uploadFile}
                  uploadProgress={uploadProgress}
                  youtubeUrl={youtubeUrl}
                  setYoutubeUrl={setYoutubeUrl}
                  addYoutube={addYoutube}
                  currentVideoResource={currentVideoResource}
                  currentYoutubeId={currentYoutubeId}
                  removeResource={removeResource}
                  canDeleteResource={canDeleteResource}
                  otherResources={otherResources}
                  contentHtmlResource={contentHtmlResource}
                  saveStudio={saveStudio}
                  richHtml={richHtml}
                  setRichHtml={setRichHtml}
                  isRejectedContext={isContentRejectedContext}
                  readOnly={isReadOnlyByReview}
                />

                <QuizEditorSection
                  activeSection={activeSection}
                  fixedCourses={fixedCourses}
                  token={token}
                  loading={loading}
                  saving={saving}
                  courseId={courseId}
                  lessonId={lessonId}
                  lessonTitle={lessonTitle}
                  setSavedQuizQuestions={setSavedQuizQuestions}
                  setQuizPreviewConfig={setQuizPreviewConfig}
                  quizSaveSignal={quizSaveSignal}
                  setQuizSaveSignal={setQuizSaveSignal}
                  quizQuestionsDraft={quizQuestionsDraft}
                  setQuizQuestionsDraft={setQuizQuestionsDraft}
                  expandedSavedQuestions={expandedSavedQuestions}
                  setExpandedSavedQuestions={setExpandedSavedQuestions}
                  editingSavedQuestions={editingSavedQuestions}
                  setEditingSavedQuestions={setEditingSavedQuestions}
                  editingBuffers={editingBuffers}
                  setEditingBuffers={setEditingBuffers}
                  quizReviewResource={quizReviewResource}
                  isRejectedContext={Boolean(isQuizRejectedContext)}
                  readOnly={isReadOnlyByReview}
                />

                <AssignmentEditorSection
                  activeSection={activeSection}
                  fixedCourses={fixedCourses}
                  token={token}
                  loading={loading}
                  saving={saving}
                  lessonId={lessonId}
                  setAssignmentShortQuestions={setAssignmentShortQuestions}
                  setAssignmentPreview={setAssignmentPreview}
                  assignmentSaveSignal={assignmentSaveSignal}
                  setAssignmentSaveSignal={setAssignmentSaveSignal}
                  assignmentEditSignal={assignmentEditSignal}
                  setAssignmentEditSignal={setAssignmentEditSignal}
                  assignmentCancelEditSignal={assignmentCancelEditSignal}
                  setAssignmentCancelEditSignal={setAssignmentCancelEditSignal}
                  assignmentLocked={assignmentLocked}
                  setAssignmentLocked={setAssignmentLocked}
                  assignmentEditing={assignmentEditing}
                  setAssignmentEditing={setAssignmentEditing}
                  setAssignmentDirty={setAssignmentDirty}
                  requestedAssignmentKind={requestedAssignmentKind}
                  autoSaveKindSwitch={autoSaveKindSwitch}
                  assignmentPreview={assignmentPreview}
                  currentAssignmentKind={currentAssignmentKind}
                  assignmentShortQuestions={assignmentShortQuestions}
                  pendingAssignmentFiles={pendingAssignmentFiles}
                  setPendingAssignmentFiles={setPendingAssignmentFiles}
                  appendAssignmentAttachments={appendAssignmentAttachments}
                  removeAssignmentAttachment={removeAssignmentAttachment}
                  isRejectedContext={isAssignmentRejectedContext}
                  readOnly={isReadOnlyByReview}
                />
              </div>

              {/* Right column — Preview */}
              <div className="ls-preview-col">
                <div className="ls-studio-card ls-preview-card">
                  <div className="ls-studio-card__head">
                    <div className="ls-studio-card__title">
                      <Eye size={18} />
                      <h2>Xem như học viên</h2>
                    </div>
                  </div>
                  <div className="ls-studio-card__body">
                    {loading ? (
                      <div className="ls-preview-loading">
                        <Loader2 size={32} className="ls-preview-loading__spin" />
                        <p>Đang tải preview...</p>
                      </div>
                    ) : (
                      <>
                        {/* Lesson header */}
                        <div className="ls-preview-header">
                          <div style={{
                            fontSize: "0.98rem",
                            color: "#334155",
                            marginBottom: "0.35rem",
                            fontWeight: 800,
                            lineHeight: 1.35,
                          }}>
                            {truncateLabel(moduleOptions.find((m) => m.id === selectedModuleId)?.title || "Chưa chọn chương")}
                            <span aria-hidden="true" style={{
                              margin: "0 0.4rem",
                              fontSize: "1.2rem",
                              color: "#cbd5e1",
                              fontWeight: 700,
                              verticalAlign: "middle",
                            }}>
                              ›
                            </span>
                            {truncateLabel(lessonTitle || lesson?.title || `Bài học #${lessonId}`)}
                          </div>
                          {hasLessonDescription ? (
                            <p className="ls-preview-description">{lessonDescription?.trim()}</p>
                          ) : null}
                        </div>

                        {activeSection === "quiz" ? (
                          <div className="ls-preview-content">
                            {(quizPreviewConfig.passing_score != null || quizRemainingSeconds != null) && (
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                gap: 8,
                                marginBottom: 10,
                              }}>
                                {quizPreviewConfig.passing_score != null && Number.isFinite(quizPreviewConfig.passing_score) && (
                                  <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                    <div style={{ width: "100%" }}>
                                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Điểm đạt</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                        {`${quizPreviewConfig.passing_score}%`}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {quizRemainingSeconds != null && (
                                  <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                    <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                                      <Timer size={16} color="#64748b" />
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                        {`${String(Math.floor(quizRemainingSeconds / 60)).padStart(2, "0")}:${String(
                                          quizRemainingSeconds % 60
                                        ).padStart(2, "0")}`}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {quizQuestionsDraft.length ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                {quizQuestionsDraft.map((item, idx) => {
                                  const shuffledOptions = shuffleBySeed(item.options || [], `${item.question_text}-${idx}`);
                                  return (
                                    <div key={`preview-quiz-${idx}`} className="ls-attachment-item" style={{ alignItems: "flex-start" }}>
                                      <div style={{ width: "100%" }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                                          Câu {idx + 1}: {item.question_text || "(trống)"}
                                        </div>
                                        <div style={{ display: "grid", gap: 6 }}>
                                          {shuffledOptions.map((opt, optIdx) => (
                                            <div
                                              key={`opt-${idx}-${optIdx}`}
                                              style={{
                                                fontSize: 12,
                                                color: "#334155",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 8,
                                                padding: "8px 10px",
                                                background: "#ffffff",
                                              }}
                                            >
                                              {String.fromCharCode(65 + optIdx)}. {opt.option_text || "(trống)"}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : activeSection === "assignment" ? (
                          <div className="ls-preview-content">
                            {!assignmentPreview ? null : (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                  gap: 8,
                                }}>
                                  {assignmentPreview.due_date && (
                                    <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                      <div style={{ width: "100%" }}>
                                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Hạn nộp</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                          {new Date(assignmentPreview.due_date).toLocaleString("vi-VN", {
                                            hour12: false,
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                    <div style={{ width: "100%" }}>
                                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Thang điểm</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                        {assignmentPreview.max_score}
                                      </div>
                                    </div>
                                  </div>
                                  {assignmentPreview.passing_score != null && (
                                    <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                      <div style={{ width: "100%" }}>
                                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Điểm đạt</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                          {assignmentPreview.passing_score}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {assignmentPreview.allow_resubmission && (
                                    <div className="ls-attachment-item" style={{ marginBottom: 0 }}>
                                      <div style={{ width: "100%" }}>
                                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Nộp lại</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                          {`Tối đa ${assignmentPreview.max_resubmissions} lần`}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {assignmentDescriptionHtml ? (
                                  <div className="ls-attachment-item" style={{ alignItems: "flex-start", background: "#ffffff", borderColor: "#e2e8f0" }}>
                                    <div style={{ width: "100%" }}>
                                      <div className="ls-rich-preview" dangerouslySetInnerHTML={{ __html: assignmentDescriptionHtml }} />
                                    </div>
                                  </div>
                                ) : null}

                                {hasAssignmentAttachments ? (
                                  <div className="ls-attachment-item" style={{ alignItems: "flex-start" }}>
                                    <div style={{ width: "100%" }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>File đính kèm đề bài</div>
                                      <div style={{ display: "grid", gap: 6 }}>
                                        {assignmentPreview.attachments.map((a, idx) => (
                                          <div
                                            key={`asg-preview-attachment-${idx}-${a.file_path}`}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              gap: 8,
                                              border: "1px solid #e2e8f0",
                                              borderRadius: 8,
                                              padding: "8px 10px",
                                              background: "#ffffff",
                                            }}
                                          >
                                            <div style={{ fontSize: 12, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {a.file_name || "Tệp đính kèm"}
                                            </div>
                                            <a href={a.signed_url} target="_blank" rel="noreferrer" className="ls-attachment-link">
                                              <LinkIcon size={14} />
                                              Mở
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {assignmentPreview.assignment_kind === "short_answer" && hasAssignmentShortQuestions ? (
                                  <div className="ls-attachment-item" style={{ alignItems: "flex-start" }}>
                                    <div style={{ width: "100%" }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Câu hỏi trả lời ngắn</div>
                                      <div style={{ display: "grid", gap: 6 }}>
                                        {assignmentShortQuestions
                                          .slice()
                                          .sort((a, b) => a.order_index - b.order_index)
                                          .map((q, idx) => (
                                            <div
                                              key={`learner-short-${q.id}-${idx}`}
                                              style={{
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 8,
                                                padding: "8px 10px",
                                                fontSize: 12,
                                                color: "#334155",
                                                background: "#ffffff",
                                              }}
                                            >
                                              <strong style={{ color: "#0f172a" }}>Câu {idx + 1}:</strong> {q.question_text || "(trống)"}
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Video player */}
                            {hasPreviewVideo ? (
                              <div className="ls-preview-video">
                                {pendingFile && pendingFilePreviewUrl && isLikelyVideoFile(pendingFile) ? (
                                  <video controls className="ls-video-player">
                                    <source src={pendingFilePreviewUrl} type={pendingFile.type || "video/mp4"} />
                                    Trình duyệt không hỗ trợ phát video.
                                  </video>
                                ) : currentYoutubeId ? (
                                  <div className="ls-video-embed">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${currentYoutubeId}?rel=0`}
                                      title="Lesson video preview"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : (
                                  <video controls className="ls-video-player">
                                    <source src={currentVideoResource?.url} type={currentVideoResource?.mime_type || "video/mp4"} />
                                    Trình duyệt không hỗ trợ phát video.
                                  </video>
                                )}
                              </div>
                            ) : null}

                            {/* Attachments preview */}
                            {hasPreviewAttachments ? (
                              <div className="ls-preview-attachments">
                                <div className="ls-section-label">Tài liệu đính kèm</div>
                                {pendingAttachmentFile && (
                                  <div className="ls-attachment-item ls-attachment-item--draft">
                                    <div className="ls-attachment-item__left">
                                      {pendingAttachmentFile.type.startsWith("image/") ? <Image size={16} /> : <File size={16} />}
                                      <span className="ls-attachment-item__name">{pendingAttachmentFile.name}</span>
                                    </div>
                                    <span className="ls-attachment-badge--draft">Bản nháp chưa lưu</span>
                                  </div>
                                )}
                                {otherResources.length > 0
                                  ? otherResources.map((r) => (
                                      <div key={r.id} className="ls-attachment-item">
                                        <div className="ls-attachment-item__left">
                                          {(r.mime_type || "").startsWith("image/") ? <Image size={16} /> : <FileText size={16} />}
                                          <span className="ls-attachment-item__name">{r.filename || "Tài liệu"}</span>
                                          {r.size_bytes ? <span className="ls-attachment-item__size">{formatFileSize(r.size_bytes)}</span> : null}
                                        </div>
                                        <a
                                          href={r.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="ls-attachment-link"
                                        >
                                          <LinkIcon size={14} />
                                          Mở
                                        </a>
                                      </div>
                                    ))
                                  : null}
                              </div>
                            ) : null}

                            {/* Rich content preview */}
                            {hasRichContent ? (
                              <div className="ls-preview-content">
                                <div className="ls-rich-preview" dangerouslySetInnerHTML={{ __html: richHtml }} />
                              </div>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}
