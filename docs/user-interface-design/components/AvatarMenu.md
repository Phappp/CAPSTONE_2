# AvatarMenu — UI Specification

**Source:** `frontend/src/components/AvatarMenu.tsx`
**Type:** Shared Component
**Purpose:** Renders the header avatar button with a popover menu for navigating to profile/security pages and logging out.

## Props

This component takes no public props. It consumes authentication state through `useAuth()` (from `../contexts/Auth`).

| Hook input | Type | Description |
| :--- | :--- | :--- |
| `useAuth().user` | `{ full_name, email, avatar_url, primary_role, roles[] }` | Current authenticated user. |
| `useAuth().logout` | `() => void` | Logs out and clears auth state. |
| `useNavigate()` | router navigate | Used for navigating to "/profile" and "/profile/security". |

## Overview

`AvatarMenu` is mounted in the global app header (right-aligned). It displays a circular avatar (image if `user.avatar_url`, otherwise computed initials), the user's display name, and a localized role label ("Giảng viên", "Học viên", "Quản trị viên"). Clicking the avatar pill toggles a popover with three navigation actions. The component has two state branches: collapsed (button only) and expanded (button + dropdown).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | Avatar pill wrapper | Position relative with `marginLeft: auto`, anchoring the popover to the right edge. |
| 2 | Click | Button | Avatar trigger button | Pill-shaped button; toggles `open` state via `setOpen((v) => !v)`. |
| 3 | View · user.avatar_url | Image | Avatar image | `<img src={user.avatar_url} alt="Avatar">` filling a 32×32 round container, `object-fit: cover`. |
| 4 | View · !user.avatar_url | Text | Avatar initials | Two-character uppercase initials computed from `full_name` (first+last) or `email[0]`; fallback "U". |
| 5 | View | Text | Display name | Renders `user.full_name`, else `user.email`, else "Người dùng". |
| 6 | View | Text | Role label | Localized via `getRoleLabel(user.primary_role ?? user.roles?.[0])`: maps `course_manager`/`teacher` → "Giảng viên", `learner`/`student` → "Học viên", `admin` → "Quản trị viên". |
| 7 | View · open | Container | Dropdown panel | Absolutely positioned popover (`right: 0`, `marginTop: 0.5rem`, `zIndex: 20`) with white background and shadow. |
| 8 | Click · open | Button | "Thông tin tài khoản" | Closes the menu and navigates to `/profile`. |
| 9 | Click · open | Button | "Bảo mật" | Closes the menu and navigates to `/profile/security`. |
| 10 | Click · open | Button | "Đăng xuất" | Closes the menu and invokes `logout()`. Text color `#c0392b`. |

## States & Validation Notes

- Local `open` state controls dropdown visibility; clicking the trigger toggles it. There is no explicit outside-click handler; the menu is closed only by clicking one of its actions.
- Initials computation defaults to "U" when neither name nor email is available.
- Role label fallback is the raw `role` string when no mapping matches; otherwise "Học viên".
- All three menu actions call `setOpen(false)` before performing their action.
