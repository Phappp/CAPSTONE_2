# CourseContentSimpleTree — UI Specification

**Source:** `frontend/src/components/CourseContentSimpleTree.tsx`
**Type:** Shared Component
**Purpose:** Simplified course content tree for teachers/admins to view, schedule, reorder, disable, restore, and delete modules and lessons.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `courseId` | `number` | — | Identifier of the course whose content tree is rendered. |
| `readOnly` | `boolean` | `false` | When true, disables all editing affordances (drag, schedule edit, disable, delete, create). |

## Overview

Used in teacher course detail pages and read-only contexts (admin review), this component fetches and renders the course's modules and lessons in a draggable tree. Each module/lesson shows a review-status icon (approved/rejected/pending/empty) computed from lesson resources, an optional unlock schedule chip, and quick actions (schedule edit, disable, drag-and-drop reorder). When the course has zero modules, it shows an onboarding CTA modal to create the first module. A "Mục đã disable" toggle reveals a section listing disabled items for restore or permanent deletion. State branches: loading, error, empty, populated active list, expanded disabled list, schedule editor open (per-module/per-lesson), create-first-module modal.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | Loading | Text | `.content-simple-tree-state` | "Đang tải cấu trúc nội dung..." while fetching. |
| 2 | Error | Text | `.content-simple-tree-state.error` | Shows the captured error message. |
| 3 | Empty · !readOnly | Button | "Bắt đầu tạo chương đầu tiên" | Opens the create-first-module modal; disabled while `openingStudio`. |
| 4 | Empty · modal | Modal | `.tree-modal-backdrop` | Dialog with title "Đặt tên chương đầu tiên". |
| 5 | Modal | TextInput | `.tree-modal-input` | Bound to `newModuleTitle`; placeholder "Ví dụ: Chương 1 - Nhập môn"; `maxLength=120`; autofocus. |
| 6 | Modal | Button | "Hủy" | Closes modal without action. |
| 7 | Modal | Button | "Tạo chương" / "Đang tạo..." | Calls `createFirstModule(newModuleTitle)`; disabled when title empty or saving. |
| 8 | View | Button | "Mục đã disable (N)" / "Ẩn mục đã disable" | Toggles the disabled section visibility; shows count of disabled items. |
| 9 | View · !readOnly | Button | Tree add (+) | Icon button (`material-symbols-outlined add`) titled "Tạo bài học và mở Studio"; calls `openStudioByPlusIcon`. |
| 10 | View | List | `.tree-root` | Ordered tree of active modules; supports drag-and-drop. |
| 11 | View | Container | `li.module-node` | Draggable module row; gains `is-dragging`/`is-drag-over` classes during DnD. |
| 12 | View | Icon | Review status icon | Material symbol (`check_circle`/`cancel`/`hourglass_top`/`help`) reflecting `getModuleReviewState`. Tooltip: "Đã duyệt"/"Bị từ chối"/"Chờ duyệt"/"Chưa có tài nguyên". |
| 13 | View | Text | Module title | Shows `m.title` or fallback `Chương #${id}`. |
| 14 | View · m.open_at | Badge | Schedule chip | Pill button showing `toDisplaySchedule(m.open_at)` (dd/mm/yyyy hh:mm AM/PM). Clicking opens the schedule editor. |
| 15 | View · m.open_at · !readOnly | Button | Schedule chip close (×) | Icon button calling `updateModuleOpenAt(m.id, null)` to remove unlock condition. |
| 16 | View · !m.open_at · !readOnly | Button | Schedule icon | `material-symbols-outlined schedule`; opens the schedule editor for the module. |
| 17 | View · !readOnly | Button | "Disable" (module) | Calls `updateModulePublished(m.id, false)`. |
| 18 | View · editorKey=m:id | Container | Schedule editor (module) | Inputs: date picker, hour (number 1–23), minute (0–59), AM/PM select, and "Lưu" button. |
| 19 | Click | Button | "Lưu" (module schedule) | Calls `saveScheduleForModule(m.id)`. Validation error: "Thời gian mở khóa không hợp lệ.". |
| 20 | View | List | `.tree-children` | Sortable list of lessons within a module; drop targets respect `dragOverLessonModuleId`. |
| 21 | View | Container | `li.lesson-node` | Draggable lesson row; classes track drag state. |
| 22 | View | Icon | Lesson type badge | Maps `lesson_type` to icon: `quiz`, `assignment`, or `menu_book`; tooltip "Quiz"/"Bài tập"/"Bài học". |
| 23 | View | Link/Button | Lesson title | Button styled as link; opens `/teacher/courses/${courseId}/lessons/${l.id}/studio`; fallback label `Bài học #${id}`. |
| 24 | View · quality_status=needs_fix | Badge | "Chưa đạt" | Warning badge with title from `quality_issue` or default message. |
| 25 | View · l.open_at | Badge | Lesson schedule chip | Pill showing scheduled open datetime; clickable to edit. |
| 26 | View · l.open_at · !readOnly | Button | Schedule chip close (×) | Clears lesson `open_at`. |
| 27 | View · !l.open_at · !readOnly | Button | Schedule icon | Opens schedule editor for lesson. |
| 28 | View · !readOnly | Button | "Disable" (lesson) | Calls `updateLessonPublished(l.id, false)`. |
| 29 | View · editorKey=l:id | Container | Schedule editor (lesson) | Same inputs as module schedule editor. |
| 30 | Empty · lessons | Container | `.tree-empty-dropzone` | Renders "Thả bài học vào chương này" when module has no lessons. |
| 31 | View · activeModules=0 | Text | `.content-simple-tree-state` | "Không còn mục đang hiển thị. Hãy khôi phục trong phần mục đã disable." |
| 32 | View · showDisabledSection · !readOnly | Container | `.tree-disabled-section` | Heading "Chương/Bài học đã Disable". |
| 33 | View · disabledCount=0 | Text | `.content-simple-tree-state` | "Không có mục nào đang disable." |
| 34 | View · disabled module | Container | `.tree-disabled-row` | Row labelled "Chương: <title>" with restore/delete buttons. |
| 35 | Click | Button | "Khôi phục" (module) | Calls `updateModulePublished(id, true)`. |
| 36 | Click | Button | "Xóa" (module) | Calls `deleteModulePermanently(id, title)` after `window.confirm("Xóa vĩnh viễn chương \"<title>\" và toàn bộ bài học bên trong?")`. |
| 37 | View · disabled lesson | Container | `.tree-disabled-row` | Row labelled "Bài học: <title> · <module title>". |
| 38 | Click | Button | "Khôi phục" (lesson) | Calls `updateLessonPublished(id, true)`. |
| 39 | Click | Button | "Xóa" (lesson) | Calls `deleteLessonPermanently(id, title)` after a confirm. |

