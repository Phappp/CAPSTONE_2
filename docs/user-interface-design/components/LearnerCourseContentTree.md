# LearnerCourseContentTree — UI Specification

**Source:** `frontend/src/components/LearnerCourseContentTree.tsx`
**Type:** Shared Component
**Purpose:** Render a learner-facing course module/lesson tree with progressive unlocking, resource previews (PDF / image / video / YouTube / Office / lesson text), heartbeat tracking and side columns for quizzes and assignments.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `courseId` | `number` | — | Active course identifier used by API endpoints. |
| `courseSlug` | `string \| null` | `undefined` | Slug appended to quiz/assignment tab URLs for back-navigation. |
| `modules` | `ModuleItem[]` | — | Tree of modules with lessons. |
| `courseThumbnailUrl` | `string \| null` | `undefined` | Fallback thumbnail for lesson cards. |
| `progress` | `CourseProgress \| null` | `undefined` | Aggregate progress including completed/unlocked lesson IDs. |
| `refreshProgress` | `() => Promise<void> \| void` | `undefined` | Callback invoked after lesson completion to refetch progress. |
| `variant` | `"full" \| "module-lessons"` | `"full"` | Visual layout flag — `module-lessons` hides chapter headers. |
| `initialLessonId` | `number \| null` | `null` | Lesson to auto-open on mount (deep link). |
| `initialAssessmentKind` | `"quiz" \| "assignment" \| null` | `null` | Forces auto-open as quiz or assignment when present. |

## Overview

