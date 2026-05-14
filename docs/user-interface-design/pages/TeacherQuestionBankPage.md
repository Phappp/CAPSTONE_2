# TeacherQuestionBankPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherQuestionBankPage.tsx`
**Route:** `/teacher/courses/:id/question-banks` (with optional `?mode=pick&bankId=<id>&contextKey=<key>` to enter pick-and-import mode)
**Purpose:** Two-column workspace for managing Question Banks — bank CRUD, archive / restore, manual question entry, three bulk-import flows (text, CSV, AI), question filtering — plus an alternate "pick mode" that returns the selected questions to the opener window for Lesson Studio quiz import.

## Overview

The standard layout renders the dashboard chrome (header, title "Question Bank", subtitle, `AvatarMenu`) followed by a two-column grid. The left column hosts an expandable create / edit-bank form and a "Danh sách ngân hàng" list with archive / restore controls; archived banks live under a togglable "Xem ngân hàng đã lưu trữ (n)" expander. The right column requires a selected bank: it displays the selected-bank header, two main tabs ("Thêm câu hỏi" and "Nhập hàng loạt"), the active form, then a filter toolbar (search, type, difficulty) and a list of all questions in the bank. The "Nhập hàng loạt" tab has three sub-tabs — "Nhập từ văn bản", "Nhập từ CSV" (with template download) and "Tạo bằng AI" (with topic / count / difficulty / type / extra instructions / attachments and a temporary AI staging list). When the URL contains `?mode=pick` the page switches to a stripped-down picker UI: list of active banks on the left, filtered pickable questions on the right with checkboxes that respect "Đã có trong quiz" exclusion and an "Import N câu đã chọn" button that posts the payload back via `window.opener.postMessage`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Click      | Button       | "Tổng quan khóa học" back button | Navigates to `/teacher/courses/${courseId}`. |
| 2   | View       | Heading      | `dashboard-title` | "Question Bank". |
| 3   | View       | Text         | `dashboard-subtitle` | "Quản lý ngân hàng câu hỏi để tái sử dụng khi soạn quiz và bài tập". |
| 4   | View       | Component    | `AvatarMenu` | Account menu in the header. |
| 5   | Error      | Container    | `.error-message` | Inline banner used both for true errors and confirmation messages (e.g. "Đã lưu trữ ngân hàng câu hỏi…"). |
| 6   | View       | Container    | `.warning-panel` "Ngân hàng chưa thể lưu trữ" | Shown when `deleteBlockedUsage` is set; lists up to 8 quizzes blocking the archive operation. |
| 7   | Click      | Button       | "Đi tới danh sách quiz đang dùng" | Navigates to `/teacher/courses/${courseId}/assessments`. |
| 8   | Click      | Button       | Warning "Mở" per quiz | Navigates to lesson-studio quiz section if `lesson_id` exists, else to the assessments page. |
| 9   | Click      | Button       | Expandable "Tạo ngân hàng mới" / "Sửa ngân hàng" | Toggles `isBankFormExpanded`; icon switches between `add` and `edit`. |
| 10  | TextInput  | TextInput    | `bankName` | Placeholder "VD: Ngân hàng câu hỏi Toán cao cấp"; required. |
| 11  | TextInput  | Textarea     | `bankDescription` | Three-row description input, placeholder "Mô tả ngắn gọn về ngân hàng câu hỏi...". |
| 12  | View       | Checkbox     | `bankShared` | Label "Cho phép chia sẻ ngân hàng với giảng viên khác". |
| 13  | Submit     | Button       | "Tạo ngân hàng" / "Lưu cập nhật" | Calls `handleSaveBank` (POST or PATCH); disabled while `loading`. |
| 14  | Click      | Button       | "Hủy" (bank form) | Calls `resetBankForm` clearing fields and collapsing the form. |
| 15  | View       | Heading      | "Danh sách ngân hàng" | `card-subtitle` for the active banks panel. |
| 16  | Click      | Button       | Bank row select | Sets `selectedBankId` for the bank; the row gains class `.active`. |
| 17  | View       | Badge        | "Chia sẻ" | Rendered when `bank.is_shared` is true. |
| 18  | Click      | Button       | Bank `edit` icon | Calls `startEditBank(bank)` (only when `is_owned`); error "Bạn chỉ có thể chỉnh sửa ngân hàng câu hỏi do mình tạo." otherwise. |
| 19  | Click      | Button       | Bank `archive` icon | Calls `handleDeleteBank(bank.id)` with confirm "Lưu trữ ngân hàng câu hỏi này? Ngân hàng lưu trữ sẽ bị ẩn khỏi danh sách chọn mới." |
| 20  | Empty      | Text         | Empty banks placeholder | "Chưa có ngân hàng câu hỏi nào" + hint "Hãy tạo ngân hàng đầu tiên để bắt đầu". |
| 21  | Click      | Button       | "Xem ngân hàng đã lưu trữ (n)" | Toggles `showArchivedBanks`. |
| 22  | Click      | Button       | Archived bank `restore` | Calls `handleRestoreBank(bank.id)`. |
| 23  | View       | Container    | `.warning-message` (right column) | "Đây là ngân hàng global do giảng viên khác chia sẻ. Bạn có thể xem và import, nhưng không thể chỉnh sửa." rendered when `!canManageSelectedBank`. |
| 24  | View       | Heading      | `selected-bank-name` | Renders `selectedBank.name`. |
| 25  | View       | Text         | `selected-bank-desc` | `selectedBank.description` or "Chưa có mô tả". |
| 26  | View       | Badge        | `question-count-badge` | Renders `{questions.length} câu hỏi`. |
| 27  | View / Click | Tab         | "Sửa câu hỏi" / "Thêm câu hỏi" | Selects `activeMainTab = "manual"`; disabled when `!canManageSelectedBank`. |
| 28  | View / Click | Tab         | "Nhập hàng loạt" | Selects `activeMainTab = "bulk"`; disabled when `!canManageSelectedBank`. |
| 29  | View       | Select       | `questionType` | Options: "Trắc nghiệm", "Đúng/Sai", "Trả lời ngắn", "Tự luận", "Điền vào chỗ trống". |
| 30  | View       | Select       | `difficulty` | Options: "Dễ", "Trung bình", "Khó". |
| 31  | View       | TextInput    | `points` (`type="number"`) | Step `0.5`, min `0.5`; required to be > 0 on submit. |
| 32  | View       | Textarea     | `questionText` | Placeholder "Nhập nội dung câu hỏi..."; required. |
| 33  | View       | TextInput    | `category` | Placeholder "VD: Đại số, Giải tích...". |
| 34  | View       | TextInput    | `tagsInput` | Placeholder "toán, đại số, cơ bản" — comma-separated, parsed into `tags[]`. |
| 35  | View       | Textarea     | `explanation` | Placeholder "Giải thích đáp án đúng...". |
| 36  | View       | List         | `options` editor | Visible only when `questionType` is `multiple_choice` or `true_false`. Each row: option text input, "Đúng" checkbox, delete button (disabled when only 2 options remain). |
| 37  | Click      | Button       | "Thêm lựa chọn" | Appends `{ option_text: "", is_correct: false }` to `options`. |
| 38  | Submit     | Button       | "Thêm câu hỏi" / "Lưu câu hỏi" | Calls `handleSaveQuestion` (POST or PATCH); validates `question_text` non-empty and `points > 0`. |
| 39  | Click      | Button       | "Hủy sửa" (question) | Calls `resetQuestionForm` (only shown while editing). |
| 40  | View / Click | Tab         | Bulk sub-tab "Nhập từ văn bản" | Sets `activeBulkSubTab = "text"`. |
| 41  | View / Click | Tab         | Bulk sub-tab "Nhập từ CSV" | Sets `activeBulkSubTab = "csv"`. |
| 42  | View / Click | Tab         | Bulk sub-tab "Tạo bằng AI" | Sets `activeBulkSubTab = "ai"`. |
| 43  | View       | Text         | Text-import hint | "Mỗi dòng một câu theo mẫu: `Câu hỏi | *Đáp án đúng | Đáp án sai | Đáp án sai`". |
| 44  | View       | Textarea     | `bulkText` | 8-row textarea; placeholder includes 3 example rows. |
| 45  | Click      | Button       | "Tạo câu hỏi từ văn bản" | Calls `importQuestionsFromBulkText`; label flips to "Đang xử lý..." while `loading`. |
| 46  | View       | Text         | CSV header hint | "Header mẫu: `question_text,correct_option,option_2,option_3,option_4,difficulty,points,explanation`". |
| 47  | Click      | Button       | "Tải file CSV mẫu" | Downloads a generated CSV template with two example rows. |
| 48  | View       | TextInput    | CSV file picker | Accepts `.csv,text/csv`; on change calls `importQuestionsFromCsv(file)` and surfaces per-line errors. |
| 49  | Error      | List         | CSV `error-list` | Shows up to 5 line errors; truncated with "...và {n} lỗi khác". |
| 50  | View       | TextInput    | `aiTopic` | Placeholder "Chủ đề (VD: thì hiện tại đơn)"; required for AI generation. |
| 51  | View       | TextInput    | `aiQuestionCount` (`type="number"`) | Range 1–20, clamped via `Math.max(1, Math.min(20, …))`. |
| 52  | View       | Select       | `aiDifficulty` | Options: "Dễ", "Trung bình", "Khó". |
| 53  | View       | Select       | `aiQuestionType` | Options: "Hỗn hợp", "Trắc nghiệm", "Đúng/Sai". |
| 54  | View       | Textarea     | `aiExtraInstructions` | Placeholder "Yêu cầu bổ sung (tuỳ chọn)". |
| 55  | View       | TextInput    | AI attachment picker | Accepts `.txt,.md,.csv,.json`; file text read up to 12000 chars; max 5 attachments. |
| 56  | Click      | Button       | "Tạo câu hỏi bằng AI" | Calls `generateQuestionsByAi`; surfaces results into `aiPendingQuestions`. Label flips to "Đang tạo..." during work. |
| 57  | View       | Container    | `ai-pending-section` | Renders when `aiPendingQuestions.length > 0`; lists each pending question with `#index`, type, difficulty, points, and a remove button. |
| 58  | Click      | Button       | "OK - Đưa vào danh sách chính" | Calls `confirmAiPendingQuestions` (bulk POST) and resets all bulk forms. |
| 59  | Click      | Button       | "Xóa danh sách tạm" | Clears `aiPendingQuestions`. |
| 60  | View       | Heading      | "Danh sách câu hỏi" | Section title with `{filteredQuestions.length}/{questions.length} câu hỏi`. |
| 61  | View       | TextInput    | `questionSearch` | Placeholder "Tìm theo nội dung, category, tags, giải thích...". |
| 62  | View       | Select       | `questionTypeFilter` | Options: "Tất cả loại câu" plus each value of `QUESTION_TYPES`. |
| 63  | View       | Select       | `questionDifficultyFilter` | Options: "Tất cả độ khó" plus each of "Dễ", "Trung bình", "Khó". |
| 64  | Click      | Button       | "Xóa lọc" | Resets search and both filter selects. |
| 65  | View       | Card         | Question row | Displays difficulty badge, type badge with icon (`quiz`, `check`, `text_fields`), optional category badge, `points-badge` "{points} điểm", question text, optional tag chips `#tag`, optional explanation block. |
| 66  | Click      | Button       | Question `edit` icon | Calls `startEditQuestion(question)` populating the manual form. |
| 67  | Click      | Button       | Question `delete` icon | Calls `handleDeleteQuestion(question.id)` with confirm "Xóa câu hỏi này?". |
| 68  | Empty      | Container    | Question empty state | "Chưa có câu hỏi nào trong ngân hàng này" or "Không có câu hỏi khớp bộ lọc hiện tại" depending on whether filters trimmed the list. |
| 69  | Empty      | Container    | No-bank empty state | "Chưa chọn ngân hàng câu hỏi" + hint when `selectedBank` is null. |
| 70  | View       | Heading      | Pick-mode title | "Chọn câu hỏi từ Question Bank" with subtitle "Chế độ chọn nhanh để import vào Lesson Studio". |
| 71  | Click      | Button       | Pick-mode "Trang quản lý Question Bank" | Navigates back to the standard `/teacher/courses/${courseId}/question-banks` view. |
| 72  | Click      | Button       | Pick-mode "Đóng tab" | Invokes `window.close()`. |
| 73  | Click      | Button       | Pick-mode "Import N câu đã chọn" | Posts `PickImportPayload` (`source: "question-bank-pick"`, `courseId`, `bankId`, `questions[]`) to `window.opener` via `postMessage`, marks them as imported, then closes the window. |
| 74  | View       | List         | Pick-mode bank list | Active banks rendered as selectable rows under "Chọn ngân hàng". |
| 75  | View       | Checkbox     | Pick-mode question checkbox | Adds / removes the question id from `pickedQuestionIds`; disabled when the question's normalized key is in `alreadyInQuizKeys`. |
| 76  | View       | Badge        | "Đã có trong quiz" | Rendered when the normalized question key matches one already imported into the current quiz context. |
| 77  | View       | Badge        | "Đã import" | Rendered when the question was imported during this picker session (`importedThisSessionIds`). |
| 78  | Click      | Button       | Pick-mode "Bỏ chọn" | Clears `pickedQuestionIds`. |

