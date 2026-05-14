# AdminCourseContentReviewPage — UI Specification

**Source:** `frontend/src/pages/admin/AdminCourseContentReviewPage.tsx`
**Route:** `/admin/courses/:id/content-review`
**Purpose:** Admin tool for reviewing every lesson resource (file, video, YouTube link, manual quiz, assignment) inside a course; supports per-resource approve/reject with templated reasons, live preview (PDF/video/YouTube/Office viewer/blob iframes), resubmission diffing, and final course-wide approval.

## Overview

The page reads `:id` from the route, calls `COURSES_API.contentTree` and `COURSES_API.listLessonResources` per lesson during `load`, and aggregates everything into `resourcesByLesson`, `pendingResources`, `approvedCount`, `rejectedCount`. The layout is a two-column grid: left = `review-tree-panel` listing modules and lessons with per-node review state badges; right = lesson detail panel containing structured Quiz/Assignment data (fetched lazily via `manualQuiz` and `previewAssignment`), an active-target timeline block, approve/reject toolbar, resource navigator buttons, and a preview area (iframe/video/PDF). Rejection is captured by a templated modal (`rejectModalResource`) with `REJECT_REASON_*` option groups scoped to lesson type and a required free-text field for `"Khác"`. `finalizeCourseReview` enforces zero pending and zero rejected resources before `PATCH adminReview` approves the whole course.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | Page Title | `<h1>` `"Duyệt nội dung khóa học "`. |
| 2   | Click      | Button       | Back To Admin Button | `"Quay về admin"` navigates to `/admin`. |
| 3   | Click      | Button       | Reload Button | `"Tải lại"`; calls `load()`; disabled while `loading`. |
| 4   | Submit     | Button       | Finalize Course Review Button | `"Hoàn tất duyệt khóa học"` / `"Đang hoàn tất..."`; disabled while `loading`, `submittingCourseReview`, or when `pendingResources.length > 0` or `rejectedCount > 0`. Hover `title` explains the blocking reason. Calls `PATCH COURSES_API.adminReview(courseId)` with `{ decision: "approve" }`; on success alerts `"Đã hoàn tất duyệt khóa học."` and navigates to `/admin`. |
| 5   | View       | Card         | Stat: Total Resources | `"Tổng tài nguyên"` = `allResources.length`. |
| 6   | View       | Card         | Stat: Pending | `"Chờ duyệt"` = `pendingResources.length`. |
| 7   | View       | Card         | Stat: Approved | `"Đã duyệt"` = `approvedCount`. |
| 8   | View       | Card         | Stat: Rejected | `"Từ chối"` = `rejectedCount`. |
| 9   | View       | Card         | Stat: Resubmitted | `"Tái nộp"` = count of `pendingResources.is_resubmitted`. |
| 10  | Click      | Button       | Resubmit Filter Toggle | Label `"Filter: ưu tiên mục tái nộp"` / `"Đang lọc: chỉ tái nộp"` toggles `resubmittedFirstOnly`. |
| 11  | Error      | Text         | Inline Error | Renders `error` inside `table-empty`. |
| 12  | Loading    | Text         | Loading Indicator | `"Đang tải..."` while `loading`. |
| 13  | View       | Container    | Content Tree Panel | Header `"Cây nội dung khóa học"`; ul of modules. |
| 14  | View       | Card         | Module Node | Shows status icon (renderReviewIcon), module title, and counts `"{total} tài nguyên · P:{pending} · R:{rejected}"`. |
| 15  | Click      | Container    | Lesson Node | `role="button"` with Enter/Space keyboard support; calls `viewLessonAsLearner(l.id)` which sets `selectedLessonId`, picks the first pending resource and opens its preview (skipped for `assignment` type). Renders status icon + lesson title and stats `"{type} · Tổng:{t} · Chờ:{p} · Duyệt:{a} · Từ chối:{r}"`. |
| 16  | View       | Container    | Empty Lesson Prompt | `"Chọn một bài học ở cây nội dung để bắt đầu duyệt."` when `!selectedLesson`. |
| 17  | View       | Heading      | Selected Lesson Title | `selectedLesson.title` + meta `"Chương: {moduleTitle} · Loại bài: {Lesson|Quiz|Assignment}"`. |
| 18  | View       | Card         | Timeline & Diff Block | Shows `last_review_decision`, timestamp (vi-VN), resubmission note `"Đây là bản gửi lại sau khi bị từ chối. Lý do reject trước: ..."`, and `last_review_note`. |
| 19  | View       | Container    | Quiz Review Block | Visible when `lesson_type==="quiz"`. Contains toolbar (approve/reject icons), quiz title, description, `Câu hỏi/Thời gian/Điểm đạt` stats, and each question card with options highlighted green when `is_correct` and labeled `"- Đáp án đúng"`. |
| 20  | Click      | Button       | Quiz Approve Button | check_circle icon; calls `reviewResource(selectedLessonReviewTarget, "approve", { bypassPreviewRequirement: true })`; disabled until pending and not loading. |
| 21  | Click      | Button       | Quiz Reject Button | cancel icon (danger); opens reject modal. |
| 22  | Loading    | Text         | Quiz Loading | `"Đang tải dữ liệu Quiz..."` while `lessonExtraLoading[lessonId]`. |
| 23  | Empty      | Text         | Quiz Empty | `"Lesson quiz này chưa có dữ liệu quiz để duyệt."`. |
| 24  | View       | Container    | Assignment Review Block | Visible when `lesson_type==="assignment"`. Contains toolbar, title, description, info cards (`Loại`, `Điểm tối đa`, `Hạn nộp`), short-answer question list when `assignment_kind==="short_answer"`. |
| 25  | View       | Text         | Assignment Marker Hint | `"Mục đang chọn chưa có marker review riêng nên chưa thể duyệt/từ chối trực tiếp."` shown when `!activeReviewTarget`. |
| 26  | Click      | Button       | Assignment Approve Button | check_circle; same approve handler. |
| 27  | Click      | Button       | Assignment Reject Button | cancel; opens reject modal. |
| 28  | View       | Card         | Assignment Info Cards | `"Loại"` = `"Trả lời ngắn"` or `"Nộp file"`; `"Điểm tối đa"` = `max_score`; `"Hạn nộp"` formatted `vi-VN`. |
| 29  | View       | Text         | Assignment Short-Answer Stats | `"Số câu hỏi: N · Thời gian làm bài: M phút"`. |
| 30  | View       | List         | Short-Answer Questions | Cards `"Câu {idx+1}: {question_text}"`. |
| 31  | Click      | Button       | Generic Preview Approve | Visible for non-quiz/non-assignment lessons when a `preview.resource` is loaded. Disabled until `canApprove(preview.resource)` — requires the resource to have been previewed. |
| 32  | Click      | Button       | Generic Preview Reject | Opens reject modal for `preview.resource`. |
| 33  | Click      | Button       | Resource Navigator Button (Lesson) | Grid of buttons `(index). {truncatedFilename}` with status icon and `"Gửi lại"` tag if resubmitted; clicking switches `selectedResourceId` and opens preview. |
| 34  | Click      | Button       | Assignment Resource Navigator | For assignments: tiles for description (`"Đề bài (HTML)"`) and each attachment, each with status icon; click updates `selectedAssignmentResourceByLesson[lessonId]`. |
| 35  | Loading    | Text         | Preview Loading | `"Đang tải nội dung..."` while `preview.loading`. |
| 36  | Error      | Text         | Preview Error | Red text showing `preview.error`. |
| 37  | View       | Container    | Assignment HTML Preview | When selected resource `type==="html"`: renders sanitized HTML via `dangerouslySetInnerHTML`. |
| 38  | Loading/Error/View | Container | Assignment File Preview | Shows `"Đang tải file để preview..."`, error text, Office viewer iframe (`view.officeapps.live.com/op/embed.aspx`) for DOC/XLS/PPT, or blob iframe; `"Định dạng .{ext} chưa hỗ trợ preview trực tiếp trong trang."` for ZIP/RAR/7Z. |
| 39  | View       | Container    | Generic Resource Preview | For lesson resources: Office viewer iframe, YouTube embed (via `getYoutubeEmbedUrl`), HTML5 `<video>` with `<source>`, PDF iframe, or fallback iframe based on `resource_kind` and extension. |
| 40  | View       | Modal        | Reject Modal | Visible when `rejectModalResource`. Header `"Từ chối tài nguyên"`, subtitle naming the resource. |
| 41  | View       | Radio        | Reject Reason Radios | Renders `rejectReasonOptions` (common + lesson-type-scoped + `"Khác"`); selecting `"other"` clears `rejectExtraNote` toggle. |
| 42  | View       | Textarea     | Reject Other Note | Visible only when `rejectReasonCode === "other"`; placeholder `"Nhập lý do cụ thể."`; required to submit. |
| 43  | Click      | Button       | Reject Cancel Button | `"Hủy"`; closes modal unless `actionLoadingId != null`. |
| 44  | Submit     | Button       | Reject Confirm Button | `"Xác nhận từ chối"` (danger); disabled when no reason selected, or reason is `"other"` with empty note (`canSubmitReject`), or action in flight. Calls `submitRejectReview` which composes `[code] label. extra` note and calls `executeReviewResource(..., "reject")`. |

