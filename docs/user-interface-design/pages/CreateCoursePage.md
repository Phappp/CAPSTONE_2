# CreateCoursePage — UI Specification

**Source:** `frontend/src/pages/teacher/CreateCoursePage.tsx`
**Route:** `/teacher/courses/new` (guarded by `Authentication` with roles `course_manager` / `teacher`)
**Purpose:** Multi-step wizard that lets a teacher / course manager create a new course by entering basic info, descriptions, a thumbnail and publishing settings, then POSTs to `COURSES_API.createCourse`.

## Overview
The page renders a 4-step wizard inside a `wizard-card`: Step 1 "Thông tin cơ bản" (title, short description, category, level, language), Step 2 "Mô tả chi tiết" (full description, learning objectives, prerequisites checklist), Step 3 "Hình ảnh" (thumbnail upload + preview), Step 4 "Cài đặt" (price, certificate flag, estimated hours, scheduled publish, tags). Local state `step`, `payload`, `selectedCategoryGroup`, `selectedCategoryMajor`, `customCategoryMajor`, `imagePreview`, `prerequisiteOptions`, `isSubmitting`, `error` and `modalState` drive the form. Saving calls `handleSave(publish)` which uploads payload to the backend; on success it navigates to `/teacher/courses/{id}`. `managerBlocked` users are intercepted via `CommonModal` and redirected to `/profile`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `dashboard-page` root | Outer page wrapper hosting header and wizard card. |
| 2 | View | Heading | Page title `dashboard-title` | Renders "Tạo khóa học mới". |
| 3 | View | Text | Page subtitle `dashboard-subtitle` | Renders "Điền thông tin theo từng bước. Bạn có thể lưu tạm bất kỳ lúc nào.". |
| 4 | View | Component | `AvatarMenu` | Top-right avatar dropdown (profile / logout). |
| 5 | View | Container | `wizard-steps` indicator | Lists 4 numbered steps: "Thông tin cơ bản", "Mô tả chi tiết", "Hình ảnh", "Cài đặt"; current step gets `active`, completed steps get `done`. |
| 6 | View (Step 1) | TextInput | Tên khóa học | Required. Placeholder "Ví dụ: Lập trình Python cho người mới bắt đầu". Bound to `payload.title` via `handleBasicChange("title", …)`. |
| 7 | View (Step 1) | Textarea | Mô tả ngắn | Required, `maxLength=200`, rows=3. Placeholder "Mô tả ngắn gọn về khóa học (tối đa 200 ký tự)". Bound to `payload.short_description`. |
| 8 | View (Step 1) | Text | Character counter | Displays `{payload.short_description.length}/200`. |
| 9 | View (Step 1) | Select | Danh mục nhóm | Bound to `selectedCategoryGroup`; options come from `CATEGORY_TAXONOMY` (e.g. "Công nghệ thông tin (IT)", "Kinh doanh - Quản trị", ..., "Khác"). |
| 10 | View (Step 1) | Select | Chuyên ngành | Shown when group ≠ "Khác". Options = `categoryMajors` for the chosen group. Bound to `selectedCategoryMajor`. |
| 11 | Conditional (Step 1, group=Khác) | TextInput | Custom chuyên ngành | Placeholder "Nhập chuyên ngành...". Bound to `customCategoryMajor`. |
| 12 | Click (Step 1) | Button | "Chọn danh mục" | Calls `applyCategorySelection()`. Validates non-empty major; writes `payload.category = "{group}: {major}"`; sets error "Vui lòng chọn hoặc nhập chuyên ngành cho danh mục." otherwise. |
| 13 | View (Step 1) | Text | Selected category preview | Shows "Danh mục đã chọn: <strong>{payload.category || "Chưa chọn"}</strong>". |
| 14 | View (Step 1) | Select | Cấp độ | Bound to `payload.level`. Options: "Cơ bản" (`beginner`), "Trung cấp" (`intermediate`), "Nâng cao" (`advanced`). |
| 15 | View (Step 1) | Select | Ngôn ngữ | Bound to `payload.language`. Options: "Tiếng Việt" (`vi`), "English" (`en`). |
| 16 | View (Step 2) | Textarea | Mô tả đầy đủ | Rows=8. Placeholder "Mô tả chi tiết khóa học. Có thể dán nội dung rich text từ trình soạn thảo.". Bound to `payload.full_description`. |
| 17 | View (Step 2) | TextInput | Mục tiêu học tập item | Repeated for each entry in `payload.learning_objectives`. Placeholder "Ví dụ: Hiểu cú pháp Python cơ bản". `handleArrayChange("learning_objectives", idx, value)`. |
| 18 | Click (Step 2) | Button | "Xóa" objective | Calls `handleRemoveArrayItem("learning_objectives", idx)`. Empty list collapses to `[""]`. |
| 19 | Click (Step 2) | Button | "+ Thêm mục tiêu" | Calls `handleAddArrayItem("learning_objectives")`. |
| 20 | View (Step 2) | Text | Prerequisite hint | "Chọn các khóa học cần hoàn tất trước khi được đăng ký khóa này.". |
| 21 | View (Step 2) | List + Checkbox | Yêu cầu tiên quyết options | Iterates `prerequisiteOptions` (fetched from `COURSES_API.catalog` with `page_size=100`, sorted by title). Each row shows course title; checkbox toggle adds/removes id in `payload.prerequisites`. |
| 22 | Empty (Step 2) | Text | Empty prerequisite list | Shows "Chưa có khóa học để chọn." when options array empty. |
| 23 | View (Step 3) | Text | Thumbnail hint | "Khuyến nghị kích thước 1280x720, dung lượng < 2MB.". |
| 24 | Change (Step 3) | TextInput (file) | Ảnh bìa khóa học upload | `accept="image/*"`. `handleImageChange(file)` POSTs to `COURSES_API.uploadCourseThumbnail()` and stores absolute URL in `payload.thumbnail_url`. |
| 25 | Conditional (Step 3) | Image | `course-image-preview` | Renders `imagePreview` after successful upload. |
| 26 | View (Step 4) | TextInput | Giá khóa học (VNĐ) | `type="number"`, `min=0`. Placeholder "Để trống nếu miễn phí". Empty string sets `payload.price=null`. |
| 27 | View (Step 4) | Select | Có chứng chỉ hoàn thành | Options "Không"/"Có" map to `payload.has_certificate` boolean. |
| 28 | View (Step 4) | TextInput | Thời gian dự kiến (giờ) | `type="number"`, `min=0`. Placeholder "Ví dụ: 25". Bound to `payload.estimated_hours`. |
| 29 | View (Step 4) | TextInput | Xuất bản tự động lúc (tùy chọn) | `type="datetime-local"`. Bound to `payload.publish_scheduled_at`. |
| 30 | View (Step 4) | TextInput | Tags | Placeholder `Nhập các tag, phân cách bằng dấu phẩy. VD: "python, programming, lập trình"`. Splits by `,` into `payload.tags`. |
| 31 | Error | Container | `error-box` | Shown when `error` is set; displays validation or API error message. |
| 32 | Click (Footer) | Button | "Hủy" | `handleCancel()` confirms via `window.confirm("Bạn có chắc muốn hủy tạo khóa học? Mọi thay đổi chưa lưu sẽ bị mất.")`; on confirm navigates `/teacher/dashboard`. |
| 33 | Click (Footer) | Button | "Lưu tạm" | Calls `handleSave(false)`; disabled while `isSubmitting`. |
| 34 | Click (Footer) | Button | "Quay lại" | Only visible when `step>1`; decrements `step`. |
| 35 | Click (Footer) | Button | "Tiếp tục" | Only visible when `step<maxStep`. Disabled if step 1 fails `canGoNextFromStep1` (title non-empty and short description 1–200 chars) or while `isSubmitting`. Increments `step`. |
| 36 | Click (Footer, Step 4) | Button | "Tạo khóa học" | Calls `handleSave(true)` which POSTs to `COURSES_API.createCourse` and navigates `/teacher/courses/{id}` on success. Disabled when `isSubmitting` or `!canGoNextFromStep1`. |
| 37 | Submit | Network | `COURSES_API.createCourse` | Body includes title, descriptions, category (defaults "general"), level, language, filtered learning_objectives & prerequisites, price, has_certificate, estimated_hours, tags, thumbnail_url, ISO publish_scheduled_at. Authorization header carries bearer token. |
| 38 | Error | Text | API error mapping | `parseFriendlyApiError` + `mapValidationMessage` translate backend validation strings (e.g. "title must be longer…" → "Vui lòng nhập tên khóa học."). |
| 39 | Conditional | Modal | `CommonModal` (manager verification) | Opens with title "Cần cấp phép giảng viên" when `managerBlocked` is true; message includes admin review note; confirm navigates to `/profile`. |

## States & Validation Notes
- `step` ∈ [1..4]; `maxStep = 4`. Step circle styling switches between `active` and `done`.
- `canGoNextFromStep1` requires `payload.title.trim().length > 0` AND `payload.short_description.trim().length` in (0, 200].
- Category is committed only after user clicks "Chọn danh mục"; otherwise the API fallback "general" is sent on submit.
- Thumbnail URLs returned by the backend are normalized via `toAbsoluteThumbnailUrl` (prepends `url` when not http/https).
- `handleSave` filters out empty learning objectives/prerequisites and converts `publish_scheduled_at` to ISO string; missing `id` in response throws "Không thể tạo khóa học: thiếu course id trả về từ server.".
- `managerBlocked` = user with `primary_role === "course_manager"` whose `manager_verification.status !== "verified"`; every save attempt is short-circuited and routes to `/profile`.
- API errors expose translated messages via `mapValidationMessage`; unmapped strings fall back to the original text.
- Cancel uses native `window.confirm`; data is discarded only on confirmation.
