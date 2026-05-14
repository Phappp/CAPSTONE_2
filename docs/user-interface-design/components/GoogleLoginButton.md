# GoogleLoginButton — UI Specification

**Source:** `frontend/src/components/GoogleLoginButton.tsx`
**Type:** Shared Component
**Purpose:** Renders a styled button that initiates Google OAuth login by redirecting the browser to the server-issued Google authorization URL.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onError` | `(error: string) => void` | — | Invoked when the OAuth URL fetch fails or the custom `onClick` throws. |
| `className` | `string` | `""` | Extra class appended to the default `google-login-button` class. |
| `text` | `string` | `"Đăng nhập với Google"` | Button label displayed when not loading. |
| `onClick` | `() => Promise<void> \| void` | — | Optional override for the default redirect flow; when provided it replaces `handleGoogleRedirect`. |

## Overview

Used on the login and signup pages, this button performs Google OAuth in one of two modes: (a) default — fetch the Google authorization URL via `apiGetGoogleAuthUrl()` and redirect via `window.location.href`; (b) override — invoke the supplied async `onClick` handler. While the action is in flight the button is disabled and shows "Đang chuyển hướng…". Hover state changes the background color from `#fff` to `#f8f8f8`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Button | google-login-button | Type `button`; class `google-login-button ${className}`; full-width pill with white background, gray border, fontSize 14, fontWeight 500. |
| 2 | View | Icon | GoogleIcon | Material UI `<GoogleIcon fontSize="small">`. |
| 3 | View · !loading | Text | Label | Renders the `text` prop (default "Đăng nhập với Google"). |
| 4 | Loading | Text | "Đang chuyển hướng..." | Replaces the label while `loading` is true. |
| 5 | Click | Behavior | `handleGoogleLogin` | Sets `loading=true`; if `onClick` prop is provided, awaits it; otherwise calls `handleGoogleRedirect()`. |
| 6 | Click | Redirect | Google OAuth | `apiGetGoogleAuthUrl()` returns the URL, then `window.location.href = authUrl`. |
| 7 | Error | Callback | `onError` | Receives the thrown message; falls back to "Không thể kết nối đến Google" when no message is available. |
| 8 | Hover | Style | Background | `onMouseEnter` sets background `#f8f8f8`; `onMouseLeave` restores `#fff`. |
| 9 | Loading | State | Disabled | `disabled={loading}` prevents repeat clicks while redirect/handler is pending. |

## States & Validation Notes

- `loading` is local state and is reset in the `finally` block of `handleGoogleLogin`. When the default redirect path runs successfully the page is replaced before `finally` executes, so the visible state may stay disabled until navigation completes.
- The default redirect path never resolves locally — control transfers to Google's domain.
- Errors from `apiGetGoogleAuthUrl()` or the supplied `onClick` are surfaced through `onError`; no in-button error UI is rendered.
- Styling is inline; consumers may extend via `className` but cannot easily override inline `style` rules.
