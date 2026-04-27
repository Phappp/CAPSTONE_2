// TeacherLessonStudioPage.tsx
import { useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Plus,
  Timer,
  Send,
  Volume2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { ASSIGNMENTS_API } from "../../api/assignments";
import { COURSES_API } from "../../api/courses";
import { url } from "../../baseUrl";
import { useAuth } from "../../contexts/Auth";
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
import "./TeacherDashboard.css";

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
        list.find((r) => (r.filename || "").toLowerCase().endsWith(".html"));
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
          const htmlText = await viewRes.text().catch(() => "");
          setRichHtml(htmlText || "");
          setInitialRichHtml(htmlText || "");
        }
      } else {
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
        // Dùng Blob + filename để tránh phụ thuộc File constructor (một số môi trường có thể không hỗ trợ ổn định).
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
      // setSuccessMessage("Đã chọn loại nội dung cho bài học.");
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
  const contentHtmlResource = resources.find((r) => (r.mime_type || "").includes("text/html")) || null;
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
  const otherResources = resources.filter((r) => !isLikelyVideoResource(r) && !(r.mime_type || "").includes("text/html"));
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

  const quizDraftChanged = useMemo(
    () => JSON.stringify(quizQuestionsDraft) !== JSON.stringify(savedQuizQuestions),
    [quizQuestionsDraft, savedQuizQuestions]
  );
  const lessonMetaDirty = useMemo(() => {
    return (
      lessonTitle.trim() !== initialLessonTitle.trim() ||
      lessonDescription.trim() !== initialLessonDescription.trim() ||
      selectedModuleId !== initialModuleId ||
      (showNewModuleInput && pendingNewModuleTitle.trim().length > 0)
    );
  }, [
    lessonTitle,
    initialLessonTitle,
    lessonDescription,
    initialLessonDescription,
    selectedModuleId,
    initialModuleId,
    showNewModuleInput,
    pendingNewModuleTitle,
  ]);
  const studioContentDirty = useMemo(() => richHtml.trim() !== initialRichHtml.trim(), [richHtml, initialRichHtml]);
  if (!courseId || !lessonId || Number.isNaN(courseId) || Number.isNaN(lessonId)) return null;

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <div className="back-nav">
              <button
                type="button"
                className="back-btn"
                onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}
              >
                <ArrowLeft size={18} />
                Nội dung khóa học
              </button>
              {/* <button
                type="button"
                className="btn-secondary"
                style={{ marginLeft: "0.5rem", width: "auto" }}
                onClick={() => void createModuleFromStudio()}
                disabled={saving || loading}
                title="Thêm chương mới"
              >
                <Plus size={16} />
                Thêm chương
              </button> */}
            </div>
            {/* <h1 className="dashboard-title" style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}
                style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                title="Đi tới nội dung khóa học"
              >
                {courseTitle}
              </button>
              <ChevronRight size={16} color="#94a3b8" />
              <button
                type="button"
                onClick={() => navigate(`/teacher/courses/${courseId}/content?tab=content`)}
                style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                title="Đi tới chương trong content builder"
              >
                {selectedModuleTitle}
              </button>
              <ChevronRight size={16} color="#94a3b8" />
              <button
                type="button"
                onClick={() => navigate(`/teacher/courses/${courseId}/lessons/${lessonId}/studio`)}
                style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                title="Mở studio của mục hiện tại"
              >
                {lessonDisplayLabel}
              </button>
            </h1> */}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="error-box" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="success-box" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }}>
            <CheckCircle size={18} />
            {successMessage}
          </div>
        )}
        {isReadOnlyByReview && (
          <div className="warning-message" style={{ marginBottom: "1rem" }}>
            Khóa học đang chờ duyệt. Bạn chỉ có thể chỉnh sửa những mục đang bị từ chối.
          </div>
        )}

        {shouldPickLessonType ? (
          <div className="lesson-type-picker-screen">
            <div className="lesson-type-picker-title">Chọn loại nội dung cho bài học mới</div>
            <div className="lesson-type-picker-actions">
              <button
                type="button"
                className="lesson-type-choice-btn choice-content"
                disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                onClick={() => void chooseNewLessonType("text")}
              >
                Bài học
              </button>
              <button
                type="button"
                className="lesson-type-choice-btn choice-quiz"
                disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                onClick={() => void chooseNewLessonType("quiz")}
              >
                Quizz
              </button>
              <button
                type="button"
                className="lesson-type-choice-btn choice-assignment"
                disabled={isReadOnlyByReview || selectingLessonType || saving || loading}
                onClick={() => void chooseNewLessonType("assignment")}
              >
                Bài tập
              </button>
            </div>
          </div>
        ) : shouldPickAssignmentKind ? (
          <div className="lesson-type-picker-screen">
            <div className="lesson-type-picker-title">Chọn dạng bài tập</div>
            <div className="lesson-type-picker-actions">
              <button
                type="button"
                className="lesson-type-choice-btn choice-assignment"
                disabled={isReadOnlyByReview || saving || loading}
                onClick={() => chooseAssignmentKind("file_prompt")}
              >
                Tự luận
              </button>
              <button
                type="button"
                className="lesson-type-choice-btn choice-quiz"
                disabled={isReadOnlyByReview || saving || loading}
                onClick={() => chooseAssignmentKind("short_answer")}
              >
                Trả lời ngắn
              </button>
            </div>
          </div>
        ) : (
        /* Two column layout */
        <div className="studio-two-column">
          {/* Left column - Editor */}
          <div className="studio-left-column">
            {!shouldPickLessonType && (
            <>
            {/* Block 1 - Lesson Info */}
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

            {/* Block 2 + 3 - Content editor */}
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

            </>
            )}
          </div>

          {/* Right column - Preview */}
          {!shouldPickLessonType && (
          <div className="studio-right-column">
            <div className="studio-card preview-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <Eye size={18} />
                  <h2>Xem như học viên</h2>
                </div>
              </div>
              <div className="studio-card-content">
                {loading ? (
                  <div className="preview-loading">
                    <Loader2 size={32} className="spin" />
                    <p>Đang tải preview...</p>
                  </div>
                ) : (
                  <>
                    {/* Lesson header */}
                    <div className="preview-lesson-header">
                      <div
                        style={{
                          fontSize: "0.98rem",
                          color: "#334155",
                          marginBottom: "0.35rem",
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {truncateLabel(moduleOptions.find((m) => m.id === selectedModuleId)?.title || "Chưa chọn chương")}
                        <span
                          aria-hidden="true"
                          style={{
                            margin: "0 0.4rem",
                            fontSize: "1.2rem",
                            color: "#cbd5e1",
                            fontWeight: 700,
                            verticalAlign: "middle",
                          }}
                        >
                          ›
                        </span>
                        {truncateLabel(lessonTitle || lesson?.title || `Bài học #${lessonId}`)}
                      </div>
                      {/* <h3 className="preview-title">{lessonTitle || lesson?.title || `Bài học #${lessonId}`}</h3> */}
                      {hasLessonDescription ? <p className="preview-description">{lessonDescription?.trim()}</p> : null}
                    </div>

                    {activeSection === "quiz" ? (
                      <div className="preview-content">
                        {(quizPreviewConfig.passing_score != null || quizRemainingSeconds != null) && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                              gap: 8,
                              marginBottom: 10,
                            }}
                          >
                            {quizPreviewConfig.passing_score != null && Number.isFinite(quizPreviewConfig.passing_score) && (
                              <div className="attachment-item" style={{ marginBottom: 0 }}>
                                <div style={{ width: "100%" }}>
                                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Điểm đạt</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                    {`${quizPreviewConfig.passing_score}%`}
                                  </div>
                                </div>
                              </div>
                            )}
                            {quizRemainingSeconds != null && (
                              <div className="attachment-item" style={{ marginBottom: 0 }}>
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
                                <div key={`preview-quiz-${idx}`} className="attachment-item" style={{ alignItems: "flex-start" }}>
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
                      <div className="preview-content">
                        {!assignmentPreview ? null : (
                          <div style={{ display: "grid", gap: 10 }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                gap: 8,
                              }}
                            >
                              {assignmentPreview.due_date && (
                                <div className="attachment-item" style={{ marginBottom: 0 }}>
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
                              <div className="attachment-item" style={{ marginBottom: 0 }}>
                                <div style={{ width: "100%" }}>
                                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Thang điểm</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                    {assignmentPreview.max_score}
                                  </div>
                                </div>
                              </div>
                              {assignmentPreview.passing_score != null && (
                                <div className="attachment-item" style={{ marginBottom: 0 }}>
                                  <div style={{ width: "100%" }}>
                                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Điểm đạt</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                      {assignmentPreview.passing_score}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {assignmentPreview.allow_resubmission && (
                                <div className="attachment-item" style={{ marginBottom: 0 }}>
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
                              <div
                                className="attachment-item"
                                style={{ alignItems: "flex-start", background: "#ffffff", borderColor: "#e2e8f0" }}
                              >
                                <div style={{ width: "100%" }}>
                                  <div
                                    className="rich-preview"
                                    dangerouslySetInnerHTML={{
                                      __html: assignmentDescriptionHtml,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : null}

                            {hasAssignmentAttachments ? (
                              <div className="attachment-item" style={{ alignItems: "flex-start" }}>
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
                                        <a href={a.signed_url} target="_blank" rel="noreferrer" className="attachment-link">
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
                              <div className="attachment-item" style={{ alignItems: "flex-start" }}>
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
                          <div className="preview-video">
                            {pendingFile && pendingFilePreviewUrl && isLikelyVideoFile(pendingFile) ? (
                              <video controls className="video-player">
                                <source src={pendingFilePreviewUrl} type={pendingFile.type || "video/mp4"} />
                                Trình duyệt không hỗ trợ phát video.
                              </video>
                            ) : currentYoutubeId ? (
                              <div className="video-embed">
                                <iframe
                                  src={`https://www.youtube.com/embed/${currentYoutubeId}?rel=0`}
                                  title="Lesson video preview"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ) : (
                              <video controls className="video-player">
                                <source src={currentVideoResource?.url} type={currentVideoResource?.mime_type || "video/mp4"} />
                                Trình duyệt không hỗ trợ phát video.
                              </video>
                            )}
                          </div>
                        ) : null}

                        {/* Attachments preview */}
                        {hasPreviewAttachments ? (
                          <div className="preview-attachments">
                            <div className="section-label">Tài liệu đính kèm</div>
                            {pendingAttachmentFile && (
                              <div className="attachment-item attachment-item-draft">
                                <div className="attachment-left">
                                  {pendingAttachmentFile.type.startsWith("image/") ? <Image size={16} /> : <File size={16} />}
                                  <span className="attachment-name">{pendingAttachmentFile.name}</span>
                                </div>
                                <span className="attachment-badge-draft">Bản nháp chưa lưu</span>
                              </div>
                            )}
                            {otherResources.length > 0
                              ? otherResources.map((r) => (
                                  <div key={r.id} className="attachment-item">
                                    <div className="attachment-left">
                                      {(r.mime_type || "").startsWith("image/") ? <Image size={16} /> : <FileText size={16} />}
                                      <span className="attachment-name">{r.filename || "Tài liệu"}</span>
                                      {r.size_bytes ? <span className="attachment-size">{formatFileSize(r.size_bytes)}</span> : null}
                                    </div>
                                    <a
                                      href={r.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="attachment-link"
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
                          <div className="preview-content">
                            <div
                              className="rich-preview"
                              dangerouslySetInnerHTML={{
                                __html: richHtml,
                              }}
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
        )}
      </div>

      <style>{`
        .studio-two-column {
          display: grid;
          grid-template-columns: minmax(0, 60%) minmax(0, 40%);
          gap: 1.5rem;
        }

        .lesson-type-picker-screen {
          min-height: calc(100vh - 260px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
        }

        .lesson-type-picker-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
        }

        .lesson-type-picker-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .lesson-type-choice-btn {
          min-width: 180px;
          padding: 0.95rem 1.25rem;
          border-radius: 14px;
          border: 1px solid transparent;
          font-size: 1.02rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .lesson-type-choice-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
          filter: brightness(0.98);
        }

        .lesson-type-choice-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .lesson-type-choice-btn.choice-content {
          background: #e0f2fe;
          border-color: #7dd3fc;
          color: #075985;
        }

        .lesson-type-choice-btn.choice-quiz {
          background: #ede9fe;
          border-color: #c4b5fd;
          color: #5b21b6;
        }

        .lesson-type-choice-btn.choice-assignment {
          background: #dcfce7;
          border-color: #86efac;
          color: #166534;
        }

        .studio-left-column,
        .studio-right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .studio-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .studio-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        }

        .studio-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .studio-card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .studio-card-title h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .studio-card-content {
          padding: 1.25rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .upload-section,
        .youtube-section {
          margin-bottom: 1rem;
        }

        .upload-row,
        .youtube-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .file-name {
          flex: 1;
          font-size: 0.85rem;
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progress-bar {
          margin-top: 0.5rem;
          height: 4px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .youtube-icon {
          color: #ff0000;
        }

        .section-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 0.75rem;
        }

        .current-video-section,
        .other-resources-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .current-video-item,
        .resource-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.75rem;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 0.5rem;
        }

        .video-info,
        .resource-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .video-name,
        .resource-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: #0f172a;
        }

        .video-size,
        .resource-size {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .resource-review-badge {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 0.14rem 0.48rem;
          letter-spacing: 0.02em;
        }

        .resource-review-badge.pending {
          color: #b45309;
          background: #ffedd5;
        }

        .resource-review-badge.approved {
          color: #166534;
          background: #dcfce7;
        }

        .resource-review-badge.rejected {
          color: #b91c1c;
          background: #fee2e2;
        }

        .reject-reason-trigger {
          width: 22px;
          height: 22px;
          border: 1px solid #fecaca;
          border-radius: 999px;
          background: #fff1f2;
          color: #b91c1c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
        }

        .reject-reason-trigger:hover {
          background: #ffe4e6;
        }

        .btn-resubmit-warning {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.42rem;
          min-height: 36px;
          padding: 0.45rem 0.8rem;
          border-radius: 10px;
          border: 1px solid #d97706;
          background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
          color: #ffffff;
          font-size: 0.84rem;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
        }

        .btn-resubmit-warning:hover:not(:disabled) {
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
          border-color: #b45309;
          box-shadow: 0 4px 10px rgba(180, 83, 9, 0.3);
          transform: translateY(-1px);
        }

        .btn-resubmit-warning:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(180, 83, 9, 0.24);
        }

        .btn-resubmit-warning:focus-visible {
          outline: 2px solid #fde68a;
          outline-offset: 2px;
        }

        .btn-resubmit-warning:disabled {
          cursor: not-allowed;
          opacity: 0.72;
          transform: none;
          box-shadow: none;
        }

        .resource-review-reason {
          font-size: 0.72rem;
          color: #b91c1c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 8px;
          padding: 0.22rem 0.45rem;
          margin-right: 0.5rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          color: #94a3b8;
        }

        .empty-state svg {
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 0.85rem;
          margin: 0;
        }

        .btn-icon-danger {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-icon-danger:hover:not(:disabled) {
          background: #fef2f2;
          color: #dc2626;
        }

        .editor-hint {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: #f1f5f9;
          border-radius: 10px;
          font-size: 0.75rem;
          color: #64748b;
        }

        /* Preview styles */
        .preview-card {
          position: sticky;
          top: 1rem;
        }

        .preview-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #94a3b8;
        }

        .preview-loading .spin {
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .preview-lesson-header {
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .preview-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.35rem;
        }

        .preview-description {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .preview-video {
          margin-bottom: 1rem;
        }

        .video-embed {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
        }

        .video-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .video-player {
          width: 100%;
          border-radius: 12px;
        }

        .empty-video {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
          color: #94a3b8;
        }

        .preview-attachments {
          margin-bottom: 1rem;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.65rem 0.75rem;
          margin-bottom: 0.5rem;
        }

        .attachment-item-draft {
          border-style: dashed;
          border-color: #94a3b8;
          background: #f8fafc;
        }

        .attachment-left {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          min-width: 0;
          flex-wrap: wrap;
        }

        .attachment-name {
          font-size: 0.84rem;
          font-weight: 500;
          color: #0f172a;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attachment-size {
          font-size: 0.72rem;
          color: #64748b;
        }

        .attachment-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: #0f172a;
          text-decoration: none;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.35rem 0.55rem;
        }

        .attachment-link:hover {
          background: #f1f5f9;
        }

        .attachment-badge-draft {
          font-size: 0.68rem;
          color: #334155;
          background: #e2e8f0;
          border-radius: 999px;
          padding: 0.2rem 0.45rem;
          white-space: nowrap;
        }

        .empty-attachments {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          color: #94a3b8;
          text-align: center;
          padding: 0.75rem;
          font-size: 0.82rem;
        }

        .preview-content {
          margin-top: 1rem;
        }

        .rich-preview {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1rem;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #334155;
        }

        .rich-preview .empty-content {
          color: #94a3b8;
          text-align: center;
          margin: 0;
        }

        .success-box {
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: #166534;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .studio-two-column {
            grid-template-columns: 1fr;
          }
          
          .preview-card {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .studio-card-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .upload-row,
          .youtube-row {
            flex-direction: column;
            align-items: stretch;
          }
          
          .file-name {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}