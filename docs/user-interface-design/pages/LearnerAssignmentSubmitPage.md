# LearnerAssignmentSubmitPage — UI Specification

**Source:** `frontend/src/pages/leaner/LearnerAssignmentSubmitPage.tsx`
**Route:** `/learner/assignment/:lessonId`
**Purpose:** Minimal full-page wrapper that hosts the `LearnerAssignmentSubmit` workflow for a single lesson outside the standard learner shell.

## Overview
Rendered inside `LearnerSidebarLayout` but immediately attaches the `minimal-assignment-page` class to `document.body` so the wrapper takes over the viewport. The page reads `lessonId` from the URL, plus `title`, `courseId`, and `slug` from the query string, and delegates the entire submission UI to the `<LearnerAssignmentSubmit>` component. On close it attempts `window.close()` (the page is typically opened in a new tab from `LearningPage`) and falls back to `navigate("/learning/{courseId}/{slug}")` or `navigate(-1)` if metadata is missing. Returns `null` when the `lessonId` is invalid.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View (invalid lessonId) | Container | null guard | When `Number(lessonId)` is 0 or `NaN`, the component returns `null` (renders nothing). |
| 2   | Loading    | Text         | minimal-page-loading | While `ready` is false (before `useLayoutEffect`), renders `<main className="minimal-page-loading">Đang tải...</main>`. |
| 3   | View       | Container    | LearnerAssignmentSubmit | Renders the `<LearnerAssignmentSubmit>` component with props `lessonId`, `lessonTitle`, `token` from `useAuth().accessToken`, `onClose`, and `onSubmitted`. |
| 4   | Click (component internal) | Button | onClose handler | Invokes `window.close()`; on failure navigates to `/learning/{learningCourseId}/{encodeURIComponent(learningSlug)}` when both query params are valid, otherwise calls `navigate(-1)`. |
| 5   | Submit (component internal) | Callback | onSubmitted | Empty handler (per source comment: "Không cần cập nhật tab gốc tại đây."). |

## States & Validation Notes
- `lessonId` URL parameter must parse as a positive integer; failure short-circuits the render to `null`.
- `lessonTitle` defaults to `Bài {lessonId}` when `title` query param is missing.
- `learningCourseId` is parsed from the `courseId` query parameter; the fallback navigation requires both `learningSlug` and `learningCourseId > 0`.
- `useLayoutEffect` toggles the `minimal-assignment-page` class on `document.body` and clears it on unmount.
- All assignment file pickers, validations, status messages, and submit buttons are owned by the `LearnerAssignmentSubmit` component (see its own UI specification).
