# TeacherCourseDetailPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherCourseDetailPage.tsx`
**Route:** `/teacher/courses/:id/edit` (guarded by `Authentication` with roles `course_manager` / `teacher`)
**Purpose:** Full course-editing workspace combining course metadata form, review timeline, embedded content tree editor, assessment shortcuts, and time-based completion rules in a single scrollable page.

## Overview
On mount the page fetches course detail (`COURSES_API.detail`), completion rules (`COURSES_API.completionRules`), prerequisite options (`COURSES_API.prerequisiteOptions`) and the personal review timeline (`COURSES_API.myReviewTimeline`). It maintains `form` / `initialForm` snapshots used by `isDirty`, plus `selectedStatus`, `rules`/`rulesDraft`, `prerequisiteOptions`, `legacyPrerequisites`, `reviewTimeline`, and modal state for assessments and manager-verification prompts. `save()` issues PATCH `COURSES_API.update` and (when status changed and no future schedule) PATCH `COURSES_API.setStatus`. `setStatusNow`, `del`, and `withdrawReviewRequest`/`submitForReview`-equivalent kebab actions live in the actions dropdown. The page also renders `CourseContentTreeEditor` and `CourseAssessmentModal` for quiz/assignment shortcuts; manager-verification blocks (`managerBlocked`) surface a `CommonModal` redirecting to `/profile`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `dashboard-page` root | Outer page wrapper. |
| 2 | Click | Button | Back button | Label "← Tổng quan khóa học"; navigates to `/teacher/courses/{courseId}`. |
| 3 | View | Heading | Course title `course-detail-title` | Shows `course.title` or "Chi tiết khóa học" placeholder. |
| 4 | View | Text | Course slug `course-detail-slug` | Shows `course.slug` or "Đang tải...". |
| 5 | View | Component | `AvatarMenu` | Top-right account menu. |
| 6 | Conditional | Modal | Save success overlay | Visible when `saveSuccessOpen`; title "Lưu thay đổi thành công"; buttons "Về tổng quan" (→ `/teacher/courses/{courseId}`) and "OK" (close). |
| 7 | Conditional | Badge | Status badge `course-status-badge` | Renders one of "Đã xuất bản", "Chờ quản trị viên duyệt", "Bản nháp", "Đã lưu trữ" using `getStatusClassName`. |
| 8 | Click | Button | Actions kebab | Material icon `more_vert`; toggles `openStatusMenu`. Disabled while `loading`. |
| 9 | Conditional | Button | "Đặt thành bản nháp" | Calls `setStatusNow("draft")`. |
| 10 | Conditional (status≠archived) | Button | "Đặt thành đã xuất bản" | Calls `setStatusNow("published")`. |
| 11 | Conditional | Button | "Gửi duyệt quản trị viên" | Calls `setStatusNow("pending_review")`. |
| 12 | Conditional | Button | Archive option | Label switches between "Đặt thành lưu trữ" and "Đang lưu trữ". Calls `setStatusNow("archived")`. |
| 13 | Conditional | Button | "Xóa khóa học" (danger) | Calls `del()` → `window.confirm("Xóa khóa học? (soft delete)")` then DELETE `COURSES_API.softDelete`; on success navigates `/teacher/dashboard`. |
| 14 | Error | Container | `error-box` (top) | Displays `error` string. |
| 15 | Conditional | Container | Quality gate warning | Visible when `course.quality_gate?.ready === false`; lists `quality_gate.issues` as bullet list under heading "Quality gate chưa đạt". |
| 16 | View | TextInput | Tên khóa học | Bound to `form.title`. |
| 17 | View | Textarea | Mô tả ngắn | Rows=3. Bound to `form.short_description`. |
| 18 | View | Textarea | Mô tả đầy đủ | Rows=8. Bound to `form.full_description`. |
| 19 | View | TextInput | Danh mục | Placeholder "Ví dụ: programming, data-science...". Bound to `form.category`. |
| 20 | View | TextInput | Xuất bản tự động lúc (tùy chọn) | `type="datetime-local"`. Bound to `form.publish_scheduled_at`. |
| 21 | View (repeat) | TextInput | Mục tiêu học tập item | Placeholder "Ví dụ: Hiểu cú pháp Python cơ bản". |
| 22 | Click | Button | "Xóa" objective | Removes item; collapses to `[""]` if empty. |
| 23 | Click | Button | "+ Thêm mục tiêu" | Appends empty string to `form.learning_objectives`. |
| 24 | View | Text | Prerequisite hint | "Học viên phải hoàn tất các khóa bên dưới trước khi đăng ký khóa này.". |
| 25 | View | List + Checkbox | Yêu cầu tiên quyết items | For each option: checkbox, title (bold), "✓ Đã chọn" (green) when selected, or "Không khả dụng" badge (red) with `c.reason` tooltip when `selectable === false`. |
| 26 | Empty | Text | "Chưa có khóa học để chọn." | Shown when `prerequisiteOptions` is empty. |
| 27 | Conditional | Text | Legacy prerequisites warning | "Không map được một số điều kiện cũ: {legacyPrerequisites.join(", ")}". |
| 28 | View | Select | Cấp độ | Options "Cơ bản"/"Trung cấp"/"Nâng cao". |
| 29 | View | Select | Ngôn ngữ | Options "Tiếng Việt"/"English". |
| 30 | View | Image | Thumbnail preview `course-thumbnail-img` | Renders `form.thumbnail_url` or placeholder "Chưa có ảnh". |
| 31 | View | TextInput | Đường dẫn ảnh (tùy chọn) | Bound to `form.thumbnail_url`. |
| 32 | Change | TextInput (file) | "Chọn ảnh từ máy" | `accept="image/*"`; uploads to `COURSES_API.uploadCourseThumbnail()`; sets `form.thumbnail_url` (absolute URL). |
| 33 | View | Text | Thumbnail hint | "Ảnh tỉ lệ 16:9 sẽ hiển thị đẹp nhất.". |
| 34 | View | TextInput | Giá (VNĐ) | `inputMode="numeric"`. Placeholder "Để trống nếu miễn phí". |
| 35 | View | Select | Có chứng chỉ | Options "Không"/"Có" → `form.has_certificate` boolean. |
| 36 | View | TextInput | Thời lượng ước tính (giờ) | `inputMode="numeric"`. Bound to `form.estimated_hours`. |
| 37 | View | TextInput | Tags | Placeholder "python, backend, nhập môn". Stored as comma-separated string. |
| 38 | View | Text | Course stats summary | "Học viên: {learners_count} · Chương: {modules_count} · Bài học: {lessons_count}". |
| 39 | Click | Button | "Lưu thay đổi" (primary) | Calls `save()`; disabled when `loading` or `!isDirty`. `ensureVerifiedForCourseActions` may block manager users. |
| 40 | View | Heading | "Timeline duyệt khóa học" | Section title. |
| 41 | Loading | Text | "Đang tải timeline..." | When `timelineLoading`. |
| 42 | View | List | Review timeline items | Up to 10 entries (`reviewTimeline.slice(0,10)`); each shows localized date, `decision`, `from_status` → `to_status`, optional `note`. |
| 43 | Empty | Text | "Chưa có lịch sử duyệt." | When `reviewTimeline` is empty. |
| 44 | View | Heading | "Nội dung khóa học" | Section title above embedded tree. |
| 45 | View | Component | `CourseContentTreeEditor` | Receives `courseId`, `embedded`, and `assessmentShortcuts.onQuiz`/`onAssignment` which call `pickLessonForAssessment(lessonId, tab)`. |
| 46 | Click | Button | "Mở soạn Quizz" (primary) | Calls `openAssessmentModal("quiz")`; opens `CourseAssessmentModal` with `tab="quiz"`. |
| 47 | Click | Button | "Mở soạn bài tập" | Calls `openAssessmentModal("assignment")`. |
| 48 | Conditional | Modal | `CourseAssessmentModal` | Controlled by `assessmentModalOpen`; receives `courses=[{ id, title }]`, current `token`, `loading`, `quizPanelCourseId`, `pickedLessonId`, and tab change callback. |
| 49 | View | Heading | "Quy tắc hoàn thành (Time-based)" | Section title. |
| 50 | Click | Button | "Tải lại" | Calls `fetchCompletionRules()`. Disabled while `rulesLoading`. |
| 51 | Click | Button | "Lưu quy tắc" | Calls `saveCompletionRules()`; PATCH `COURSES_API.completionRules(courseId)`. |
| 52 | Error (rules) | Container | `error-box` | Shows `rulesError`. |
| 53 | View | TextInput | Video: tối thiểu (giây) | `inputMode="numeric"`. Bound to `rulesDraft.video_min_seconds`. |
| 54 | View | TextInput | Video: tối thiểu (% thời lượng, 0..1) | `inputMode="decimal"`. Bound to `rulesDraft.video_min_percent`. |
| 55 | View | TextInput | Text: tối thiểu (giây) | `inputMode="numeric"`. Bound to `rulesDraft.text_min_seconds`. |
| 56 | View | Text | "Đang áp dụng:" summary | Shows `Video ≥ {rules.video_min_seconds}s hoặc ≥ {rules.video_min_percent} · Text ≥ {rules.text_min_seconds}s` when `rules` loaded, else "--". |
| 57 | Conditional | Modal | `CommonModal` (manager verification) | Opens when `ensureVerifiedForCourseActions` returns false. Title "Cần cấp phép giảng viên"; confirm navigates `/profile`. |

