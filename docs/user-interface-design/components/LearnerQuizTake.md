# LearnerQuizTake — UI Specification

**Source:** `frontend/src/components/LearnerQuizTake.tsx`
**Type:** Shared Component
**Purpose:** Modal that lets a learner attempt a lesson quiz, displays attempt history, captures single-choice answers, submits the attempt and renders pass/fail results with optional correct-answer review.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `courseId` | `number` | — | Course identifier used in API URLs. |
| `lessonId` | `number` | — | Lesson identifier the quiz belongs to. |
| `lessonTitle` | `string` | — | Fallback title shown when quiz data has not loaded. |
| `token` | `string \| null` | — | Bearer token for the `Authorization` header. |
| `onClose` | `() => void` | — | Invoked when the user dismisses the modal. |
| `onCompleted` | `() => void` | — | Invoked once a submission returns `is_passed === true`. |

## Overview

The component fetches the quiz payload (questions, attempt metadata, recent attempts) on mount, normalizes server errors via `normalizeLearnerErrorMessage`, and renders questions as single-select radio groups. Submission posts the selections to `learnerQuizSubmit`; the result panel shows score percent, earned/max points, pass/fail badge, and per-question correctness when both `show_correct_answers` flags are true. A "Lượt còn" indicator prevents new attempts when all attempts have been consumed. The dialog uses `role="dialog" aria-modal="true"` with the title element id `learner-quiz-title`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Modal | `learner-quiz-overlay` / `learner-quiz-modal` | Full-screen overlay anchoring the quiz dialog. |
| 2 | View | Heading | `learner-quiz-title` | Displays `quiz.title` if loaded, else `lessonTitle` prop. |
| 3 | View | Text | Quiz description | Renders `quiz.description` when present, otherwise "Quizz trắc nghiệm". |
| 4 | Click | Button | `learner-quiz-close` | Top-right "Đóng" button; calls `onClose`. |
| 5 | View | Text | Attempts meta | Reads "Lượt còn: {attemptsLeft} / {max_attempts}". |
| 6 | View | Text | Passing-score meta | Conditional — shows "Điểm đạt: {passing_score}%" when set. |
| 7 | View | Text | Time-limit meta | Conditional — shows "Thời gian: {time_limit_minutes} phút (gợi ý — hãy tự quản lý thời gian)". |
| 8 | Loading | Text | Body placeholder | "Đang tải quiz…" with muted color while `loading`. |
| 9 | Error | Container | `learner-quiz-error` | Shows normalized error message when `error` is set and not loading. |
| 10 | View | List | Recent-attempts list | Container labeled "Lịch sử bài đã nộp" listing `quiz.recent_attempts`. |
| 11 | Click | Container | Attempt `<details>` row | Expandable summary "Lần {n} · {score}% · Đạt/Chưa đạt · {date}". |
| 12 | View | Text | Attempt answer rows | Each answer prints "Câu {idx+1}: {question_text}" and "Đáp án đã chọn: {selected_option_text}" or fallback `#id` or "—". |
| 13 | Empty | Text | No-answer fallback | "Không có dữ liệu câu trả lời." when an attempt has no answer rows. |
| 14 | View | Text | Out-of-attempts banner | "Bạn đã dùng hết số lần làm bài cho quiz này." when `attemptsLeft <= 0` and no current result. |
| 15 | View | Container | Question card | `learner-quiz-q` rendered per question while attempts remain and no result is shown. |
| 16 | View | Badge | `learner-quiz-q__badge` | "Câu {idx+1} · {points} điểm". |
| 17 | View | Text | `learner-quiz-q__text` | Question text. |
| 18 | Radio | Radio | `learner-quiz-opt` input | Name `qq-{quiz_question_id}`; selected option toggles `learner-quiz-opt--selected` class; updates `selections` map. |
| 19 | Click | Button | `learner-quiz-btn-ghost` | Footer "Hủy" button; calls `onClose`. |
| 20 | Click | Button | `learner-quiz-btn-primary` (Submit) | Footer "Nộp bài" / "Đang nộp…"; disabled until `allAnswered` and not `submitting`; triggers `handleSubmit`. |
| 21 | Validation | Behavior | Submission gate | Submit blocked unless every question has a selection (`selections[id]` numeric). |
| 22 | View | Container | `learner-quiz-result` | Result panel; appends `--pass` or `--fail` class based on `is_passed`. |
| 23 | View | Text | Result score | Large `score_percent`% with subline "{earned_points} / {max_points} điểm — Đạt/Chưa đạt". |
| 24 | View | List | Detail breakdown | Rendered when both `quiz.show_correct_answers` and `result.show_correct_answers` are true; each item labels "Câu {idx+1}: Đúng/Sai" plus the question text. |
| 25 | Click | Button | Result close button | Centered footer "Đóng" button; calls `onClose`. |

## States & Validation Notes

- `attemptsLeft = max(0, max_attempts - attempts_used)`; submit form is hidden when `<= 0`.
- `allAnswered` requires every question id to have a numeric value in `selections`; otherwise the primary submit button is disabled.
- Server error messages are post-processed: "ghi danh hợp lệ" / "chưa đăng ký khóa học này" becomes "Bạn không còn quyền học khóa này..."; "không thể truy cập bài học" / "chưa mở theo lịch" becomes "Bài học chưa mở hoặc bạn chưa đủ điều kiện truy cập." Empty errors default to "Đã xảy ra lỗi. Vui lòng thử lại."
- The component refuses to mount the quiz when `data.quiz` is missing or `questions` is empty, throwing "Chưa có nội dung quiz hợp lệ. Giáo viên cần lưu lại quiz...".
- `onCompleted` only fires when the submission returns `is_passed === true`.
- Reloading via `load()` resets `result`, `selections`, and `error`.
