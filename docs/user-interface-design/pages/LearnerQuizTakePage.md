# LearnerQuizTakePage — UI Specification

**Source:** `frontend/src/pages/leaner/LearnerQuizTakePage.tsx`
**Route:** `/learner/quiz/:courseId/:lessonId`
**Purpose:** Minimal full-page wrapper that hosts the `LearnerQuizTake` workflow for a single lesson, typically opened in a separate tab from the learning roadmap.

## Overview
The page is gated by `Authentication` and `LearnerSidebarLayout`, but it applies the `minimal-quiz-page` class to `document.body` so it visually escapes the layout chrome. Both `courseId` and `lessonId` URL parameters are required and parsed as numbers; if either fails validation, the component returns `null`. The optional `title` query parameter is forwarded as `lessonTitle`; the optional `slug` parameter is used by the `onClose` handler to navigate back to `/learning/{courseId}/{slug}` when the embedded `window.close()` call cannot terminate the tab. The entire quiz experience (questions, timer, submission, attempts list) is delegated to `<LearnerQuizTake>`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View (invalid courseId/lessonId) | Container | null guard | Returns `null` when either id parses to 0 or `NaN`. |
| 2   | Loading    | Text         | minimal-page-loading | "Đang tải..." shown while `ready` is false. |
| 3   | View       | Container    | LearnerQuizTake | Renders `<LearnerQuizTake courseId={cid} lessonId={lid} lessonTitle={title} token={accessToken} onClose={closePage} onCompleted={noop} />`. |
| 4   | Click (component internal) | Button | onClose handler | Invokes `window.close()`; if `learningSlug` is present, redirects via `navigate("/learning/{cid}/{encodeURIComponent(slug)}", { replace: true })`, otherwise `navigate(-1)`. |
| 5   | Submit (component internal) | Callback | onCompleted | Empty handler (no-op per source comment). |

## States & Validation Notes
- `cid` and `lid` are derived from `Number(useParams().courseId)` / `Number(useParams().lessonId)`; both must be truthy and finite to render the wrapper.
- `lessonTitle` falls back to `Bài {lid}` when the `title` query param is missing.
- `useLayoutEffect` toggles the `minimal-quiz-page` class on `document.body`; cleanup removes it on unmount.
- `closePage` is best-effort: if `window.close()` is blocked, the user is routed back into the learning roadmap.
- All quiz rendering, scoring feedback, and attempt history are owned by `LearnerQuizTake` (separate component specification).
