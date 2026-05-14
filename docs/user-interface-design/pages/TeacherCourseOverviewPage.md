# TeacherCourseOverviewPage — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherCourseOverviewPage.tsx`
**Route:** `/teacher/courses/:id` (guarded by `Authentication` with roles `course_manager` / `teacher`)
**Purpose:** Analytics dashboard for a single course showing hero metadata, review submission controls, KPI cards, enrollment charts, lesson/assessment distributions, learner leaderboard, and a prerequisite graph modal.

## Overview
On mount the page calls `COURSES_API.managerOverview(courseId)` to populate `data: ManagerOverview` and then `COURSES_API.myRejectedResources` and `COURSES_API.myPendingResources` to populate review-status banners. A debounced effect calls `COURSES_API.learnersProgress` for the leaderboard whenever `learnerPage` or `learnerQ` change. The page renders inline SVG `LineMini` / `BarChartMini` / `PieMini` chart components and pulls the prerequisite graph lazily via `COURSES_API.prerequisiteGraph` when the user opens the modal. Status transitions ("Gửi duyệt"/"Thu hồi yêu cầu duyệt") use PATCH `COURSES_API.setStatus`. Quick-fix buttons appear under errors and route users to `/teacher/courses/{courseId}/content?tab=…` based on which validation phrase appears in `error`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `teacher-dashboard course-overview-page` root | Outer wrapper. |
| 2 | Click | Button | "Quay lại danh sách" `back-btn` | Navigates to `/teacher/dashboard?section=course`. Icon `arrow_back`. |
| 3 | View | Heading | Page title | "Tổng quan khóa học". |
| 4 | View | Text | Page subtitle | "Theo dõi hiệu suất và tiến độ học viên". |
| 5 | View | Component | `AvatarMenu` | Top-right account menu. |
| 6 | Loading | Container | `loading-state` | Shows spinning `sync` icon and "Đang tải tổng quan khóa học..." when `loading && !data`. |
| 7 | Error | Container | `warning-message` | Renders `error` string; below it shows quick-fix actions. |
| 8 | Conditional (error) | Button | Quick-fix actions | `quickFixActions` derived from substrings in `error`. "Đi tới Thông tin khóa học" → `/teacher/courses/{courseId}/content?tab=info`; "Đi tới Cấu trúc nội dung" → `/teacher/courses/{courseId}/content?tab=content`. |
| 9 | Conditional | Container | Rejected resources banner | When `!error && rejectedResources.length > 0`: "Có {n} nội dung bị từ chối. Vui lòng mở mục cần sửa để cập nhật và gửi lại.". |
| 10 | Conditional (pending_review) | Card | Pending resources panel | Header "Nội dung đang chờ duyệt ({count})". Lists up to 8 `pendingResources` with filename or lesson title fallback, module path, and badge "Gửi lại" or "Mới gửi". Footer "Và {n} mục khác..." when more than 8. |
| 11 | Conditional (pending_review) | Button | "Mở mục cần sửa" / "Mở mục cần sửa ({n})" | Renders only when `c.status === "pending_review"`; navigates to `/teacher/courses/{courseId}/content?tab=content`. Title hint "Mở nội dung bị từ chối để sửa và gửi lại". |
| 12 | Conditional (pending_review) | Button | "Thu hồi yêu cầu duyệt" / "Đang thu hồi..." | Calls `withdrawReviewRequest()` → `window.confirm("Thu hồi yêu cầu duyệt để quay về bản nháp và tiếp tục chỉnh sửa?")` then PATCH `COURSES_API.setStatus` to `draft`. Disabled while `loading` or `withdrawingReview`. |
| 13 | Conditional (other statuses) | Button | "Gửi duyệt" / "Đang gửi..." | Calls `submitForReview()` → `window.confirm("Bạn có chắc muốn gửi khóa học này để quản trị viên duyệt không?")` then PATCH status to `pending_review`. Icon `send`. |
| 14 | View | Image | `course-thumbnail-large` | Renders `c.thumbnail_url` or placeholder with `menu_book` icon. |
| 15 | View | Heading | Course title large | Displays `c.title`. |
| 16 | View | Badge | Status badge `status-badge--{status}` | Renders `statusLabel` ("Đã xuất bản", "Bản nháp", "Chờ duyệt", "Đã lưu trữ"). |
| 17 | View | Text | Course slug | Shows "/" + `c.slug`. |
| 18 | View | Text | Short description | `c.short_description` or fallback "Chưa có mô tả ngắn.". |
| 19 | Click | Button | "Nội dung" `btn-secondary` | Navigates to `/teacher/courses/{courseId}/content?tab=content`. Icon `format_list_bulleted`. |
| 20 | Click | Button | "Sơ đồ tiên quyết" | Calls `openGraphModal()` which sets `graphModalOpen` and lazy-loads `loadPrerequisiteGraph()`. Icon `account_tree`. |
| 21 | Click | Button | "Ngân hàng câu hỏi" | Navigates to `/teacher/courses/{courseId}/question-banks`. Icon `question_answer`. |
| 22 | View | Heading | "Thống kê nhanh" | Section header with `insights` icon. |
| 23 | View | Card grid | KPI stats cards | Six cards: "Học viên" (`learners_count`), "Chương" (`modules_count`), "Bài học" (`lessons_count`), "Tiến độ TB" (`{data.avg_progress_percent}%`), "Bài có Quiz" (`lessons_with_quiz_count`), "Bài có bài tập" (`lessons_with_assignment_count`). Each uses tinted icon background. |
| 24 | View | Heading | "Phân tích & Xu hướng" | Section header with `analytics` icon. |
| 25 | View | Chart | "Ghi danh theo tháng" `LineMini` | Renders inline SVG line chart using `enrollment_trend.labels`/`values`. |
| 26 | View | Chart | "Trạng thái ghi danh" `PieMini` | Donut chart from `enrollmentPie`: "Đang học" (active, blue), "Hoàn thành" (completed, green), "Bỏ học" (dropped, amber), "Hết hạn" (expired, purple). Falls back to a single empty slice when all zeros. Center label "ghi danh". |
| 27 | View | Heading | "Phân bố chi tiết" | Section header with `bar_chart` icon. |
| 28 | View | Chart | "Loại bài học" `BarChartMini` | Bars for "Video" (purple) and "Văn bản" (cyan) from `lesson_type_counts`. |
| 29 | View | Chart | "Đánh giá" `BarChartMini` | Bars for "Quiz" (pink) and "Bài tập" (orange) from `lessons_with_quiz_count` / `lessons_with_assignment_count`. |
| 30 | View | Chart | "Tiến độ học viên" `BarChartMini` | Bars built from `progress_distribution` (cycled colors). |
| 31 | View | Heading | "Bảng xếp hạng học viên" | Section header with `leaderboard` icon. |
| 32 | View | TextInput | Learner search `search-input` | Placeholder "Tìm theo tên hoặc email...". Bound to `learnerQ`; setting it resets `learnerPage = 1`. Disabled while `learnerLoading`. |
| 33 | Click | Button | "Tải lại" leaderboard | Calls `fetchLearnerProgress()`. Disabled while `learnerLoading`. |
| 34 | Error (leaderboard) | Container | `error-message small` | Renders `learnerError`. |
| 35 | View | Table | Learner leaderboard | Columns: "Hạng", "Học viên" (avatar + name + email), "Tiến độ" (progress bar + percent), "Hoàn thành" (`{completed_lessons}/{total_lessons}`), "Thời gian" ({minutes}), "Trạng thái" badge, "Lần truy cập cuối" (locale date). |
| 36 | Loading (table) | Row | "Đang tải dữ liệu..." | Single row with spinning `sync` icon spans 7 columns. |
| 37 | Empty (table) | Row | "Chưa có dữ liệu học viên" | Single row with `inbox` icon when no items. |
| 38 | View | ProgressBar | `progress-bar-fill` | Width set to `{progress_percent}%`. |
| 39 | View | Badge | Learner status | "Đang học" when `status==="active"`, "Hoàn thành" when `completed`, else raw status. |
| 40 | View | Container | `learners-pagination` | Shows "Tổng: {total} học viên". |
| 41 | Click | Button | "Trước" pagination | Decrements `learnerPage` (min 1). Disabled while loading or on page 1. Icon `chevron_left`. |
| 42 | View | Text | Current page indicator | "Trang {learnerResult.page}". |
| 43 | Click | Button | "Sau" pagination | Increments `learnerPage`. Disabled when `items.length < page_size` (end of list). Icon `chevron_right`. |
| 44 | Conditional | Modal | Prerequisite graph modal | Visible when `graphModalOpen`. Title "Sơ đồ tiên quyết" with `account_tree` icon; close button (`close` icon) on header and "Đóng" primary button in footer. |
| 45 | Loading (modal) | Container | `loading-state small` | Spinning `sync` + "Đang tải sơ đồ..." while `graphLoading`. |
| 46 | View (modal) | Component | `PrerequisiteGraph` | Receives `prerequisiteGraph` data and opens course pages via `window.open("/courses/{slug}", "_blank")` on node click. `showCompletionStatus={false}`. |

