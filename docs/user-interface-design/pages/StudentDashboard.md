# StudentDashboard — UI Specification

**Source:** `frontend/src/pages/leaner/StudentDashboard.tsx`
**Route:** `/student/dashboard`
**Purpose:** Primary landing experience for learners, presenting enrollment statistics, ongoing courses, suggested courses, deadlines, and quick navigation to course detail and learning hubs.

## Overview
Wrapped by `Authentication` for the `learner`/`student` roles but rendered outside `LearnerSidebarLayout`; this page provides its own sidebar plus mobile sidebar drawer. It issues three parallel API calls on mount: `COURSES_API.myEnrollments` (paged enrolled courses), three filtered enrollments queries to build the stats (`total`, `completed`, `active`), and `COURSES_API.catalog` (suggested courses sorted by `learners_count desc`). Search input is debounced 500 ms into `debouncedSearchTerm`; status filter and search trigger a re-fetch and reset `currentPage` to 1. Aborts are tracked via `AbortController` to prevent stale state writes. The continue-learning grid displays up to six enrolled courses with module-derived progress labels; the suggested tab presents up to six unenrolled top picks.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View (mobile sidebar open) | Button | mobile-sidebar-overlay | Backdrop button with `aria-label="Đóng menu điều hướng"`; clicking closes the mobile sidebar. |
| 2   | View       | Heading      | brand-name | Static text "MindBridge". |
| 3   | View       | Text         | brand-subtitle | Static text "CỔNG HỌC VIÊN". |
| 4   | Click      | Link         | nav-link Bảng điều khiển | `<NavLink to="/student/dashboard">` with `LayoutDashboard` icon and label "Bảng điều khiển". |
| 5   | Click      | Link         | nav-link Khám phá khóa học | `<NavLink to="/courses">` with `BookOpen` icon and label "Khám phá khóa học". |
| 6   | Click      | Button       | view-progress-btn | "Xem tiến độ" with `TrendingUp` icon; navigates to `/student/dashboard`. |
| 7   | Click      | Button       | mobile-menu-btn | Toggles `isMobileSidebarOpen`; icon switches between `Menu` and `X`; `aria-expanded` reflects state. |
| 8   | View       | Avatar       | AvatarMenu | Embedded avatar menu in the header. |
| 9   | View       | Card         | metric-card Tiến độ tổng quan | `Target` icon, label "Tiến độ tổng quan", value "{stats.overallProgress}%". |
| 10  | View (stats.overallProgress > 70) | Badge | pro-badge | Displays "PRO" badge in the metric header. |
| 11  | View       | Card         | metric-card Khóa học đang học | `BookOpen` icon, label "Khóa học đang học", value `stats.active`. |
| 12  | View       | Card         | metric-card Chứng chỉ đạt được | `Award` icon, label "Chứng chỉ đạt được", value `stats.certificatesEarned`. |
| 13  | View       | Card         | chart-card | "Hoạt động học tập" + subtitle "Số giờ học trong 7 ngày gần nhất"; legend dot labelled "Giờ". |
| 14  | View       | Chart        | x-axis bars | Seven bars rendering mock study hours `[2, 3, 1.5, 4, 2.5, 3.5, 1]` against days "T2", "T3", "T4", "T5", "T6", "T7", "CN" (max height 120 px). |
| 15  | Input      | TextInput    | search-input | Placeholder "Tìm kiếm khóa học..."; updates `searchTerm`; `Search` icon prefix; debounced 500 ms. |
| 16  | Select     | Select       | filter-select | Options: "Tất cả trạng thái" (all), "Đang học" (active), "Hoàn thành" (completed), "Đã dừng" (dropped), "Hết hạn" (expired). |
| 17  | Click      | Button       | explore-btn | "Khám phá thêm" with `Sparkles` icon; navigates to `/courses`. |
| 18  | Click      | Tab          | tab-btn Khóa học của tôi | Sets `activeMainTab="myCourses"`; `BookOpen` icon. |
| 19  | Click      | Tab          | tab-btn Gợi ý cho bạn | Sets `activeMainTab="suggested"`; `Sparkles` icon; triggers re-fetch when the list is empty. |
| 20  | View       | Card         | sidebar-card (Hạn nộp sắp tới) | Heading "Hạn nộp sắp tới" with "Xem tất cả" button navigating to `/courses`. |
| 21  | View       | List item    | deadline-item | Up to three active in-progress courses; first item uses badge "Sắp đến hạn", subsequent show `formatDate(last_accessed_at)` or "Đang học"; progress percent displayed. |
| 22  | Empty      | List item    | deadline-item (empty) | When no active courses: "Không có hạn nộp" + "Bạn đang theo kịp tiến độ!" + "Khám phá thêm khóa học để tiếp tục học". |
| 23  | View       | Card         | promo-box | Promo CTA with heading "Nâng cấp gói Plus", description "Mở khóa quyền truy cập không giới hạn vào các chứng chỉ chuyên nghiệp.", and button "Tìm hiểu thêm". |
| 24  | View       | Heading      | section-title (Continue Learning) | "Tiếp tục học". |
| 25  | Click      | Button       | nav-btn (prev) | `ChevronLeft` icon; `setCurrentPage(p => max(1, p-1))`; disabled at page 1. |
| 26  | Click      | Button       | nav-btn (next) | `ChevronRight` icon; `setCurrentPage(p => min(totalPages, p+1))`; disabled at last page. |
| 27  | Loading (myCourses) | Spinner | loading-center | `Loader2` spinner displayed while enrolled fetch is pending. |
| 28  | Error (myCourses) | Card | error-card | `AlertCircle` icon, title "Đã xảy ra lỗi", message and "Thử lại" retry button. |
| 29  | View (myCourses, items) | Card | course-card | One card per enrolled course (slice 0..6); accepts Enter/Space keys; navigates to `/my-courses/{course_id}/{course_slug}` (`openLearningHub`). |
| 30  | View       | Image        | course-image | `course_thumbnail` if present, otherwise `BookOpen` placeholder. |
| 31  | View       | Badge        | course-badge (module) | "Chương {currentModule}/{modules_count || 10}" computed from `progress_percent`. |
| 32  | View       | Heading      | course-title | Renders `course_title`. |
| 33  | View       | Text         | course-instructor | `instructor_name` or fallback "Giảng viên khóa học". |
| 34  | View       | ProgressBar  | progress-bar | "Tiến độ" label + percent text; fill `style={{ width: '{progress_percent}%' }}`. |
| 35  | Click      | Button       | resume-btn (myCourses) | Label "Học tiếp"; inherits parent card click handler. |
| 36  | Empty (myCourses) | Container | empty-state | `BookOpen` icon, heading "Chưa có khóa học nào", subtext "Bạn chưa đăng ký khóa học nào. Bắt đầu hành trình học ngay hôm nay!", "Khám phá khóa học" CTA. |
| 37  | Loading (suggested) | Spinner | loading-center | `Loader2` spinner while suggestion fetch is pending. |
| 38  | Error (suggested) | Card | error-card | `AlertCircle`, title "Không thể tải gợi ý", message and "Thử lại" button. |
| 39  | Empty (suggested) | Container | empty-state | `Sparkles` icon, heading "Chưa có gợi ý nào", subtext "Quay lại sau để xem các gợi ý khóa học phù hợp hơn.", "Xem tất cả khóa học" CTA. |
| 40  | View (suggested, items) | Card | course-card (suggested) | One card per item in `visibleSuggested` (slice 0..6); navigates to `/courses/{slug}` (`openCoursePublicDetail`). |
| 41  | View       | Badge        | course-badge (level) | `getLevelText(level)` returns "Cơ bản"/"Trung cấp"/"Nâng cao"/raw level. |
| 42  | View       | Badge        | stat-badge learners | `Users` icon and "{learners_count || 0} học viên". |
| 43  | View       | Badge        | stat-badge modules | `Layers3` icon and "{modules_count || 0} chương". |
| 44  | Click      | Button       | resume-btn (suggested) | Label "Xem chi tiết"; inherits parent card click handler. |
| 45  | View (totalPages > 1) | Container | pagination | Visible only for the `myCourses` tab when items exist and no loading/error. |
| 46  | Click      | Button       | page-btn (prev) | "Trước" with `ChevronLeft`; disabled at page 1. |
| 47  | View       | Text         | page-info | "Trang {currentPage} / {totalPages}". |
| 48  | Click      | Button       | page-btn (next) | "Sau" with `ChevronRight`; disabled at the last page. |

## States & Validation Notes
- Three race-protection refs (`enrolledRequestRef`, `statsRequestRef`, `suggestedRequestRef`) ensure only the latest response writes to state; the enrolled fetch also aborts in-flight calls.
- Debounced search waits 500 ms; status and search changes reset `currentPage` to 1 in a dedicated `useEffect`.
- `displayName` resolves to `user.full_name`/`user.email`/"Học viên"; currently displayed inside `AvatarMenu` indirectly.
- `getStudyHours` returns the hard-coded 7-day mock dataset; bar height is clamped against `Math.max(...studyHours, 5)`.
- `visibleSuggested` deduplicates suggestions against the current enrolled set by both `course_id` and `course_slug` and respects the API's `is_enrolled` flag.
- Status filter values map directly to the backend `status` query string parameter; "all" omits it.
- `getModuleLabel` derives the current module index from `Math.ceil(progress_percent/100 * (modules_count || 10))`.
- Error messages: "Không thể tải danh sách khóa học", "Không thể tải thống kê học tập", "Không thể tải gợi ý khóa học".
- Cleanup `useEffect` aborts the enrolled request on unmount.
