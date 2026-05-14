# PaymentResultPage — UI Specification

**Source:** `frontend/src/pages/leaner/PaymentResultPage.tsx`
**Route:** `/payment-result`
**Purpose:** Read-only status page that confirms the outcome of a payment order and routes the user back into the learner experience or the catalog.

## Overview
Rendered inside `LearnerSidebarLayout` for learner roles. The page reads `order_id` from the query string and calls `GET PAYMENTS_API.orderById(orderId)` to fetch the current state. The localized status label is derived via `useMemo` from `order.status` (`paid`, `pending`, `failed`, `expired`, `refunded`). Layout reuses the catalog's `catalog/card` classnames for visual consistency. A single primary action is rendered: paid orders surface a "Vào dashboard học viên" button; every other status surfaces "Quay lại danh sách khóa học".

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | catalog__title | Static heading "Kết quả thanh toán". |
| 2   | View       | Avatar       | AvatarMenu | Embedded avatar menu in the header. |
| 3   | Loading    | Container    | errorBox (loading) | Shows "Đang tải trạng thái thanh toán..." while the order fetch is pending. |
| 4   | Error      | Container    | errorBox (error) | Shows `error` text (missing order id or fetch failure: "Thiếu thông tin đơn thanh toán." / "Không thể tải trạng thái đơn."). |
| 5   | View (order) | Card        | result-card | Wrapper card constrained to `maxWidth: 680px`. |
| 6   | View       | Heading      | card__title | Renders `statusLabel`: "Thanh toán thành công" (paid), "Đang chờ xác nhận thanh toán" (pending), "Thanh toán thất bại" (failed), "Đơn thanh toán đã hết hạn" (expired), "Đơn đã hoàn tiền" (refunded), else raw status. |
| 7   | View       | Text         | card__desc Mã đơn | "Mã đơn: #{order.id}". |
| 8   | View       | Text         | card__desc Số tiền | "Số tiền: {formatVnd(order.amount)}". |
| 9   | Click (paid) | Button | Vào dashboard học viên Button | Visible when `order.status === "paid"`; navigates to `/student/dashboard`. |
| 10  | Click (!paid) | Button | Quay lại danh sách khóa học Button | Visible for all non-paid statuses; navigates to `/courses`. |

## States & Validation Notes
- Missing/NaN `orderId` immediately sets `error` to "Thiếu thông tin đơn thanh toán." and short-circuits the fetch.
- The status label is computed via `useMemo` from `order.status`; unknown statuses fall through to the raw string.
- Only one of the two action buttons is rendered at a time, governed by `order.status === "paid"`.
- `formatVnd` uses the `vi-VN` locale with VND currency formatting; on failure it falls back to `"{amount} VND"`.
- The fetch uses an `alive` flag to guard against state updates after unmount.