## States & Validation Notes

- The component fetches the course content tree via `COURSES_API.contentTree(courseId)` and the per-lesson resource review states via `COURSES_API.listLessonResources(...)` to compute `reviewStateByLesson`.
- Active vs. disabled split is computed inline: `activeModules` retains modules with `is_published !== false` and filters lessons similarly; disabled rows fall into `disabledModules` or `disabledLessonsByModule`.
- Drag-and-drop uses HTML5 native events to set `draggingModuleId`/`draggingLesson` and `dragOverModuleId`/`dragOverLessonId`/`dragOverLessonModuleId`. Drop triggers `reorderModules` or `reorderLessons`, which PATCH to `COURSES_API.reorderContent` and re-fetch.
- Schedule drafts are kept in `scheduleDrafts` keyed by `m:<id>` or `l:<id>`. `draftToIso()` rejects invalid hour/minute and returns `null`, setting an inline error.
- `readOnly=true` suppresses all mutation affordances: add buttons, drag handles, disable/restore/delete buttons, and schedule editors.
- The "+" toolbar button delegates to `openStudioByPlusIcon`, which creates a new lesson under the last active module and navigates to `/teacher/courses/<courseId>/lessons/<lessonId>/studio?new=1&moduleId=<mid>&pickType=1`.
- Delete operations call `window.confirm` before issuing DELETE requests; failure messages populate the page-level error state.
