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

type LessonType = "video" | "text" | "quiz" | "assignment";

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
  const [newLesson, setNewLesson] = useState<Record<
    number,
    { title: string; description: string; lesson_type: LessonType; file?: File | null }
  >>({});
  const [openAddModule, setOpenAddModule] = useState(false);
  const [openAddLesson, setOpenAddLesson] = useState<Record<number, boolean>>({});
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);

  const [resourcesByLessonId, setResourcesByLessonId] = useState<
    Record<number, LessonResource[]>
  >({});
  const inFlightResources = useRef<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const saveTimer = useRef<number | null>(null);
  const scheduleReorderSave = (nextTree: ContentTree) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveReorder(nextTree).catch(() => {});
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
    setLoading(true);
    setError(null);
    fetchTree()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const payload =
      newLesson[moduleId] || ({ title: "", description: "", lesson_type: "text" } as const);
    if (!payload.title.trim()) {
      toast.error("Vui lòng nhập tên bài học.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${url}${COURSES_API.createLesson(props.courseId, moduleId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          lesson_type: payload.lesson_type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Không thể tạo bài học.");
      const lessonId = Number(data?.id);
      setNewLesson((prev) => ({
        ...prev,
        [moduleId]: { title: "", description: "", lesson_type: "text", file: null },
      }));
      setOpenAddLesson((prev) => ({ ...prev, [moduleId]: false }));
      await fetchTree();

      // Cho phép thêm nội dung ngay sau khi tạo: mở mục tài nguyên + (nếu có) upload file
      if (lessonId) {
        setResourcesByLessonId((prev) => ({ ...prev, [lessonId]: prev[lessonId] ?? [] }));
        if (payload.file) {
          await uploadLessonFile(lessonId, payload.file);
        } else {
          await fetchLessonResources(lessonId);
        }
      }
      toast.success("Đã thêm bài học");
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

  const uploadLessonFile = async (lessonId: number, file: File) => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${url}${COURSES_API.uploadLessonResource(props.courseId, lessonId)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Upload thất bại.");
      await fetchLessonResources(lessonId);
      toast.success("Đã upload tài nguyên");
    } catch (e: any) {
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

  function PencilIcon() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 20h9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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

  function ReplaceIcon() {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 7h10v4h2V5H5v6h2V7Z"
          fill="currentColor"
        />
        <path
          d="M17 17H7v-4H5v6h14v-6h-2v4Z"
          fill="currentColor"
        />
        <path
          d="M9 12h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function renderLessonResources(lessonId: number) {
    const resources = resourcesByLessonId[lessonId];
    const list = resources || [];
    const latest = list.length ? list[list.length - 1] : null;
    const hasResource = !!latest;

    return (
      <div style={{ marginTop: "0.6rem" }}>
        <div
          style={{
            marginTop: "0.5rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          {resourcesByLessonId[lessonId] === undefined ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Đang tải tài nguyên…
            </div>
          ) : !hasResource ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Chưa có tài nguyên.</span>
              <button
                type="button"
                className="secondary-button"
                style={{ width: "auto", padding: "0.25rem 0.6rem" }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.onchange = (e: any) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLessonFile(lessonId, f);
                  };
                  input.click();
                }}
                disabled={saving}
              >
                + Upload file
              </button>
            </div>
          ) : latest ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "0.5rem 0.6rem",
                background: "white",
                alignItems: "center",
              }}
            >
              <a
                href={`${url}${latest.url}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    overflow: "hidden",
                  }}
                >
                  {latest.preview_url ? (
                    <img
                      src={`${url}${latest.preview_url}`}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  ) : latest.mime_type?.startsWith("image/") ? (
                    <img
                      src={`${url}${latest.url}`}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  ) : (
                    <FilePreviewIcon />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <span style={{ fontWeight: 600 }}>Xem nội dung</span>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {latest.mime_type || "Tài liệu đính kèm"}
                  </span>
                </div>
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <IconButton
                  title="Thay file"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.onchange = (e: any) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLessonFile(lessonId, f);
                    };
                    input.click();
                  }}
                  disabled={saving}
                >
                  <ReplaceIcon />
                </IconButton>
                <IconButton
                  title="Thay thumbnail"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e: any) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLessonPreview(latest.id, lessonId, f);
                    };
                    input.click();
                  }}
                  disabled={saving}
                >
                  <FilePreviewIcon />
                </IconButton>
                <IconButton
                  title="Xóa file"
                  onClick={() => deleteResource(latest.id, lessonId)}
                  disabled={saving}
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const closeModuleEditing = (moduleId: number) => {
    setEditingModuleId(null);
    setOpenAddLesson((prev) => ({ ...prev, [moduleId]: false }));
    setNewLesson((prev) => ({
      ...prev,
      [moduleId]: { title: "", description: "", lesson_type: "text", file: null },
    }));
  };

  return (
    <div>
      {/* avoid duplicate Toaster in full-page usage */}
      {props.embedded ? null : <Toaster position="top-right" />}

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
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              {loading
                ? "Đang tải nội dung…"
                : saving
                ? "Đang lưu thay đổi…"
                : ""}
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
                          onBlur={(e) => {
                            const next = e.target.value;
                            if (next.trim() && next.trim() !== m.title) renameModule(m.id, next);
                            setEditingModuleId(null);
                          }}
                          disabled={saving}
                        />
                      ) : (
                        <div style={{ fontWeight: 700 }}>{m.title}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <IconButton
                        title="Chỉnh sửa chương (đổi tên / thêm bài)"
                        onClick={() => {
                          setEditingLessonId(null);
                          setEditingModuleId((prev) => (prev === m.id ? null : m.id));
                          setOpenAddLesson((prev) => ({ ...prev, [m.id]: true }));
                        }}
                        disabled={saving}
                      >
                        <PencilIcon />
                      </IconButton>
                      <IconButton
                        title="Xóa chương"
                        onClick={() => deleteModule(m.id)}
                        disabled={saving}
                      >
                        <DeleteIcon />
                      </IconButton>
                      {editingModuleId === m.id ? (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ width: "auto" }}
                          onClick={() => closeModuleEditing(m.id)}
                          disabled={saving}
                        >
                          Xong
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ marginTop: "0.6rem", paddingLeft: "0.5rem" }}>
                    <SortableContext
                      items={m.lessons.map((l) => `lesson:${l.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                        {m.lessons.map((l, lessonIdx) => (
                          <SortableRow key={l.id} id={`lesson:${l.id}`}>
                            <div
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 10,
                                padding: "0.6rem",
                                background: "#fcfcfc",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  alignItems: "center",
                                }}
                              >
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
                                    <input
                                      className="form-input"
                                      style={{ width: 380, maxWidth: "100%" }}
                                      defaultValue={l.title}
                                      onBlur={(e) => {
                                        const next = e.target.value;
                                        if (next.trim() && next.trim() !== l.title) renameLesson(l.id, next);
                                        setEditingLessonId(null);
                                      }}
                                      disabled={saving}
                                    />
                                  ) : (
                                    <div style={{ fontWeight: 700 }}>{l.title}</div>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                  <IconButton
                                    title="Chỉnh sửa bài học (đổi tên / tài nguyên)"
                                    onClick={async () => {
                                      setEditingModuleId(null);
                                      setEditingLessonId((prev) => (prev === l.id ? null : l.id));
                                      if (!resourcesByLessonId[l.id]) {
                                        await fetchLessonResources(l.id).catch(() => {});
                                      }
                                    }}
                                    disabled={saving}
                                  >
                                    <PencilIcon />
                                  </IconButton>
                                  <IconButton
                                    title="Xóa bài học"
                                    onClick={() => deleteLesson(l.id)}
                                    disabled={saving}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                  {editingLessonId === l.id ? (
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      style={{ width: "auto" }}
                                      onClick={() => setEditingLessonId(null)}
                                      disabled={saving}
                                    >
                                      Xong
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              {/* resources + upload */}
                              {renderLessonResources(l.id)}
                            </div>
                          </SortableRow>
                        ))}
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
                            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr) 150px auto",
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
                                  lesson_type: prev[m.id]?.lesson_type ?? "text",
                                  file: prev[m.id]?.file ?? null,
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
                                  lesson_type: prev[m.id]?.lesson_type ?? "text",
                                  file: prev[m.id]?.file ?? null,
                                },
                              }))
                            }
                            disabled={saving}
                          />
                          <select
                            className="form-input"
                            value={newLesson[m.id]?.lesson_type ?? "text"}
                            onChange={(e) =>
                              setNewLesson((prev) => ({
                                ...prev,
                                [m.id]: {
                                  title: prev[m.id]?.title ?? "",
                                  description: prev[m.id]?.description ?? "",
                                  lesson_type: e.target.value as LessonType,
                                  file: prev[m.id]?.file ?? null,
                                },
                              }))
                            }
                            disabled={saving}
                          >
                            <option value="video">video</option>
                            <option value="text">text</option>
                            <option value="quiz">quiz</option>
                            <option value="assignment">assignment</option>
                          </select>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ width: "auto" }}
                              onClick={() => setOpenAddLesson((p) => ({ ...p, [m.id]: false }))}
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
                        <div
                          style={{
                            marginTop: "0.5rem",
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <label
                            className="secondary-button"
                            style={{ width: "auto", cursor: "pointer" }}
                          >
                            {newLesson[m.id]?.file ? "Đổi file đính kèm" : "+ Chọn file đính kèm"}
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
                                    lesson_type: prev[m.id]?.lesson_type ?? "text",
                                    file: f,
                                  },
                                }));
                              }}
                              disabled={saving}
                            />
                          </label>
                          {newLesson[m.id]?.file ? (
                            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                              {newLesson[m.id]?.file?.name}
                            </span>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>(File đính kèm tùy chọn)</span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

