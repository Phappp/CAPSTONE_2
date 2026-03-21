import { useEffect, useMemo, useRef, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import toast, { Toaster } from "react-hot-toast";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type LessonType = "video" | "text";

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad2 = (x: number) => String(x).padStart(2, "0");
  if (h > 0) return `${h}:${pad2(m)}:${pad2(ss)}`;
  return `${m}:${pad2(ss)}`;
}

function parseYoutubeVideoId(inputUrl: string): string | null {
  try {
    const u = new URL(inputUrl.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || "";
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

let ytApiPromise: Promise<void> | null = null;
function ensureYoutubeIframeApiLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      const tick = () => {
        if ((window as any).YT?.Player) resolve();
        else setTimeout(tick, 50);
      };
      tick();
      return;
    }
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.body.appendChild(s);
  });
  return ytApiPromise;
}

type LessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  preview_url?: string | null;
};

type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  order_index: number;
};

type ModuleItem = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order_index: number;
  lessons: LessonItem[];
};

type ContentTree = {
  course_id: number;
  modules: ModuleItem[];
};

type NewLessonData = {
  title: string;
  description: string;
  lesson_type: LessonType;
  file?: File | null;
  youtubeUrl?: string | null;
};

type ResourceViewerState = {
  type: "youtube" | "pdf" | "image" | "video" | "text" | "other";
  youtubeId?: string;
  blobUrl?: string;
  filename: string;
  contentType: string;
  loading: boolean;
};

function SortableRow(props: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id, disabled: props.disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
}

function isModuleDragId(id: string) {
  return id.startsWith("module:");
}
function isLessonDragId(id: string) {
  return id.startsWith("lesson:");
}
function parseId(id: string) {
  const [, raw] = id.split(":");
  return Number(raw);
}

/** Thống nhất nhãn loại file cho lesson (hiển thị trên UI). */
function getLessonFileTypeLabel(mimeType: string | null, filename?: string | null): string {
  if (mimeType) {
    if (mimeType.startsWith("video/")) return "Video";
    if (mimeType.startsWith("image/")) return "Ảnh";
    if (mimeType.startsWith("audio/")) return "Âm thanh";
    if (mimeType.startsWith("text/")) return "Văn bản";
    if (mimeType === "application/pdf") return "PDF";
    if (
      mimeType.includes("wordprocessingml") ||
      mimeType === "application/msword"
    )
      return "Word";
  }
  if (filename) {
    const ext = filename.toLowerCase().split(".").pop() || "";
    if (ext === "pdf") return "PDF";
    if (["mp4", "webm", "ogg", "mov", "m4v", "avi"].includes(ext)) return "Video";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "Ảnh";
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "Âm thanh";
    if (["doc", "docx"].includes(ext)) return "Word";
  }
  return "Tài liệu đính kèm";
}

