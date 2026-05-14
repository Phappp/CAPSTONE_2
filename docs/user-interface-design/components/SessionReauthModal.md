# SessionReauthModal — UI Specification

**Source:** `frontend/src/components/SessionReauthModal.tsx`
**Type:** Shared Component
**Purpose:** Modal dialog prompting the user to re-authenticate via email/password or Google when the active session has expired, preserving the current route.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `open` | `boolean` | — | Controls visibility — when false the component returns `null`. |
| `email` | `string` | — | Controlled email input value. |
| `onEmailChange` | `(value: string) => void` | — | Email input change handler. |
| `onSubmitPassword` | `(password: string) => Promise<void>` | — | Invoked on form submit with the typed password. |
| `onGoogleLogin` | `() => Promise<void>` | — | Invoked when the user starts a Google sign-in attempt. |
| `onClose` | `() => void` | `undefined` | Optional dismiss handler; when omitted, the close button is not rendered. |
| `error` | `string \| null` | `undefined` | External error message (takes precedence over `googleError`). |
| `loading` | `boolean` | `false` | Disables the submit button and toggles its label. |

## Overview

The modal renders a fixed overlay with a centered card. The form validates required email and password fields, calls `onSubmitPassword(password)` on submit, then clears the local password state. Google sign-in is delegated to `GoogleLoginButton`; success path calls `onGoogleLogin`, while errors propagate via the local `googleError` state. Errors are rendered in a single banner where `error` (server-provided) takes precedence over `googleError`. The optional "Đóng" button only appears when `onClose` is supplied.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Modal | `session-reauth-overlay` | Fullscreen overlay; `role="dialog" aria-modal="true"`. |
| 2 | View | Container | `session-reauth-card` | Centered card hosting the form. |
| 3 | View | Heading | Card title | Static heading "Phiên đăng nhập đã hết hạn". |
| 4 | View | Text | Card subtitle | "Vui lòng xác thực lại để tiếp tục ngay tại trang hiện tại.". |
| 5 | View | EmailInput | Email field | Label "Email"; `type="email"`, `autoComplete="email"`, `required`; value bound to `email` prop. |
| 6 | View | PasswordInput | Password field | Label "Mật khẩu"; `type="password"`, `autoComplete="current-password"`, `required`; local state `password`. |
| 7 | Error | Container | `session-reauth-error` | Visible when `error` or `googleError` is truthy; prints `error ?? googleError`. |
| 8 | Submit | Button | Submit button | Reads "Đăng nhập lại" when idle, "Đang xác thực..." when `loading`; disabled while loading; triggers `handleSubmit`. |
| 9 | View | Divider | `session-reauth-divider` | Visual separator with label "hoặc". |
| 10 | Click | Button | `GoogleLoginButton` | Text "Đăng nhập lại bằng Google"; clears `googleError` then awaits `onGoogleLogin`; failure routes to `handleGoogleError`. |
| 11 | Click | Button | `session-reauth-close` | Optional "Đóng" button rendered only when `onClose` is provided; calls `onClose`. |
| 12 | Validation | Behavior | Submit reset | After `onSubmitPassword`, local password state is cleared regardless of outcome. |

## States & Validation Notes

- `if (!open) return null;` is the first effect — no DOM is rendered when closed.
- The form sets `googleError` to `null` before each submit to ensure the password error path overrides any prior Google failure.
- Email is fully controlled by the parent (`email` prop + `onEmailChange`); the component never mutates it locally.
- HTML5 `required` attributes block submission when either field is empty.
- The Google button receives `className="session-reauth-google-btn"` and forwards both `onClick` and `onError` callbacks.
