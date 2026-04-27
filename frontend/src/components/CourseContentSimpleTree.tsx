import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { useAuth } from "../contexts/Auth";
import "./CourseContentSimpleTree.css";

type LessonNode = {
  id: number;
  title: string;
  open_at?: string | null;
  is_published?: boolean;
  lesson_type?: "video" | "text" | "quiz" | "assignment";
  quality_status?: "ok" | "needs_fix";
  quality_issue?: string | null;
};

type LessonResourceReviewItem = {
  review_status?: "pending" | "approved" | "rejected";
};

type ReviewState = "approved" | "rejected" | "pending" | "empty";

type ModuleNode = {
  id: number;
  title: string;
  open_at?: string | null;
  is_published?: boolean;
  lessons: LessonNode[];
};

type ContentTree = {
  modules: ModuleNode[];
};

type ScheduleDraft = {
  date: string; // yyyy-mm-dd
  hour: string; // 1..23 (cho phép nhập >12 để auto PM)
  minute: string; // 0..59
  period: "AM" | "PM";
};

function getLessonTypeBadge(lessonType?: LessonNode["lesson_type"]): { icon: string; className: string; title: string } | null {
  if (lessonType === "quiz") {
    return { icon: "quiz", className: "is-quiz", title: "Quiz" };
  }
  if (lessonType === "assignment") {
    return { icon: "assignment", className: "is-assignment", title: "Bài tập" };
  }
  return { icon: "menu_book", className: "is-content", title: "Bài học" };
}

