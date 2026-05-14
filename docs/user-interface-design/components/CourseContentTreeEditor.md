# CourseContentTreeEditor — UI Specification

**Source:** `frontend/src/components/CourseContentTreeEditor.tsx`
**Type:** Shared Component
**Purpose:** Full-featured editor for teachers to author course content: create, rename, reorder, schedule, delete modules and lessons; upload/manage lesson resources (file/YouTube); compose rich text notes; and launch quiz/assignment authoring shortcuts.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `courseId` | `number` | — | Course whose modules and lessons are edited. |
| `embedded` | `boolean` | — | When true, hides the standalone `<Toaster>` (parent owns notifications). |
| `assessmentShortcuts` | `{ onQuiz: (lessonId: number) => void; onAssignment: (lessonId: number) => void } \| undefined` | — | Optional callbacks that expose menu items "Soạn quiz" / "Soạn bài tập" for the parent to open authoring modals. |

## Overview

Used by the teacher course studio, this editor combines a draggable module/lesson tree (powered by `@dnd-kit`) with rich resource management. It performs autosave drafts to `localStorage`, persists lesson primary-resource mappings, computes media durations via the YouTube IFrame API or HTMLVideoElement, and renders an in-modal `<ResourceViewer>` for YouTube/PDF/image/video/text/other content types. State branches: loading tree, saving (mutations or reorder), uploading (with progress 0–85% sending, 85% backend, 100% completion), idle. The component also drives a Rich Text Editor modal (expanded mode), a resource manager modal, and a schedule editor inline per module/lesson and on the create forms.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View · !embedded | Toast | `<Toaster>` | Hosts `react-hot-toast` notifications. |
| 2 | View · resourceViewer | Modal | `<ResourceViewer>` | Renders YouTube embed, PDF iframe, image, video, or text content depending on resource type; closes via `closeResourceViewer`. |
| 3 | View · resourceManagerLessonId | Modal | "Quản lý tài nguyên bài học" | Lists all resources for the lesson with #index and filename; primary resource shows a "Chính" badge. |
| 4 | Click · resourceManager | Button | "Đặt chính" | Calls `setPrimaryResource(lessonId, resourceId)`; disabled when current primary or saving. |
| 5 | Click · resourceManager | Button | "Mở" | Calls `openResource(r)`; loads the resource into the viewer. |
| 6 | Click · resourceManager | Button | "Xóa" | Calls `deleteResource(r.id, r.lesson_id)` then refreshes the resource list. |
| 7 | View · resourceManager · empty | Text | "Bài học này chưa có tài nguyên." | Empty state. |
| 8 | Click · resourceManager | Button | "Đóng" | Closes the resource manager modal. |
| 9 | View · expandedRichEditorModuleId | Modal | "Soạn bài học - Chế độ mở rộng" | Full-height modal hosting `<LessonRichTextEditor>` for the draft new lesson's `richTextHtml`. |
| 10 | Click · richEditorModal | Button | "Xong" | Closes the expanded editor modal. |
| 11 | View · error | Text | Error message | Red text shown in the toolbar area when `error` is set. |
| 12 | View · uploadProgress | Spinner + Text | "Đang tải lên… N%" | Circular SVG progress indicator updates with `uploadProgress.percent`. |
| 13 | View · loading | Text | "Đang tải nội dung…" | Shown when fetching the tree. |
| 14 | View · saving | Text | "Đang lưu thay đổi…" | Shown during persistence operations. |
| 15 | Click | Button | "Chương" / "Đóng" | Toolbar IconButton that toggles `openAddModule`; disabled while saving. |
| 16 | View · openAddModule | Container | "Thêm chương mới" | Dashed-border form with title input, description input, save button, and schedule controls. |
| 17 | View · openAddModule | TextInput | New module title | Placeholder "Tên chương (mặc định: Chương N)" where N = `modules.length + 1`. |
| 18 | View · openAddModule | TextInput | New module description | Placeholder "Mô tả (không bắt buộc)". |
| 19 | Click | Button | "Lưu chương" | Calls `createModule`. |
| 20 | Click | Button | "Đặt lịch mở" / "Đã đặt lịch" | Toggles `openNewModuleScheduleEditor`; emoji prefix 🕒. |
| 21 | View · openNewModuleScheduleEditor | TextInput (datetime-local) | New module open_at | Bound to `newModule.open_at`; step=60. |
| 22 | View | Container (DndContext) | Module DnD context | Wraps the tree with PointerSensor (`distance: 6`), `closestCenter`, and `onDragOver`/`onDragEnd` handlers. |
| 23 | View | Container | Module card | One per module; shows "Chương N" badge, title (double-click to rename), open_at chip/editor, and lesson list. |
| 24 | DblClick | TextInput | Module title (inline rename) | Replaces title with an `<input className="form-input">`; commits on blur via `renameModule(id, next)`. |
| 25 | View · editingLessonId | TextInput | Lesson title (inline rename) | Same pattern as module; persists via `renameLesson(id, next)`. |
| 26 | View · assessmentShortcuts · lessons>0 | Button[] | Module-level quiz/assignment shortcut | Buttons that delegate to `assessmentShortcuts.onQuiz(firstLessonId)` / `onAssignment(firstLessonId)`. |
| 27 | View · assessmentShortcuts · lessons=0 | Text | Hint | Indicates that the chapter has no lessons to author assessments for. |
| 28 | View · lesson | Container | Lesson row | Per-lesson card with primary-resource thumbnail (YouTube cover, image, or course thumbnail fallback), title, type/size/duration text, and per-lesson action buttons. |
| 29 | View · displayedResource | Image | Resource thumbnail | YouTube thumb, `preview_url`, or first MIME image; otherwise placeholder file icon. Optional duration label rendered at bottom-right. |
| 30 | View · lesson | Text | Resource summary | "Đang tải tài nguyên…" / "Đang tải lên… N%" / "<typeLabel> · <duration> · <N> tài nguyên" / "Chưa có file đính kèm". |
| 31 | Click | Button | "+ Upload file" | Opens a hidden `<input type="file">` then calls `uploadLessonFile(lessonId, file)`. |
| 32 | Click | Button | "+ YouTube" | Calls `attachYoutubeLink(lessonId)` to attach a URL (prompted). |
| 33 | Click | Button | "🕒 Đặt lịch" / "🕒 Đã đặt lịch" | Toggles `openLessonScheduleEditorId`. |
| 34 | View · scheduleEditor (lesson) | TextInput (datetime-local) | Lesson open_at | Bounded by `min={module.open_at}`; commits on blur via `updateLessonOpenAt`. |
| 35 | Click | Button | Lesson actions kebab "⋯" | Toggles a contextual menu (`role="menu"`) anchored top:44 right:0. |
| 36 | Menu · open | Button | "+ Thêm file" | Same upload flow as ID 31. |
| 37 | Menu · open | Button | "Quản lý tài nguyên" | Opens the resource manager modal for the lesson. |
| 38 | Menu · open | Button | "Gắn YouTube" | Same as ID 32. |
| 39 | Menu · open · assessmentShortcuts | Button | "Soạn quiz" | Calls `assessmentShortcuts.onQuiz(l.id)`. |
| 40 | Menu · open · assessmentShortcuts | Button | "Soạn bài tập" | Calls `assessmentShortcuts.onAssignment(l.id)`. |
| 41 | Menu · open | Button | "Xóa bài học" | Calls `deleteLesson(l.id)` after `window.confirm("Xóa bài học này?")`. |

## States & Validation Notes

- `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))` defines pointer activation threshold.
- The `newLesson` drafts auto-save to `localStorage` under key `teacher-course-new-lesson-draft-<courseId>` with a 700 ms debounce; `file` is never serialized.
- Primary resource mapping is persisted under `teacher-course-primary-resource-map` and validated to ensure integer ids on rehydrate.
- YouTube parsing accepts `youtu.be/<id>`, `youtube.com/?v=<id>`, `/embed/<id>`, `/shorts/<id>` hosts. Video filenames are detected via the regex `\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i`.
- Upload progress is reported with three phases: 0–85% during upload, hold at 85% during backend processing, then 100% briefly before clearing.
- The reorder pipeline maintains optimistic local state via `arrayMove`, persists via `COURSES_API.reorderContent`, and refetches the tree on success; on failure it refetches to restore canonical order.
- Inline rename inputs commit on `onBlur`; empty or unchanged values do not trigger persistence.
- `assessmentShortcuts` is optional; when undefined the kebab menu hides "Soạn quiz" / "Soạn bài tập" entries.
- Lesson resource duration is fetched lazily via `ensureDurationForResource`: YouTube via the IFrame API (off-screen iframe), uploaded videos via a temporary `<video>` element from a blob fetched with auth headers.
