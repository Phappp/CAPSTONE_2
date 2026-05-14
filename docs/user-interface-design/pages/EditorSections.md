# EditorSections — UI Specification

**Source:** `frontend/src/pages/teacher/lesson-studio/EditorSections.tsx`
**Route:** N/A — embedded sub-view
**Purpose:** Provides four reusable studio cards consumed exclusively by `TeacherLessonStudioPage` (`LessonInfoCard`, `ContentEditorSection`, `QuizEditorSection`, `AssignmentEditorSection`) plus the internal helper `RejectReasonButton`. Each section renders one or more `studio-card` containers (header + content) and is gated by the parent's `activeSection`, so it can short-circuit to `null` when its section is not the active one.

## Overview

This module is not mounted at any route on its own; it ships the structural building blocks for the Lesson Studio layout. `LessonInfoCard` lets the teacher rename a lesson, attach it to a module (with inline "new module" creation), and edit the short description. `ContentEditorSection` handles primary content lessons: a video uploader (file or YouTube), an "other resources" list, and a `LessonRichTextEditor` for HTML body. `QuizEditorSection` embeds the `ManualQuizEditor` and a separate list-of-questions card with collapse / edit / delete controls. `AssignmentEditorSection` embeds the `AssignmentEditor` and a dynamic sub-list that switches between short-answer questions and file attachments depending on `currentAssignmentKind`. All editors share three visual states: normal (`btn-primary` "Lưu"), rejected-context (`btn-resubmit-warning` "Gửi lại"), and `readOnly` (all interactive controls disabled).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Error      | Button       | `RejectReasonButton` | Internal helper shown beside a "rejected" review badge; on click invokes `window.alert("Lý do từ chối:\n\n" + reason)`. Hidden when `reason` is empty. |
| 2   | View       | Card         | `LessonInfoCard` header | Title icon `Edit3` followed by "Thông tin bài học"; right side "Lưu" button (disabled while `readOnly`, `saving`, or `loading`). |
| 3   | View       | Select       | `selectedModuleId` | Form group labelled "Chương"; options come from `moduleOptions`; disabled when no modules or `readOnly` / `saving` / `loading`. |
| 4   | Click      | Button       | "Thêm chương mới" (`+`) | Triggers `createModuleFromStudio` (parent expands the inline new-module input and defaults its title to "Chương mới"). |
| 5   | View       | TextInput    | `pendingNewModuleTitle` | Visible only when `showNewModuleInput`; placeholder "Nhập tên chương mới (sẽ tạo khi bấm Lưu thông tin)". |
| 6   | Click      | Button       | New-module cancel (`X`) | Resets `showNewModuleInput=false` and `pendingNewModuleTitle=""`. |
| 7   | View       | Text         | Label "Quizz" / "Bài tập" / "Bài học" | Lesson-title field label derived from `activeSection`. |
| 8   | View       | TextInput    | `lessonTitle` | Placeholder adapts: "Nhập tên Quizz" / "Nhập tên bài tập" / "Nhập tên bài học". |
| 9   | View       | Textarea     | `lessonDescription` | Three-row field labelled "Mô tả ngắn (tùy chọn)" with placeholder "Mô tả nội dung bài học...". |
| 10  | View       | Card         | `ContentEditorSection` "Video / Tài nguyên" header | Title icon `Video` and heading "Video / Tài nguyên". |
| 11  | Click      | Button       | "Upload file" tab | Sets `videoInputMode = "file"`. |
| 12  | Click      | Button       | "YouTube" tab | Sets `videoInputMode = "youtube"`. |
| 13  | View       | TextInput    | File picker (`<input type="file">`) | Label "Chọn file"; `accept="video/*,application/pdf,.doc,.docx,…"`; updates `pendingFile`. |
| 14  | View       | Text         | `.file-name` | "Chưa chọn file" when no pending file, else the file's name. |
| 15  | Click      | Button       | "Upload" | Invokes `uploadFile`; while uploading the label shows `${uploadProgress}%`. Disabled until a file is chosen. |
| 16  | Loading    | Container    | `.progress-bar` | Shown when `0 < uploadProgress < 100`; width animates by `uploadProgress`. |
| 17  | View       | TextInput    | `youtubeUrl` | Placeholder "Dán link YouTube để thêm video..."; `addYoutube` disabled when blank. |
| 18  | Click      | Button       | "Thêm" (YouTube) | Calls `addYoutube` which deletes existing video resources then POSTs the YouTube URL. |
| 19  | View       | Container    | "Video hiện tại" | Section label and either a current video item or empty-state "Chưa có video. Hãy upload file hoặc thêm link YouTube." |
| 20  | View       | Badge        | `resource-review-badge` | Renders `getReviewStatusLabel(review_status)`; classes `pending`, `approved`, `rejected`. |
| 21  | View       | Badge        | "Đã gửi lại chờ duyệt" | Shown when `review_status === "pending"` AND `is_resubmitted` is truthy. |
| 22  | Click      | Button       | Video `Trash2` action | Calls `removeResource(id, filename)`; tooltip switches to "Tài nguyên bị từ chối phải sửa và gửi lại, không thể xóa khi khóa học chờ duyệt." when `canDeleteResource` returns false. |
| 23  | View       | List         | "Tài nguyên khác" | Iterates `otherResources` showing a `FileText` icon, name, review badge, optional reject-reason button, optional resubmission badge "Đã gửi lại", and trash action. |
| 24  | View       | Card         | "Nội dung phụ" | Header includes review badge for `contentHtmlResource` and reject-reason button; right side button is "Lưu" (or "Gửi lại" when `isRejectedContext`). |
| 25  | View       | Component    | `LessonRichTextEditor` | Bound to `richHtml` via `setRichHtml`; disabled when `readOnly`, `saving`, or `loading`. |
| 26  | View       | Text         | `.editor-hint` | "Hỗ trợ định dạng văn bản, hình ảnh, video nhúng. Nội dung sẽ được lưu dưới dạng HTML." |
| 27  | View       | Card         | `QuizEditorSection` "Quizz" header | Title icon `FileText` and heading "Quizz" with optional `quizReviewResource` badge plus reject-reason button; right side "Lưu" / "Gửi lại" toggle. |
| 28  | View       | Component    | `ManualQuizEditor` | Embedded in `embeddedMode` with `embeddedQuizTitle = lessonTitle`, `hideSaveButton`, external save signal `quizSaveSignal`, and `questionsOverride={quizQuestionsDraft}`. |
| 29  | View       | Card         | "Danh sách câu hỏi" | Shows the saved-question summary panel. |
| 30  | Click      | Button       | "Lưu" / "Gửi lại" in question list | Increments `quizSaveSignal` to dispatch the save signal to `ManualQuizEditor`. |
| 31  | Click      | Button       | Expand-all (`ChevronDown`) | Sets `expandedSavedQuestions` to every index in `quizQuestionsDraft`. |
| 32  | Click      | Button       | Collapse-all (`ChevronUp`) | Clears `expandedSavedQuestions`. |
| 33  | Empty      | Text         | Empty quiz list message | "Chua co cau hoi da luu. Nhap thu cong trong khoi Quizz va bam Luu Quizz de cap nhat danh sach." |
| 34  | View       | List         | Saved-question row | Shows `Câu {idx+1}: {question_text}` and `Dap an dung: {correct option}`. |
| 35  | Click      | Button       | Question `Pencil` toggle | Adds / removes index from `editingSavedQuestions` and seeds / clears `editingBuffers[idx]`. |
| 36  | Click      | Button       | Question `Trash2` toggle | Removes index from `quizQuestionsDraft`. |
| 37  | Click      | Button       | Question expand toggle | Toggles index in `expandedSavedQuestions` (icon switches between `ChevronUp` and `ChevronDown`). |
| 38  | View       | Card         | `AssignmentEditorSection` "Bai tap" header | Title icon `FileText` and heading "Bai tap". |
| 39  | Click      | Button       | "Lưu" / "Gửi lại" (assignment) | Increments `assignmentSaveSignal`. |
| 40  | Click      | Button       | "Chỉnh sửa" / "Huy chinh sua" toggle | Toggles `assignmentEditing`; when entering edit mode increments `assignmentEditSignal` and unlocks; when cancelling locks and increments `assignmentCancelEditSignal`. Disabled until `assignmentPreview` exists. |
| 41  | View       | Component    | `AssignmentEditor` | Embedded mode with `hidePreviewSections`, `hidePrimarySaveButton`, `hideInlineEditButton`, `forcedAssignmentKind={requestedAssignmentKind}`, `autoSaveOnForcedKindSwitch={autoSaveKindSwitch}`; reports preview, short-answer questions and dirty state back via callbacks. |
| 42  | View       | Card         | Sub-list card heading | "Danh sach cau tra loi ngan" when `currentAssignmentKind === "short_answer"`, else "Danh sach file dinh kem". |
| 43  | View       | List         | Short-answer list | Each entry sorted by `order_index`, rendered as `Câu {idx+1}: {question_text}`. Empty state: "Chua co cau hoi tra loi ngan." |
| 44  | View       | TextInput    | Attachment picker | `<input type="file" multiple>`; updates `pendingAssignmentFiles`. |
| 45  | View       | Text         | Pending file counter | "Da chon {n} file de chen them." or "Chua chon file moi.". |
| 46  | Click      | Button       | "Them file vao danh sach" | Calls `appendAssignmentAttachments`; disabled when no pending file or `readOnly`/`saving`/`loading`. |
| 47  | View       | List         | Attachment list | Each row shows `file_name`, a "Mo" link to `signed_url`, and a `Trash2` button calling `removeAssignmentAttachment(file_path)`. |
| 48  | Empty      | Text         | Attachments empty state | "Chua co file dinh kem." when `assignmentPreview.attachments` is empty. |
| 49  | Empty      | Text         | Assignment empty state | "Chua co bai tap da luu de hien thi thong tin." when `assignmentPreview` is `null`. |