export default function CourseContentSimpleTree({ courseId, readOnly = false }: { courseId: number; readOnly?: boolean }) {
  const navigate = useNavigate();
  const { accessToken: token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleNode[]>([]);
  const [scheduleEditorKey, setScheduleEditorKey] = useState<string | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraft>>({});
  const [openingStudio, setOpeningStudio] = useState(false);
  const [showDisabledSection, setShowDisabledSection] = useState(false);
  const [draggingModuleId, setDraggingModuleId] = useState<number | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<number | null>(null);
  const [draggingLesson, setDraggingLesson] = useState<{ moduleId: number; lessonId: number } | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<number | null>(null);
  const [dragOverLessonModuleId, setDragOverLessonModuleId] = useState<number | null>(null);
  const [reviewStateByLesson, setReviewStateByLesson] = useState<Record<number, ReviewState>>({});

  const getReviewStateFromItems = (items: LessonResourceReviewItem[]): ReviewState => {
    if (!Array.isArray(items) || !items.length) return "empty";
    const hasRejected = items.some((x) => x.review_status === "rejected");
    if (hasRejected) return "rejected";
    const hasPending = items.some((x) => x.review_status === "pending");
    if (hasPending) return "pending";
    const hasApproved = items.some((x) => x.review_status === "approved");
    if (hasApproved) return "approved";
    return "empty";
  };

  const getModuleReviewState = (moduleId: number): ReviewState => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return "empty";
    const states = (module.lessons || []).map((l) => reviewStateByLesson[l.id] || "empty");
    const hasAny = states.some((s) => s !== "empty");
    if (!hasAny) return "empty";
    if (states.some((s) => s === "rejected")) return "rejected";
    if (states.some((s) => s === "pending")) return "pending";
    return "approved";
  };

  const renderReviewIcon = (state: ReviewState) => {
    if (state === "approved") {
      return <span className="material-symbols-outlined review-status-icon approved" title="Đã duyệt">check_circle</span>;
    }
    if (state === "rejected") {
      return <span className="material-symbols-outlined review-status-icon rejected" title="Bị từ chối">cancel</span>;
    }
    if (state === "pending") {
      return <span className="material-symbols-outlined review-status-icon pending" title="Chờ duyệt">hourglass_top</span>;
    }
    return <span className="material-symbols-outlined review-status-icon empty" title="Chưa có tài nguyên">help</span>;
  };

  const toLocalDatetime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad2 = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const toDisplaySchedule = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad2 = (x: number) => String(x).padStart(2, "0");
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const minutes = pad2(d.getMinutes());
    const h24 = d.getHours();
    const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${dd}/${mm}/${yyyy} ${pad2(h12)}:${minutes} ${period}`;
  };

  const buildDraftFromIso = (iso?: string | null): ScheduleDraft => {
    if (!iso) {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return { date, hour: "8", minute: "00", period: "AM" };
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return { date, hour: "8", minute: "00", period: "AM" };
    }
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const h24 = d.getHours();
    const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return {
      date,
      hour: String(h12),
      minute: String(d.getMinutes()).padStart(2, "0"),
      period,
    };
  };

  const draftToIso = (draft?: ScheduleDraft | null): string | null => {
    if (!draft) return null;
    const date = String(draft.date || "").trim();
    const hRaw = Number(String(draft.hour || "").trim());
    const mRaw = Number(String(draft.minute || "").trim());
    if (!date || !Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return null;
    if (hRaw <= 0 || mRaw < 0 || mRaw > 59) return null;
    const hourNormalized = hRaw % 24;
    let h24 = hourNormalized;
    if (hRaw <= 12) {
      if (draft.period === "AM") h24 = hRaw % 12; // 12 AM -> 00
      else h24 = hRaw === 12 ? 12 : hRaw + 12; // 1..11 PM -> +12
    }
    const hh = String(h24).padStart(2, "0");
    const mm = String(Math.floor(mRaw)).padStart(2, "0");
    const dt = new Date(`${date}T${hh}:${mm}:00`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  };

  const fetchTree = useCallback(async () => {
    const res = await fetch(`${url}${COURSES_API.contentTree(courseId)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as ContentTree & { message?: string };
    if (!res.ok) throw new Error(data?.message || "Không thể tải cấu trúc nội dung.");
    setModules(Array.isArray(data.modules) ? data.modules : []);
  }, [courseId, token]);

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    fetchTree()
      .catch((e: any) => setError(e?.message || "Không thể tải cấu trúc nội dung."))
      .finally(() => setLoading(false));
  }, [courseId, fetchTree]);

  useEffect(() => {
    const lessonIds = modules.flatMap((m) => (m.lessons || []).map((l) => Number(l.id))).filter((id) => Number.isFinite(id));
    if (!lessonIds.length) {
      setReviewStateByLesson({});
      return;
    }
    let cancelled = false;
    const fetchReviewStates = async () => {
      try {
        const entries = await Promise.all(
          lessonIds.map(async (lessonId) => {
            const res = await fetch(`${url}${COURSES_API.listLessonResources(courseId, lessonId)}`, {
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            const json = (await res.json().catch(() => ({}))) as { items?: LessonResourceReviewItem[] };
            if (!res.ok) return [lessonId, "empty" as ReviewState] as const;
            return [lessonId, getReviewStateFromItems(Array.isArray(json.items) ? json.items : [])] as const;
          })
        );
        if (cancelled) return;
        const map: Record<number, ReviewState> = {};
        for (const [lessonId, state] of entries) map[lessonId] = state;
        setReviewStateByLesson(map);
      } catch {
        if (!cancelled) setReviewStateByLesson({});
      }
    };
    void fetchReviewStates();
    return () => {
      cancelled = true;
    };
  }, [courseId, modules, token]);

  const updateModuleOpenAt = async (moduleId: number, valueIso: string | null) => {
    try {
      const res = await fetch(`${url}${COURSES_API.updateModule(courseId, moduleId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ open_at: valueIso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật lịch mở chương.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật lịch mở chương.");
    }
  };

  const updateLessonOpenAt = async (lessonId: number, valueIso: string | null) => {
    try {
      const res = await fetch(`${url}${COURSES_API.updateLesson(courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ open_at: valueIso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật lịch mở bài.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật lịch mở bài.");
    }
  };

  const updateModulePublished = async (moduleId: number, isPublished: boolean) => {
    try {
      const res = await fetch(`${url}${COURSES_API.updateModule(courseId, moduleId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_published: isPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật trạng thái chương.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật trạng thái chương.");
    }
  };

  const updateLessonPublished = async (lessonId: number, isPublished: boolean) => {
    try {
      const res = await fetch(`${url}${COURSES_API.updateLesson(courseId, lessonId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_published: isPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật trạng thái bài học.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật trạng thái bài học.");
    }
  };

  const openScheduleEditor = (key: string, iso?: string | null) => {
    setScheduleEditorKey((k) => (k === key ? null : key));
    setScheduleDrafts((prev) => ({ ...prev, [key]: buildDraftFromIso(iso) }));
  };

  const saveScheduleForModule = async (moduleId: number) => {
    const key = `m:${moduleId}`;
    const iso = draftToIso(scheduleDrafts[key]);
    if (!iso) {
      setError("Thời gian mở khóa không hợp lệ.");
      return;
    }
    await updateModuleOpenAt(moduleId, iso);
  };

  const saveScheduleForLesson = async (lessonId: number) => {
    const key = `l:${lessonId}`;
    const iso = draftToIso(scheduleDrafts[key]);
    if (!iso) {
      setError("Thời gian mở khóa không hợp lệ.");
      return;
    }
    await updateLessonOpenAt(lessonId, iso);
  };

  const openStudioByPlusIcon = async () => {
    setOpeningStudio(true);
    setError(null);
    try {
      const activeModules = modules.filter((m) => m.is_published !== false);
      const targetModule = activeModules[activeModules.length - 1];
      if (!targetModule?.id) throw new Error("Chưa có chương khả dụng để tạo bài học.");
      const createRes = await fetch(`${url}${COURSES_API.createLesson(courseId, targetModule.id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: "Bài học mới",
          description: null,
          lesson_type: "text",
          open_at: null,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error((createData as any)?.message || "Không thể tạo bài học mới.");
      const lessonId = Number((createData as any)?.id);
      if (!lessonId) throw new Error("Không nhận được mã bài học mới.");
      navigate(`/teacher/courses/${courseId}/lessons/${lessonId}/studio?new=1&moduleId=${targetModule.id}&pickType=1`);
    } catch (e: any) {
      setError(e?.message || "Không thể thêm mới.");
    } finally {
      setOpeningStudio(false);
    }
  };

  const deleteModulePermanently = async (moduleId: number, moduleTitle?: string) => {
    if (!window.confirm(`Xóa vĩnh viễn chương "${moduleTitle || "này"}" và toàn bộ bài học bên trong?`)) return;
    setOpeningStudio(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteModule(courseId, moduleId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể xóa vĩnh viễn chương.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn chương.");
    } finally {
      setOpeningStudio(false);
    }
  };

  const deleteLessonPermanently = async (lessonId: number, lessonTitle?: string) => {
    if (!window.confirm(`Xóa vĩnh viễn bài học "${lessonTitle || "này"}"?`)) return;
    setOpeningStudio(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.deleteLesson(courseId, lessonId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể xóa vĩnh viễn bài học.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn bài học.");
    } finally {
      setOpeningStudio(false);
    }
  };

  const reorderModules = async (fromModuleId: number, toModuleId: number) => {
    if (fromModuleId === toModuleId) return;
    const fromIdx = modules.findIndex((m) => m.id === fromModuleId);
    const toIdx = modules.findIndex((m) => m.id === toModuleId);
    if (fromIdx < 0 || toIdx < 0) return;

    const nextModules = [...modules];
    const [moved] = nextModules.splice(fromIdx, 1);
    nextModules.splice(toIdx, 0, moved);

    setModules(nextModules);
    setOpeningStudio(true);
    setError(null);
    try {
      const modulesPayload = nextModules.map((m, idx) => ({ id: m.id, order_index: idx + 1 }));
      const lessonsPayload = nextModules.flatMap((m) =>
        (m.lessons || []).map((l, idx) => ({
          id: l.id,
          module_id: m.id,
          order_index: idx + 1,
        }))
      );
      const res = await fetch(`${url}${COURSES_API.reorderContent(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ modules: modulesPayload, lessons: lessonsPayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật thứ tự chương.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật thứ tự chương.");
      await fetchTree();
    } finally {
      setOpeningStudio(false);
    }
  };

  const reorderLessons = async (
    fromModuleId: number,
    fromLessonId: number,
    toModuleId: number,
    toLessonId: number | null
  ) => {
    const fromModuleIdx = modules.findIndex((m) => m.id === fromModuleId);
    const toModuleIdx = modules.findIndex((m) => m.id === toModuleId);
    if (fromModuleIdx < 0 || toModuleIdx < 0) return;

    const nextModules = modules.map((m) => ({ ...m, lessons: [...(m.lessons || [])] }));
    const fromLessons = nextModules[fromModuleIdx].lessons;
    const fromLessonIdx = fromLessons.findIndex((l) => l.id === fromLessonId);
    if (fromLessonIdx < 0) return;

    const [movedLesson] = fromLessons.splice(fromLessonIdx, 1);
    const toLessons = nextModules[toModuleIdx].lessons;
    const targetIdx = toLessonId ? toLessons.findIndex((l) => l.id === toLessonId) : -1;

    if (targetIdx < 0) toLessons.push(movedLesson);
    else toLessons.splice(targetIdx, 0, movedLesson);

    if (fromModuleId === toModuleId && (toLessonId === null || fromLessonId === toLessonId)) {
      return;
    }
    setModules(nextModules);
    setOpeningStudio(true);
    setError(null);
    try {
      const modulesPayload = nextModules.map((m, idx) => ({ id: m.id, order_index: idx + 1 }));
      const lessonsPayload = nextModules.flatMap((m) =>
        (m.lessons || []).map((l, idx) => ({
          id: l.id,
          module_id: m.id,
          order_index: idx + 1,
        }))
      );
      const res = await fetch(`${url}${COURSES_API.reorderContent(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ modules: modulesPayload, lessons: lessonsPayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không thể cập nhật thứ tự bài học.");
      await fetchTree();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật thứ tự bài học.");
      await fetchTree();
    } finally {
      setOpeningStudio(false);
    }
  };

  const activeModules = modules
    .filter((m) => m.is_published !== false)
    .map((m) => ({ ...m, lessons: (m.lessons || []).filter((l) => l.is_published !== false) }));
  const disabledModules = modules.filter((m) => m.is_published === false);
  const disabledLessonsByModule = modules
    .map((m) => ({
      moduleId: m.id,
      moduleTitle: m.title,
      lessons: (m.lessons || []).filter((l) => l.is_published === false),
    }))
    .filter((x) => x.lessons.length > 0);
  const disabledCount =
    disabledModules.length + disabledLessonsByModule.reduce((sum, x) => sum + x.lessons.length, 0);

  if (loading) return <div className="content-simple-tree-state">Đang tải cấu trúc nội dung...</div>;
  if (error) return <div className="content-simple-tree-state error">{error}</div>;
  if (!modules.length) return <div className="content-simple-tree-state">Chưa có chương/bài học.</div>;

  return (
    <div className="content-simple-tree">
      <div className="tree-toolbar">
        <button
          type="button"
          className="tree-toggle-disabled-btn"
          onClick={() => setShowDisabledSection((v) => !v)}
          title="Xem/khôi phục mục đã disable"
        >
          {showDisabledSection ? "Ẩn mục đã disable" : `Mục đã disable (${disabledCount})`}
        </button>
        {!readOnly ? (
          <button
            type="button"
            className="tree-add-btn"
            title="Tạo bài học và mở Studio"
            onClick={() => void openStudioByPlusIcon()}
            disabled={openingStudio}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        ) : null}
      </div>
      <ul className="tree-root">
        {activeModules.map((m) => (
          <li
            key={m.id}
            className={`tree-node module-node ${draggingModuleId === m.id ? "is-dragging" : ""} ${dragOverModuleId === m.id && draggingModuleId !== m.id ? "is-drag-over" : ""}`}
            draggable={!readOnly}
            onDragStart={() => {
              setDraggingModuleId(m.id);
              setDragOverModuleId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!readOnly && draggingModuleId && draggingModuleId !== m.id) {
                setDragOverModuleId(m.id);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = draggingModuleId;
              setDragOverModuleId(null);
              setDraggingModuleId(null);
              if (!readOnly && fromId && fromId !== m.id) {
                void reorderModules(fromId, m.id);
              }
            }}
            onDragEnd={() => {
              setDraggingModuleId(null);
              setDragOverModuleId(null);
            }}
          >
            <div className="tree-title-row">
              <span className="tree-review-status-wrap">{renderReviewIcon(getModuleReviewState(m.id))}</span>
              <div className="tree-title">{m.title || `Chương #${m.id}`}</div>
              {m.open_at ? (
                <span
                  className="tree-schedule-chip tree-schedule-chip-action is-set"
                  role="button"
                  tabIndex={0}
                  title="Bấm để đổi ngày mở khóa"
                  onClick={() => {
                    if (readOnly) return;
                    openScheduleEditor(`m:${m.id}`, m.open_at);
                  }}
                  onKeyDown={(e) => {
                    if (readOnly) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openScheduleEditor(`m:${m.id}`, m.open_at);
                    }
                  }}
                >
                  <span>{toDisplaySchedule(m.open_at)}</span>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="tree-schedule-chip-close"
                      title="Xóa điều kiện mở khóa"
                      onClick={(e) => {
                        e.stopPropagation();
                        void updateModuleOpenAt(m.id, null);
                      }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  ) : null}
                </span>
              ) : null}
              {!m.open_at && !readOnly ? (
                <button
                  type="button"
                  className="tree-icon-btn"
                  title="Đặt lịch mở chương"
                  onClick={() => openScheduleEditor(`m:${m.id}`, m.open_at)}
                >
                  <span className="material-symbols-outlined">schedule</span>
                </button>
              ) : null}
              {!readOnly ? (
                <button
                  type="button"
                  className="tree-disable-btn"
                  title="Disable chương"
                  onClick={() => void updateModulePublished(m.id, false)}
                >
                  Disable
                </button>
              ) : null}
              {scheduleEditorKey === `m:${m.id}` && (
                <div className="tree-schedule-editor">
                  <input
                    type="date"
                    className="tree-datetime-input tree-date-input"
                    value={scheduleDrafts[`m:${m.id}`]?.date || ""}
                    onChange={(e) =>
                      setScheduleDrafts((prev) => ({
                        ...prev,
                        [`m:${m.id}`]: {
                          ...(prev[`m:${m.id}`] || buildDraftFromIso(m.open_at)),
                          date: e.target.value,
                        },
                      }))
                    }
                    disabled={readOnly}
                  />
                  <input
                    type="number"
                    className="tree-datetime-input tree-time-input"
                    min={1}
                    max={23}
                    placeholder="hh"
                    value={scheduleDrafts[`m:${m.id}`]?.hour || ""}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const hourNum = Number(hour);
                      setScheduleDrafts((prev) => ({
                        ...prev,
                        [`m:${m.id}`]: {
                          ...(prev[`m:${m.id}`] || buildDraftFromIso(m.open_at)),
                          hour,
                          period: Number.isFinite(hourNum) && hourNum > 12 ? "PM" : (prev[`m:${m.id}`]?.period || "AM"),
                        },
                      }));
                    }}
                    disabled={readOnly}
                  />
                  <span className="tree-time-sep">:</span>
                  <input
                    type="number"
                    className="tree-datetime-input tree-time-input"
                    min={0}
                    max={59}
                    placeholder="mm"
                    value={scheduleDrafts[`m:${m.id}`]?.minute || ""}
                    onChange={(e) =>
                      setScheduleDrafts((prev) => ({
                        ...prev,
                        [`m:${m.id}`]: {
                          ...(prev[`m:${m.id}`] || buildDraftFromIso(m.open_at)),
                          minute: e.target.value,
                        },
                      }))
                    }
                    disabled={readOnly}
                  />
                  <select
                    className="tree-datetime-input tree-period-input"
                    value={scheduleDrafts[`m:${m.id}`]?.period || "AM"}
                    onChange={(e) =>
                      setScheduleDrafts((prev) => ({
                        ...prev,
                        [`m:${m.id}`]: {
                          ...(prev[`m:${m.id}`] || buildDraftFromIso(m.open_at)),
                          period: (e.target.value as "AM" | "PM") || "AM",
                        },
                      }))
                    }
                    disabled={readOnly}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                  <button type="button" className="tree-save-btn" onClick={() => void saveScheduleForModule(m.id)} disabled={readOnly}>
                    Lưu
                  </button>
                </div>
              )}
            </div>
            {Array.isArray(m.lessons) && m.lessons.length > 0 ? (
              <ul
                className={`tree-children ${dragOverLessonModuleId === m.id && !dragOverLessonId ? "is-drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingLesson) {
                    setDragOverLessonId(null);
                    setDragOverLessonModuleId(m.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragging = draggingLesson;
                  setDragOverLessonId(null);
                  setDragOverLessonModuleId(null);
                  setDraggingLesson(null);
                  if (dragging) {
                    void reorderLessons(dragging.moduleId, dragging.lessonId, m.id, null);
                  }
                }}
              >
                {m.lessons.map((l) => {
                  const lessonTypeBadge = getLessonTypeBadge(l.lesson_type);
                  const lessonReviewState = reviewStateByLesson[l.id] || "empty";
                  return (
                  <li
                    key={l.id}
                    className={`tree-node lesson-node ${draggingLesson?.lessonId === l.id ? "is-dragging" : ""} ${dragOverLessonId === l.id && draggingLesson?.lessonId !== l.id ? "is-drag-over" : ""}`}
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDraggingLesson({ moduleId: m.id, lessonId: l.id });
                      setDragOverLessonId(null);
                      setDragOverLessonModuleId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!readOnly && draggingLesson && draggingLesson.lessonId !== l.id) {
                        setDragOverLessonId(l.id);
                        setDragOverLessonModuleId(m.id);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const dragging = draggingLesson;
                      setDragOverLessonId(null);
                      setDragOverLessonModuleId(null);
                      setDraggingLesson(null);
                      if (!readOnly && dragging && dragging.lessonId !== l.id) {
                        void reorderLessons(dragging.moduleId, dragging.lessonId, m.id, l.id);
                      }
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setDraggingLesson(null);
                      setDragOverLessonId(null);
                      setDragOverLessonModuleId(null);
                    }}
                  >
                    <div className="tree-title-row">
                      <span className="tree-review-status-wrap">{renderReviewIcon(lessonReviewState)}</span>
                      {lessonTypeBadge ? (
                        <span className={`tree-lesson-type-icon ${lessonTypeBadge.className}`} title={lessonTypeBadge.title}>
                          <span className="material-symbols-outlined">{lessonTypeBadge.icon}</span>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="tree-title lesson-link"
                        onClick={() => navigate(`/teacher/courses/${courseId}/lessons/${l.id}/studio`)}
                        title="Mở Lesson Studio"
                      >
                        {l.title || `Bài học #${l.id}`}
                      </button>
                      {l.quality_status === "needs_fix" ? (
                        <span
                          className="tree-quality-badge is-warning"
                          title={l.quality_issue || "Bài học chưa đạt điều kiện chất lượng để gửi duyệt."}
                        >
                          Chưa đạt
                        </span>
                      ) : null}
                      {l.open_at ? (
                        <span
                          className="tree-schedule-chip tree-schedule-chip-action is-set"
                          role="button"
                          tabIndex={0}
                          title="Bấm để đổi ngày mở khóa"
                          onClick={() => {
                            if (readOnly) return;
                            openScheduleEditor(`l:${l.id}`, l.open_at);
                          }}
                          onKeyDown={(e) => {
                            if (readOnly) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openScheduleEditor(`l:${l.id}`, l.open_at);
                            }
                          }}
                        >
                          <span>{toDisplaySchedule(l.open_at)}</span>
                          {!readOnly ? (
                            <button
                              type="button"
                              className="tree-schedule-chip-close"
                              title="Xóa điều kiện mở khóa"
                              onClick={(e) => {
                                e.stopPropagation();
                                void updateLessonOpenAt(l.id, null);
                              }}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          ) : null}
                        </span>
                      ) : null}
                      {!l.open_at && !readOnly ? (
                        <button
                          type="button"
                          className="tree-icon-btn"
                          title="Đặt lịch mở bài"
                          onClick={() => openScheduleEditor(`l:${l.id}`, l.open_at)}
                        >
                          <span className="material-symbols-outlined">schedule</span>
                        </button>
                      ) : null}
                      {!readOnly ? (
                        <button
                          type="button"
                          className="tree-disable-btn"
                          title="Disable bài học"
                          onClick={() => void updateLessonPublished(l.id, false)}
                        >
                          Disable
                        </button>
                      ) : null}
                      {scheduleEditorKey === `l:${l.id}` && (
                        <div className="tree-schedule-editor">
                          <input
                            type="date"
                            className="tree-datetime-input tree-date-input"
                            value={scheduleDrafts[`l:${l.id}`]?.date || ""}
                            onChange={(e) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [`l:${l.id}`]: {
                                  ...(prev[`l:${l.id}`] || buildDraftFromIso(l.open_at)),
                                  date: e.target.value,
                                },
                              }))
                            }
                            disabled={readOnly}
                          />
                          <input
                            type="number"
                            className="tree-datetime-input tree-time-input"
                            min={1}
                            max={23}
                            placeholder="hh"
                            value={scheduleDrafts[`l:${l.id}`]?.hour || ""}
                            onChange={(e) => {
                              const hour = e.target.value;
                              const hourNum = Number(hour);
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [`l:${l.id}`]: {
                                  ...(prev[`l:${l.id}`] || buildDraftFromIso(l.open_at)),
                                  hour,
                                  period: Number.isFinite(hourNum) && hourNum > 12 ? "PM" : (prev[`l:${l.id}`]?.period || "AM"),
                                },
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <span className="tree-time-sep">:</span>
                          <input
                            type="number"
                            className="tree-datetime-input tree-time-input"
                            min={0}
                            max={59}
                            placeholder="mm"
                            value={scheduleDrafts[`l:${l.id}`]?.minute || ""}
                            onChange={(e) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [`l:${l.id}`]: {
                                  ...(prev[`l:${l.id}`] || buildDraftFromIso(l.open_at)),
                                  minute: e.target.value,
                                },
                              }))
                            }
                            disabled={readOnly}
                          />
                          <select
                            className="tree-datetime-input tree-period-input"
                            value={scheduleDrafts[`l:${l.id}`]?.period || "AM"}
                            onChange={(e) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [`l:${l.id}`]: {
                                  ...(prev[`l:${l.id}`] || buildDraftFromIso(l.open_at)),
                                  period: (e.target.value as "AM" | "PM") || "AM",
                                },
                              }))
                            }
                            disabled={readOnly}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                          <button type="button" className="tree-save-btn" onClick={() => void saveScheduleForLesson(l.id)} disabled={readOnly}>
                            Lưu
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : null}
            {(!Array.isArray(m.lessons) || m.lessons.length === 0) && (
              <div
                className={`tree-empty-dropzone ${dragOverLessonModuleId === m.id ? "is-drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingLesson) setDragOverLessonModuleId(m.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragging = draggingLesson;
                  setDragOverLessonId(null);
                  setDragOverLessonModuleId(null);
                  setDraggingLesson(null);
                  if (!readOnly && dragging) {
                    void reorderLessons(dragging.moduleId, dragging.lessonId, m.id, null);
                  }
                }}
              >
                Thả bài học vào chương này
              </div>
            )}
          </li>
        ))}
      </ul>
      {!activeModules.length ? (
        <div className="content-simple-tree-state">Không còn mục đang hiển thị. Hãy khôi phục trong phần mục đã disable.</div>
      ) : null}
      {!readOnly && showDisabledSection && (
        <div className="tree-disabled-section">
          <div className="tree-disabled-title">Chương/Bài học đã Disable</div>
          {!disabledCount ? (
            <div className="content-simple-tree-state">Không có mục nào đang disable.</div>
          ) : (
            <>
              {disabledModules.map((m) => (
                <div key={`dm-${m.id}`} className="tree-disabled-row">
                  <div className="tree-disabled-label">Chương: {m.title || `Chương #${m.id}`}</div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button type="button" className="tree-restore-btn" onClick={() => void updateModulePublished(m.id, true)}>
                      Khôi phục
                    </button>
                    <button type="button" className="tree-delete-btn" onClick={() => void deleteModulePermanently(m.id, m.title)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
              {disabledLessonsByModule.map((group) =>
                group.lessons.map((l) => (
                  <div key={`dl-${l.id}`} className="tree-disabled-row">
                    <div className="tree-disabled-label">
                      Bài học: {l.title || `Bài học #${l.id}`} · {group.moduleTitle || `Chương #${group.moduleId}`}
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button type="button" className="tree-restore-btn" onClick={() => void updateLessonPublished(l.id, true)}>
                        Khôi phục
                      </button>
                      <button type="button" className="tree-delete-btn" onClick={() => void deleteLessonPermanently(l.id, l.title)}>
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
