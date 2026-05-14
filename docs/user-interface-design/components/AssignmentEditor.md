# AssignmentEditor — UI Specification

**Source:** `frontend/src/components/AssignmentEditor.tsx`
**Type:** Shared Component
**Purpose:** Provides a teacher-facing editor used to create, preview, edit, and grade lesson assignments (file-prompt or short-answer kinds).

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `courses` | `CourseBrief[]` | — | List of courses available for selection (`{ id, title }`). |
| `token` | `string \| null` | — | Authorization bearer token for API calls. |
| `loading` | `boolean` | — | Indicates an external loading state that disables actions. |
| `pickedLessonId` | `number \| null` | — | Lesson id forced from the content tree (kebab menu / chapter button). |
| `embeddedMode` | `boolean` | `false` | When true, hides course/lesson selectors and uses lesson title/description as defaults. |
| `hidePreviewSections` | `boolean` | `false` | When true, hides the preview and submissions panels. |
| `onShortAnswerQuestionsChange` | `(questions: Array<{id, question_text, order_index}>) => void` | — | Callback for parent to mirror short-answer questions. |
| `onAssignmentPreviewChange` | `(preview: AssignmentPreview \| null) => void` | — | Callback fired when preview is loaded or cleared. |
| `saveSignal` | `number` | `0` | Bumped by parent to trigger save action. |
| `editSignal` | `number` | `0` | Bumped by parent to enter edit mode. |
| `cancelEditSignal` | `number` | `0` | Bumped by parent to cancel edit mode. |
| `forceReadOnly` | `boolean` | `false` | Forces read-only state regardless of preview. |
| `hidePrimarySaveButton` | `boolean` | `false` | Hides the inline primary "Lưu" button. |
| `hideInlineEditButton` | `boolean` | `false` | Hides the inline "Chỉnh sửa"/"Hủy chỉnh sửa" button. |
| `onSavedSuccessfully` | `() => void` | — | Callback fired after a successful create or update. |
| `onDirtyChange` | `(dirty: boolean) => void` | — | Notifies parent whether the form has unsaved changes. |
| `forcedAssignmentKind` | `"file_prompt" \| "short_answer" \| null` | `null` | Forces the assignment kind value. |
| `hideAssignmentKindSwitch` | `boolean` | `false` | Hides the assignment-kind switch container. |
| `autoSaveOnForcedKindSwitch` | `boolean` | `false` | Automatically saves when forced kind differs from preview. |

## Overview