## States & Validation Notes

- Every section component receives a `readOnly` flag; when truthy all inputs and buttons in that section are disabled so the page can lock down editing while the course is under admin review.
- `RejectReasonButton` returns `null` for empty / whitespace-only reasons, ensuring it does not render an empty pill alongside non-rejected badges.
- Each section bails out early (`return null`) when `activeSection` does not match its own type, so the parent layout can mount all four components unconditionally without duplicating UI.
- Quiz / assignment save flows are signal-based: incrementing `quizSaveSignal`, `assignmentSaveSignal`, `assignmentEditSignal`, or `assignmentCancelEditSignal` triggers the embedded editor's effect-based handler exactly once.
- `editingBuffers` are deep clones (`JSON.parse(JSON.stringify(item))`) so that inline edits inside the question list do not mutate `quizQuestionsDraft` until saved through the embedded editor.
- The "Lưu" label intentionally has Vietnamese-without-diacritics variants ("Luu", "Danh sach cau hoi", "Danh sach cau tra loi ngan", "Bai tap", "Tep dinh kem") in the source. These strings are preserved verbatim in the UI.
- The `Save` button in `QuizEditorSection` and `AssignmentEditorSection` swaps to `btn-resubmit-warning` styling with label "Gửi lại" when `isRejectedContext` is true, signalling that submitting will re-enter admin review.