## States & Validation Notes
- `courseId = Number(params.id)`; the component returns `null` for invalid ids.
- `load()` first fetches the manager overview, then sequentially the rejected and pending resource lists; any failure clears `data`, `rejectedResources`, `pendingResources` and sets `error`.
- `fetchLearnerProgress` is debounced (400ms) on `learnerPage` + `learnerQ` changes and uses `q.trim()` only when non-empty.
- `quickFixActions` is computed via case-insensitive substring matches against `error`. Phrases like "ít nhất 1 chương", "bài tập", "tài nguyên bị từ chối" trigger the content tab link.
- `statusLabel` is derived from `c.status`; unknown statuses produce an empty string.
- `submitForReview` and `withdrawReviewRequest` use `window.confirm` and call `load()` after the PATCH succeeds to refresh banners.
- `enrollmentPie` filters out zero-value slices; when all are zero a placeholder "Chưa có dữ liệu" slice is supplied to `PieMini`.
- `LineMini`, `BarChartMini`, `PieMini` are local inline SVG components defined in the same file; they auto-scale via `viewBox` and compute their own padding/grid.
- Prerequisite graph data is loaded only on modal open (lazy), and failures silently set `prerequisiteGraph` to `null`.
- Pending resource banner is suppressed unless course status equals `pending_review` AND there is at least one pending resource.
