# TeacherLessonRosterModal — UI Specification

**Source:** `frontend/src/components/TeacherLessonRosterModal.tsx`
**Type:** Shared Component
**Purpose:** Teacher modal that lists learners enrolled in a lesson with two tabs — assignment submissions (with grading workflow) and quiz attempt scores — backed by the assignment roster and quiz-scores APIs.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `open` | `boolean` | — | Controls visibility; component returns `null` when false. |
| `onClose` | `() => void` | — | Closes the modal (also triggered by overlay click). |
| `courseId` | `number` | — | Course identifier for the quiz scores endpoint. |
| `lessonId` | `number` | — | Lesson identifier used by both endpoints. |
| `lessonTitle` | `string` | — | Displayed in the modal header. |
| `hasAssignment` | `boolean` | — | Enables and defaults to the assignment tab when true. |
| `hasQuiz` | `boolean` | — | Enables the quiz tab. |
| `token` | `string \| null` | — | Bearer token used in API requests. |

## Overview

On open, the modal locks `document.body.style.overflow` and selects the default tab (assignment if available, otherwise quiz). It fetches the roster for the active tab via `assignmentLearnerRoster` or `quizLearnerScores`, populates score and feedback drafts from existing grades, and renders an expandable row per learner. Teachers grade a submission by entering a score in `[0, max_score]` and an optional textarea note, then submitting via `gradeSubmission`. Quiz tab is read-only — it summarizes each learner's attempts with pass/fail status. Both tabs support an in-modal name/email search filter, and the quiz tab also shows passing-score and max-attempts meta.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Modal | `tlr-overlay` / `tlr-panel` | Overlay closes on click; panel uses `role="dialog" aria-modal="true"` and `aria-labelledby="tlr-title"`. |
| 2 | View | Heading | `tlr-title` | "Theo dõi bài học: {lessonTitle}". |
| 3 | View | Text | `tlr-sub` | Static subtitle "Danh sách học viên đã ghi danh · bài tập & điểm quiz". |
| 4 | Click | Button | `tlr-close` ("×") | Calls `onClose`. |
| 5 | Click | Tab | "Bài tập" tab | Visible when `hasAssignment`; toggles `tab = "assignment"`. |
| 6 | Click | Tab | "Quiz" tab | Visible when `hasQuiz`; toggles `tab = "quiz"`. |
| 7 | Loading | Text | "Đang tải…" (assignment) | Visible while `loadingA`. |
| 8 | Error | Container | `tlr-error` (assignment) | Renders `errA` when present. |
| 9 | Empty | Text | No-assignment fallback | "Bài học chưa có bài tập." when fetch returned without assignment payload. |
| 10 | View | Text | Assignment meta | "{title} · Thang điểm: {max_score}". |
| 11 | View | TextInput | Assignment search input | Placeholder "Tìm theo tên hoặc email..."; filters learner rows by lowercased name/email. |
| 12 | View | Card | Summary cards | Two `tlr-summary-card` boxes showing "Đã nộp" and "Chưa nộp" counts versus total. |
| 13 | View | Table | `tlr-table` (assignment) | Columns: STT, Học viên, Email, Trạng thái nộp, action cell. |
| 14 | View | Badge | "Đã nộp" / "Chưa nộp" badges | Green when submitted (`tlr-badge--ok tlr-badge--submitted`), red otherwise. |
| 15 | View | Badge | "· Muộn" indicator | Appended when `submission.is_late` is true. |
| 16 | View | Badge | "Đã chấm" badge | Visible when `graded_score` set or `status === "graded"`. |
| 17 | Click | Button | `tlr-linkbtn` "Xem và chấm" / "Thu gọn" | Toggles inline detail row for the submission. |
| 18 | View | Container | Expanded submission row | Two-column layout (`tlr-preview` + `tlr-grade`). |
| 19 | View | Text | `tlr-preview` content | Heading "Nội dung nộp (tóm tắt)" followed by `submission.content_preview`. |
| 20 | View | List | Short-answer list | Rendered when `submission_short_answers` has entries; each "Câu {idx+1}: {answer_text}" with "—" fallback. |
| 21 | View | Text | Attachment count | "Có {attachment_count} file đính kèm." when attachments exist. |
| 22 | View | List | Attachment files | Heading "File đã nộp"; bullet list of links resolved via `resolveAttachmentUrl` (prefixes `url` for relative paths). |
| 23 | View | TextInput (number) | "Điểm (0–{maxScore})" input | Min 0, max `maxScore`, step 0.01; mirrors `scoreDraft[submission_id]`. |
| 24 | View | Textarea | "Nhận xét" textarea | 3 rows; binds to `feedbackDraft[submission_id]`. |
| 25 | Click | Button | `tlr-primary` "Lưu điểm" / "Đang lưu…" | Calls `submitGrade(submission_id, maxScore)`; disabled while `gradingId === submission_id`. |
| 26 | View | Text | Already-graded note | "Đã chấm trước đó: {graded_score}" with "· Đã duyệt" when status is graded. |
| 27 | Loading | Text | "Đang tải…" (quiz) | Visible while `loadingQ`. |
| 28 | Error | Container | `tlr-error` (quiz) | Renders `errQ` when present. |
| 29 | Empty | Text | No-quiz fallback | "Bài học chưa có quiz." after fetch with empty payload. |
| 30 | View | Text | Quiz meta | "{title} · Điểm đạt: {passing_score}% · Tối đa {max_attempts} lần làm". |
| 31 | View | TextInput | Quiz search input | Same placeholder/filter behavior as assignment search. |
| 32 | View | Table | `tlr-table` (quiz) | Columns: STT, Học viên, Email, "Điểm các lần làm (%)". |
| 33 | Empty | Text | "Chưa làm" placeholder | Shown when learner has no attempts. |
| 34 | View | List | `tlr-attempts` per-learner | Lists each attempt as "Lần {n}: {score}% · Đạt/Chưa đạt · {datetime}". |
| 35 | View | Text | Neither-feature fallback | When neither `hasAssignment` nor `hasQuiz` is true: "Bài học chưa gắn quiz hoặc bài tập trên cây nội dung. Hãy dùng \"Soạn Quizz\" / \"Soạn bài tập\" trước, rồi mở lại để xem danh sách học viên và điểm." |
| 36 | Validation | Behavior | Grade validation | Submit blocked unless score parses as a number within `[0, maxScore]`; otherwise toasts "Vui lòng nhập điểm hợp lệ." or "Điểm phải từ 0 đến {maxScore}.". |

## States & Validation Notes

- Body scroll lock is applied on open (`document.body.style.overflow = "hidden"`) and restored on close via cleanup.
- After successful grading, `loadAssignment()` re-fetches the roster so the new grade and "Đã chấm" badge appear.
- The overlay listens for clicks to close; the panel calls `stopPropagation` so internal clicks do not dismiss it.
- Tab defaulting effect prefers `assignment` when both features exist; quiz becomes default only when `hasAssignment` is false.
- When `open` toggles false, `expanded`, `roster`, `quizData`, `errA`, and `errQ` are all cleared.
- Attachment URLs that are absolute (`http(s)://`) are passed through; relative paths are prefixed with `baseUrl` and a leading slash if missing.
- `maxScore` defaults to `10` when `roster.assignment` is missing, guarding the grade input's `max` attribute.
- Search filter uses lowercase substring match across `full_name` and `email`.
