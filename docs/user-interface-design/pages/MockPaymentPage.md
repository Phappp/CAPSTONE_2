# MockPaymentPage — UI Specification

**Source:** `frontend/src/pages/leaner/MockPaymentPage.tsx`
**Route:** `/mock-payment`
**Purpose:** Simulated checkout page that mimics a real payment gateway flow, lets the user select a method/bank, accept the policy, and finalize an order as success or failure for QA and demo scenarios.

## Overview
Reads the target `order_id` from the query string and loads order metadata from `PAYMENTS_API.orderById(orderId)`. The UI is split into a left "method selection" panel and a right "order summary" panel. The user picks one of four payment methods (`momo_wallet`, `atm_card`, `visa_master`, `qr_bank`), optionally chooses a bank when the QR option is active, accepts the policy checkbox, then triggers `POST PAYMENTS_API.completeMockOrder(orderId)` with a `decision` of `"paid"` or `"failed"`. The "paid" path runs three artificial delays (550/700/650 ms) with rotating status text before posting; on success it shows a centered overlay and navigates to `/payment-result` after 1.5 s. The countdown timer derives from `order.expired_at` and is refreshed every second via a `setInterval`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | mock-checkout__title | Static heading "Thanh toán khóa học". |
| 2   | View       | Avatar       | AvatarMenu | Embedded avatar menu in the header. |
| 3   | Loading    | Container    | mock-checkout__alert (loading) | "Đang tải đơn thanh toán..." while initial order fetch is in flight. |
| 4   | Error      | Container    | mock-checkout__alert--error | Displays `error` state messages (missing order, fetch failures, mock completion failures). |
| 5   | View       | Badge        | mock-chip | Static badge text "Checkout Demo (auto success)". |
| 6   | View       | Heading      | mock-checkout__panelTitle | "Chọn phương thức thanh toán". |
| 7   | View       | Text         | mock-checkout__panelDesc | "Trải nghiệm luồng thanh toán như môi trường thật. Giao dịch demo sẽ tự động thành công.". |
| 8   | Click      | Button       | mock-method (Ví MoMo) | Selects `momo_wallet`; logo "MoMo"; description "Thanh toán tức thì bằng số dư ví hoặc thẻ liên kết."; badge "Phổ biến". |
| 9   | Click      | Button       | mock-method (Thẻ ATM) | Selects `atm_card`; logo "ATM"; description "Thanh toán qua cổng NAPAS và Internet Banking."; badge "Bảo mật 3D". |
| 10  | Click      | Button       | mock-method (Visa/Master/JCB) | Selects `visa_master`; logo "VISA"; description "Hỗ trợ thẻ quốc tế, xác thực OTP."; badge "Quốc tế". |
| 11  | Click      | Button       | mock-method (Quét QR ngân hàng) | Selects `qr_bank`; logo "QR"; description "Dùng app ngân hàng bất kỳ để quét mã QR."; badge "Nhanh". |
| 12  | View (qr_bank) | Container | mock-bank-picker | Visible only when `selectedMethod === "qr_bank"`. |
| 13  | Select (qr_bank) | Select | mock-bank-picker__select | Options "VCB - Vietcombank", "BIDV - BIDV", "VTB - VietinBank", "TCB - Techcombank", "MB - MB Bank", "ACB - ACB"; controls `selectedBank`. |
| 14  | Click      | Checkbox     | mock-policy | Label "Tôi đồng ý với điều khoản thanh toán và chính sách hoàn tiền của nền tảng."; required to enable the primary button. |
| 15  | Click      | Button       | mock-btn--primary | "Thanh toán ngay" (or "Đang xử lý..." while submitting); calls `complete("paid")`. Disabled when `!canComplete || submitting || !acceptedPolicy`. |
| 16  | Click      | Button       | mock-btn (Mô phỏng thất bại) | Calls `complete("failed")`; disabled when `!canComplete || submitting`. |
| 17  | Click      | Button       | mock-btn (Xem kết quả) | Navigates to `/payment-result?order_id={order.id}`; disabled while `submitting`. |
| 18  | Loading (submitting) | Container | mock-processing | Spinner plus `processingStep` text (rotates through "Đang khởi tạo phiên thanh toán...", "Đang xác thực {method.label}...", "Đang xác nhận giao dịch..."). |
| 19  | View       | Heading      | mock-summary__title | "Thông tin đơn hàng". |
| 20  | View       | List item    | mock-summary__row (Mã đơn) | "Mã đơn" / `#{order.id}`. |
| 21  | View       | List item    | mock-summary__row (Trạng thái) | "Trạng thái" / styled badge `mock-status mock-status--{status}` showing raw status. |
| 22  | View       | List item    | mock-summary__row (Phương thức) | "Phương thức" / `selectedMethodMeta.label`. |
| 23  | View (qr_bank) | List item | mock-summary__row (Ngân hàng) | "Ngân hàng" / `selectedBankMeta.name`. |
| 24  | View       | List item    | mock-summary__row (Tạm tính) | "Tạm tính" / `formatVnd(order.amount)`. |
| 25  | View       | List item    | mock-summary__row (Phí cổng) | "Phí cổng" / `formatVnd(0)`. |
| 26  | View       | List item    | mock-summary__row--total | "Tổng cộng" / `formatVnd(order.amount)`. |
| 27  | View       | Text         | mock-summary__timer | "Đơn hết hạn sau" / `countdownLabel` (`mm:ss`). |
| 28  | View       | Container    | mock-security | Two static lines: "🔒 Kết nối mã hóa TLS 1.2" and "✅ Chuẩn bảo mật PCI DSS". |
| 29  | View (successNotice) | Modal | mock-success-overlay | `role="status"`, `aria-live="polite"`; card with "✓", "Thanh toán thành công", "Giao dịch đã được xác nhận. Đang chuyển đến trang kết quả...". |

## States & Validation Notes
- `orderId` parsed from `search.get("order_id")`; missing/NaN sets `error = "Thiếu thông tin đơn thanh toán."` and prevents any UI beyond the alert.
- `canComplete` is true only when `order.status === "pending"`; non-pending states disable all method selectors, the policy checkbox, and the primary buttons.
- Primary button requires all three: `canComplete`, `!submitting`, `acceptedPolicy === true`.
- Failure simulation skips the artificial step delays and posts `{ decision: "failed" }` immediately.
- Successful submission shows the overlay, waits 1.5 s, then navigates to `/payment-result?order_id={orderId}`; failed/expired/refunded navigate immediately.
- Countdown derives `secondsLeft` from `order.expired_at` (Date diff with `nowTick`); fallback display is `"15:00"` when missing.
- Bank picker only renders for `qr_bank` method; default selection is `vcb`.
- API failures set `error` and clear `submitting`; the user can retry from the same state.
