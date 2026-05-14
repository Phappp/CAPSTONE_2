# AdminDashboard — UI Specification

**Source:** `frontend/src/pages/admin/AdminDashboard.tsx`
**Route:** `/admin`
**Purpose:** Single-page administrative console with a collapsible sidebar that switches between six panels — user management, audit logs, OpenRouter API keys, course-review queue, course-manager verifications, and system revenue — backed by `@tanstack/react-query` data hooks.

## Overview

The component renders a fixed `admin-sidebar` (`MindBridge` logo, six `navItems`, user-info footer, logout button) and a main pane whose content is driven by the `view` state (`AdminView`). Six React Query hooks (`usersQuery`, `auditQuery`, `openRouterQuery`, `pendingReviewQuery`, `managerVerificationQuery`, `revenueSummaryQuery` + `revenueByTeacherQuery`) are enabled conditionally on `view` + `accessToken`. Admin operations call services in `adminUsersClient` (reset password, role/status updates, soft delete, restore, bulk action with undo, CSV export, OpenRouter key CRUD/test/cooldown, review course, review manager verification). Permissions are gated by `can(adminTier, action)` where `adminTier` is derived from `user.roles`. A shared `CommonModal` (`noticeModal`) surfaces success/error notices; many destructive flows fall back to `window.confirm` / `window.prompt`. Sub-components handle each panel: `UserRow`, `AuditLogsPanel`, `KeysPanel`, `CourseReviewsPanel`, `ManagerVerificationsPanel`, `RevenuePanel`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Button       | Mobile Menu Button | Floating Menu icon button; sets `mobileOpen=true`. |
| 2   | View       | Container    | Mobile Overlay | Rendered while `mobileOpen`; clicking it calls `closeMobileSidebar`. |
| 3   | View       | Container    | Admin Sidebar | `admin-sidebar` with `collapsed` and `mobile-open` modifier classes driven by `sidebarCollapsed` and `mobileOpen`. |
| 4   | View       | Text         | Sidebar Logo | Renders `"MindBridge"` when not collapsed. |
| 5   | Click      | Button       | Sidebar Toggle | Toggles `sidebarCollapsed`; icon switches between ChevronRight and ChevronLeft. |
| 6   | Click      | Tab          | Nav Item: Users | Label `"Quản lý người dùng"` (Users icon); always enabled; sets `view="users"`. |
| 7   | Click      | Tab          | Nav Item: Audit Logs | `"Nhật ký hệ thống"` (FileText); disabled when `!can(adminTier, "view_audit_logs")`. |
| 8   | Click      | Tab          | Nav Item: Keys | `"Khóa API"` (Key); disabled when `!can(adminTier, "change_status")`. |
| 9   | Click      | Tab          | Nav Item: Course Reviews | `"Duyệt khóa học"` (BookOpen); same permission gate. |
| 10  | Click      | Tab          | Nav Item: Manager Verifications | `"Xác minh giảng viên"` (UserCheck). |
| 11  | Click      | Tab          | Nav Item: Revenue | `"Doanh thu hệ thống"` (Wallet); requires `view_audit_logs`. |
| 12  | View       | Text         | User Info Email | `user.email` rendered in sidebar footer. |
| 13  | View       | Text         | User Info Role | `getRoleDisplayLabel(user.primary_role || user.roles[0])`. |
| 14  | Click      | Button       | Logout Button | Calls `logout` from auth context; LogOut icon. |
| 15  | View       | Heading      | Main Title | `VIEW_CONFIG[view].label` (e.g. `"Quản lý người dùng"`). |
| 16  | View       | Text         | Main Subtitle | `VIEW_CONFIG[view].description`. |
| 17  | View       | Card         | Users Stats Cards | Four cards: `Tổng số`, `Học viên`, `Giảng viên`, `Quản trị viên` from `statistics.total/learners/course_managers/admins`. |
| 18  | View       | TextInput    | User Search Field | Placeholder `"Tìm kiếm theo email, tên, SĐT..."`; resets `page=1` on change; bound to `search`; Search icon overlay. |
| 19  | Click      | Button       | Export CSV Button | `"XUẤT FILE"` with Download icon; `exportCsv` builds CSV of `displayedUsers` and downloads `admin_users_<date>.csv`. |
| 20  | View       | Checkbox     | Fuzzy Search Toggle | Label `"Tìm gần đúng"`; toggles `fuzzy` (server search disabled while true). |
| 21  | View       | Select       | Role Filter | Options `Tất cả vai trò / Học viên / Giảng viên / Quản trị viên` bound to `role`. |
| 22  | View       | Select       | Status Filter | Options `Tất cả trạng thái / Hoạt động / Chờ duyệt / Bị khóa / Đã xóa` bound to `status`. |
| 23  | View       | Checkbox     | Include Deleted Toggle | `"Gồm cả đã xóa"` controls `includeDeleted`. |
| 24  | View       | TextInput    | Saved Filter Name Input | Placeholder `"Tên bộ lọc đã lưu..."` bound to `savedFilterName`. |
| 25  | Click      | Button       | Save Filter Button | `"Lưu bộ lọc"` (Save icon); persists current filter object to `savedFilters` and `localStorage` key `admin_users_saved_filters`. |
| 26  | Click      | Badge        | Saved Filter Tag | For each saved filter: name button applies it; `✕` removes it. |
| 27  | View       | Text         | Bulk Count | `"Đã chọn: {selectedOnPage.length}"`. |
| 28  | View       | Select       | Bulk Action Select | Options `Kích hoạt / Vô hiệu hóa / Đổi vai trò` bound to `bulkAction`. |
| 29  | View       | Select       | Bulk Role Select | Visible when `bulkAction === "set_role"`; options `Học viên / Giảng viên / Quản trị viên`. |
| 30  | Click      | Button       | Apply Bulk Button | `"Áp dụng"` / `"Đang chạy..."`; disabled when no selection or `bulkRunning`; `runBulk` confirms then calls `apiBulkAction`. |
| 31  | Click      | Button       | Undo Bulk Button | `"Hoàn tác"`; disabled until a previous activate/deactivate; reverses action via `apiBulkAction`. |
| 32  | Click      | Button       | Clear Selection Button | `"Bỏ chọn"`; resets `selectedIds`. |
| 33  | View       | Table        | Users Table | Columns: checkbox, `Người dùng`, `Email`, `Vai trò`, `Trạng thái`, `Đăng nhập cuối`, `Thao tác`. |
| 34  | Loading    | Text         | Users Loading Row | Spinner RefreshCw + `"Đang tải..."` while `usersQuery.isLoading`. |
| 35  | Error      | Text         | Users Error Row | AlertCircle + `"Không thể tải danh sách người dùng"`. |
| 36  | Empty      | Text         | Users Empty Row | `"Không có người dùng nào"`. |
| 37  | View       | Checkbox     | Select-All Checkbox | Toggles all non-deleted users on the page via `toggleSelectAllOnPage`. |
| 38  | View       | Checkbox     | Row Selection Checkbox | Toggles `selectedIds`; disabled for `status === "deleted"`. |
| 39  | View       | Badge        | Status Badge | Maps `active → "Hoạt động"`, `pending → "Chờ duyệt"`, `banned → "Bị khóa"`, `deleted → "Đã xóa"`. |
| 40  | Click      | Button       | Reset Password Button | Lock icon (`btn-small`); confirms via `window.confirm` then `apiResetUserPassword`; shows temp password notice. |
| 41  | Click      | Select       | Row Role Select | Bound to `user.role`; on change calls `handleUpdateRole` (with confirmation) → `apiUpdateUserRole`. |
| 42  | Click      | Button       | Row Status: Activate | `"Mở"`; `handleUpdateStatus(target, "active")`. |
| 43  | Click      | Button       | Row Status: Ban | `"Khóa"`; prompts for reason (required for ban) and confirms via `window.confirm`; calls `apiUpdateUserStatus`. |
| 44  | Click      | Button       | Row Soft Delete Button | `"Xóa mềm"` (danger); prompts mandatory reason; calls `apiSoftDeleteUser`. |
| 45  | Click      | Button       | Row Restore Button | `"Khôi phục"` (UserRestore icon); only when `status === "deleted"`; calls `apiRestoreUser`. |
| 46  | Click      | Button       | Users Pagination Prev | ChevronLeft `"Trước"`; disabled when `page <= 1`. |
| 47  | Click      | Button       | Users Pagination Next | `"Sau"` ChevronRight; disabled at last page. |
| 48  | View       | Text         | Pagination Info | `"Trang {page} / {pagination.pages}"`. |
| 49  | View       | TextInput    | Audit Actor Filter | Placeholder `"ID người thao tác"` bound to `auditActorId`. |
| 50  | View       | TextInput    | Audit Action Filter | Placeholder `"Hành động"` bound to `auditAction`. |
| 51  | View       | TextInput    | Audit From DateTime | `type="datetime-local"`, bound to `auditFrom`. |
| 52  | View       | TextInput    | Audit To DateTime | `type="datetime-local"`, bound to `auditTo`. |
| 53  | View       | Table        | Audit Logs Table | Columns: `Thời gian / Người thao tác / Hành động / Đối tượng / Chi tiết` with `metadata` rendered as JSON in `<pre>`. |
| 54  | Loading/Error/Empty | Text | Audit States | Shared spinner / error / empty rows analogous to users table. |
| 55  | View       | Container    | OpenRouter Config Section | Title `"🤖 Cấu hình OpenRouter"` with the inputs below. |
| 56  | View       | Textarea     | OpenRouter Models Input | Label `"Danh sách model (mỗi dòng 1 model)"`, 5 rows; placeholder `openai/gpt-4o-mini\nanthropic/claude-3.5-sonnet`. |
| 57  | View       | TextInput    | OpenRouter Default Model | Label `"Model mặc định"`, placeholder `openai/gpt-4o-mini`. |
| 58  | View       | TextInput    | OpenRouter Cooldown Minutes | Label `"Số phút chờ khi key bị giới hạn"`, `type="number"`, min `1`. |
| 59  | Submit     | Button       | Save OpenRouter Config | `"Lưu cấu hình OpenRouter"` / `"Đang lưu..."`; calls `saveOpenRouterConfig`. |
| 60  | View       | Toast        | OpenRouter Message | `openRouterMessage` shown as `toast-message`; auto-cleared after 5 s. |
| 61  | View       | Text         | Active Available Keys | `"Khóa hoạt động khả dụng: {activeAvailableKeys}"`. |
| 62  | Click      | Tab          | Key Health Filter Tags | Tags `Tất cả / Ổn định / Giới hạn / Lỗi xác thực / Không hoạt động` set `keyHealthFilter`. |
| 63  | View       | TextInput    | New Key Label Input | Placeholder `"Nhãn (vd: key dự phòng #2)"` bound to `newOpenRouterKeyLabel`. |
| 64  | View       | PasswordInput | New API Key Input | `type="password"` placeholder `"Nhập khóa API OpenRouter"` bound to `newOpenRouterApiKey`. |
| 65  | Click      | Button       | Add Key Button | `"Thêm khóa"` with Plus icon; calls `createOpenRouterKey` (validates key non-empty). |
| 66  | View       | Card         | Key Card | For each filtered key: badge `healthStatus.toUpperCase()`, `#id`, optional label, `key_preview`, status (`hoạt động / không hoạt động · khả dụng / đang chờ`), cooldown timestamp, error count, last used timestamp. |
| 67  | Click      | Button       | Toggle Active Button | `"Bật"` / `"Tắt"` toggles `is_active` via `apiUpdateOpenRouterKey`. |
| 68  | Click      | Button       | Set Cooldown Button | `"Đặt thời gian chờ"` calls `setOpenRouterKeyCooldown` using current `openRouterCooldownMinutes`. |
| 69  | Click      | Button       | Clear Cooldown Button | `"Xóa thời gian chờ"` calls `clearOpenRouterKeyCooldown`. |
| 70  | Click      | Button       | Test Key Button | `"Kiểm tra"` / `"Đang kiểm tra..."` while `testingKeyId === id`; calls `testOpenRouterKey`. |
| 71  | Click      | Button       | Delete Key Button | `"Xóa"` (danger); confirms then `apiDeleteOpenRouterKey`. |
| 72  | View       | TextInput    | Course Review Search | Placeholder `"Tìm theo tiêu đề / slug"` bound to `reviewQ`. |
| 73  | Click      | Button       | Course Review Refresh | `"Tải lại"` (RefreshCw) calls `pendingReviewQuery.refetch`. |
| 74  | View       | Table        | Pending Courses Table | Columns: `Khóa học / Danh mục / Slug / Kiểm tra chất lượng / Phase / Cập nhật / Thao tác`. |
| 75  | View       | Icon         | Quality Gate Indicator | Check icon (green) if `quality_gate.ready`, else AlertCircle (amber). |
| 76  | View       | Badge        | Course Review Phase Badge | `phaseByCourse[course.id]` (e.g. `"Đang xử lý"`) rendered as warning badge. |
| 77  | Click      | Button       | Proceed Review Button | `"Tiến hành duyệt"` opens the in-panel detail view with course metadata. |
| 78  | Click      | Button       | Course Detail Back Button | `"Quay lại danh sách"` clears `selectedCourse`. |
| 79  | View       | Card         | Course Detail Grid | Cards for Slug, Danh mục, Cập nhật, Chất lượng (`Đạt`/`Chưa đạt`), Mô tả ngắn, Ghi chú kiểm tra chất lượng. |
| 80  | Click      | Button       | Open Content Review Button | `"Duyệt nội dung"` navigates to `/admin/courses/:id/content-review`. |
| 81  | Click      | Button       | Course Timeline Button | `"Lịch sử"` calls `viewReviewTimeline`; shows first 10 entries via notice modal. |
| 82  | View       | TextInput    | Verification Search | Placeholder `"Tìm theo email / họ tên"` bound to `verificationQ`. |
| 83  | View       | Select       | Verification Status Filter | Options `Tất cả trạng thái / Chờ duyệt / Đã xác minh / Từ chối / Tạm khóa`. |
| 84  | Click      | Button       | Verification Refresh | `"Tải lại"` calls `managerVerificationQuery.refetch`. |
| 85  | View       | Table        | Verifications Table | Columns: `Người dùng / Trạng thái / Hồ sơ năng lực / Cập nhật / Thao tác`; status badge maps to localized labels via `formatStatusLabel`. |
| 86  | Click      | Button       | Verification Detail Button | `"Xem chi tiết"` opens in-panel detail view. |
| 87  | Click      | Button       | Verification Approve Button | `"Xác minh"` calls `reviewManagerVerification(item, "verified")`. |
| 88  | Click      | Button       | Verification Reject Button | `"Từ chối"` (danger). |
| 89  | Click      | Button       | Verification Suspend Button | `"Tạm khóa"`. |
| 90  | View       | List         | Verification Certificate Links | Renders `splitLinks(certificate_links)` as anchor list with `target="_blank"`. |
| 91  | View       | Card         | Revenue Stats | Four cards: `Doanh thu gộp`, `Phí hệ thống`, `Doanh thu giảng viên`, `Đơn hàng thành công / hoàn tiền` (paid/refunded). |
| 92  | View       | TextInput    | Revenue Search | Placeholder `"Tìm theo tên/email/ID giảng viên..."` bound to `revenueSearch`. |
| 93  | View       | TextInput    | Revenue Date From | `type="date"` bound to `revenueFrom`. |
| 94  | View       | TextInput    | Revenue Date To | `type="date"` bound to `revenueTo`. |
| 95  | View       | Table        | Revenue By Teacher Table | Columns: `Giảng viên / Doanh thu gộp / Phí hệ thống / Doanh thu ròng / Paid / Refund / Ghi nhận gần nhất`. Money via `formatMoney` (vi-VN + `đ`). |
| 96  | View       | Modal        | Notice Modal | `CommonModal` driven by `noticeModal` with variants `info / warning / error / success`. |

