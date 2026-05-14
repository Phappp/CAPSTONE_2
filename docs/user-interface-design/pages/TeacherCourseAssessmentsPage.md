# TeacherCourseAssessmentsPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherCourseAssessmentsPage.tsx`
**Route:** `/teacher/courses/:id/assessments` (guarded by `Authentication` with roles `course_manager` / `teacher`)
**Purpose:** Displays a flat lesson-by-lesson table for the current course so teachers can launch the Quiz Editor, Assignment Editor, or roster pages for each lesson in new tabs.

## Overview
The page fetches `COURSES_API.detail(courseId)` and `COURSES_API.contentTree(courseId)` in parallel and flattens module→lesson into `rows: LessonRow[]` annotated with module/lesson order and `has_quiz` / `has_assignment` booleans. Local state `loading`, `error`, `courseTitle`, `rows`, and the memoised `displayRows` (which inject a `showModule` flag to merge consecutive rows from the same module) drive rendering. The table exposes action buttons that open the Quiz Editor, Assignment Editor, and Lesson Roster in new browser tabs via `window.open`. Several elements (header back-buttons, summary card, reload toolbar) remain in the source but are currently commented out and therefore not rendered.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `dashboard-page teacher-course-overview` root | Outer wrapper for the assessments view. |
| 2 | Error | Container | `error-box` | Renders the value of `error` when API calls fail (e.g. "Không tải được khóa học.", "Không tải được nội dung khóa học.", "Lỗi tải dữ liệu."). |
| 3 | Loading (initial) | Text | "Đang tải…" placeholder | Visible when `loading && !rows.length`; renders inside `chart-card teacher-course-overview__loading`. |
| 4 | View | Heading | "Danh sách bài học" | Title of the lessons table (`chart-card-title`). |
| 5 | View | Table | Lesson assessment table | Columns: "Chương", "Bài", "Quizz", "Bài tập", "Thao tác". |
| 6 | View (row) | Text | Module label | Shows `{moduleOrder}. {moduleTitle}` only on the first row of each module (`displayRows[idx].showModule`); blank otherwise. |
| 7 | View (row) | Text | Lesson label | Shows `{lessonOrder}. {lesson.title}`. |
| 8 | View (row) | Text | Has Quiz indicator | Displays "Có" when `r.has_quiz`, otherwise "—". |
| 9 | View (row) | Text | Has Assignment indicator | Displays "Có" when `r.has_assignment`, otherwise "—". |
| 10 | Click (row) | Button | "Soạn Quizz" | Calls `openEditorTab(r.id, "quiz")` → opens `/teacher/courses/{courseId}/quiz-editor?lessonId={id}` in a new tab (`window.open(..., "_blank", "noopener,noreferrer")`). |
| 11 | Click (row) | Button | "Soạn bài tập" | Calls `openEditorTab(r.id, "assignment")` → opens `/teacher/courses/{courseId}/assignment-editor?lessonId={id}` in a new tab. |
| 12 | Conditional (row) | Button | "Danh sách / điểm" | Visible only when `r.has_assignment || r.has_quiz`. Calls `openRoster(r)` → opens `/teacher/courses/{courseId}/lessons/{id}/roster?title=…&hasQuiz=…&hasAssignment=…` in a new tab. Styled with indigo accent (`borderColor: "#4f46e5"`, `color: "#4338ca"`). |
| 13 | Empty | Text | "Chưa có bài học. Hãy thêm chương/bài ở trang xây dựng nội dung." | Shown beneath the table when `!rows.length && !loading`. |
| 14 | View (hidden) | Container | Commented header block | The original top bar (`back-button` "← Tổng quan khóa học", "Chỉnh sửa khóa học", `AvatarMenu`) is commented out in source. |
| 15 | View (hidden) | Container | Commented summary card | The original `chart-card` showing "Quản lý Quizz & bài tập", course title, "Tải lại" and "Xây dựng nội dung" buttons is commented out in source. |

## States & Validation Notes
- `courseId = Number(params.id)`; when `!courseId || Number.isNaN(courseId)` the component returns `null` (route is treated as invalid).
- `authHeaders` is memoised and adds `Authorization: Bearer ${token}` only when an access token is present in storage.
- `load()` runs in `useEffect` on mount and whenever `[courseId, authHeaders]` change. It fetches detail + content tree in parallel; either failure populates `error` and clears `rows`.
- `LessonRow.moduleOrder` and `lessonOrder` are derived from array index (1-based) inside the response, not from server fields.
- `displayRows` injects `showModule` to suppress duplicate module labels for consecutive rows from the same module.
- All "Soạn …" and roster actions intentionally open in a new tab to preserve the current assessments listing.
- The component is also embedded inside `TeacherCourseContentBuilderPage` (assessment tab) but currently that embed is commented out.