## States & Validation Notes
- `courseId = Number(params.id)`; on `NaN` the effect navigates to `/teacher/dashboard`.
- `isDirty` compares the entire `form` (title, descriptions, category, level, language, thumbnail_url, publish_scheduled_at, learning_objectives, prerequisites, price, has_certificate, estimated_hours, tags) and `selectedStatus` against `initialForm`.
- `normalizeStringArray` handles array, JSON string, or human-typed bullet/newline lists; output always contains at least one empty string slot.
- `reconcilePrerequisitesToIds` accepts numeric ids, "Khóa học #N" patterns, or titles; unmappable values populate `legacyPrerequisites`. `selectedPrerequisiteIds` is derived only from numeric ids >0.
- Save behaviour: PATCH `COURSES_API.update` only sends `thumbnail_url` when it changed since `initialForm`; status PATCH is skipped when `publish_scheduled_at` is in the future.
- `del()` and every status mutation route through `ensureVerifiedForCourseActions` so unverified `course_manager` accounts get redirected to `/profile` via `CommonModal`.
- `quality_gate.issues` is rendered verbatim as a bullet list — these strings come from the backend and surface readiness errors.
- `CourseAssessmentModal` syncs `quizPanelCourseId` with the current course id once available (`useEffect` on `course?.id`).
- Review timeline silently degrades to an empty list on failure (`fetchReviewTimeline` swallows errors).