## States & Validation Notes

- `adminTier` derives from `user.roles` lowercased; `can(tier, action)` allows only `tier === "admin"` to perform any action except `hard_delete`. Disabled flags propagate through nav items and inline buttons.
- Bulk actions (`activate`, `deactivate`, `set_role`) confirm via `window.confirm`; `set_role` requires `bulkRole`; `lastUndo` stores reversible activate/deactivate operations only.
- CSV export filename: `admin_users_${YYYY-MM-DD}.csv`; rows reflect current `displayedUsers` (post-fuzzy filtering).
- Saved filters persist in `localStorage` under `admin_users_saved_filters`; load on mount, write on every change.
- React Query keys include all filter values so pagination/filter changes refetch lazily; `keepPreviousData: true` for users/audit/courses/verifications/revenue tables.
- `getKeyHealthStatus` derives a key's badge: `inactive` if `!is_active`, `auth_error` on `last_test_status==="unauthorized"`, `limited` on `rate_limited` or `!is_available_now`, `healthy` on `ok`, else `unknown`.
- All Vietnamese strings are preserved verbatim (`"Hoạt động"`, `"Đang xử lý"`, `"Tải lại"`, etc.). Date columns format via `toLocaleString("vi-VN")`.
- `window.prompt` and `window.confirm` are used for inline notes/reasons on reset password, role change, status change (ban requires reason), soft delete (reason required), course review (reject reason required), manager verification (note optional).
