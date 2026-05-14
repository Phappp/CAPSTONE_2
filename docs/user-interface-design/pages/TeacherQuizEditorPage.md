# TeacherQuizEditorPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherQuizEditorPage.tsx`
**Route:** `/teacher/courses/:id/quiz-editor` (guarded by `Authentication allowedRoles={["course_manager", "teacher"]}`; expects optional `?lessonId=<id>`)
**Purpose:** Compatibility shim that immediately redirects legacy "quiz editor" deep links into the consolidated Lesson Studio with the quiz section preselected.

## Overview

This route exists solely to keep older URLs working. The component reads the URL `:id` and the `lessonId` query parameter, validates them, then issues a single `navigate(..., { replace: true })` inside `useEffect`. It renders `null` — no visible markup is produced. If the course id is missing or `NaN` the user is sent to `/teacher/dashboard`; if the `lessonId` is missing or `NaN` the user is sent to the course-level assessments page; otherwise the user is forwarded to `/teacher/courses/${courseId}/lessons/${lessonId}/studio?section=quiz` where the real quiz editor (inside `TeacherLessonStudioPage`) takes over.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Container    | (none) | The component returns `null`; no DOM is rendered. |
| 2   | Validation | Param        | `id` route param | Parsed via `Number(id)`; when `NaN` or zero the `useEffect` redirects to `/teacher/dashboard`. |
| 3   | Validation | Param        | `lessonId` query param | Parsed via `Number(searchParams.get("lessonId"))`; when missing / `NaN` the page redirects to `/teacher/courses/${courseId}/assessments`. |
| 4   | View       | Redirect     | Lesson Studio quiz section | When both ids are valid the `useEffect` calls `navigate(\`/teacher/courses/${courseId}/lessons/${pickedLessonId}/studio?section=quiz\`, { replace: true })`. |

## States & Validation Notes

- The redirect lives inside a single `useEffect` whose dependency array is `[courseId, pickedLessonId, navigate]`, so it fires once per render with stable params.
- All redirects use `{ replace: true }` so the legacy URL is removed from the browser history and the back button skips this transition.
- Because the component renders `null`, there is no transient flash of UI — users land directly on the destination route.
- No data fetching, error handling, or user-facing controls exist on this page; all editor behaviour is owned by `TeacherLessonStudioPage` (see `TeacherLessonStudioPage.md`).
