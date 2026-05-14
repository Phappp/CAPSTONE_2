# ResetPasswordPage — UI Specification

**Source:** `frontend/src/pages/authentication/ResetPasswordPage.tsx`
**Route:** `/reset-password`
**Purpose:** Allow a user holding a reset-password `token` query parameter to set a new password for their account.

## Overview

The page renders a centered `.auth-card` with a title, subtitle, and a form containing two password inputs (`newPassword`, `confirmPassword`) plus inline error/success boxes and a submit button. The reset `token` is parsed once from the URL via `useSearchParams` and memoized. `handleSubmit` performs three client-side validations (presence of token, minimum 6 characters, password match) before calling `apiResetPassword({ token, new_password })`. On success the green box appears; on failure the red box displays the error. A "back to login" link is always visible. The card reuses styles from `./LoginPage.css`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | Page Title | `<h1 class="auth-title">` displaying "Đặt lại mật khẩu". |
| 2   | View       | Text         | Page Subtitle | `<p class="auth-subtitle">` displaying "Nhập mật khẩu mới cho tài khoản của bạn." |
| 3   | View       | Text         | New Password Label | Label "Mật khẩu mới" tied to `id="new-password"`. |
| 4   | View       | PasswordInput | New Password Field | `<input id="new-password" type="password" required minLength={6}>` bound to `newPassword`, placeholder "Nhập mật khẩu mới". |
| 5   | View       | Text         | Confirm Password Label | Label "Xác nhận mật khẩu mới" tied to `id="confirm-password"`. |
| 6   | View       | PasswordInput | Confirm Password Field | `<input id="confirm-password" type="password" required minLength={6}>` bound to `confirmPassword`, placeholder "Nhập lại mật khẩu mới". |
| 7   | Validation | Container    | Token Missing Error | `.error-box` showing "Liên kết đặt lại mật khẩu không hợp lệ." when the URL has no `token` query param. |
| 8   | Validation | Container    | Short Password Error | `.error-box` showing "Mật khẩu mới phải có ít nhất 6 ký tự." when `newPassword.length < 6`. |
| 9   | Validation | Container    | Password Mismatch Error | `.error-box` showing "Mật khẩu xác nhận không khớp." when `newPassword !== confirmPassword`. |
| 10  | Error      | Container    | API Error Box | `.error-box` showing the rejected `err.message`, falling back to "Không thể đặt lại mật khẩu." |
| 11  | Success    | Container    | Success Box | `.success-box` showing "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại." |
| 12  | Submit     | Button       | Update Password Button | `<button type="submit" class="primary-button">`; idle label "Cập nhật mật khẩu", loading label "Đang cập nhật...". Disabled while `loading`. Triggers `handleSubmit` -> `apiResetPassword({ token, new_password: newPassword })`. |
| 13  | Click      | Button       | Back to Login Link | `<button type="button" class="link-button">` labeled "Quay lại đăng nhập"; calls `navigate("/login")`. |
| 14  | View       | Container    | Auth Layout Wrapper | Outer `.auth-layout` > `.auth-card` providing the card frame. |

## States & Validation Notes

- URL parameter: `token` is read with `useSearchParams` and stored via `useMemo`; empty string when absent.
- Component state: `newPassword`, `confirmPassword`, `loading`, `error`, `success`.
- Validation order in `handleSubmit`: token presence -> `newPassword.length >= 6` -> `newPassword === confirmPassword`. Each failure short-circuits with a localized error.
- `apiResetPassword` is called with `{ token, new_password: newPassword }`; success sets only the success box (no automatic redirect to `/login`).
- HTML5 enforces `required` and `minLength={6}` on both password inputs in addition to the JS-side check.
- No password-strength meter, visibility toggle, or paste-prevention logic is implemented.
