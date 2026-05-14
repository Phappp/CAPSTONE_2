# LoginPage — UI Specification

**Source:** `frontend/src/pages/authentication/LoginPage.tsx`
**Route:** `/login`
**Purpose:** Authenticate an existing user via email/password (with optional 2FA challenge) or Google OAuth, and redirect to the role-appropriate dashboard.

## Overview

The page is split into two columns: a decorative left panel showcasing the MindBridge brand, glass card, and tagline; and a right panel containing the sign-in form. The form has two mutually exclusive branches controlled by the `show2FA` state — the default credentials form (`email`, `password`, `remember`, password visibility toggle, error display, primary submit, divider, Google login) and the two-factor verification form (single 6-digit code input, submit, and a "Quay lại đăng nhập" link that resets `show2FA`, `twoFACode`, `tempEmail`). The page also reads an `error` query param on mount via `useSearchParams` to surface redirect-time errors, and uses `useAuth().login()` to dispatch credentials (forwarding `twoFACode` when present).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Image        | Brand Logo | Renders `transLogo` with alt text "MindBridge logo" inside the `.brand` block on the left panel. |
| 2   | View       | Icon         | Glass Card Sparkle | Lucide `Sparkles` icon (size 24) inside `.glass-icon` used as decorative element. |
| 3   | View       | Container    | Glass Avatars | Three decorative avatar circles containing `UsersRound`, `Lightbulb`, and `BookOpenText` icons (size 14). |
| 4   | View       | Heading      | Brand Quote | Renders "The future of learning is personalized and proactive." as the tagline (`.quote-text`). |
| 5   | View       | Text         | Quote Author | Renders "MindBridge Co." under the decorative divider. |
| 6   | View       | Link         | Landing Home Link | Anchor to `/` with `House` icon and label "Landing"; aria-label "Về trang landing". |
| 7   | View       | Heading      | Form Title | Displays "Welcome back" in default state; switches to "Two-factor verification" when `show2FA` is true. |
| 8   | View       | Text         | Form Subtitle | Displays "Đăng nhập để tiếp tục học tập và quản lý khóa học của bạn." (default) or "Nhập mã xác thực được gửi đến email của bạn." (2FA). |
| 9   | View       | EmailInput   | Email Field | `<input id="email" type="email" required>` bound to `email` state, placeholder "you@example.com". HTML5 email validation. |
| 10  | View       | PasswordInput | Password Field | `<input id="password">` whose type toggles between `password` and `text` via `showPassword`, bound to `password`, placeholder "••••••••", required. |
| 11  | Click      | Button       | Password Visibility Toggle | Icon button rendering `Eye` or `EyeOff` (size 18); flips `showPassword`. aria-label "Ẩn mật khẩu" / "Hiện mật khẩu". |
| 12  | View       | Checkbox     | Remember Me Checkbox | Bound to `remember` state. Label text "Ghi nhớ đăng nhập". Passed into `login()` payload. |
| 13  | Click      | Button       | Forgot Password Link | `.btn-link` labeled "Quên mật khẩu?"; invokes `navigate("/forgot-password")`. |
| 14  | Error      | Container    | Error Box | `.error-box` rendered conditionally when `error` state is non-null; displays raw error string. |
| 15  | Submit     | Button       | Login Submit Button | Primary `<button type="submit">` labeled "Đăng nhập" + `ArrowRight` icon; disabled while `loading`. Calls `handleSubmit` -> `login({ email, password, remember })`. |
| 16  | Loading    | Spinner      | Submit Spinner | `.loading-spinner` shown inside the submit button while `loading` is true. |
| 17  | View       | Divider      | OR Divider | Two `.divider-line` segments with "OR" `.divider-text` between primary and Google CTA. |
| 18  | Click      | Button       | Google Login Button | `<GoogleLoginButton>` shared component with `text="Sign in with Google"`; `onError` forwards messages to `setError` via `handleGoogleError`. |
| 19  | View       | Text         | Register Footer | Renders "Chưa có tài khoản?" followed by `Link` to `/register` labeled "Đăng ký". |
| 20  | View (2FA) | Text         | 2FA Code Label | Label "Mã xác thực" associated with id `2fa-code`. |
| 21  | View (2FA) | TextInput    | 2FA Code Field | `<input id="2fa-code" type="text" required maxLength={6}>` placeholder "Nhập mã 6 chữ số"; bound to `twoFACode`. |
| 22  | Submit (2FA) | Button     | 2FA Verify Button | Primary submit labeled "Xác thực" + `ArrowRight`; disabled while `loading`. Calls `handleVerify2FA` -> `login({ email: tempEmail, password, twoFACode, remember })`. |
| 23  | Click (2FA) | Button      | Back to Login Button | `.btn-link` labeled "Quay lại đăng nhập"; clears `show2FA`, `twoFACode`, `tempEmail`. |
| 24  | Validation | Toast/Error | Default Error Message | Fallback "Có lỗi xảy ra, vui lòng thử lại." used when `login()` rejection has no message. |
| 25  | Validation (2FA) | Toast/Error | 2FA Error Message | Fallback "Mã xác thực không đúng." used when `handleVerify2FA` rejection has no message. |
| 26  | View       | Container    | Background Blurs | Two `.bg-blur` decorative elements (top and bottom) inside the left panel. |

## States & Validation Notes

- Component state: `email`, `password`, `remember`, `showPassword`, `loading`, `error`, `show2FA`, `twoFACode`, `tempEmail`.
- On mount, `searchParams.get("error")` populates `error` via `decodeURIComponent` so redirects (e.g., from OAuth) can surface failure reasons.
- `handleSubmit` calls `login({ email, password, remember })`. If the resolved result has `requires2FA === true`, the page captures `tempEmail = email` and flips into the 2FA branch instead of completing login.
- `handleVerify2FA` re-invokes `login()` with `twoFACode` plus the original `password` (note: password is held only in component state; refreshing the page during the 2FA step would lose it).
- HTML5 validation: email field requires a valid email; password and 2FA code are `required`; 2FA code is capped at 6 characters via `maxLength`.
- `GoogleLoginButton.onError` forwards messages into the local `error` box.
- Layout reuses `./LoginPage.css`; states "Loading" and "Error" are mutually visible (spinner replaces button label, error box appears above actions).
