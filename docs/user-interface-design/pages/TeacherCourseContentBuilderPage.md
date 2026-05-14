# TeacherCourseContentBuilderPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherCourseContentBuilderPage.tsx`
**Route:** `/teacher/courses/:id/content` (guarded by `Authentication` with roles `course_manager` / `teacher` / `admin`)
**Purpose:** Tabbed workspace that lets a teacher edit course metadata, build the module/lesson tree, manage assessments, and configure completion rules for an existing course.

## Overview
The page loads course detail (`COURSES_API.detail`), completion rules (`COURSES_API.completionRules`), and selectable prerequisites (`COURSES_API.prerequisiteOptions`) on mount. It maintains `form` and `initialForm` snapshots so it can detect `isDirty`, plus `selectedStatus`, `rules`/`rulesDraft`, `prerequisiteOptions`, `legacyPrerequisites`, and `activeTab` (`info` | `content` | `assessment` | `rules`; the assessment tab button is commented out, only the embedded section is dormant). Saving issues PATCH `COURSES_API.update` and, when the status changed without a future schedule, PATCH `COURSES_API.setStatus`. The page also offers status switching via a kebab dropdown, soft delete, withdraw-from-review, and embeds `CourseContentSimpleTree` and (when activated) `TeacherCourseAssessmentsPage`. When the course is `pending_review`, the info form becomes read-only (`isReadOnlyByReview`).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `teacher-dashboard content-builder-page` root | Outer wrapper for the builder. |
| 2 | Click | Button | Back navigation `back-btn` | Label "Tổng quan khóa học" with `arrow_back` icon; navigates to `/teacher/courses/{courseId}`. |
| 3 | View | Component | `AvatarMenu` | Top-right avatar/profile menu. |
| 4 | Conditional | Badge | Status badge | Visible when `course` loaded; displays course status with mapped label ("Đã xuất bản"/"Bản nháp"/"Chờ duyệt"/"Đã lưu trữ") and material icon (`public`, `edit_note`, `archive`). |
| 5 | Conditional | Text | Course meta stats | Shows `{modules_count} chương`, `{lessons_count} bài học`, `{learners_count} học viên` with material icons. |
| 6 | Error | Container | `error-box` | Renders `error` string when any API call fails. |
| 7 | View | Tab | "Thông tin khóa học" (`tab-btn`) | Sets `activeTab="info"`. Icon `info`. |
| 8 | View | Tab | "Nội dung" | Sets `activeTab="content"`. Icon `menu_book`. |
| 9 | View | Tab | "Quy tắc hoàn thành" | Sets `activeTab="rules"`. Icon `check_circle`. |
| 10 | Conditional (info tab, pending_review) | Button | "Thu hồi yêu cầu duyệt" | Calls `withdrawReviewRequest()`; uses `window.confirm("Thu hồi yêu cầu duyệt để mở khóa chỉnh sửa?")`; PATCHes status to `draft`. Toggles loading label "Đang thu hồi...". |
| 11 | Click (info tab) | Button | Status menu trigger `icon-btn` | Material icon `more_vert`. Disabled when `loading` or `isReadOnlyByReview`. Toggles `openStatusMenu`. |
| 12 | Conditional (dropdown) | Button | "Đặt thành bản nháp" | Calls `setStatusNow("draft")` via PATCH `COURSES_API.setStatus`. |
| 13 | Conditional (dropdown, !archived) | Button | "Đặt thành đã xuất bản" | Calls `setStatusNow("published")`. |
| 14 | Conditional (dropdown) | Button | Archive item | Label "Đặt thành lưu trữ"; when status already archived shows "Đang lưu trữ". Calls `setStatusNow("archived")`. |
| 15 | Conditional (dropdown) | Button | "Xóa khóa học" (danger) | Calls `del()` → `window.confirm("Xóa khóa học? (soft delete)")` then DELETE `COURSES_API.softDelete(courseId)`; on success navigates `/teacher/dashboard`. |
| 16 | Click (info tab) | Button | "Lưu thay đổi" (primary) | Calls `save()`. Disabled when `loading`, `!isDirty`, or `isReadOnlyByReview`. Icon `save`. |
| 17 | View (info tab) | TextInput | Tên khóa học | Required (`required-star`). Bound to `form.title`. |
| 18 | View (info tab) | Textarea | Mô tả ngắn | Rows=3. Placeholder "Mô tả ngắn gọn về khóa học...". Bound to `form.short_description`. |
| 19 | View (info tab) | Textarea | Mô tả đầy đủ | Rows=6. Placeholder "Mô tả chi tiết nội dung khóa học...". Bound to `form.full_description`. |
| 20 | View (info tab) | TextInput | Xuất bản tự động lúc (tùy chọn) | `type="datetime-local"`. Bound to `form.publish_scheduled_at`. |
| 21 | View (info tab) | TextInput | Giá (VNĐ) | `inputMode="numeric"`. Placeholder "Để trống nếu miễn phí". Bound to `form.price`. |
| 22 | View (info tab) | Select | Cấp độ | Options "Cơ bản"/"Trung cấp"/"Nâng cao" mapped to `beginner`/`intermediate`/`advanced`. |
| 23 | View (info tab) | Select | Ngôn ngữ | Options "Tiếng Việt"/"English" mapped to `vi`/`en`. |
| 24 | View (info tab) | Image | Thumbnail preview | Renders `form.thumbnail_url` or shows placeholder "Chưa có ảnh". |
| 25 | View (info tab) | TextInput | Đường dẫn ảnh (tùy chọn) | Bound to `form.thumbnail_url`. |
| 26 | Change (info tab) | TextInput (file) | "Chọn ảnh" upload | `accept="image/*"`. POSTs file to `COURSES_API.uploadCourseThumbnail()`; on success sets `form.thumbnail_url` (absolute URL if response is relative). |
| 27 | View (info tab) | Text | Thumbnail hint | "Ảnh tỉ lệ 16:9 sẽ hiển thị đẹp nhất". |
| 28 | View (info tab) | TextInput (repeat) | Mục tiêu học tập item | Bound to each `form.learning_objectives[idx]`. Placeholder "Ví dụ: Hiểu cú pháp Python cơ bản". |
| 29 | Click (info tab) | Button | Delete objective `icon-btn danger` | Removes item; collapses to `[""]` if empty. Icon `delete`. |
| 30 | Click (info tab) | Button | "Thêm mục tiêu" `add-btn` | Appends empty string to `form.learning_objectives`. Icon `add`. |
| 31 | View (info tab) | List | Prerequisite items | Iterates `prerequisiteOptions`; each row shows checkbox, title, `Đã chọn` badge when selected, `Không khả dụng` badge with `c.reason` tooltip when `selectable === false`. Click toggles selection (no-op when disabled or read-only). |
| 32 | Empty (info tab) | Text | Empty prerequisite list | "Chưa có khóa học để chọn". |
| 33 | Conditional (info tab) | Text | Legacy warning `legacy-warning` | "Không map được một số điều kiện cũ: {legacyPrerequisites.join(", ")}" when reconciliation leaves leftover strings. |
| 34 | View (content tab) | Container | "Cấu trúc nội dung" card | Embeds `CourseContentSimpleTree` with `courseId` and `readOnly={isReadOnlyByReview}`. |
| 35 | View (assessment tab, dormant) | Embed | `TeacherCourseAssessmentsPage` | Section is rendered when `activeTab === "assessment"`; the tab button to reach it is commented out in source. |
| 36 | View (rules tab) | Heading | "Quy tắc hoàn thành (Time-based)" | Section title with `check_circle` icon. |
| 37 | Click (rules tab) | Button | "Tải lại" `btn-sm` | Calls `fetchCompletionRules()`. Disabled while `rulesLoading` or `isReadOnlyByReview`. |
| 38 | Click (rules tab) | Button | "Lưu quy tắc" `btn-primary` | Calls `saveCompletionRules()` (PATCH `COURSES_API.completionRules`). |
| 39 | Error (rules tab) | Container | `error-box` | Shows `rulesError`. |
| 40 | View (rules tab) | TextInput | Video: thời gian tối thiểu (giây) | `type="number"`, `min=0`, `step=1`. Bound to `rulesDraft.video_min_seconds`. |
| 41 | View (rules tab) | TextInput | Video: phần trăm thời lượng tối thiểu (0..1) | `type="number"`, `min=0`, `max=1`, `step=0.1`. Bound to `rulesDraft.video_min_percent`. |
| 42 | View (rules tab) | TextInput | Khác: thời gian tối thiểu (giây) | `type="number"`, `min=0`, `step=1`. Bound to `rulesDraft.text_min_seconds`. |
| 43 | View (rules tab) | Text | "Đang áp dụng:" summary | Reads from `rules`; shows `Video ≥ {video_min_seconds}s hoặc ≥ {video_min_percent} · Khác ≥ {text_min_seconds}s`, or " -- " when null. |
| 44 | Submit | Modal | Success modal | Visible when `saveSuccessOpen`; title "Lưu thay đổi thành công", body "Bạn muốn quay trở về danh sách khóa học hay tiếp tục ở lại trang này?". Buttons "Về tổng quan" (navigates `/teacher/courses/{courseId}`) and "OK" (closes modal). |

## States & Validation Notes
- `useEffect` reads `?tab=` from `location.search`; valid values are `content`, `info`, `assessment`, `rules` and override default `info`.
- `normalizeStringArray` accepts arrays, JSON strings, or text split by newline / bullet / dash, always producing `string[]` with a single empty entry when input is missing.
- `reconcilePrerequisitesToIds` converts mixed inputs (numeric ids, "Khóa học #N", or titles) into a deduplicated id list; unmappable values go into `legacyPrerequisites`.
- `isReadOnlyByReview` (`course?.status === "pending_review"`) disables every editable control on the info tab and blocks status changes / deletion.
- `save()` skips PATCHing status when `publish_scheduled_at` is set to a future time (`scheduleFuture`) so server-side scheduler handles publication.
- Save failures surface via `error`; success opens the modal and re-fetches detail.
- `selectedPrerequisiteIds` is derived from `form.prerequisites` (numeric ids > 0); unknown ids different from `courseId` are auto-inserted as `Khóa học #{id}` placeholders into `prerequisiteOptions` for display continuity.
