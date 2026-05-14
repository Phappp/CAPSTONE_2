# CoursesCatalogPage — UI Specification

**Source:** `frontend/src/pages/leaner/CoursesCatalogPage.tsx`
**Route:** `/courses`
**Purpose:** Browseable catalog of published courses with search, level filter, pagination, and one-click enroll or purchase actions for learners.

## Overview
Rendered inside `LearnerSidebarLayout` and protected by `Authentication` for `learner`/`student` roles. The catalog is fetched from `COURSES_API.catalog` sorted by `learners_count desc` with page size 12. The search input is debounced for 450 ms via a `qInput`/`q` pair and the level selector triggers an immediate fetch by resetting page to 1. Enrolled courses are filtered out client-side (`visibleItems`). Free enrollment uses `COURSES_API.enroll(courseId)`, paid enrollment posts to `PAYMENTS_API.createMomoOrder` and redirects to the returned `payment_url`; if the order is already paid, the user is taken to `/student/dashboard`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | catalog__title | Renders the text "Khám phá khóa học". |
| 2   | View       | Avatar       | AvatarMenu | Embedded `<AvatarMenu />` in the header. |
| 3   | Input      | TextInput    | Search Input | Placeholder "Tìm theo tên..."; bound to `qInput`; debounced 450 ms to `q`; disabled while `loading`. |
| 4   | Select     | Select       | Level Filter | Options "Tất cả cấp độ" (`""`), "Cơ bản" (`beginner`), "Trung cấp" (`intermediate`), "Nâng cao" (`advanced`); resets page to 1 on change. |
| 5   | Error      | Container    | errorBox | Visible when `error` is set; displays Vietnamese error message. |
| 6   | View       | Card         | Course Card | One card per item in `visibleItems` (filters out `is_enrolled`). |
| 7   | View       | Image        | card__thumb | Renders `c.thumbnail_url` if present; otherwise empty wrapper. |
| 8   | View       | Badge        | levelBadge | "Cơ bản"/"Trung cấp"/"Nâng cao" with `badge--green`, `badge--blue`, `badge--purple` classes respectively. |
| 9   | View       | Heading      | card__title | Renders `c.title`. |
| 10  | View       | Text         | card__desc | Renders `c.short_description` or "—" placeholder. |
| 11  | View       | Text         | Price Line | Shows "Học phí: {formatVnd(price)}" when `price > 0`, otherwise "Miễn phí". |
| 12  | Click      | Button       | Detail Button | Label "Xem chi tiết"; navigates to `/courses/{c.slug}`; disabled while `loading`. |
| 13  | Click      | Button       | Primary Action Button | Label decision tree: "Chưa đủ điều kiện" when `can_enroll === false`; "Mua khóa học" when `price > 0`; "Đăng ký" otherwise. Triggers `checkoutPaidCourse(c.id)` or `enroll(c.id)` accordingly. |
| 14  | View (can_enroll false) | Text | Prerequisite Notice | "Cần hoàn tất khóa tiên quyết trước khi đăng ký.". |
| 15  | Empty      | Container    | empty-info | When `!loading && !error && visibleItems.length === 0`: "Không có khóa học mới để đăng ký (các khóa học trong danh sách này bạn đã đăng ký hết).". |
| 16  | View       | Text         | Footer Total | Shows "Đang tải..." while loading, else `Tổng: {data.total}`. |
| 17  | Click      | Button       | Pagination Prev | Label "Trước"; decrements `page`; disabled when `loading` or `page <= 1`. |
| 18  | View       | Text         | Pagination Indicator | "Trang {page} / {totalPages}" computed from `ceil(total / pageSize)`. |
| 19  | Click      | Button       | Pagination Next | Label "Sau"; increments `page`; disabled when `loading` or `page >= totalPages`. |

## States & Validation Notes
- `loading` toggles during catalog fetches, enroll calls, and pagination; disables every interactive control on the page.
- `error` captures messages from catalog fetch ("Không thể tải danh sách khóa học."), enroll failures ("Không thể đăng ký khóa học."), or MoMo errors ("Không thể tạo đơn thanh toán." / "Không nhận được liên kết thanh toán từ MoMo." / "Không thể bắt đầu thanh toán.").
- Free enrollment requires `window.confirm("Đăng ký khóa học này?")`; success triggers `window.alert("Đăng ký thành công. Khóa học sẽ hiển thị trong Dashboard học viên.")` and resets to page 1.
- Paid checkout: if backend returns `status === "paid"`, alerts "Bạn đã thanh toán khóa học này trước đó. Vào Dashboard để tiếp tục học." and navigates to `/student/dashboard`. Otherwise `window.location.href = payment_url`.
- Debounce: `qInput` -> `q` after 450 ms; level changes immediately re-fetch.
- Pagination uses `pageSize = 12` and `sort_by=learners_count`, `sort_dir=desc`.