Used inside learner course pages to navigate chapters and consume lesson content. Each lesson renders as a clickable card with thumbnail, type badge, completion pill and lock pill. The component issues periodic heartbeat requests while the resource viewer is open, drives a circular countdown ring, and tries `completeLesson` once the backend signals `can_complete`. Quizz and assignment items render in side columns and open in new browser tabs (`/learner/quiz/...` and `/learner/assignment/...`). The viewer dispatches to specialized renderers (YouTube iframe, Office Online iframe, raw blob, image, video, lesson-text fallback).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | Error | Container | `learnerTreeError` banner | Shown when `resourceError` is non-null with failure message. |
| 2 | Loading | Text | `learnerTreeLoading` | Displays "Đang tải nội dung..." while initial resources are fetched and the cache is empty. |
| 3 | View | Graph/Canvas | Countdown ring | Visible while viewer is open and `heartbeat.required_seconds > 0`; SVG circle uses `--pct` CSS variable; toggles `learnerTreeCountdown--ready` when `can_complete` is true. |
| 4 | View | Container | Module section | Iterates over `modules`; only renders when not locked and not collapsed. |
| 5 | View | Badge | `learnerTreeModule__badge` | Shows "Chương {moduleIdx+1}". |
| 6 | Click | Button | `learnerTreeModule__titleBtn` | Toggles collapse for the module; disabled while `moduleLocked` or in `module-lessons` variant. |
| 7 | Click | Button | `learnerTreeModule__collapseBtn` | Displays "＋" when collapsed and "−" when expanded; same disable rules as ID 6. |
| 8 | View | Text | `learnerTreeModule__emptyHint` | Reads "Chương này chỉ có Quizz / bài tập — xem cột bên phải." when no core lesson exists. |
| 9 | View | Card | `learnerTreeLesson` (core) | Lesson card with index "Bài học {n}", thumbnail, lock/complete pills; role `button` if unlocked, `group` if locked; `tabIndex` is `-1` when locked. |
| 10 | Click | Button | `learnerTreeLesson__thumbBtn` | Opens the latest resource via `openResource(latest)`. Disabled when locked or no resource available. |
| 11 | View | Image | Lesson thumbnail | Shows YouTube hqdefault, the resource preview, the courseThumbnailUrl, or `FilePreviewIcon` SVG fallback. |
| 12 | View | Icon | `learnerTreeLesson__quizThumb` / `learnerTreeLesson__assignThumb` | Emoji "📝" for quiz cards, "📋" for assignment cards (compact mode). |
| 13 | View | Badge | `learnerTreeLesson__durationPill` | Displays formatted YouTube duration when computed. |
| 14 | View | Icon | `learnerTreeLesson__playOverlay` | SVG play triangle overlaid on YouTube/video thumbnails. |
| 15 | View | Badge | `learnerTreeLesson__typeBadge` | Shows "Quiz" or "Bài tập" labels when applicable and `hideTypeBadge` is false. |
| 16 | View | Text | `learnerTreeLesson__unlockHint` | Visible when locked — shows hint such as `Ch.{n} · Sau Bài học {m}` or attached-assessment hint. |
| 17 | View | Badge | `learnerTreeLesson__statusPill--locked` | Displays "Bị khóa", "Bị khóa (mở {time})", "Chưa mở khóa" with tooltip showing full unlock datetime. |
| 18 | View | Badge | `learnerTreeLesson__statusPill--completed` | Reads "Hoàn thành" when `completedSet` contains the lesson id. |
| 19 | View | Container | `learnerTreeModule__quizColumn` | Aside column titled "Quizz" listing standalone and attached quiz entries. |
| 20 | View | Heading | `learnerTreeModule__quizHeading` | Static heading "Quizz". |
| 21 | View | Container | `learnerTreeModule__assignColumn` | Aside column titled "Bài tập" listing standalone and attached assignment entries. |
| 22 | View | Heading | `learnerTreeModule__assignHeading` | Static heading "Bài tập". |
| 23 | Click | Card | Quiz card | When unlocked, opens `/learner/quiz/{courseId}/{lessonId}?title=...&slug=...` in a new tab via `window.open`. |
| 24 | Click | Card | Assignment card | When unlocked, opens `/learner/assignment/{lessonId}?title=...&courseId=...&slug=...` in a new tab. |
| 25 | Keyboard | Card | Lesson/quiz/assignment card | Enter or Space key triggers the same open action as click when unlocked. |
| 26 | View | Modal | Resource viewer overlay | Fixed-position dialog (`role="dialog" aria-modal="true"`); closes on backdrop click or "Đóng" button. |
| 27 | View | Text | Viewer header title | Shows resource filename, or "Đang tải..." while `state.loading` is true. |
| 28 | Click | Button | Viewer close button | Reads "Đóng"; calls `closeViewer` and revokes any blob URL. |
| 29 | View | Container | Viewer content area (YouTube) | Embeds `https://www.youtube.com/embed/{id}?autoplay=1&rel=0` in an iframe with permitted features. |
| 30 | View | Container | Viewer content area (lessonText) | Pre-wrapped block displaying `state.content` or "Không có nội dung." when empty. |
| 31 | View | Container | Viewer content area (office) | Iframe pointing at `view.officeapps.live.com/op/view.aspx?src=...` for `.doc`/`.docx`. |
| 32 | View | Container | Viewer content area (pdf/text) | Iframe loading the blob URL of the resource. |
| 33 | View | Image | Viewer image | Renders image blob centered with `object-fit: contain`. |
| 34 | View | Container | Viewer video | HTML `<video>` element with controls and autoplay. |
| 35 | View | Link | Viewer download fallback | "Tải xuống: {filename}" link with `download` attribute when content type unsupported. |
| 36 | Loading | Text | Viewer loading state | Shows centered "Đang tải..." while resource is being fetched. |
| 37 | Validation | Behavior | Heartbeat tick | POSTs `delta_seconds: 1` immediately, then every 3000 ms `delta_seconds: 3`; local animation timer updates ring at 120 ms cadence. |
| 38 | Submit | Behavior | `tryCompleteLesson` | Called when `heartbeat.can_complete` is true; POSTs to `completeLesson`, refreshes progress; retries allowed on error. |

## States & Validation Notes

- `progress` controls unlock semantics: when omitted, only the first lesson of the first module is unlocked by default.
- `attachedUnlocked(id)` returns true only when both `unlockedSet` and `completedSet` contain the lesson id — meaning attached quizzes/assignments unlock after the host lesson is completed.
- The component pre-fetches resources only for unlocked lessons to avoid backend 403 errors.
- YouTube duration retrieval is lazy and uses the YouTube IFrame Player API; failures leave duration as `null`.
- Object URLs created for blob viewers are revoked on viewer close and component unmount.
- Resource viewer click handlers stop propagation so clicks on content do not dismiss the overlay; clicks on the backdrop call `onClose`.
- `initialLessonId` and `initialAssessmentKind` deep-link logic runs once per change and is guarded by `initialLessonHandledRef`.
