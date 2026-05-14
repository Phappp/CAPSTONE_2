# TeacherLessonStudioPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherLessonStudioPage.tsx`
**Route:** `/teacher/courses/:id/lessons/:lessonId/studio` (query parameters: `new=1`, `moduleId`, `pickType=1`, `pickAssignmentKind=1`, `section=content|quiz|assignment`, `assignmentKind=short_answer|file_prompt`, `autoSaveKindSwitch=1`)
**Purpose:** Two-column lesson authoring studio that lets teachers pick a lesson type, edit lesson metadata, upload media or write rich-text content, manage quiz / assignment editors and continuously preview the lesson exactly as the learner will see it.

## Overview

The page loads the course detail, course content tree, and the lesson's resources in parallel, then renders a sticky header with a "Nội dung khóa học" back button followed by ephemeral error / success / read-only review banners. When the URL contains `pickType=1` the body becomes a 3-button "Chọn loại nội dung cho bài học mới" picker; with `pickAssignmentKind=1` it becomes a 2-button "Chọn dạng bài tập" picker. Otherwise the layout is a 60/40 grid: the left column composes `LessonInfoCard` plus `ContentEditorSection`, `QuizEditorSection` and `AssignmentEditorSection` (only the one matching `activeSection` renders), and the right column is a sticky preview card titled "Xem như học viên" rendering video / attachments / rich HTML, or a quiz / assignment preview with timer and metadata. When the course is `pending_review` and no resources are rejected the editors lock into read-only mode; when individual resources are rejected the relevant save button switches to an orange "Gửi lại" affordance.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Click      | Button       | "Nội dung khóa học" back button | Navigates to `/teacher/courses/${courseId}/content?tab=content`. |
| 2   | Error      | Container    | `.error-box` | Displays `AlertCircle` icon and the `error` message; auto-cleared after 4000 ms. |
| 3   | View       | Container    | `.success-box` | Shows `CheckCircle` icon plus `successMessage`; auto-cleared after 4000 ms. |
| 4   | View       | Container    | `.warning-message` | When `isReadOnlyByReview` is true: "Khóa học đang chờ duyệt. Bạn chỉ có thể chỉnh sửa những mục đang bị từ chối." |
| 5   | View       | Heading      | Picker title "Chọn loại nội dung cho bài học mới" | Rendered when `shouldPickLessonType` (`?pickType=1`). |
| 6   | Click      | Button       | "Bài học" choice | Calls `chooseNewLessonType("text")` → PATCH `lesson_type=text` and drops `pickType` from URL. |
| 7   | Click      | Button       | "Quizz" choice | Calls `chooseNewLessonType("quiz")` → sets `lesson_type=quiz`, adds `section=quiz` to URL. |
| 8   | Click      | Button       | "Bài tập" choice | Calls `chooseNewLessonType("assignment")` → sets `lesson_type=assignment`, adds `section=assignment&pickAssignmentKind=1`. |
| 9   | View       | Heading      | Picker title "Chọn dạng bài tập" | Rendered when `shouldPickAssignmentKind`. |
| 10  | Click      | Button       | "Tự luận" | Calls `chooseAssignmentKind("file_prompt")` → URL `section=assignment&assignmentKind=file_prompt`. |
| 11  | Click      | Button       | "Trả lời ngắn" | Calls `chooseAssignmentKind("short_answer")` → URL `section=assignment&assignmentKind=short_answer`. |
| 12  | View       | Card         | `LessonInfoCard` | Block 1: module select, optional new-module inline input, lesson title input, optional short description textarea, Lưu button. See `EditorSections.md` for fields. |
| 13  | View       | Card         | `ContentEditorSection` | Block 2 + 3 when `activeSection === "content"` and the lesson is not an assessment. Hosts video / file / YouTube uploader and the `LessonRichTextEditor`. |
| 14  | View       | Card         | `QuizEditorSection` | Two cards when `activeSection === "quiz"`: the `ManualQuizEditor` and a "Danh sách câu hỏi" panel with expand / edit / delete affordances. |
| 15  | View       | Card         | `AssignmentEditorSection` | Two cards when `activeSection === "assignment"`: the `AssignmentEditor` plus a sub-list ("Danh sách câu trả lời ngắn" or "Danh sách file đính kèm" depending on `currentAssignmentKind`). |
| 16  | View       | Card         | "Xem như học viên" preview card | Right column; sticky on screens ≥ 1024 px. |
| 17  | Loading    | Spinner      | `.preview-loading` | Shows spinning `Loader2` and "Đang tải preview..." when `loading`. |
| 18  | View       | Heading      | Preview lesson breadcrumb | Combines `truncateLabel(selectedModuleTitle)`, the chevron "›", and `truncateLabel(lessonTitle)` (fallbacks: `lesson?.title` or `Bài học #${lessonId}`). |
| 19  | View       | Text         | `preview-description` | Shows `lessonDescription` when non-empty. |
| 20  | View       | Card         | Quiz preview "Điểm đạt" | Renders `quizPreviewConfig.passing_score` followed by `%`. |
| 21  | View       | Card         | Quiz preview countdown | Renders remaining time `MM:SS` when `quizRemainingSeconds != null`, decremented every second from `quizPreviewConfig.time_limit_minutes`. |
| 22  | View       | List         | Quiz preview question list | Each question rendered with title `Câu {idx+1}: {text}` and options labelled `A.`, `B.`, … using `shuffleBySeed` with seed `${question_text}-${idx}` for deterministic shuffle. |
| 23  | View       | Card         | Assignment preview "Hạn nộp" | Renders `assignmentPreview.due_date` via `toLocaleString("vi-VN", { hour12: false, day, month, year, hour, minute })`. |
| 24  | View       | Card         | Assignment preview "Thang điểm" | Renders `assignmentPreview.max_score`. |
| 25  | View       | Card         | Assignment preview "Điểm đạt" | Renders `assignmentPreview.passing_score` when present. |
| 26  | View       | Card         | Assignment preview "Nộp lại" | Renders "Tối đa {max_resubmissions} lần" when `allow_resubmission`. |
| 27  | View       | Container    | `.rich-preview` | Renders `assignmentPreview.description` HTML via `dangerouslySetInnerHTML`. |
| 28  | View       | List         | "File đính kèm đề bài" | Lists `assignmentPreview.attachments` with a "Mở" link to each `signed_url`. |
| 29  | View       | List         | "Câu hỏi trả lời ngắn" | Lists `assignmentShortQuestions` ordered by `order_index` as `Câu {idx+1}: {question_text}`. |
| 30  | View       | Video        | Preview video player | When a pending video file is selected: `<video>` with object URL; when `currentYoutubeId`: embedded YouTube iframe; otherwise `<video>` with `currentVideoResource.url`. Empty state: "Trình duyệt không hỗ trợ phát video." inside `<video>`. |
| 31  | View       | List         | Preview "Tài liệu đính kèm" | Lists `pendingAttachmentFile` (badge "Bản nháp chưa lưu") and any non-video / non-HTML resources; each has a "Mở" link. |
| 32  | View       | Container    | `.preview-content` (rich) | Renders `richHtml` via `dangerouslySetInnerHTML` when text content exists. |

