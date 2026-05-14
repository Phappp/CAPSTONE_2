# ManualQuizEditor — UI Specification

**Source:** `frontend/src/components/ManualQuizEditor.tsx`
**Type:** Shared Component
**Purpose:** Teacher-side quiz authoring panel supporting manual entry, Question Bank picking, CSV import, and AI generation, with full save lifecycle and dirty-state reporting back to the host.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `courses` | `CourseBrief[]` | — | Course options for the dropdown. |
| `token` | `string \| null` | — | Bearer token used in API headers. |
| `loading` | `boolean` | — | When true, disables most controls. |
| `selectedCourseId` | `number \| null` | — | Currently selected course id (controlled). |
| `onSelectedCourseIdChange` | `(id: number \| null) => void` | — | Notifies parent of course selection change. |
| `pickedLessonId` | `number \| null` | `undefined` | External force-set lesson id (used when a parent picker passes context). |
| `embeddedMode` | `boolean` | `false` | When true, hides course/lesson/title/description rows and section headers. |
| `embeddedQuizTitle` | `string` | `undefined` | Fallback title used while in embedded mode. |
| `showSavedQuestionsSection` | `boolean` | `true` | Toggle for the "Danh sách câu hỏi" summary card. |
| `onSavedQuestionsChange` | `(questions: QuestionRow[]) => void` | `undefined` | Emits saved question rows on every change. |
| `onQuizConfigChange` | `(config: QuizPreviewConfig) => void` | `undefined` | Emits `{ time_limit_minutes, passing_score }` whenever those fields change. |
| `onDirtyChange` | `(dirty: boolean) => void` | `undefined` | Reports dirty diff against `lastSavedFingerprint`. |
| `hideSaveButton` | `boolean` | `false` | Hides the bottom "Lưu Quizz" action row. |
| `externalSaveSignal` | `number` | `0` | Number that, when incremented, triggers `handleSaveQuiz` from outside. |
| `questionsOverride` | `QuestionRow[] \| null` | `null` | Replaces in-memory question rows when set and mode is not manual. |

## Overview

