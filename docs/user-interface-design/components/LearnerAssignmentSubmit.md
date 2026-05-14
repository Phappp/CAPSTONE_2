# LearnerAssignmentSubmit — UI Specification

**Source:** `frontend/src/components/LearnerAssignmentSubmit.tsx`
**Type:** Shared Component
**Purpose:** Modal that lets a learner read the assignment, submit answers/files (or short answers), view grading status, and review the latest submitted attempt.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `lessonId` | `number` | — | Lesson identifier used to fetch the learner's assignment payload. |
| `lessonTitle` | `string` | — | Fallback heading text when the assignment payload has not loaded. |
| `token` | `string \| null` | — | Bearer token for authenticated requests. |
| `onClose` | `() => void` | — | Closes the modal. |
| `onSubmitted` | `() => void` | — | Invoked after a successful submission so the parent can refresh. |

## Overview

Mounted from the learner course view when the user opens an assignment lesson, this component fetches the assignment via `ASSIGNMENTS_API.learnerAssignmentForLesson(lessonId)`, optionally starts a countdown timer for `short_answer` kinds (persisted in `localStorage` per assignment id), and renders a form that branches by `assignment_kind`. After submission it loads grading state via `ASSIGNMENTS_API.myAssignmentGrade(assignmentId)` and shows the latest attempt (text content / files / short answers) along with score and feedback. State branches: loading, error, submit-open, submit-closed (due/attempts/time exhausted), submitted (doneMsg), graded.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Modal | learner-quiz-overlay | Overlay dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="learner-asg-title"`; max-width 2000. |
| 2 | View | Heading | Title | `<h2 id="learner-asg-title">` shows `assignment.title` or fallback `lessonTitle`. |
| 3 | View · !assignment | Text | "Đang tải…" | Sub-heading replaced by "Nộp bài tập theo hướng dẫn giảng viên." once loaded. |
| 4 | Click | Button | "Đóng" | Calls `onClose`. |
| 5 | View · assignment | Container | learner-quiz-meta | Row of metadata badges: Hạn nộp, Thang điểm, Điểm đạt, Dạng (File / văn bản · Trả lời ngắn), Thời gian làm bài + Còn lại, Lượt nộp. |
| 6 | View · short_answer · time_limit | Text | Timer label | `mm:ss` countdown; turns red (`#dc2626`) when ≤60s. |
| 7 | View | Text | Lượt nộp | `${usedSubmitAttempts}/${maxSubmitAttempts}`. |
| 8 | Loading | Text | "Đang tải bài tập…" | Body placeholder while `loading`. |
| 9 | Error | Container | learner-quiz-error | Renders normalized error message (e.g., "Bài học chưa mở hoặc bạn chưa đủ điều kiện truy cập."). |
| 10 | View · gradeRow | Card | "Trạng thái & điểm" | Box showing grading summary. |
| 11 | View · gradeRow=null | Text | "Bạn chưa nộp bài tập." | Empty grading state. |
| 12 | View · gradeRow.status=graded | Text | Điểm | Renders `${gradeRow.score} / ${assignment.max_score}` and optional feedback (Nhận xét). |
| 13 | View · gradeRow.status=submitted | Text | "Đã nộp · <datetime>" | Pending-grade message: "Giảng viên chưa chấm điểm…". |
| 14 | View · gradeRow.submission_id | Card | "Bài đã nộp gần nhất" | Section listing the latest submitted content. |
| 15 | View · short_answer answers | List | Submitted short answers | Each card shows "Câu N" and `answer_text` (or "—"). |
| 16 | View · file_prompt submission_text | Text | Nội dung văn bản | Pre-wrapped textual submission. |
| 17 | View · submission_attachments | List | File đã nộp | Renders anchors using `signed_url` (falls back to `file_path`) opening in a new tab. |
| 18 | View · doneMsg | Text | doneMsg | Green confirmation text after successful submit. |
| 19 | View · submitClosedReason | Text | submitClosedReason | Orange warning: "Đã hết thời gian làm bài…", "Đã dùng hết lượt nộp…", or "Đã hết thời hạn nộp bài. Form nộp đã được đóng.". |
| 20 | View · open · description | Text | Description | Pre-wrapped description block. |
| 21 | View · open · attachments | List | "Đề bài / tài liệu" | List of teacher-provided attachments (`signed_url`). |
| 22 | View · open · short_answer | Container | Question list | Each question card shows badge "Câu N" and a `<textarea rows={3}>` bound to `shortAnswers[q.id]` with placeholder "Nhập đáp án…". |
| 23 | View · open · file_prompt | Textarea | Nội dung bài làm (văn bản) | 6 rows; bound to `textSubmission`; placeholder "Bạn có thể ghi đáp án trực tiếp tại đây, hoặc chỉ nộp file bên dưới.". |
| 24 | View · open · file_prompt | TextInput (file) | File đính kèm (tùy chọn) | Multiple file input; bound to `files`. |
| 25 | View · open · file_prompt · files>0 | Text | Selected files | Displays comma-separated file names. |
| 26 | Click | Button | "Nộp bài" / "Đang gửi…" | Calls `handleSubmit()`; disabled while submitting. |
| 27 | Click | Button | "Hủy" | Calls `onClose`; disabled while submitting. |
| 28 | Validation · short_answer | Error throw | "Vui lòng trả lời đầy đủ tất cả các câu." | Triggered when any answer text is empty. |
| 29 | Validation · short_answer | Error throw | "Đã hết thời gian làm bài." | Triggered when timer hits 0 at submit. |
| 30 | Validation · file_prompt | Error throw | "Vui lòng nhập nội dung hoặc đính kèm ít nhất một file." | Triggered when both text and files are empty. |

## States & Validation Notes

- `assignment.assignment_kind` switches the form between text/file upload and short-answer questions.
- `remainingSeconds` is computed each second from a start timestamp persisted in `localStorage` under `short-answer-timer:<assignment_id>`; the key is cleared on a successful short-answer submission.
- `maxSubmitAttempts` = `allow_resubmission ? max_resubmissions + 1 : 1`. `usedSubmitAttempts` = `(resubmission_count ?? 0) + 1` once a submission exists.
- `submitClosedReason` computes precedence: time-out > attempt-exhausted > past due (factoring `late_submission_days` when `allow_late_submission`).
- Error messages from the API are normalized through `normalizeLearnerErrorMessage` to map technical phrases (e.g., "chưa ghi danh") to learner-friendly text.
- For short-answer submission the request is JSON (`short_answers: [{question_id, answer_text}]`); for file_prompt the request is multipart `FormData` with `text_submission` and `files`.
- Grade loading uses `authJsonHeaders`; file upload uses `authBareHeaders` (no Content-Type so the browser sets the boundary).
- After a successful submission `onSubmitted()` is invoked once for both branches.
