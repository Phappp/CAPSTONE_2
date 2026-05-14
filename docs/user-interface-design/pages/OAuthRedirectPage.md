# OAuthRedirectPage — UI Specification

**Source:** `frontend/src/pages/authentication/OAuthRedirectPage.tsx`
**Route:** `/oauth/redirect`
**Purpose:** Handle the Google OAuth callback — parse tokens from the URL, optionally prompt the user to choose a role for first-time Google sign-ins, persist the session, and redirect to the role-appropriate dashboard (or post the result back to a popup opener).

## Overview

The page consumes query parameters from the OAuth provider (`access_token`, `refresh_token`, `uid`, `error`, `requires_role_selection`, `pending_token`, `full_name`) inside a single `useEffect`. It branches into three UI states: (1) an error state when an `error` param is present or a downstream API call fails — shows the message and auto-redirects to `/login` after 2–3 seconds; (2) a role-selection state when `requires_role_selection === "1"` — shows two CTAs (learner / course_manager) calling `apiCompleteGoogleOAuth`; (3) a default loading state with a spinner and "Vui lòng chờ trong giây lát..." caption while the user profile is being fetched via `apiGetCurrentUser`. If running inside a popup (`window.opener` present), the page posts the result via `postMessage` and closes itself rather than navigating. Final navigation honours a `sessionStorage` `post_auth_redirect` entry, else routes by primary role.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Container    | OAuth Section Wrapper | `<section class="oauth-section">` containing the two-column layout. |
| 2   | View       | Container    | Background Blurs | Two decorative `.bg-blur` elements (top/bottom) inside `.oauth-left`. |
| 3   | View       | Image        | Brand Logo | `<img src={transLogo} alt="MindBridge logo">` inside `.brand`. |
| 4   | View       | Icon         | Glass Sparkle Icon | Lucide `Sparkles` (size 24) inside `.glass-icon`. |
| 5   | View       | Container    | Glass Decoration Lines | Two decorative spans `.glass-line .line-long` and `.glass-line .line-short`. |
| 6   | View       | Heading      | Brand Quote | `<h2 class="quote-text">` displaying "Securely connecting your Google account with MindBridge." |
| 7   | View       | Text         | Quote Author | Span "MindBridge Co." beneath `.author-divider`. |
| 8   | View       | Link         | Landing Home Link | `<Link to="/">` with `House` icon (size 16) and label "Landing"; aria-label "Về trang landing". |
| 9   | View       | Heading      | Dynamic Form Title | Renders "Đăng nhập thất bại" when `error` is set, "Chọn vai trò để tiếp tục" when `needsRoleSelection` is true, otherwise "Đang xử lý đăng nhập...". |
| 10  | Error      | Container    | Error State Box | `.oauth-state-box.error` containing the decoded `error` message and the note "Đang chuyển hướng về trang đăng nhập...". |
| 11  | Loading    | Container    | Loading State Box | `.oauth-state-box` with `.oauth-loader` spinner and `<p class="state-note">` "Vui lòng chờ trong giây lát...". Default branch when neither `error` nor `needsRoleSelection` is active. |
| 12  | Role Selection | Container | Role Greeting Text | `<p class="form-subtitle">` showing `Xin chào {displayName}, ` (when `displayName` is set) followed by "bạn muốn dùng tài khoản Google này với vai trò nào?". |
| 13  | Click      | Button       | Learner Role Button | `<button class="btn btn-primary">` labeled "Tôi là học viên"; disabled while `isSubmittingRole`. Calls `handleSelectRole("learner")`. |
| 14  | Click      | Button       | Course Manager Role Button | `<button class="btn btn-secondary">` labeled "Tôi là giảng viên"; disabled while `isSubmittingRole`. Calls `handleSelectRole("course_manager")`. |
| 15  | Side Effect | Behavior    | Popup postMessage | When `window.opener` exists, `postResultToOpener` sends `{ type: "oauth:success" \| "oauth:error", ... }` to the opener origin and calls `window.close()`. |
| 16  | Side Effect | Behavior    | Session Token Persistence | On success path, `setTokens`, `saveAuthToStorage(..., true)`, and `setUser(resolvedUser)` from `useAuth()` are invoked. |
| 17  | Side Effect | Behavior    | Post-Auth Redirect | `navigateAfterAuth(role)` reads `sessionStorage.post_auth_redirect` (and removes it) or falls back to `/teacher/dashboard` (teacher / course_manager), `/admin` (admin), or `/student/dashboard` (default). |
| 18  | Error Redirect | Behavior | Auto Redirect to Login | After an error, `setTimeout` redirects to `/login?error=...` after 2000 ms (API failure) or 3000 ms (other failures). |
| 19  | Validation | Toast/Error  | Missing Tokens Error | Sets `error` to "Không nhận được thông tin xác thực từ Google" when `access_token`, `refresh_token`, or `uid` are absent. |
| 20  | Validation | Toast/Error  | API Profile Error | Sets `error` to "Không thể tải quyền tài khoản. Vui lòng đăng nhập lại." when `apiGetCurrentUser` rejects. |
| 21  | Validation | Toast/Error  | Generic Failure | Sets `error` to "Không thể xử lý đăng nhập" or, in role-selection completion, falls back to "Không thể hoàn tất đăng nhập Google." |

## States & Validation Notes

- Component state: `error`, `needsRoleSelection`, `pendingToken`, `displayName`, `isSubmittingRole`. Derived flag `isPopupFlow = !!window.opener && window.opener !== window`.
- Query parameter contract: `access_token`, `refresh_token`, `uid`, `error`, `requires_role_selection` (string "1"), `pending_token`, `full_name`.
- `apiGetCurrentUser` and `apiCompleteGoogleOAuth` are dynamically imported from `../../services/authClient` to defer module load until the redirect actually fires.
- `resolvePrimaryRole` (from `utils/roles`) derives the effective role used both inside the resolved user object and for navigation branching.
- Popup behaviour: when present, `postMessage` is sent to `window.location.origin` and the window is closed; no navigation occurs in the popup. The opener page is expected to listen for `oauth:success` / `oauth:error` messages.
- Sequencing on success: `tempUser` (fallback skeleton) is built, then merged with `userData` from the API; roles default to `["learner"]` if the API returns none.
- Auto-redirect timers: 3000 ms after a query-param error or generic failure, 2000 ms after an API failure to load the user profile.
- Layout uses `./OAuthRedirectPage.css`; no form submission elements exist outside the role-selection branch.
