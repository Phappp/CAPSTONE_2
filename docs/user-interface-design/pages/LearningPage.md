# LearningPage — UI Specification

**Source:** `frontend/src/pages/leaner/LearningPage.tsx`
**Route:** `/learning/:id/:slug`
**Purpose:** Roadmap-style course learning page that visualizes module milestones and lesson nodes, drives lesson playback through a modal, and dispatches quiz/assignment launches to dedicated tabs while tracking heartbeat-based progress.

## Overview
This is the central learner experience for an enrolled course. It fetches course detail (`COURSES_API.learning`) and per-course progress (`COURSES_API.progress`), then computes the visual roadmap. Modules are rendered as alternating left/right milestone nodes connected by SVG link geometry, with per-lesson hit circles laid out along each link. Selecting a lesson opens a contextual "quick pick" allowing the learner to open the lesson modal, the quiz tab, or the assignment tab. While the lesson modal is open the page sends 3-second heartbeats to `COURSES_API.lessonHeartbeat(courseId, lessonId)` and animates a countdown ring; when `can_complete` becomes true the page silently calls `COURSES_API.completeLesson` once. Assessment submission status is pre-fetched for every lesson via `COURSES_API.learnerQuizTake` and `ASSIGNMENTS_API.myAssignmentGrade` to drive warning highlights and completion ticks.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Click      | Button       | learningPage__back | "← Quay lại"; navigates to `/my-courses/{courseId}/{slug}`. Disabled during initial loading. |
| 2   | View       | Heading      | learningPage__title | Renders `course.title` in the top bar. |
| 3   | View       | Text         | learningPage__meta | "Đã hoàn thành {completedLessons}/{totalLessons} bài học · Tiến độ tổng {progressPercent}%". |
| 4   | View       | ProgressBar  | learningPage__progressBar | `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=progressPercent`. |
| 5   | View       | Avatar       | AvatarMenu | Embedded `<AvatarMenu />` in the top bar. |
| 6   | Loading    | Text         | learningPage__loading | "Đang tải bản đồ lộ trình..." while initial fetch is running and `course` is null. |
| 7   | Error      | Container    | learningPage__errorBox | Visible when `error` is set; renders normalized message and a "Quay lại" CTA. |
| 8   | View       | Card         | summaryCard Chương đã mở | "Chương đã mở" with value `{unlockedModules}/{modules.length}`. |
| 9   | View       | Card         | summaryCard Chương hoàn thành | "Chương hoàn thành" with `{completedModules}/{modules.length}`. |
| 10  | View       | Card (highlight) | summaryCard Mục tiêu tiếp theo | "Mục tiêu tiếp theo" plus "Chương {nextModuleOrder}: {nextModule.title}" or "Bạn đã hoàn thành toàn bộ lộ trình". |
| 11  | View       | Container    | learningPage__roadmap | Hosts the SVG link layer and the module milestone nodes; clicking blank space clears `assessmentQuickPick`. |
| 12  | View       | Icon (SVG)   | learningPage__lessonNode | Circle per lesson; modifier classes `--done`, `--todo`, `--warning`, `--focus`, `--processing`, `--next`. |
| 13  | Click/Keyboard | Button (SVG hit) | learningPage__lessonHit | `role="button"`, `aria-label="Mở bài: {title}"`; disabled when `canOpenLesson` is false. Opens `assessmentQuickPick` near the cursor. |
| 14  | View (quickPick) | Container | learningPage__assessmentQuickPick | Floating menu positioned at `(x, y)`; stops propagation. |
| 15  | Click      | Button       | assessmentPickBtn Bài học | Opens the lesson modal (`setLessonModal`). Marked with leading "✓" when already completed. |
| 16  | Click      | Button       | assessmentPickBtn Quizz | Opens `/learner/quiz/{courseId}/{lessonId}?title=...&slug=...` in a new tab. Disabled when the lesson has no quiz. |
| 17  | Click      | Button       | assessmentPickBtn Bài tập | Opens `/learner/assignment/{lessonId}?title=...&courseId=...&slug=...` in a new tab. Disabled when no assignment. |
| 18  | View       | Button       | learningPage__milestone | Module milestone with status classes `--completed`, `--unlocked`, `--locked`. `aria-label` "Chương {idx+1}: {title}. {status}. {n} bài học". |
| 19  | Click      | Button       | milestone button | Navigates to `/learning/{courseId}/{slug}/modules/{m.id}` when `canClick` is true. |
| 20  | Empty      | Text         | learningPage__empty | "Chưa có chương nào." when `modules` is empty. |
| 21  | View       | Modal        | learningPage__lessonModal | Visible when `lessonModal` is set; backdrop click closes the modal and refreshes progress. |
| 22  | Click      | Button       | learningPage__lessonModalClose (×) | `aria-label="Dong"`; closes the modal and triggers `fetchProgress()`. |
| 23  | View       | Heading      | learningPage__lessonModalTitle | Lesson title or fallback "Bài học". |
| 24  | Click      | Button       | learningPage__lessonModalActBtn | One per assessment kind on this lesson ("Quizz" or "Bài tập"); opens the assessment in a new tab and closes the modal. |
| 25  | Loading    | Text         | learningPage__lessonModalEmpty (loading) | "Đang tải tài nguyên..." while fetching `COURSES_API.listLessonResources`. |
| 26  | Error      | Text         | learningPage__lessonModalEmpty (error) | Shows `lessonModalError` from `normalizeLearnerErrorMessage`. |
| 27  | View (YouTube) | VideoPlayer | learningPage__lessonModalFrame | Iframe pointing to `https://www.youtube.com/embed/{id}` with `allowFullScreen`. |
| 28  | View (image) | Image      | learningPage__lessonModalImage | Renders the resource `<img>` when mime starts with `image/`. |
| 29  | View (video) | VideoPlayer | learningPage__lessonModalVideo | HTML5 `<video>` with `controls` when mime starts with `video/`. |
| 30  | View (pdf/text) | Iframe | learningPage__lessonModalFrame | Iframe for PDFs or text/* mimes. |
| 31  | View (other mime) | Link | Mở tệp Link | Renders fallback "Không thể hiển thị trực tiếp tệp này." followed by `<a target="_blank">Mở tệp</a>`. |
| 32  | View (no resource) | Text | learningPage__lessonModalEmpty | "Bài học chưa có tài nguyên." when no resource and no description. |
| 33  | View (description only) | Text | learningPage__lessonModalText | Renders `modalLesson.description` when no resource is loaded. |
| 34  | Click      | Button       | Previous Button | "← Previous"; opens previous unlocked lesson; disabled when `!modalCanGoPrev`. |
| 35  | Click      | Button       | Next Button | "Next →"; opens next unlocked lesson; disabled when `!modalCanGoNext`. |
| 36  | View (lessonModalNavPick) | Container | learningPage__lessonModalNavPick | Inline picker when the target lesson has both quiz and assignment; label "Chọn đích:". |
| 37  | Click      | Button       | lessonModalNavPickBtn | Opens the chosen assessment ("Quizz" or "Bài tập") in a new tab. |
| 38  | View (lessonModal & heartbeat with required_seconds > 0) | ProgressBar | learningPage__countdown | Floating circular countdown ring; modifier `--ready` when `heartbeat.can_complete` is true; CSS custom property `--pct` reflects `countdownRemainingPct`. |

## States & Validation Notes
- `normalizeLearnerErrorMessage` maps "ghi danh hợp lệ"/"chưa đăng ký khóa học này" to "Bạn không còn quyền học khóa này (có thể đã dừng hoặc hết hạn)."; "không thể truy cập bài học"/"chưa mở theo lịch" to "Bài học chưa mở hoặc bạn chưa đủ điều kiện truy cập."; empty errors become "Đã xảy ra lỗi. Vui lòng thử lại.".
- `canOpenLesson(moduleId, lessonId)` requires the module to be unlocked, not future-dated, and the lesson id to be in `unlocked_lesson_ids` (or the first module when progress has not loaded).
- `isWarningLesson` flags completed video/text lessons whose quiz or assignment has not been submitted, and where the next lesson (in module or first lesson of next module) is still locked.
- The heartbeat loop posts `delta_seconds=1` on entry, then `3` every 3 s. On unmount it posts a final 1 s delta. Successful response updates `heartbeat`, `countdownRemainingPct`, and may trigger `tryCompleteLesson` once (`completedAttemptedRef` deduplicates calls).
- Quiz and assignment status are aggregated per-lesson into `assessmentSubmittedByLessonId`, controlling the "✓" indicators and warning behavior.
- Roadmap link geometry is recomputed on resize, font-load, animation completion, and `ResizeObserver` events; lessons cluster along link segments with adjustable lane offsets.
- Backdrop click on the lesson modal closes the modal and forces a `fetchProgress()` to refresh unlock state.
