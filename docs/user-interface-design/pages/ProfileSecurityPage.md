# ProfileSecurityPage — UI Specification

**Source:** `frontend/src/pages/ProfileSecurityPage.tsx`
**Route:** `/profile/security`
**Purpose:** Authenticated security center allowing the user to change their password and toggle account-protection preferences (two-factor authentication, login notifications, trusted device).

## Overview

The page is wrapped by `Authentication` and shares the layout shell of `ProfilePage` (`dashboard-page profile-page-shell`). The header renders the kicker `"Security center"`, title `"Bảo mật tài khoản"`, subtitle, a `Dashboard` navigation button and the global `AvatarMenu`. The body is a `profile-main-card` containing a two-column `profile-security-grid`: left card = `"Đổi mật khẩu"` form with three password inputs and a submit button; right card = `"Cài đặt bảo mật"` with three checkbox rows and a save button. Two independent loading flags (`savingPassword`, `savingSecurity`) drive button disabled states; a single shared `errorMessage`/`successMessage` pair is rendered at the bottom of the card.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Text         | Page Kicker | Static text `"Security center"`. |
| 2   | View       | Heading      | Page Title | `<h1>` `"Bảo mật tài khoản"`. |
| 3   | View       | Text         | Page Subtitle | `"Quản lý mật khẩu và các thiết lập an toàn cho tài khoản của bạn."`. |
| 4   | Click      | Button       | Dashboard Button | `goToDashboard`: admin → `/admin`, teacher/course_manager → `/teacher/dashboard`, else `/student/dashboard`; House icon. |
| 5   | View       | Container    | AvatarMenu | `<AvatarMenu />` rendered top-right. |
| 6   | View       | Heading      | Password Card Title | `"Đổi mật khẩu"` with Lock icon. |
| 7   | View       | PasswordInput | Current Password Field | Label `"Mật khẩu hiện tại"`, `type="password"`, bound to `currentPassword`. |
| 8   | View       | PasswordInput | New Password Field | Label `"Mật khẩu mới"`, `type="password"`, bound to `newPassword`. |
| 9   | View       | PasswordInput | Confirm Password Field | Label `"Xác nhận mật khẩu mới"`, `type="password"`, bound to `confirmPassword`. |
| 10  | Submit     | Button       | Change Password Button | Primary button with Save icon; label switches `"Đổi mật khẩu"` / `"Đang lưu..."`; disabled while `savingPassword`; calls `changePassword`. |
| 11  | Validation | Error        | Required Fields Validation | If any of the three password fields is empty: `"Vui lòng nhập đầy đủ thông tin mật khẩu."`. |
| 12  | Validation | Error        | Minimum Length Validation | If `newPassword.length < 8`: `"Mật khẩu mới phải có ít nhất 8 ký tự."`. |
| 13  | Validation | Error        | Confirmation Match Validation | If `newPassword !== confirmPassword`: `"Xác nhận mật khẩu mới không khớp."`. |
| 14  | View       | Heading      | Security Card Title | `"Cài đặt bảo mật"` with Shield icon. |
| 15  | View       | Checkbox     | 2FA Toggle | Row labeled `"Xác thực hai lớp (2FA)"`; `<input type="checkbox">` bound to `twoFactorEnabled`. |
| 16  | View       | Checkbox     | Login Notification Toggle | Row labeled `"Thông báo đăng nhập mới"`; bound to `loginNotification` (defaults to `true`). |
| 17  | View       | Checkbox     | Device Trust Toggle | Row labeled `"Tin cậy thiết bị hiện tại"`; bound to `deviceTrust`. |
| 18  | Submit     | Button       | Save Security Button | Primary button with Save icon; label `"Lưu cài đặt"` / `"Đang lưu..."`; disabled while `savingSecurity`; calls `saveSecurity` which `PATCH`es `PROFILE_API.updateSecurity` with `{ is_2fa_enabled, notify_new_login, is_trusted_device }`. |
| 19  | Error      | Container    | Error Box | Renders `errorMessage` (e.g. `"Không thể đổi mật khẩu."`, `"Không thể lưu cài đặt bảo mật."`) inside `error-box` at bottom of the card. |
| 20  | View       | Toast        | Success Message | Renders `successMessage` (e.g. `"Đổi mật khẩu thành công."`, `"Đã lưu cài đặt bảo mật."`) inside `profile-success-message`. |

## States & Validation Notes

- `changePassword` clears `errorMessage` and `successMessage` before submitting `PUT PROFILE_API.changePassword` with body `{ old_password, new_password, confirm_password }`; on success it clears all three password fields and shows `"Đổi mật khẩu thành công."`.
- `saveSecurity` posts `PATCH PROFILE_API.updateSecurity`; on failure surfaces server `message` or fallback Vietnamese error.
- Both submit handlers share `errorMessage`/`successMessage` state — only the most recent operation's feedback is visible.
- The Dashboard button derives the target route from `user.roles` (lowercased Set lookup) provided by `useAuth`.
- No client-side strength meter is rendered; only the length and confirmation checks above are enforced before the API call.