### Page-level state machine (informative)

| Aspect | Value |
| :-- | :-- |
| `activeSection` | `quiz` / `assignment` when `?section=` matches, else `lesson.lesson_type === "assignment" ? "assignment" : "quiz"` for assessments, otherwise `content`. |
| `currentAssignmentKind` | `?assignmentKind=…` if present, else `assignmentPreview.assignment_kind`, fallback `file_prompt`. |
| `isReadOnlyByReview` | `courseStatus === "pending_review"` AND no rejected resources. |
| `isContentRejectedContext` | Any non-quiz / non-assignment resource has `review_status === "rejected"`. |
| `isQuizRejectedContext` | `quizReviewResource?.review_status === "rejected"`. |
| `isAssignmentRejectedContext` | Any `[ASSIGNMENT]` resource has `review_status === "rejected"`. |

## States & Validation Notes

- `load()` fetches `COURSES_API.detail`, `COURSES_API.contentTree`, and `COURSES_API.listLessonResources` in parallel, then in quick-new mode (`?new=1`) clears the title / description / rich HTML and selects `quickModuleId` (or the last module) by default.
- When `richHtml` references `youtube.com|youtu.be|<video|video/`, or any resource has `mime_type` starting with `video/`, `saveStudio` patches `lesson_type = "video"`, otherwise `lesson_type = "text"`.
- `addYoutube` and `uploadFile` for videos first delete previous video resources before posting the new YouTube URL / FormData payload, ensuring only one video per lesson.
- `removeResource` refuses to delete resources with `review_status === "rejected"` while `courseStatus === "pending_review"`, surfacing "Không thể xóa tài nguyên đang bị từ chối khi khóa học chờ duyệt. Vui lòng sửa và gửi lại."
- `saveLessonMeta` validates a non-empty `lessonTitle`, optionally creates a new module via `COURSES_API.createModule`, PATCH-updates the lesson, and when the module changes triggers `COURSES_API.reorderContent` with recomputed `order_index` arrays.
- `switchAssignmentKindWithConfirm` prompts a `window.confirm` warning about unsaved changes before flipping `assignmentKind` and setting `autoSaveKindSwitch=1`.
- `appendAssignmentAttachments` and `removeAssignmentAttachment` keep `assignmentPreview.attachments` in sync via `ASSIGNMENTS_API.uploadAttachments` then PATCH `attachments`.
- `quizRemainingSeconds` is initialized from `time_limit_minutes * 60`, decremented by 1 every second via `setInterval` and reset whenever the config changes.
- `lessonMetaDirty`, `studioContentDirty`, `quizDraftChanged`, and `assignmentDirty` are exposed via `useMemo` for future unsaved-changes guards.
- The hidden picker buttons (`shouldPickLessonType`, `shouldPickAssignmentKind`) are disabled while `isReadOnlyByReview`, `selectingLessonType`, `saving`, or `loading`.
- All save buttons swap to the orange `btn-resubmit-warning` "Gửi lại" variant when their corresponding rejected context flag is `true`.