## States & Validation Notes

- Approval requires either (a) the resource was opened in the preview (`previewedIds` includes it) for generic file/video resources, or (b) `bypassPreviewRequirement: true` for structured Quiz/Assignment blocks. Generic approves trigger a `window.confirm` unless `skipConfirm: true`.
- Reject reason taxonomy (`rejectReasonOptions`) is `REJECT_REASON_COMMON_OPTIONS` + a scoped list based on `selectedLesson.lesson_type`: `quiz → REJECT_REASON_QUIZ_OPTIONS`, `assignment → REJECT_REASON_ASSIGNMENT_OPTIONS`, otherwise `REJECT_REASON_LESSON_OPTIONS`, plus `REJECT_REASON_OTHER_OPTION`.
- Final approval (`finalizeCourseReview`) refuses to proceed if any pending or rejected resource remains; the button is also disabled with explanatory `title`.
- Preview mode is decided by file extension via `getPreviewModeByExt`: `pdf/png/jpg/jpeg/gif/webp/txt/csv/mp4/webm/mp3/wav → blob`, `doc/docx/xls/xlsx/ppt/pptx → office_viewer`, `zip/rar/7z → unsupported`, else `blob`.
- Resubmission ordering: `selectedResources` sorts by `is_resubmitted` desc then `last_reviewed_at || created_at` desc. `resubmittedFirstOnly` filters to resubmissions only.
- After a successful review, `executeReviewResource` auto-navigates to the next pending resource (or next assignment marker) and re-opens preview; if none remain, it clears preview.
- Blob URLs are tracked in `preview.blobUrl` and `assignmentBlobUrlRef`; both are revoked via `releasePreviewBlob` / `releaseAssignmentFileBlob` on cleanup and on every new preview load.
- All user-facing strings are Vietnamese and preserved verbatim, including reject reason labels (e.g. `"Nội dung không đúng phạm vi bài học"`, `"Quiz chưa hợp lệ (câu hỏi/đáp án)"`).
- Timestamps render via `toLocaleString("vi-VN")` and filenames are truncated by `truncateKeepExtension(name, 36)`.
- The page returns `null` early if `courseId` is `NaN`, blocking render until a valid route param is present.
