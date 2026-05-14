# TeacherAssignmentEditorPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherAssignmentEditorPage.tsx`
**Route:** `/teacher/courses/:id/assignment-editor` (guarded by `Authentication` with roles `course_manager` / `teacher`)
**Purpose:** Server-style redirect shim that normalises legacy assignment-editor URLs into the unified Lesson Studio route (`/teacher/courses/:id/lessons/:lessonId/studio?section=assignment`).

## Overview
This page renders nothing visible. On mount, it reads `id` from `useParams` and `lessonId` from `useSearchParams`. When `courseId` is invalid it redirects to `/teacher/dashboard`; when `lessonId` is missing it redirects to `/teacher/courses/{courseId}/assessments`; otherwise it redirects to the Lesson Studio assignment section. All redirects use `navigate(..., { replace: true })`, so the entry never enters the history stack.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | Load (mount) | Hook | `useParams().id` | Parses route param `id` and coerces with `Number(id)` into `courseId`. |
| 2 | Load (mount) | Hook | `useSearchParams()` | Reads query string parameter `lessonId`; `pickedLessonId = Number(lessonIdRaw)` when present, otherwise `null`. |
| 3 | Load (invalid courseId) | Navigation | `/teacher/dashboard` | When `!courseId` or `Number.isNaN(courseId)`, calls `navigate("/teacher/dashboard", { replace: true })`. |
| 4 | Load (missing lessonId) | Navigation | `/teacher/courses/{courseId}/assessments` | When `pickedLessonId` is falsy or NaN, replaces URL with the course assessments page. |
| 5 | Load (valid params) | Navigation | `/teacher/courses/{courseId}/lessons/{lessonId}/studio?section=assignment` | Default redirect target; mounts the unified Lesson Studio with the assignment section preselected. |
| 6 | View | Empty render | `null` | Component returns `null`; no DOM output is produced. |

## States & Validation Notes
- The effect dependency array is `[courseId, pickedLessonId, navigate]`; redirects fire only on change.
- All `navigate` calls use `replace: true` so the user cannot navigate back to this transient route.
- Because rendering returns `null`, no spinner, error, or fallback UI is presented — the route is purely a redirect controller and relies on the destination pages to display feedback.
- Numeric coercion: malformed `:id` or `?lessonId=` produce `NaN`, triggering the upstream fallback redirects.