// Component Resource Viewer Modal
function ResourceViewer({ state, onClose }: { state: ResourceViewerState; onClose: () => void }) {
  const getTitle = () => {
    switch (state.type) {
      case "youtube":
        return "Video YouTube";
      case "pdf":
        return "Tài liệu PDF";
      case "image":
        return "Hình ảnh";
      case "video":
        return "Video";
      case "text":
        return "Văn bản";
      default:
        return "Tài nguyên";
    }
  };

  const renderContent = () => {
    if (state.loading) {
      return (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
          Đang tải...
        </div>
      );
    }

    switch (state.type) {
      case "youtube":
        return state.youtubeId ? (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${state.youtubeId}?autoplay=1&rel=0`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        ) : null;

      case "pdf":
        return state.blobUrl ? (
          <iframe
            title={state.filename}
            src={state.blobUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        ) : null;

      case "image":
        return state.blobUrl ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={state.blobUrl}
              alt={state.filename}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        ) : null;

      case "video":
        return state.blobUrl ? (
          <video
            controls
            autoPlay
            style={{ width: "100%", height: "100%" }}
            src={state.blobUrl}
            title={state.filename}
          >
            Trình duyệt không hỗ trợ phát video.
          </video>
        ) : null;

      case "text":
        return state.blobUrl ? (
          <iframe
            title={state.filename}
            src={state.blobUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        ) : null;

      default:
        return state.blobUrl ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
              Trình duyệt không xem được file này.
            </p>
            <a
              href={state.blobUrl}
              download={state.filename}
              className="primary-button"
              style={{ width: "auto" }}
            >
              Tải xuống
            </a>
          </div>
        ) : null;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: state.type === "youtube" || state.type === "video" ? 1200 : 1000,
          maxHeight: "90vh",
          background: state.type === "youtube" || state.type === "video" ? "#000" : "#fff",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: state.type === "youtube" || state.type === "video" ? "1px solid #333" : "1px solid #e5e7eb",
            background: state.type === "youtube" || state.type === "video" ? "#111" : "#fff",
            color: state.type === "youtube" || state.type === "video" ? "#fff" : "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontWeight: 600 }}>
              {getTitle()}
            </span>
            <span style={{
              fontSize: "0.85rem",
              color: state.type === "youtube" || state.type === "video" ? "#9ca3af" : "#6b7280"
            }}>
              {state.filename}
            </span>
          </div>
          <button
            type="button"
            className={state.type === "youtube" || state.type === "video" ? "primary-button" : "secondary-button"}
            style={{
              width: "auto",
              background: state.type === "youtube" || state.type === "video" ? "transparent" : undefined,
              borderColor: state.type === "youtube" || state.type === "video" ? "#333" : undefined,
              color: state.type === "youtube" || state.type === "video" ? "#fff" : undefined,
            }}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            background: state.type === "youtube" || state.type === "video" ? "#000" : "#fff",
            aspectRatio: state.type === "youtube" || state.type === "video" ? "16/9" : undefined,
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function CourseContentTreeEditor(props: {
  courseId: number;
  embedded?: boolean;
}) {
  const token = useMemo(() => getAccessToken(), []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<ContentTree | null>(null);

  const [newModule, setNewModule] = useState({ title: "", description: "" });
  const [newLesson, setNewLesson] = useState<Record<number, NewLessonData>>({});
  const [openAddModule, setOpenAddModule] = useState(false);
  const [openAddLesson, setOpenAddLesson] = useState<Record<number, boolean>>({});
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const [openResourceMenuLessonId, setOpenResourceMenuLessonId] = useState<number | null>(null);

  // State cho Resource Viewer
  const [resourceViewer, setResourceViewer] = useState<ResourceViewerState | null>(null);

  const [resourcesByLessonId, setResourcesByLessonId] = useState<
    Record<number, LessonResource[]>
  >({});
  const [durationByResourceId, setDurationByResourceId] = useState<Record<number, number>>({});
  const inFlightResources = useRef<Set<number>>(new Set());
  /** Tiến trình upload (0–85% = gửi file, 85% giữ khi backend xử lý, 100% chỉ khi xong hết rồi ẩn ngay). */
  const [uploadProgress, setUploadProgress] = useState<{ lessonId: number; percent: number } | null>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-lesson-actions-menu="root"]')) setOpenResourceMenuLessonId(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const computeYoutubeDurationSeconds = async (videoId: string): Promise<number | null> => {
    await ensureYoutubeIframeApiLoaded();
    const YT = (window as any).YT;
    if (!YT?.Player) return null;
    return await new Promise<number | null>((resolve) => {
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-9999px";
      host.style.top = "-9999px";
      host.style.width = "1px";
      host.style.height = "1px";
      document.body.appendChild(host);
      const player = new YT.Player(host, {
        height: "1",
        width: "1",
        videoId,
        playerVars: { controls: 0, autoplay: 0 },
        events: {
          onReady: () => {
            try {
              const d = Number(player.getDuration?.() ?? 0);
              resolve(Number.isFinite(d) && d > 0 ? d : null);
            } catch {
              resolve(null);
            } finally {
              try {
                player.destroy();
              } catch {
                // ignore
              }
              host.remove();
            }
          },
          onError: () => {
            try {
              player.destroy();
            } catch {
              // ignore
            }
            host.remove();
            resolve(null);
          },
        },
      });
      void player;
    });
  };

  const computeUploadedVideoDurationSeconds = async (resourceId: number): Promise<number | null> => {
    const viewUrl = `${url}${COURSES_API.viewLessonResource(props.courseId, resourceId)}`;
    const res = await fetch(viewUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      const duration = await new Promise<number | null>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = blobUrl;
        v.onloadedmetadata = () => {
          const d = Number(v.duration);
          resolve(Number.isFinite(d) && d > 0 ? d : null);
        };
        v.onerror = () => resolve(null);
      });
      return duration;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const ensureDurationForResource = async (r: LessonResource) => {
    if (durationByResourceId[r.id] != null) return;
    const ytId = parseYoutubeVideoId(r.url || "");
    if (ytId) {
      const d = await computeYoutubeDurationSeconds(ytId);
      if (d) setDurationByResourceId((prev) => ({ ...prev, [r.id]: d }));
      return;
    }
    const isVideo = (r.mime_type || "").startsWith("video/");
    if (!isVideo) return;
    const d = await computeUploadedVideoDurationSeconds(r.id);
    if (d) setDurationByResourceId((prev) => ({ ...prev, [r.id]: d }));
  };

  const saveTimer = useRef<number | null>(null);
  const scheduleReorderSave = (nextTree: ContentTree) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveReorder(nextTree).catch(() => { });
    }, 450);
  };

  const fetchTree = async () => {
    const res = await fetch(`${url}${COURSES_API.contentTree(props.courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải nội dung khóa học.");
    setTree(data as ContentTree);
  };

  const fetchLessonResources = async (lessonId: number) => {
    if (inFlightResources.current.has(lessonId)) return;
    inFlightResources.current.add(lessonId);
    const res = await fetch(
      `${url}${COURSES_API.listLessonResources(props.courseId, lessonId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải tài nguyên bài học.");
    setResourcesByLessonId((prev) => ({
      ...prev,
      [lessonId]: (data?.items || []) as LessonResource[],
    }));
    inFlightResources.current.delete(lessonId);
  };

  useEffect(() => {
    const latest = Object.values(resourcesByLessonId)
      .map((arr) => (Array.isArray(arr) && arr.length ? arr[0] : null))
      .filter(Boolean) as LessonResource[];
    for (const r of latest) {
      ensureDurationForResource(r).catch(() => { });
    }
  }, [resourcesByLessonId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTree()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
  }, [props.courseId]);

  useEffect(() => {
    if (!tree) return;
    const lessonIds = tree.modules.flatMap((m) => m.lessons.map((l) => l.id));
    for (const id of lessonIds) {
      if (resourcesByLessonId[id] !== undefined) continue;
      if (inFlightResources.current.has(id)) continue;
      fetchLessonResources(id).catch(() => {
        inFlightResources.current.delete(id);
      });
    }
  }, [tree]);

  const saveReorder = async (nextTree: ContentTree) => {
    setSaving(true);
    try {
      const modulesPayload = nextTree.modules.map((m, idx) => ({
        id: m.id,
        order_index: idx + 1,
      }));
      const lessonsPayload = nextTree.modules.flatMap((m) =>
        m.lessons.map((l, idx) => ({
          id: l.id,
          module_id: m.id,
          order_index: idx + 1,
        }))
      );

      const res = await fetch(`${url}${COURSES_API.reorderContent(props.courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ modules: modulesPayload, lessons: lessonsPayload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể lưu thứ tự.");
      }
      toast.success("Đã lưu thứ tự");
    } catch (e: any) {
      toast.error(e?.message || "Lưu thứ tự thất bại");
    } finally {
      setSaving(false);
    }
  };

  const createModule = async () => {
    const nextTitle = newModule.title.trim() || `Chương ${(tree?.modules?.length ?? 0) + 1}`;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.createModule(props.courseId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: nextTitle,
          description: newModule.description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Không thể tạo module.");
      setNewModule({ title: "", description: "" });
      setOpenAddModule(false);
      await fetchTree();
      toast.success("Đã thêm chương mới");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const createLesson = async (moduleId: number) => {
    const payload = newLesson[moduleId] || {
      title: "",
      description: "",
      lesson_type: "text" as const,
      file: null,
      youtubeUrl: null
    };

    if (!payload.title.trim()) {
      toast.error("Vui lòng nhập tên bài học.");
      return;
    }

    if (payload.file && payload.youtubeUrl) {
      toast.error("Chỉ được chọn một loại tài nguyên (file hoặc YouTube).");
      return;
    }

    setSaving(true);
    try {
      // Tạo bài học trước
      const res = await fetch(`${url}${COURSES_API.createLesson(props.courseId, moduleId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          lesson_type: "text" as LessonType,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Không thể tạo bài học.");

      const lessonId = Number(data?.id);

      // Reset form
      setNewLesson((prev) => ({
        ...prev,
        [moduleId]: { title: "", description: "", lesson_type: "text", file: null, youtubeUrl: null },
      }));
      setOpenAddLesson((prev) => ({ ...prev, [moduleId]: false }));
      await fetchTree();

      // Xử lý tài nguyên sau khi tạo bài học
      if (lessonId) {
        setResourcesByLessonId((prev) => ({ ...prev, [lessonId]: prev[lessonId] ?? [] }));

        if (payload.file) {
          // Upload file nếu có
          await uploadLessonFile(lessonId, payload.file);
          toast.success("Đã thêm bài học và upload file");
        } else if (payload.youtubeUrl) {
          // Gắn YouTube nếu có
          const ytUrl = payload.youtubeUrl;
          const ytRes = await fetch(`${url}${COURSES_API.createYoutubeLessonResource(props.courseId, lessonId)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ youtube_url: ytUrl.trim(), title: "YouTube" }),
          });

          const ytData = await ytRes.json().catch(() => ({}));
          if (!ytRes.ok) throw new Error(ytData?.message || "Không thể gắn link YouTube.");

          await fetchLessonResources(lessonId);
          toast.success("Đã thêm bài học và gắn YouTube");
        } else {
          toast.success("Đã thêm bài học");
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const renameModule = async (moduleId: number, title: string) => {
    const next = title.trim();
    if (!next) return;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.updateModule(props.courseId, moduleId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể cập nhật module.");
      }
      await fetchTree();
      toast.success("Đã cập nhật chương");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const renameLesson = async (lessonId: number, title: string) => {
    const next = title.trim();
    if (!next) return;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.updateLesson(props.courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể cập nhật bài học.");
      }
      await fetchTree();
      toast.success("Đã cập nhật bài học");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (moduleId: number) => {
    const ok = window.confirm("Xóa module này? Tất cả bài học trong module sẽ bị xóa.");
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteModule(props.courseId, moduleId)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể xóa module.");
      }
      await fetchTree();
      toast.success("Đã xóa module");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId: number) => {
    const ok = window.confirm("Xóa bài học này?");
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteLesson(props.courseId, lessonId)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể xóa bài học.");
      }
      await fetchTree();
      toast.success("Đã xóa bài học");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const attachYoutubeLink = async (lessonId: number) => {
    const ytUrl = window.prompt("Dán link YouTube vào đây (vd: https://youtu.be/abc123):");
    if (!ytUrl) return;
    const vid = parseYoutubeVideoId(ytUrl);
    if (!vid) {
      toast.error("Link YouTube không hợp lệ.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.createYoutubeLessonResource(props.courseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ youtube_url: ytUrl.trim(), title: "YouTube" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Không thể gắn link YouTube.");
      await fetchLessonResources(lessonId);
      toast.success("Đã gắn link YouTube");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const fetchLessonResourceList = async (lessonId: number): Promise<LessonResource[]> => {
    const res = await fetch(
      `${url}${COURSES_API.listLessonResources(props.courseId, lessonId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải tài nguyên bài học.");
    return (data?.items || []) as LessonResource[];
  };

  const deleteLessonResourceById = async (resourceId: number) => {
    const res = await fetch(
      `${url}${COURSES_API.deleteLessonResource(props.courseId, resourceId)}`,
      {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = String(data?.message || "");
      if (msg.includes("Không tìm thấy tài nguyên")) return;
      throw new Error(data?.message || "Không thể xóa tài nguyên.");
    }
  };

  const uploadLessonFile = async (lessonId: number, file: File) => {
    setSaving(true);
    setUploadProgress({ lessonId, percent: 0 });
    const uploadUrl = `${url}${COURSES_API.uploadLessonResource(props.courseId, lessonId)}`;
    const form = new FormData();
    form.append("file", file);

    const before = await fetchLessonResourceList(lessonId).catch(() => []);
    const hadAny = before.length > 0;

    try {
      const result = await new Promise<{ ok: boolean; data: Record<string, unknown>; status: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 85);
            setUploadProgress((prev) => (prev?.lessonId === lessonId ? { lessonId, percent } : prev));
          }
        });
        xhr.addEventListener("load", () => {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(xhr.responseText || "{}");
          } catch {
            // ignore
          }
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, data, status: xhr.status });
        });
        xhr.addEventListener("error", () => reject(new Error("Upload thất bại.")));
        xhr.addEventListener("abort", () => reject(new Error("Đã hủy.")));
        xhr.open("POST", uploadUrl);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(form);
      });

      if (!result.ok) throw new Error((result.data?.message as string) || "Upload thất bại.");
      setUploadProgress({ lessonId, percent: 85 });
      const after = await fetchLessonResourceList(lessonId);
      const keepId = after.length ? after[0].id : null;
      for (const r of after) {
        if (keepId && r.id === keepId) continue;
        await deleteLessonResourceById(r.id);
      }
      await fetchLessonResources(lessonId);
      setUploadProgress({ lessonId, percent: 100 });
      setTimeout(() => setUploadProgress(null), 80);
      toast.success(hadAny ? "Đã thay file đính kèm" : "Đã upload tài nguyên");
    } catch (e: any) {
      setUploadProgress(null);
      toast.error(e?.message || "Upload thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLessonPreview = async (resourceId: number, lessonId: number, file: File) => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `${url}${COURSES_API.uploadLessonResourcePreview(props.courseId, resourceId)}`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Upload thumbnail thất bại.");
      await fetchLessonResources(lessonId);
      toast.success("Đã cập nhật thumbnail");
    } catch (e: any) {
      toast.error(e?.message || "Upload thumbnail thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resourceId: number, lessonId: number) => {
    const ok = window.confirm("Xóa tài nguyên này?");
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteLessonResource(props.courseId, resourceId)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = String(data?.message || "");
        if (msg.includes("Không tìm thấy tài nguyên")) {
          await fetchLessonResources(lessonId);
          toast.success("Đã xóa tài nguyên");
          return;
        }
        throw new Error(data?.message || "Không thể xóa tài nguyên.");
      }
      await fetchLessonResources(lessonId);
      toast.success("Đã xóa tài nguyên");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const replaceLessonFile = async (lessonId: number, _existingResourceId: number, file: File) => {
    await uploadLessonFile(lessonId, file);
  };

  const openResource = async (resource: LessonResource) => {
    if (!resource) return;

    // Kiểm tra nếu là YouTube
    const ytId = parseYoutubeVideoId(resource.url || "");
    if (ytId) {
      setResourceViewer({
        type: "youtube",
        youtubeId: ytId,
        filename: resource.filename || "YouTube Video",
        contentType: resource.mime_type || "",
        loading: false,
      });
      return;
    }

    // Xử lý các loại file khác
    setResourceViewer({
      type: "other",
      filename: resource.filename || "File",
      contentType: resource.mime_type || "",
      loading: true,
    });

    const viewUrl = `${url}${COURSES_API.viewLessonResource(props.courseId, resource.id)}`;

    try {
      const res = await fetch(viewUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể mở tài nguyên.");
      }

      let contentType = res.headers.get("Content-Type") || "";
      let blob = await res.blob();
      const filename = resource.filename || "file";
      const fnLower = filename.toLowerCase();

      // Xác định loại file dựa vào content-type hoặc extension
      let type: ResourceViewerState["type"] = "other";

      const isPdf = contentType.startsWith("application/pdf") || fnLower.endsWith(".pdf");
      const isImage = contentType.startsWith("image/");
      const isVideo = contentType.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v|avi)$/i.test(fnLower);
      const isText = contentType.startsWith("text/");

      if (isPdf) {
        type = "pdf";
        if (!contentType.startsWith("application/pdf")) {
          contentType = "application/pdf";
          blob = new Blob([blob], { type: "application/pdf" });
        }
      } else if (isImage) {
        type = "image";
      } else if (isVideo) {
        type = "video";
        if (!contentType.startsWith("video/")) {
          const videoMime: Record<string, string> = {
            ".mp4": "video/mp4", ".webm": "video/webm", ".ogg": "video/ogg",
            ".mov": "video/quicktime", ".m4v": "video/x-m4v", ".avi": "video/x-msvideo",
          };
          const ext = fnLower.match(/\.(mp4|webm|ogg|mov|m4v|avi)$/)?.[0] || ".mp4";
          contentType = videoMime[ext] || "video/mp4";
          blob = new Blob([blob], { type: contentType });
        }
      } else if (isText) {
        type = "text";
      }

      const blobUrl = URL.createObjectURL(blob);
      setResourceViewer({
        type,
        blobUrl,
        filename,
        contentType,
        loading: false,
      });
    } catch (e: any) {
      setResourceViewer(null);
      toast.error(e?.message || "Không thể mở tài nguyên.");
    }
  };

  const closeResourceViewer = () => {
    if (resourceViewer?.blobUrl) {
      URL.revokeObjectURL(resourceViewer.blobUrl);
    }
    setResourceViewer(null);
  };

  const findLessonLocation = (lessonId: number) => {
    if (!tree) return null;
    for (const m of tree.modules) {
      const idx = m.lessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0) return { moduleId: m.id, index: idx };
    }
    return null;
  };

  const onDragOver = (event: DragOverEvent) => {
    if (!tree) return;
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;

    if (isLessonDragId(activeId)) {
      const lessonId = parseId(activeId);
      const from = findLessonLocation(lessonId);
      if (!from) return;

      let targetModuleId: number | null = null;
      if (isLessonDragId(overId)) {
        const overLessonId = parseId(overId);
        const to = findLessonLocation(overLessonId);
        targetModuleId = to?.moduleId ?? null;
      } else if (isModuleDragId(overId)) {
        targetModuleId = parseId(overId);
      }
      if (!targetModuleId || targetModuleId === from.moduleId) return;

      const fromModuleIdx = tree.modules.findIndex((m) => m.id === from.moduleId);
      const toModuleIdx = tree.modules.findIndex((m) => m.id === targetModuleId);
      if (fromModuleIdx < 0 || toModuleIdx < 0) return;

      const next = structuredClone(tree) as ContentTree;
      const [moved] = next.modules[fromModuleIdx].lessons.splice(from.index, 1);
      moved.module_id = targetModuleId;
      next.modules[toModuleIdx].lessons.push(moved);
      setTree(next);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!tree) return;
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;

    if (isModuleDragId(activeId) && isModuleDragId(overId)) {
      const activeModuleId = parseId(activeId);
      const overModuleId = parseId(overId);
      const oldIndex = tree.modules.findIndex((m) => m.id === activeModuleId);
      const newIndex = tree.modules.findIndex((m) => m.id === overModuleId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = { ...tree, modules: arrayMove(tree.modules, oldIndex, newIndex) };
      setTree(next);
      scheduleReorderSave(next);
      return;
    }

    if (isLessonDragId(activeId) && isLessonDragId(overId)) {
      const activeLessonId = parseId(activeId);
      const overLessonId = parseId(overId);
      const from = findLessonLocation(activeLessonId);
      const to = findLessonLocation(overLessonId);
      if (!from || !to) return;

      const fromModuleIdx = tree.modules.findIndex((m) => m.id === from.moduleId);
      const toModuleIdx = tree.modules.findIndex((m) => m.id === to.moduleId);
      if (fromModuleIdx < 0 || toModuleIdx < 0) return;

      const next = structuredClone(tree) as ContentTree;
      if (from.moduleId === to.moduleId) {
        next.modules[fromModuleIdx].lessons = arrayMove(
          next.modules[fromModuleIdx].lessons,
          from.index,
          to.index
        );
      } else {
        const [moved] = next.modules[fromModuleIdx].lessons.splice(from.index, 1);
        moved.module_id = to.moduleId;
        next.modules[toModuleIdx].lessons.splice(to.index, 0, moved);
      }

      setTree(next);
      scheduleReorderSave(next);
      return;
    }

    if (isLessonDragId(activeId) && isModuleDragId(overId)) {
      const lessonId = parseId(activeId);
      const targetModuleId = parseId(overId);
      const from = findLessonLocation(lessonId);
      if (!from) return;
      if (from.moduleId === targetModuleId) return;
      const fromModuleIdx = tree.modules.findIndex((m) => m.id === from.moduleId);
      const toModuleIdx = tree.modules.findIndex((m) => m.id === targetModuleId);
      if (fromModuleIdx < 0 || toModuleIdx < 0) return;
      const next = structuredClone(tree) as ContentTree;
      const [moved] = next.modules[fromModuleIdx].lessons.splice(from.index, 1);
      moved.module_id = targetModuleId;
      next.modules[toModuleIdx].lessons.push(moved);
      setTree(next);
      scheduleReorderSave(next);
    }
  };

  const moduleIds = (tree?.modules || []).map((m) => `module:${m.id}`);

  function IconButton(props: {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        className="secondary-button"
        style={{
          width: "auto",
          padding: "0.35rem 0.5rem",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
        }}
        title={props.title}
        aria-label={props.title}
        onClick={props.onClick}
        disabled={props.disabled}
      >
        {props.children}
      </button>
    );
  }

  function PlusIcon() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function CloseIcon() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 6 6 18M6 6l12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function FilePreviewIcon() {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="9"
          cy="10"
          r="2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M7 17l3-3 2 2 3-3 3 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function DeleteIcon() {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 3h6l1 2h4v2H4V5h4l1-2Z"
          fill="currentColor"
        />
        <path
          d="M6 9h12l-1 10H7L6 9Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  function YoutubeIcon() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
          fill="currentColor"
        />
        <path
          d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          fill="white"
        />
      </svg>
    );
  }

  return (
    <div>
      {props.embedded ? null : <Toaster position="top-right" />}

      {/* Resource Viewer Modal - dùng chung cho tất cả các loại */}
      {resourceViewer && (
        <ResourceViewer
          state={resourceViewer}
          onClose={closeResourceViewer}
        />
      )}

      <div
        style={{
          marginTop: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          {error ? (
            <div style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{error}</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
              {uploadProgress !== null ? (
                <>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                    aria-hidden
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: "rotate(-90deg)" }}>
                      <circle
                        cx="11"
                        cy="11"
                        r="9"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="11"
                        cy="11"
                        r="9"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 9}
                        strokeDashoffset={2 * Math.PI * 9 * (1 - uploadProgress.percent / 100)}
                        style={{ transition: "stroke-dashoffset 0.15s ease-out" }}
                      />
                    </svg>
                  </span>
                  <span>Đang tải lên… {uploadProgress.percent}%</span>
                </>
              ) : loading ? (
                "Đang tải nội dung…"
              ) : saving ? (
                "Đang lưu thay đổi…"
              ) : (
                ""
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <IconButton
            title={openAddModule ? "Đóng tạo chương" : "Tạo chương mới"}
            onClick={() => setOpenAddModule((v) => !v)}
            disabled={saving}
          >
            {openAddModule ? <CloseIcon /> : <PlusIcon />}
            <span style={{ fontWeight: 700 }}>{openAddModule ? "Đóng" : "Chương"}</span>
          </IconButton>
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "0.75rem",
        }}
      >
        {openAddModule ? (
          <div
            style={{
              border: "1px dashed #d1d5db",
              borderRadius: 12,
              padding: "0.75rem",
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Thêm chương mới</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr) auto",
                gap: "0.5rem",
              }}
            >
              <input
                className="form-input"
                placeholder={`Tên chương (mặc định: Chương ${(tree?.modules?.length ?? 0) + 1})`}
                value={newModule.title}
                onChange={(e) => setNewModule((p) => ({ ...p, title: e.target.value }))}
                disabled={saving}
              />
              <input
                className="form-input"
                placeholder="Mô tả (không bắt buộc)"
                value={newModule.description}
                onChange={(e) => setNewModule((p) => ({ ...p, description: e.target.value }))}
                disabled={saving}
              />
              <button
                type="button"
                className="primary-button"
                style={{ width: "auto" }}
                onClick={createModule}
                disabled={saving}
              >
                Lưu chương
              </button>
            </div>
          </div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
            {(tree?.modules || []).map((m, moduleIdx) => (
              <SortableRow key={m.id} id={`module:${m.id}`}>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "0.9rem",
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.1rem 0.4rem",
                          borderRadius: 999,
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontWeight: 700,
                        }}
                      >
                        Chương {moduleIdx + 1}
                      </span>
                      {editingModuleId === m.id ? (
                        <input
                          className="form-input"
                          style={{ width: 320, maxWidth: "100%" }}
                          defaultValue={m.title}
                          autoFocus
                          onBlur={(e) => {
                            const next = e.target.value;
                            if (next.trim() && next.trim() !== m.title) renameModule(m.id, next);
                            setEditingModuleId(null);
                          }}
                          disabled={saving}
                        />
                      ) : (
                        <div
                          style={{ fontWeight: 700, cursor: "text" }}
                          onDoubleClick={() => {
                            if (saving) return;
                            setEditingLessonId(null);
                            setEditingModuleId(m.id);
                          }}
                        >
                          {m.title}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <IconButton
                        title="Xóa chương"
                        onClick={() => deleteModule(m.id)}
                        disabled={saving}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        title={collapsedModules[m.id] ? "Mở rộng chương" : "Thu gọn chương"}
                        onClick={() =>
                          setCollapsedModules((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                        }
                        disabled={saving}
                      >
                        {collapsedModules[m.id] ? "＋" : "−"}
                      </IconButton>
                    </div>
                  </div>

                  {!collapsedModules[m.id] && (
                    <div style={{ marginTop: "0.6rem", paddingLeft: "0.5rem" }}>
                      <SortableContext
                        items={m.lessons.map((l) => `lesson:${l.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                          {m.lessons.map((l, lessonIdx) => {
                            const lessonResources = resourcesByLessonId[l.id];
                            const lessonList = lessonResources ?? [];
                            const latestResource = lessonList.length ? lessonList[0] : null;
                            const hasResource = !!latestResource;
                            const resourcesLoading = lessonResources === undefined;
                            const ytId = latestResource ? parseYoutubeVideoId(latestResource.url || "") : null;
                            const ytThumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null;
                            const durationLabel = latestResource
                              ? formatDuration(durationByResourceId[latestResource.id])
                              : null;
                            return (
                              <SortableRow key={l.id} id={`lesson:${l.id}`}>
                                <div
                                  style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    padding: "1rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "1rem",
                                    alignItems: "stretch",
                                  }}
                                >
                                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        width: 120,
                                        height: 72,
                                        borderRadius: 10,
                                        background: "#f3f4f6",
                                        overflow: "hidden",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {resourcesLoading ? (
                                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#9ca3af" }}>
                                          …
                                        </div>
                                      ) : hasResource ? (
                                        <button
                                          type="button"
                                          onClick={() => latestResource && openResource(latestResource)}
                                          disabled={saving || !latestResource}
                                          style={{ width: "100%", height: "100%", padding: 0, border: "none", cursor: saving ? "not-allowed" : "pointer", background: "none", display: "block" }}
                                        >
                                          <div style={{ width: "100%", height: "100%", position: "relative" }}>
                                            {ytThumb ? (
                                              <img
                                                src={ytThumb}
                                                alt=""
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                loading="lazy"
                                              />
                                            ) : latestResource.preview_url ? (
                                              <img src={latestResource.preview_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                                            ) : latestResource.mime_type?.startsWith("image/") ? (
                                              <img src={latestResource.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                                            ) : (
                                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                                                <FilePreviewIcon />
                                              </div>
                                            )}
                                            {durationLabel ? (
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  right: 6,
                                                  bottom: 6,
                                                  background: "rgba(0,0,0,0.82)",
                                                  color: "white",
                                                  fontSize: "0.72rem",
                                                  fontWeight: 800,
                                                  padding: "0.12rem 0.35rem",
                                                  borderRadius: 6,
                                                  lineHeight: 1.2,
                                                  letterSpacing: "0.01em",
                                                  userSelect: "none",
                                                }}
                                              >
                                                {durationLabel}
                                              </div>
                                            ) : null}
                                          </div>
                                        </button>
                                      ) : (
                                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                                          <FilePreviewIcon />
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                        <span
                                          style={{
                                            fontSize: "0.75rem",
                                            padding: "0.15rem 0.5rem",
                                            borderRadius: "999px",
                                            background: "#eef2ff",
                                            color: "#3730a3",
                                            fontWeight: 700,
                                          }}
                                        >
                                          Bài {lessonIdx + 1}
                                        </span>
                                        {editingLessonId === l.id ? (
                                          <>
                                            <input
                                              className="form-input"
                                              style={{ width: 320, maxWidth: "100%" }}
                                              defaultValue={l.title}
                                              onBlur={(e) => {
                                                const next = e.target.value;
                                                if (next.trim() && next.trim() !== l.title) renameLesson(l.id, next);
                                                setEditingLessonId(null);
                                              }}
                                              disabled={saving}
                                            />
                                            <button
                                              type="button"
                                              className="secondary-button"
                                              style={{ width: "auto" }}
                                              onClick={() => setEditingLessonId(null)}
                                              disabled={saving}
                                            >
                                              Xong
                                            </button>
                                          </>
                                        ) : (
                                          <div
                                            style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", cursor: "text" }}
                                            onDoubleClick={() => {
                                              if (saving) return;
                                              setEditingModuleId(null);
                                              setEditingLessonId(l.id);
                                              if (!resourcesByLessonId[l.id]) fetchLessonResources(l.id).catch(() => { });
                                            }}
                                          >
                                            {l.title}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                        {resourcesLoading
                                          ? "Đang tải tài nguyên…"
                                          : uploadProgress?.lessonId === l.id
                                            ? `Đang tải lên… ${uploadProgress.percent}%`
                                            : hasResource
                                              ? (() => {
                                                const base = getLessonFileTypeLabel(
                                                  latestResource?.mime_type ?? null,
                                                  latestResource?.filename
                                                );
                                                const dur = latestResource
                                                  ? formatDuration(durationByResourceId[latestResource.id])
                                                  : null;
                                                return dur ? `${base} · ${dur}` : base;
                                              })()
                                              : "Chưa có file đính kèm"}
                                      </div>
                                      {!hasResource && !resourcesLoading && uploadProgress?.lessonId !== l.id ? (
                                        <div style={{ marginTop: "0.35rem" }}>
                                          <button
                                            type="button"
                                            className="secondary-button"
                                            style={{ width: "auto", padding: "0.25rem 0.6rem" }}
                                            onClick={() => {
                                              const input = document.createElement("input");
                                              input.type = "file";
                                              input.onchange = (e: any) => {
                                                const f = (e.target as HTMLInputElement).files?.[0];
                                                if (f) uploadLessonFile(l.id, f);
                                              };
                                              input.click();
                                            }}
                                            disabled={saving}
                                          >
                                            + Upload file
                                          </button>
                                          <button
                                            type="button"
                                            className="secondary-button"
                                            style={{ width: "auto", padding: "0.25rem 0.6rem", marginLeft: "0.5rem" }}
                                            onClick={() => attachYoutubeLink(l.id)}
                                            disabled={saving}
                                          >
                                            + YouTube
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div
                                    data-lesson-actions-menu="root"
                                    style={{ position: "relative", display: "flex", alignItems: "flex-start" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      aria-haspopup="menu"
                                      aria-expanded={openResourceMenuLessonId === l.id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenResourceMenuLessonId((cur) => (cur === l.id ? null : l.id));
                                      }}
                                      disabled={saving}
                                      style={{ width: 40, height: 40, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 10, fontSize: 18, lineHeight: 1 }}
                                      title="Thao tác"
                                    >
                                      ⋯
                                    </button>
                                    {openResourceMenuLessonId === l.id ? (
                                      <div
                                        role="menu"
                                        style={{
                                          position: "absolute",
                                          top: 44,
                                          right: 0,
                                          minWidth: 180,
                                          background: "#fff",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: 12,
                                          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.10)",
                                          padding: 6,
                                          zIndex: 20,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="secondary-button"
                                          style={{ width: "100%", justifyContent: "flex-start" }}
                                          onClick={() => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.onchange = (e: any) => {
                                              const f = (e.target as HTMLInputElement).files?.[0];
                                              if (f) uploadLessonFile(l.id, f);
                                            };
                                            input.click();
                                            setOpenResourceMenuLessonId(null);
                                          }}
                                          disabled={saving}
                                        >
                                          Thay file
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="secondary-button"
                                          style={{ width: "100%", justifyContent: "flex-start", marginTop: 6 }}
                                          onClick={() => {
                                            attachYoutubeLink(l.id);
                                            setOpenResourceMenuLessonId(null);
                                          }}
                                          disabled={saving}
                                        >
                                          Gắn YouTube
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="secondary-button"
                                          style={{ width: "100%", justifyContent: "flex-start", color: "#b91c1c" }}
                                          onClick={() => {
                                            deleteLesson(l.id);
                                            setOpenResourceMenuLessonId(null);
                                          }}
                                          disabled={saving}
                                        >
                                          Xóa bài học
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </SortableRow>
                            );
                          })}
                        </div>
                      </SortableContext>

                      {openAddLesson[m.id] ? (
                        <div
                          style={{
                            marginTop: "0.6rem",
                            border: "1px dashed #d1d5db",
                            borderRadius: 10,
                            padding: "0.6rem",
                            background: "#fafafa",
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Thêm bài học mới</div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr) auto",
                              gap: "0.5rem",
                            }}
                          >
                            <input
                              className="form-input"
                              placeholder="Tên bài học (bắt buộc)"
                              value={newLesson[m.id]?.title ?? ""}
                              onChange={(e) =>
                                setNewLesson((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    title: e.target.value,
                                    description: prev[m.id]?.description ?? "",
                                    lesson_type: "text",
                                    file: prev[m.id]?.file ?? null,
                                    youtubeUrl: prev[m.id]?.youtubeUrl ?? null,
                                  },
                                }))
                              }
                              disabled={saving}
                            />
                            <input
                              className="form-input"
                              placeholder="Mô tả (không bắt buộc)"
                              value={newLesson[m.id]?.description ?? ""}
                              onChange={(e) =>
                                setNewLesson((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    title: prev[m.id]?.title ?? "",
                                    description: e.target.value,
                                    lesson_type: "text",
                                    file: prev[m.id]?.file ?? null,
                                    youtubeUrl: prev[m.id]?.youtubeUrl ?? null,
                                  },
                                }))
                              }
                              disabled={saving}
                            />
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{ width: "auto" }}
                                onClick={() => {
                                  setOpenAddLesson((p) => ({ ...p, [m.id]: false }));
                                  setNewLesson((prev) => ({
                                    ...prev,
                                    [m.id]: { title: "", description: "", lesson_type: "text", file: null, youtubeUrl: null },
                                  }));
                                }}
                                disabled={saving}
                              >
                                Đóng
                              </button>
                              <button
                                type="button"
                                className="primary-button"
                                style={{ width: "auto" }}
                                onClick={() => createLesson(m.id)}
                                disabled={saving}
                              >
                                Lưu bài học
                              </button>
                            </div>
                          </div>

                          {/* Chọn tài nguyên */}
                          <div
                            style={{
                              marginTop: "0.75rem",
                              display: "flex",
                              gap: "0.75rem",
                              alignItems: "center",
                              flexWrap: "wrap",
                              borderTop: "1px solid #e5e7eb",
                              paddingTop: "0.75rem",
                            }}
                          >
                            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#374151" }}>
                              Chọn tài nguyên (tùy chọn):
                            </span>

                            {/* Upload file */}
                            <label
                              className="secondary-button"
                              style={{
                                width: "auto",
                                cursor: "pointer",
                                background: newLesson[m.id]?.file ? "#e0e7ff" : undefined,
                                borderColor: newLesson[m.id]?.file ? "#818cf8" : undefined,
                              }}
                            >
                              {newLesson[m.id]?.file ? "✓ Đã chọn file" : "+ Chọn file"}
                              <input
                                type="file"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  e.currentTarget.value = "";
                                  setNewLesson((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      title: prev[m.id]?.title ?? "",
                                      description: prev[m.id]?.description ?? "",
                                      lesson_type: "text",
                                      file: f,
                                      youtubeUrl: null, // Xóa YouTube nếu đã chọn
                                    },
                                  }));
                                }}
                                disabled={saving}
                              />
                            </label>

                            {/* Gắn YouTube */}
                            <button
                              type="button"
                              className="secondary-button"
                              style={{
                                width: "auto",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                background: newLesson[m.id]?.youtubeUrl ? "#e0e7ff" : undefined,
                                borderColor: newLesson[m.id]?.youtubeUrl ? "#818cf8" : undefined,
                              }}
                              onClick={async () => {
                                const ytUrl = window.prompt("Dán link YouTube vào đây:");
                                if (!ytUrl) return;
                                const vid = parseYoutubeVideoId(ytUrl);
                                if (!vid) {
                                  toast.error("Link YouTube không hợp lệ.");
                                  return;
                                }

                                setNewLesson((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    title: prev[m.id]?.title ?? "",
                                    description: prev[m.id]?.description ?? "",
                                    lesson_type: "text",
                                    file: null, // Xóa file nếu đã chọn
                                    youtubeUrl: ytUrl,
                                  },
                                }));

                                toast.success("Đã thêm link YouTube");
                              }}
                              disabled={saving}
                            >
                              <YoutubeIcon />
                              {newLesson[m.id]?.youtubeUrl ? "✓ Đã gắn YouTube" : "+ Gắn YouTube"}
                            </button>
                          </div>

                          {/* Hiển thị thông tin file đã chọn */}
                          {newLesson[m.id]?.file && (
                            <div style={{
                              marginTop: "0.5rem",
                              padding: "0.5rem",
                              background: "#f3f4f6",
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                <FilePreviewIcon />
                                <span style={{ fontSize: "0.9rem", color: "#1f2937", wordBreak: "break-word" }}>
                                  {newLesson[m.id]?.file?.name}
                                </span>
                                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                                  {(() => {
                                    const f = newLesson[m.id]?.file;
                                    if (!f) return null;
                                    return `(${(f.size / 1024 / 1024).toFixed(2)} MB)`;
                                  })()}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="link-button"
                                style={{ color: "#b91c1c", fontSize: "0.85rem" }}
                                onClick={() => {
                                  setNewLesson((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      ...prev[m.id],
                                      file: null,
                                    },
                                  }));
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          )}

                          {/* Hiển thị thông tin YouTube đã chọn */}
                          {newLesson[m.id]?.youtubeUrl && (
                            <div style={{
                              marginTop: "0.5rem",
                              padding: "0.5rem",
                              background: "#f3f4f6",
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                <YoutubeIcon />
                                <span style={{ fontSize: "0.9rem", color: "#1f2937", wordBreak: "break-word" }}>
                                  {newLesson[m.id]?.youtubeUrl}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="link-button"
                                style={{ color: "#b91c1c", fontSize: "0.85rem" }}
                                onClick={() => {
                                  setNewLesson((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      ...prev[m.id],
                                      youtubeUrl: null,
                                    },
                                  }));
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          )}

                          <div style={{
                            marginTop: "0.5rem",
                            fontSize: "0.85rem",
                            color: "#6b7280",
                            fontStyle: "italic",
                          }}>
                            * Có thể thêm tài nguyên sau khi tạo bài học
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "0.6rem",
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ width: "auto" }}
                            onClick={() =>
                              setOpenAddLesson((prev) => ({ ...prev, [m.id]: true }))
                            }
                            disabled={saving}
                          >
                            + Thêm bài học
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}