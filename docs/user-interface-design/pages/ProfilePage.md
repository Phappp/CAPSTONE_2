# ProfilePage — UI Specification

**Source:** `frontend/src/pages/ProfilePage.tsx`
**Route:** `/profile`
**Purpose:** Authenticated profile center for viewing and editing personal account information, managing the user avatar, and (when the user has the `course_manager` role) submitting a course-manager licensing application with expertise areas, evidence links and readiness checklist.

## Overview

The page mounts behind the `Authentication` wrapper. On mount it fetches `PROFILE_API.getProfile` and (if `isCourseManager`) `PROFILE_API.courseManagerReadiness`, hydrating both `form` (personal info) and `applicationForm` (manager application) plus `evidenceLinks`. The layout is a `profile-page-header` with kicker `"Account center"`, title `"Hồ sơ cá nhân"`, a `Dashboard` button + `AvatarMenu`, and a `profile-main-card` containing the avatar section and a two-column grid: left = editable form, right = read-only `Thông tin tài khoản` panel plus a manager `Checklist cấp phép`. Avatar uploads stream through a confirmation cropper modal (`showCropper`). All destructive avatar deletions confirm via `CommonModal`. `saveProfile` updates personal info via `PUT updateProfile`; if `isCourseManager`, it then `PUT submitCourseManagerApplication` and refreshes the readiness checklist.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Loading    | Text         | Initial Loader | Renders `"Đang tải thông tin hồ sơ..."` inside `profile-main-card` while `loading` is true. |
| 2   | View       | Text         | Page Kicker | Static text `"Account center"`. |
| 3   | View       | Heading      | Page Title | `<h1>` `"Hồ sơ cá nhân"`. |
| 4   | View       | Text         | Page Subtitle | `"Quản lý thông tin tài khoản và hồ sơ cấp phép course manager."`. |
| 5   | Click      | Button       | Dashboard Button | `goToDashboard` routes by role: admin → `/admin`, teacher/course_manager → `/teacher/dashboard`, else `/student/dashboard`. House icon. |
| 6   | View       | Container    | AvatarMenu | Imported `<AvatarMenu />` for global user actions. |
| 7   | View       | Avatar       | Profile Avatar Wrapper | Displays `<img>` from `avatarPreview` or fallback initial `(profile?.full_name?.[0] || "U").toUpperCase()`. |
| 8   | Click      | Button       | Upload Avatar Label | Label wrapping hidden `<input type="file" accept="image/jpeg,image/png,image/gif,image/webp">`; label text toggles between `"Tải ảnh"` and `"Đang tải..."` when `avatarUploading`. |
| 9   | Click      | Button       | Delete Avatar Button | Triggers `deleteAvatar` → opens `CommonModal` with `"Xác nhận xóa ảnh"`; disabled when `avatarDeleting` or no `avatarPreview`. |
| 10  | Validation | Error        | Avatar File Validation | Rejects non-JPEG/PNG/GIF/WEBP files (`"Vui lòng chọn file JPEG, PNG, WEBP hoặc GIF."`) and files > 5 MB (`"Dung lượng ảnh tối đa 5MB."`). |
| 11  | View       | TextInput    | First Name Field | Label `"Họ"`, bound to `form.first_name`. |
| 12  | View       | TextInput    | Last Name Field | Label `"Tên"`, bound to `form.last_name`. |
| 13  | View       | TextInput    | Phone Number Field | Label `"Số điện thoại"`, bound to `form.phone_number`. |
| 14  | View       | Textarea     | Bio Field | Label `"Bio"`, 4 rows, bound to `form.bio`. |
| 15  | View       | Select       | Expertise Group Select | Visible when `isCourseManager`; options drawn from `EXPERTISE_TAXONOMY` (IT, Kinh doanh, Tài chính, Marketing, Y tế, etc.); updates `selectedExpertiseGroup`. |
| 16  | View       | Select / TextInput | Expertise Major Picker | If group !== `"Khác"`: `<select>` with majors for the group; else `<input>` placeholder `"Nhập chuyên ngành khác..."` bound to `customExpertiseMajor`. |
| 17  | Click      | Button       | Add Expertise Area Button | `"Thêm chuyên ngành"` calls `addExpertiseArea`: validates non-empty major, dedupes via `selectedExpertiseAreas`, sets `applicationForm.expertise_areas` joined by `", "`. |
| 18  | View       | Badge        | Expertise Chip List | Renders each entry in `selectedExpertiseAreas` as a chip with text and Trash2 remove button calling `removeExpertiseArea(item)`. |
| 19  | View       | Text         | Expertise Hint | `"Bạn có thể thêm nhiều chuyên ngành để admin đánh giá đúng năng lực thực tế."`. |
| 20  | View       | TextInput    | Years Experience Field | Label `"Số năm kinh nghiệm"`, `type="number"`, min `0`, bound to `applicationForm.years_experience`. |
| 21  | View       | TextInput    | Organization Field | Label `"Đơn vị công tác"`, bound to `applicationForm.organization_name`. |
| 22  | View       | TextInput    | Portfolio Field | Label `"Portfolio"`, bound to `applicationForm.portfolio_url`. |
| 23  | View       | TextInput    | Evidence Link Input | Placeholder `"Dán link minh chứng..."` bound to `newEvidenceLink`. |
| 24  | Click      | Button       | Add Evidence Button | `"Thêm"` calls `addEvidenceLink`: trims and dedupes into `evidenceLinks`. |
| 25  | Click      | Button       | Upload Evidence Label | Hidden `<input type="file" accept=".pdf,image/jpeg,image/png,image/webp">`; calls `uploadManagerEvidence`. Label toggles `"Upload"` / `"Đang upload..."`. |
| 26  | Validation | Error        | Evidence Upload Validation | Rejects non-PDF/JPG/PNG/WEBP (`"Chỉ chấp nhận PDF/JPG/PNG/WEBP."`) and files > 10 MB (`"Dung lượng file tối đa 10MB."`). |
| 27  | View       | Badge        | Evidence Chip List | Each entry in `evidenceLinks` renders a chip with text, Copy button (`copyEvidenceLink` → clipboard), Trash2 remove button (`removeEvidenceLink`). |
| 28  | View       | Textarea     | Teaching Statement Field | Label `"Cam kết chất lượng đào tạo"`, 3 rows, bound to `applicationForm.teaching_statement`. |
| 29  | View       | Textarea     | Application Note Field | Label `"Thông tin bổ sung"`, 3 rows, bound to `applicationForm.application_note`. |
| 30  | Click      | Button       | Cancel Button | `"Hủy"` resets `form` to `originalForm`; disabled when `!hasUnsavedChanges`. |
| 31  | Submit     | Button       | Save Changes Button | `"Lưu thay đổi"` (label `"Đang lưu..."` while `saving`) calls `saveProfile`; disabled when `!hasUnsavedChanges` or `saving`. |
| 32  | Validation | Error        | Phone Validation | `phone_number` must match regex `/^0\d{9,10}$/`; error: `"Số điện thoại không hợp lệ. Vui lòng nhập dạng 0xxxxxxxxx."`. |
| 33  | Validation | Error        | Full Name Validation | `full_name` (after trim) must be ≥ 2 characters: `"Vui lòng nhập họ và tên hợp lệ."`. |
| 34  | View       | Card         | Account Info Card | Title `"Thông tin tài khoản"`; rows for `Email`, `Ngày tham gia` (locale `vi-VN`), `Vai trò` (`profile.roles.join(", ")`). |
| 35  | View       | Card         | Manager Checklist Card | Visible when `isCourseManager`; title `"Checklist cấp phép"`; rows render `managerReadiness.checklist`: each shows label and either CheckCircle2 (green) or TriangleAlert (amber) with hint via `title`. |
| 36  | Loading    | Text         | Checklist Loading | `"Đang tải checklist..."` while `managerReadinessLoading`. |
| 37  | Error      | Container    | Checklist Error | Renders `managerReadinessError` inside `error-box`. |
| 38  | Error      | Container    | Form Error Box | Bottom `error-box` displays `errorMessage`. |
| 39  | View       | Toast        | Success Message | `profile-success-message` displays `successMessage` (e.g. `"Cập nhật hồ sơ thành công."`, `"Đã lưu hồ sơ và gửi cập nhật cho quản trị viên."`). |
| 40  | View       | Modal        | Avatar Cropper Modal | Visible when `showCropper`; title `"Xác nhận ảnh đại diện"`; preview `<img>` from `avatarPreview`; actions: `"Hủy"` closes, `"Lưu"` triggers `confirmCropAndUpload`. |
| 41  | View       | Modal        | Common Modal | Generic `CommonModal` driven by `modalState`; used for avatar-delete confirmation with `showCancel=true`. |

## States & Validation Notes

- `hasUnsavedChanges` is `true` when either `form !== originalForm` or, for managers, when `applicationForm`/`evidenceLinks` deviate from the initial readiness application.
- `isCourseManager` is computed from `profile.roles` lowercased; manager-only sections (expertise picker, evidence, statements, checklist card) only render when true.
- `saveProfile` first updates personal info; if manager, it submits the application with `certificate_links` joined by `\n`, `years_experience` parsed to number or null, then re-fetches readiness.
- Avatar upload converts the previewed data URL to a `File` named `"avatar.jpg"` and posts `multipart/form-data`; on success `updateUser({ avatar_url })` syncs the auth context.
- All error/success messages are derived from API `message` or fallback Vietnamese strings.
- Date formatting uses `toLocaleDateString("vi-VN")` for `Ngày tham gia`.