## States & Validation Notes

- `loadBanks` requests `?course_id=${courseId}&include_archived=true`; on success it auto-selects the first active bank when none was selected previously, and clears the selection when the selected bank disappears.
- `selectedBankId` resets `aiPendingQuestions` and `pickedQuestionIds` to empty via dedicated effects whenever it changes.
- `canManageSelectedBank` defaults to `true` when `is_owned` is undefined, so legacy banks remain editable; otherwise the manual / bulk tabs and form buttons are disabled.
- `handleSaveBank` requires a trimmed non-empty `bankName`; otherwise it throws "Tên ngân hàng câu hỏi không được để trống.".
- `handleSaveQuestion` requires a non-empty trimmed `question_text` and `points > 0`; for `multiple_choice` / `true_false` it filters out blank options before submitting.
- `importQuestionsFromBulkText` parses pipe-delimited lines, treats a `*` prefix as the correct answer, falls back to the first option as correct when none is starred, and rejects lines with fewer than one wrong answer.
- `importQuestionsFromCsv` skips the header row (`question_text` keyword), validates `question_text`, `correct_option`, and at least one wrong option; collected line errors are stored in `csvImportErrors`.
- `generateQuestionsByAi` validates `aiTopic` non-empty and limits attachments to 5 items totalling up to 12000 characters each (sliced at read time).
- Pick-mode listens to `localStorage[contextKey]` to read `questionKeys` exposed by the opener, so previously imported questions are pre-marked and disabled in the picker.
- The selection payload posted back uses `window.location.origin` as the `targetOrigin` for `postMessage`, enforcing same-origin delivery.
- Question key normalization (`normalizeQuestionKey`) lowercases and collapses whitespace before composing `${type}::${text}` so duplicates across casing / whitespace are detected consistently.
