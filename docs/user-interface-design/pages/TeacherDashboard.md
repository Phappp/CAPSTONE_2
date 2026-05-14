# TeacherDashboard — UI Specification

**Source:** `frontend/src/pages/teacher/TeacherDashboard.tsx`
**Route:** `/teacher/dashboard` (guarded by `Authentication allowedRoles={["course_manager", "teacher"]}`)
**Purpose:** Central workspace for teachers / course managers to monitor teaching performance (course status distribution, revenue, learners, transactions) and to manage their own courses (list, filter, sort, change status, archive, delete).

## Overview

The screen renders two top-level sections selected by tabs: "Tổng quan" (Dashboard) and "Quản lý khóa học" (Course Management). The Dashboard section displays stats cards, revenue summary, four SVG charts (BarChart, PieChart, two LineCharts), quick-stats and a recent revenue transactions table, all filterable by an optional date range. The Course Management section shows the teacher's own courses through status tabs, a search box (debounced 450 ms), a sort dropdown and three view modes (`list`, `grid`, `compact`). Persisted preferences (`teacher_courses_tab`, `teacher_courses_sort`, `teacher_courses_view`) survive across reloads via `localStorage`. Manager accounts whose `manager_verification.status !== "verified"` are blocked from create / publish / archive / delete actions and routed to `/profile` through a `CommonModal` confirm dialog.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Container    | `.teacher-dashboard > .dashboard-container` | Root wrapper that hosts header, section tabs and the active section body. |
| 2   | View       | Heading      | `dashboard-title` | Static page title "DASHBOARD". |
| 3   | View       | Text         | `dashboard-subtitle` | Subtitle "Quản lý khóa học và theo dõi hiệu suất giảng dạy". |
| 4   | View       | Component    | `AvatarMenu` | Header-right account menu component imported from `components/AvatarMenu`. |
| 5   | View / Click | Tab         | Section tab "Tổng quan" | Sets `section = "dashboard"`; visually `.active` when matched. |
| 6   | View / Click | Tab         | Section tab "Quản lý khóa học" | Sets `section = "course"`; resets `tab`, `searchInput`, `q`, `page` on switch into dashboard via effect. |
| 7   | View       | Checkbox     | `timeFilterEnabled` | Label "Lọc theo thời gian"; toggling off clears `timeFrom` and `timeTo`. |
| 8   | View       | TextInput    | `timeFrom` (`type="date"`) | Lower bound of the dashboard date range; disabled until `timeFilterEnabled`. |
| 9   | View       | TextInput    | `timeTo` (`type="date"`) | Upper bound of the dashboard date range; disabled until `timeFilterEnabled`. |
| 10  | Click      | Button       | "Đặt lại" | Resets `timeFilterEnabled` to false and clears both dates. |
| 11  | View       | Card         | Stat card "Tổng số" | Displays `filteredStatus.total`. |
| 12  | View       | Card         | Stat card "Đã xuất bản" | Displays `filteredStatus.published`. |
| 13  | View       | Card         | Stat card "Bản nháp" | Displays `filteredStatus.draft`. |
| 14  | View       | Card         | Stat card "Chờ duyệt" | Displays `filteredStatus.pending_review`. |
| 15  | View       | Card         | Stat card "Đã lưu trữ" | Displays `filteredStatus.archived`. |
| 16  | View       | Card         | Revenue card "Doanh thu gộp" | Shows `revenueSummary.gross_revenue` formatted via `Intl.NumberFormat("vi-VN")` as VND; placeholder `...` when `financeLoading`. |
| 17  | View       | Card         | Revenue card "Phí nền tảng" | Shows `revenueSummary.platform_fee_total` in VND. |
| 18  | View       | Card         | Revenue card "Doanh thu ròng" | Shows `revenueSummary.net_revenue` in VND. |
| 19  | View       | Card         | Revenue card "Đơn đã thanh toán" | Shows `revenueSummary.paid_orders` as integer. |
| 20  | View       | Chart        | BarChart "Phân bố trạng thái" | Custom SVG bar chart of `published / draft / pending_review / archived`. |
| 21  | View       | Chart        | PieChart "Phân bố theo cấp độ" | Donut chart over `beginner / intermediate / advanced / other` ("Cơ bản", "Trung cấp", "Nâng cao", "Khác"); shows total in center. |
| 22  | View       | Chart        | LineChart "Xu hướng tạo khóa học" | 6-bucket monthly line built from `created_at` of `filteredCourses`. |
| 23  | View       | Chart        | LineChart "Xu hướng doanh thu ròng" | Line chart from `revenueTrend.net_revenue`; falls back to `learnersSeries` when empty. |
| 24  | View       | Card         | Quick stat "Tổng khóa học" | `filteredStatus.total`. |
| 25  | View       | Card         | Quick stat "Học viên" | Sum of `learners_count`. |
| 26  | View       | Card         | Quick stat "Tỷ lệ xuất bản" | `Math.round(published/total*100)` as `%`. |
| 27  | View       | Card         | Quick stat "Đánh giá TB" | Placeholder "—" (data not wired). |
| 28  | View       | Table        | "Giao dịch doanh thu gần đây" | Columns: "Mã đơn", "Ngày ghi nhận", "Doanh thu gộp", "Phí nền tảng", "Doanh thu ròng", "Trạng thái" (badge "Đã ghi nhận" or "Đảo bút toán"); shows up to 8 rows from `revenueTransactions`. |
| 29  | Empty      | Text         | Transactions empty row | Single cell "Chưa có giao dịch doanh thu trong khoảng thời gian đã chọn." |
| 30  | View       | Heading      | `section-title` | "Khóa học của tôi" in Course Management section. |
| 31  | View       | Text         | `section-subtitle` | "Quản lý, xuất bản và theo dõi tất cả khóa học". |
| 32  | Click      | Button       | "Tạo khóa học mới" | Navigates to `/teacher/courses/new`; first calls `ensureVerifiedForCourseActions` which opens `CommonModal` when manager is unverified. |
| 33  | View / Click | Tab         | Course tabs (`all`, `published`, `draft`, `pending_review`, `archived`) | Sets `tab`; badges show `stats.{key}`; persisted under `teacher_courses_tab`. |
| 34  | TextInput  | TextInput    | `searchInput` | Placeholder "Tìm kiếm khóa học..."; debounced 450 ms into `q`; disabled while `loading`. |
| 35  | View       | Select       | `sort.sort_by:sort_dir` | Options: "Mới cập nhật", "Cũ nhất", "Mới tạo", "Tạo sớm nhất", "Tên A → Z", "Tên Z → A", "Học viên nhiều nhất", "Học viên ít nhất"; persisted under `teacher_courses_sort`. |
| 36  | View       | Text         | "Hiển thị:" | Label preceding the view-mode toggle. |
| 37  | Click      | Button       | View toggle "Danh sách" | Sets `courseView = "list"`. |
| 38  | Click      | Button       | View toggle "Lưới" | Sets `courseView = "grid"`. |
| 39  | Click      | Button       | View toggle "Gọn" | Sets `courseView = "compact"`. |
| 40  | Error      | Text         | `error-message` | Displays error string from API failures (set into `error`). |
| 41  | View       | Card         | Course card item | Each card shows thumbnail (image or `menu_book` placeholder), title, status badge ("Đã xuất bản" / "Bản nháp" / "Chờ quản trị viên duyệt" / "Đã lưu trữ"), `short_description` (fallback "Chưa có mô tả"), meta row of learners / modules / lessons, and a quality-gate label "Quality gate: Ready" or "Quality gate: Chưa đạt" (issues tooltip). |
| 42  | Click      | Card         | Course card | Navigates to `/teacher/courses/${c.id}` when not loading. |
| 43  | Click      | Button       | Action menu "Xuất bản" | Calls `handleSetStatus(c.id, "published")` (gated by `ensureVerifiedForCourseActions`). |
| 44  | Click      | Button       | Action menu "Bỏ xuất bản" | Calls `handleUnpublish(c.id)` → confirm dialog "Bỏ xuất bản khóa học này?" then `handleSetStatus(c.id, "draft")`. |
| 45  | Click      | Button       | Action menu "Lưu trữ" | Calls `handleSetStatus(c.id, "archived")`. |
| 46  | Click      | Button       | Action menu "Khôi phục" | Calls `handleSetStatus(c.id, "draft")` for archived courses. |
| 47  | Click      | Button       | Action menu "Xóa" | Calls `handleDelete(c.id)` → confirm "Xóa khóa học? Thao tác sẽ đưa khóa học vào thùng rác (soft delete)." and DELETE `softDelete(courseId)`. |
| 48  | Empty      | Container    | `empty-state` | When `result.items.length === 0`: icon `inbox` and text "Chưa có khóa học nào". |
| 49  | View       | Text         | `pagination-info` | "Đang tải..." while loading, else `Hiển thị {items.length} / {total} khóa học`. |
| 50  | Click      | Button       | Pagination "Trước" | Decrements `page` (min 1) and refetches. |
| 51  | View       | Text         | `pagination-current` | Current page number. |
| 52  | Click      | Button       | Pagination "Sau" | Increments `page` up to `ceil(total / pageSize)` and refetches. |
| 53  | Loading    | Text         | Stat values | Stat / quick-stat numbers display `0` until `result` / `stats` are loaded; revenue values render `...` while `financeLoading`. |
| 54  | Modal      | Modal        | `CommonModal` | Shown by `ensureVerifiedForCourseActions` with title "Cần cấp phép giảng viên", message includes optional `manager_verification.review_note`; on confirm navigates to `/profile`. |

## States & Validation Notes

- `tab`, `sort`, and `courseView` are initialized from `localStorage` and persisted on every change via dedicated `useEffect` blocks.
- `searchInput → q` is debounced by 450 ms; an effect on `[tab, q, sort.sort_by, sort.sort_dir]` resets `page` to 1 and triggers `fetchStats + fetchList + fetchRevenue` after a 250 ms delay.
- `filteredCourses` is `result.items` filtered locally by `created_at` against `timeFrom` / `timeTo` when `timeFilterEnabled`; all stat/chart memos derive from it.
- A document-level `mousedown` listener closes the per-card action menu when clicking outside `[data-course-actions-menu="root"]`.
- `handleSetStatus`, `handleUnpublish`, and `handleDelete` set `loading = true`, surface API messages into `error`, and call `refetch()` on success.
- VND formatting uses `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })` with a fallback `"${amount} VND"` if the formatter throws.
- `managerBlocked` is computed from `user.primary_role === "course_manager"` and `manager_verification.status !== "verified"`; it gates every mutating action via `ensureVerifiedForCourseActions`.
