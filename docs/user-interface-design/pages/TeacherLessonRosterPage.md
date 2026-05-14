# TeacherLessonRosterPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherLessonRosterPage.tsx`
**Route:** `/teacher/courses/:id/lessons/:lessonId/roster` (guarded by `Authentication allowedRoles={["course_manager", "teacher"]}`)
**Purpose:** Thin full-window wrapper that mounts the shared `TeacherLessonRosterModal` so a lesson roster (learner / submission / grading view) can be opened in a dedicated tab independent of the main teacher workspace.

## Overview

This page is intentionally minimalist: it parses `id` / `lessonId` from the URL params and `title` / `hasQuiz` / `hasAssignment` from query parameters, then renders `TeacherLessonRosterModal` with `open` always true. While the component mounts it toggles the body class `minimal-roster-page` so global page chrome is hidden; closing the modal (via the modal's own controls) tries `window.close()` and falls back to navigating to `/teacher/courses/:id/assessments`. If the route params are invalid the component renders nothing (`return null`).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Loading    | Text         | `.minimal-page-loading` | Renders "Đang tải..." while the `useLayoutEffect` is applying the `minimal-roster-page` body class and `ready` is still `false`. |
| 2   | View       | Modal        | `TeacherLessonRosterModal` | Mounted with `open={true}`, receives `courseId`, `lessonId`, `lessonTitle`, `hasAssignment`, `hasQuiz`, `token`. Hosts the entire roster UX (filters, table, modals) inside this dedicated route. |
| 3   | View       | Param        | `title` query string | Read via `useSearchParams().get("title")`; if absent the page passes `"Bài " + lessonId` as the modal `lessonTitle`. |
| 4   | View       | Param        | `hasQuiz` query string | Treated as boolean (`search.get("hasQuiz") === "1"`); forwarded to the modal. |
| 5   | View       | Param        | `hasAssignment` query string | Treated as boolean (`search.get("hasAssignment") === "1"`); forwarded to the modal. |
| 6   | Click      | Handler      | `onClose` | The modal's close callback is wired to `closePage()`, which attempts `window.close()` then `navigate("/teacher/courses/${courseId}/assessments")`. |
| 7   | Validation | Container    | Param guard | If `Number(id)` or `Number(lessonId)` is `NaN` or zero, the component returns `null` (no UI rendered). |

## States & Validation Notes

- `useAuth()` provides the `accessToken` value passed into the modal so authenticated roster API calls reuse the same token as the main app.
- The component sets and removes the `minimal-roster-page` class on `document.body` via `useLayoutEffect`, ensuring the chrome reset is in place before the first paint.
- `setReady(true)` flips the loading placeholder to the actual modal; without `useLayoutEffect` the body class flicker could appear.
- All roster controls (filters, badge tabs, action buttons, grading modal) live in `TeacherLessonRosterModal`; this page intentionally exposes no other UI elements.
- The close flow is fault-tolerant: `window.close()` is wrapped in `try/catch` because programmatic close is blocked when the tab was not script-opened.