The component fetches the course content tree and any existing quiz for the chosen lesson, hydrates the form (title/description/time-limit/passing-score/max-attempts/shuffle/show-results flags), and offers four creation modes via tab buttons: `manual`, `question_bank`, `csv`, `ai`. Manual mode renders an editable table with dynamic option columns (min 2, expandable via "+/-") and dedupe warnings. Question Bank mode opens a separate tab via `window.open`, then receives picked questions back through a `window.message` event (`source: "question-bank-pick"`). CSV mode parses uploaded CSV with a fixed header schema and tolerates partial errors. AI mode posts topic, count (1–20), difficulty, type, optional instructions, and up to 5 attachments to the `manualQuizAiGenerate` endpoint. Save dispatches the merged payload to `manualQuiz` POST, then refreshes `savedQuestions` and the dirty fingerprint.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Toast | `Toaster` | `react-hot-toast` portal pinned to `top-right`. |
| 2 | View | Select | Course select | Visible when `!embeddedMode`; options from `courses`; disabled while loading or empty; resets `lessonId` on change. |
| 3 | Click | Button | "Mở Content Builder →" | Navigates to `/teacher/courses/{selectedCourseId}/content`; disabled when no course selected. |
| 4 | View | Select | Lesson select | `<optgroup>` per module labeled "Chương {n}: {title}"; each option "Bài {n}: {title} · {lesson_type}". |
| 5 | Error | Container | `error-box` | Displays `lessonsError` text when content tree fetch fails. |
| 6 | View | TextInput | "Tiêu đề Quizz *" | Bound to `title`; disabled while saving. |
| 7 | View | Textarea | "Mô tả" | Bound to `description`, 2 rows. |
| 8 | View | TextInput (number) | "Thời giới hạn (phút)" | Min 0; placeholder "Để trống = không giới hạn". |
| 9 | View | TextInput (number) | "Điểm đạt (%)" | Min 0, max 100, step 0.01; placeholder "Ví dụ: 50". |
| 10 | View | TextInput (number) | "Số lần làm tối đa" | Min 1; coerces to `max(1, value)`. |
| 11 | View | Checkbox | "Trộn câu hỏi" | Toggles `shuffleQuestions`. |
| 12 | View | Checkbox | "Trộn đáp án" | Toggles `shuffleOptions`. |
| 13 | View | Checkbox | "Hiện kết quả ngay" | Toggles `showResults`. |
| 14 | View | Checkbox | "Hiện đáp án đúng" | Toggles `showCorrect`. |
| 15 | Click | Tab | "Thủ công" button | Sets `quizCreateMode = "manual"`. |
| 16 | Click | Tab | "Question Bank" button | Sets `quizCreateMode = "question_bank"`. |
| 17 | Click | Tab | "Import CSV" button | Sets `quizCreateMode = "csv"`. |
| 18 | Click | Tab | "Tạo bằng AI" button | Sets `quizCreateMode = "ai"`. |
| 19 | Click | Button | "Mở Bank để import câu hỏi" | Persists existing question keys to localStorage under `qb-pick-context:{courseId}:{lessonId}`, then opens `/teacher/courses/{courseId}/question-banks?mode=pick&bankId=...&lessonId=...&contextKey=...` in a new tab. |
| 20 | View | List | Pending bank questions list | Shows imported-but-unsaved bank questions; each row labels "Đúng/Sai" or "Trắc nghiệm" plus points. |
| 21 | Click | Button | "Bỏ" (per row) | Removes a pending bank question by index. |
| 22 | Click | Button | "Xóa danh sách tạm" | Clears `pendingBankImportedQuestions`. |
| 23 | View | TextInput | "Chủ đề *" (AI) | Pre-filled with the selected lesson title when available. |
| 24 | View | TextInput (number) | "Số câu" (AI) | Clamped to 1–20. |
| 25 | View | Select | "Độ khó" (AI) | Options "Dễ" / "Trung bình" / "Khó". |
| 26 | View | Select | "Loại câu" (AI) | Options "Trộn" / "Trắc nghiệm" / "Đúng / Sai". |
| 27 | View | Textarea | "Yêu cầu bổ sung (tuỳ chọn)" | Free-form extra instructions. |
| 28 | Click | FileUpload | AI attachment input | Accepts `.txt,.md,.csv,.json`; trims, slices to 12000 chars, keeps up to 5 attachments; warns "File đính kèm đang trống." or "Không đọc được file đính kèm." |
| 29 | Click | Button | "Xóa" (attachment) | Removes the corresponding attachment. |
| 30 | Click | Button | "Tạo bằng AI" / "AI đang tạo..." | Invokes `generateByAi`; validates course/lesson/topic; appends new rows to `questions`. |
| 31 | Click | Button | "Tải file CSV mẫu" | Downloads a sample CSV with header and two example rows. |
| 32 | Click | FileUpload | CSV upload input | Accepts `.csv`; parses lines, tolerates header row, validates ≥2 options; surfaces errors via "Dòng CSV bị bỏ qua" panel and partial-success toast. |
| 33 | View | Container | `csvImportErrors` warning panel | Lists up to 8 error rows plus "...và {n} lỗi khác." overflow caption. |
| 34 | View | Table | Manual question table | Columns: STT, question_text, dynamic option columns, action header (+/-), difficulty, points, explanation, "Thao tác". |
| 35 | Click | Button | "+" header button | Increments `manualOptionCount` and appends an empty option to each row. |
| 36 | Click | Button | "-" header button | Decrements `manualOptionCount` (min 2); truncates options and forces `is_correct = (idx === 0)`. |
| 37 | View | TextInput | Per-row question_text input | Updates the question via `updateQuestion`. |
| 38 | View | TextInput | Option text input | First column is correct answer; subsequent columns are distractors; setting any value forces `is_correct = (idx === 0)`. |
| 39 | View | Select | difficulty cell | Options easy/medium/hard. |
| 40 | View | TextInput (number) | points cell | Min 0.01, step 0.5; falls back to 1 when invalid. |
| 41 | View | TextInput | explanation cell | Free text per row. |
| 42 | Click | Button | "Xóa" (row) | Removes the row; disabled when only one row remains or while saving. |
| 43 | Validation | Text | Duplicate-option warning | "Cảnh báo: có đáp án bị trùng nhau." appears beneath the row when normalized option texts collide. |
| 44 | Click | Button | "+ Thêm dòng" | Appends a fresh `defaultQuestion()` to the manual table. |
| 45 | Click | Button | "Lưu Quizz" / "Đang lưu..." | Calls `handleSaveQuiz`; disabled while saving or `loading`; hidden when `hideSaveButton`. |
| 46 | View | Container | "Danh sách câu hỏi" card | Visible when `showSavedQuestionsSection` is true; lists saved questions with correct answer. |
| 47 | Empty | Text | Saved-questions empty state | "Chưa có câu hỏi đã lưu. Nhập ở phần Thủ công và bấm \"Lưu Quizz\" để nạp xuống danh sách này." |
| 48 | Submit | Behavior | Save lifecycle | Builds payload from manual rows + saved rows (manual mode) or `questions + pendingBankImportedQuestions` (other modes); validates course/lesson/title; toasts errors. |

## States & Validation Notes

- Save aborts with "Chọn khóa học và bài học." when `selectedCourseId` is null or `lessonId === ""`, and with "Nhập tiêu đề Quizz." when no resolved title is found.
- `lastSavedFingerprint` is the canonical baseline for dirty detection; `onDirtyChange` is suppressed until the baseline exists.
- Pending bank import flow listens on `window.message` and verifies both `origin === window.location.origin` and matching `courseId`; failed payload validation is silently ignored.
- True/False questions imported from the bank are normalized to options "Đúng"/"Sai" with `is_correct` mirroring the original first-correct flag.
- AI generation requires a non-empty `aiTopic`; otherwise toasts "Nhập chủ đề để AI tạo câu hỏi.".
- CSV header detection is case-insensitive on the substring "question_text"; if absent, parsing starts at line 0.
- `manualMaxOptionCount` is bounded below by 2 and the largest existing row's options length.
- After successful save in manual mode, the editable table resets to one default row and `manualOptionCount = 4`.
- `externalSaveSignal` is consumed by an effect that triggers `handleSaveQuiz`; the initial value `0` is ignored.
