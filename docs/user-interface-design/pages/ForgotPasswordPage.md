# ForgotPasswordPage — UI Specification

**Source:** `frontend/src/pages/authentication/ForgotPasswordPage.tsx`
**Route:** `/forgot-password`
**Purpose:** Allow an unauthenticated user to request a password-reset email by submitting their account email address.

## Overview

The page renders a single centered `.auth-card` containing a title, descriptive subtitle, a one-field form for the email, and a "back to login" link. The form posts to `apiForgotPassword({ email })`. UI state branches on `loading` (submit button label switches), `success` (green box displays the confirmation message), and `error` (red box displays the failure message). The card reuses the styling from `./LoginPage.css`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Heading      | Page Title | `<h1 class="auth-title">` displaying "Quên mật khẩu". |
| 2   | View       | Text         | Page Subtitle | `<p class="auth-subtitle">` displaying "Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu." |
| 3   | View       | Text         | Email Label | Label "Email" tied to the email input via `htmlFor="email"`. |
| 4   | View       | EmailInput   | Email Field | `<input id="email" type="email" required>` bound to the `email` state with placeholder "you@example.com". HTML5 email validation enforced. |
| 5   | Error      | Container    | Error Box | `.error-box` rendered when `error` is non-null; default fallback "Không thể gửi yêu cầu, vui lòng thử lại." used when `err.message` is empty. |
| 6   | Success    | Container    | Success Box | `.success-box` rendered when `success` is non-null; displays "Liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email." |
| 7   | Submit     | Button       | Send Reset Link Button | `<button type="submit" class="primary-button">`; label "Gửi liên kết đặt lại" while idle, "Đang gửi..." while `loading`. Disabled when `loading` is true. Triggers `handleSubmit` -> `apiForgotPassword({ email })`. |
| 8   | Click      | Button       | Back to Login Link | `<button type="button" class="link-button">` labeled "Quay lại đăng nhập"; calls `navigate("/login")`. |
| 9   | View       | Container    | Auth Layout Wrapper | Outer `.auth-layout` > `.auth-card` containers providing the centered card frame. |

## States & Validation Notes

- Component state: `email`, `loading`, `error`, `success`.
- `handleSubmit` clears both `error` and `success`, sets `loading`, calls `apiForgotPassword({ email })`; on rejection falls back to "Không thể gửi yêu cầu, vui lòng thử lại."
- The `success` state does not automatically navigate away; the user must click "Quay lại đăng nhập" to return to the login page.
- Email field relies on native HTML5 validation (`type="email" required`); no extra format check is performed in JS.
- No CAPTCHA, throttling, or rate-limit hints rendered client-side.