Used inside the teacher Course Assessment Modal and lesson studio flows, this editor manages the full assignment lifecycle for a single lesson: selecting course/lesson context, configuring metadata (title, description, scoring, due date, late/resubmission policy), authoring either file-prompt content (rich text + file attachments) or a short-answer questionnaire (with time limit), and loading preview and learner submissions for grading. It synchronizes via `pickedLessonId`, save/edit signals from the parent, and persists changes through the assignments REST API. State branches include: empty (no preview yet), preview/read-only, editing existing assignment, saving, and grading-per-submission.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `assignment-editor` root | Wraps the entire editor; mounts `<Toaster>` for toast notifications. |
| 2 | View · !embeddedMode | Select | Khóa học | Bound to `selectedCourseId`; options come from `courses`; disabled while `loading`/`lessonsLoading` or empty list. |
| 3 | View · !embeddedMode | Select | Bài học | Bound to `lessonId`; renders `<optgroup>` per module with label "Chương N: <title>" and options "Bài N: <title> · <lesson_type>". |
| 4 | Error | Container | `error-box` lessonsError | Displays "Không thể tải cây bài học." when lesson tree fetch fails. |
| 5 | View · !embeddedMode | Text | Editor hint | Static guidance: "Mở khóa theo thứ tự bài trong khóa: học viên cần hoàn thành các bài đứng trước…". |
| 6 | View · !embeddedMode | Heading | "Thông tin bài tập" | Section heading. |
| 7 | View · !hidePrimarySaveButton | Button | "Lưu" / "Đang xử lý..." | Primary save button; disabled while `saving`, `loading`, or no `lessonId`; invokes `handlePrimarySave` which routes to create or update. |
| 8 | View · !embeddedMode | TextInput | Tiêu đề * | Bound to `title`; disabled when `saving` or `readOnly`. |
| 9 | View · !embeddedMode · kind!=file_prompt | Textarea | Mô tả/yêu cầu * | 4 rows; bound to `description`. |
| 10 | View | TextInput (number) | Thang điểm | Bound to `maxScore`; min=0 step=1. |
| 11 | View | TextInput (number) | Điểm đạt (optional) | Bound to `passingScore`; placeholder "Ví dụ: 6"; empty value persisted as `null`. |
| 12 | View | TextInput (date) | Ngày | Date picker for due date; min/max derived from `yearOptions`. |
| 13 | View | Select | Giờ | 12-hour selector (01–12) for due date. |
| 14 | View | Select | Phút | Minute selector (00–59). |
| 15 | View | Select | AM/PM | Meridiem selector for due date. |
| 16 | View · file_prompt | Checkbox | "Cho phép nộp muộn" | Toggles `allowLate`; auto-sets `lateDays=1` if previously zero. |
| 17 | View · file_prompt · allowLate | TextInput (number) | Số ngày nộp trễ | Bound to `lateDays`; disabled when `!allowLate`. |
| 18 | View · file_prompt | Checkbox | "Cho phép nộp lại" | Toggles `allowResubmission`; ensures `maxResubmissions>=1`. |
| 19 | View · file_prompt · allowResubmission | TextInput (number) | Số lần nộp lại tối đa | Bound to `maxResubmissions`. |
| 20 | View · file_prompt | Container | LessonRichTextEditor — "Nội dung" | Rich text editor for description; supports formatting, images, tables, DOCX import/export. |
| 21 | View · short_answer | TextInput (number) | Thời gian làm bài (phút) * | Bound to `timeLimitMinutes`; min=1. |
| 22 | View · short_answer | Textarea[] | Câu hỏi trả lời ngắn * | Editable list of short-answer prompts; index labelled "1.", "2.", …; placeholder "Nội dung câu hỏi". |
| 23 | Click · short_answer | Button | "Xóa" (per question) | Removes the question from `shortAnswerLines`; disabled when only one question remains. |
| 24 | Click · short_answer | Button | "Thêm câu" | Appends an empty entry to `shortAnswerLines`. |
| 25 | View · file_prompt | TextInput (file) | "File đính kèm (Tùy chọn)" | Multiple file upload; `accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar,.7z"`. |
| 26 | View · file_prompt · files>0 | List | file-list | Displays selected file name and rounded KB size. |
| 27 | View · preview · !hideInlineEditButton | Button | "Chỉnh sửa" / "Hủy chỉnh sửa" | Toggles `editing`; loads preview into editor when entering edit mode. |
| 28 | View · preview · !hidePreviewSections | Card | "Preview bài tập" | Displays title, due date (vi format AM/PM), score, late policy, resubmission policy, assignment kind, time limit. |
| 29 | View · preview · short_answer | List | "Câu hỏi:" | Ordered list of short-answer questions. |
| 30 | View · preview | Card | "Đính kèm (N)" | Grid of attachments; image attachments display thumbnails, otherwise placeholder "File"; each card has filename and "Mở file" link. |
| 31 | View · editing | Button | "Lưu thay đổi" / "Đang lưu..." | Triggers `handleSaveEdit`. |
| 32 | View · preview · !hidePreviewSections | Card | "Bài nộp & chấm điểm" | Section heading and instructions: "Xem nội dung tóm tắt, nhập điểm (0–{max})…". |
| 33 | Loading | Text | "Đang tải danh sách…" | Shown when `submissionsLoading`. |
| 34 | Error | Container | `error-box` submissionsError | Shown when `submissionsError` is set. |
| 35 | Empty | Text | "Chưa có học viên nộp bài." | Empty-state message. |
| 36 | View | Card[] | Submission row | Shows student full name, email, submitted_at (vi-VN locale), status, late tag, content preview. |
| 37 | View | TextInput (number) | Điểm (max N) | Bound to `scoreDraft[id]`; min=0; max=`preview.max_score`; step=0.01. |
| 38 | View | Textarea | Nhận xét | Bound to `feedbackDraft[id]`; 2 rows. |
| 39 | Click | Button | "Lưu điểm" / "Đang lưu…" | Calls `submitGrade(submission_id)`; disabled while `gradingId===id`. |
| 40 | Validation | Toast (error) | "Vui lòng nhập điểm hợp lệ." | Triggered when score input is empty or NaN before grading. |
| 41 | Validation | Toast (error) | "Điểm phải từ 0 đến {max}." | Triggered when score falls outside `[0, max_score]`. |
| 42 | Validation | Toast (error) | "Vui lòng chọn bài học." | Triggered before create if `lessonId` is empty. |
| 43 | Validation | Toast (error) | Tiêu đề/Mô tả missing | Different messages for embedded vs. non-embedded modes. |
| 44 | Validation | Toast (error) | "Vui lòng chọn hạn nộp." | Triggered when `dueDate` is empty before submission. |
| 45 | Validation | Toast (error) | "Vui lòng nhập thời gian làm bài hợp lệ (>= 1 phút)." | For short_answer kind with invalid `timeLimitMinutes`. |
| 46 | Validation | Toast (error) | "Dạng trả lời ngắn cần ít nhất một câu hỏi." | For short_answer kind with empty questions list. |
| 47 | Submit | Toast (success) | "Tạo bài tập thành công!" / "Cập nhật thành công!" / "Đã lưu điểm và nhận xét." | Success notifications. |

## States & Validation Notes

- `readOnly` derives from `(Boolean(preview) && !editing) || forceReadOnly`. Most fields become disabled when read-only or saving.
- `assignmentDirty` is recomputed via `useMemo` over draft values and the preview; emitted to parent through `onDirtyChange`.
- Switching `lessonId` resets preview, draft, short-answer lines, time limit, submissions, and grading drafts.
- The component owns its own `<Toaster>` for `react-hot-toast` and listens to `saveSignal`/`editSignal`/`cancelEditSignal` props as imperative triggers from the parent.
- When `assignmentKind === "short_answer"`, selected files are cleared and file inputs are not rendered.
- `autoSaveOnForcedKindSwitch` orchestrates: forced kind diff → load short-answer defaults / file defaults → after state settles, automatically invokes `handleSaveEdit`.
- Due date is split into day/month/year/hour/minute/meridiem inputs that round-trip through `buildDueDateLocalFromParts` and `datetimeLocalToIso` for backend persistence.
