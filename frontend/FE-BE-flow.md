## Luồng kết nối Frontend - Backend

Tài liệu này mô tả cách frontend hiện tại gọi backend, tập trung vào luồng auth (đăng nhập, đăng ký + OTP) và cách tổ chức code FE.

---

### 1. Cấu trúc thư mục liên quan

- **`frontend/src/api/auth.ts`**
  - Chỉ khai báo **đường dẫn API** cho module auth:
  - Ví dụ:
    - `AUTH_API.register = "/api/auth/register"`
    - `AUTH_API.verifyRegistrationOtp = "/api/auth/register/verify-otp"`
    - `AUTH_API.login = "/api/auth/login"`

- **`frontend/src/services/authClient.ts`**
  - Chịu trách nhiệm **gọi HTTP** tới backend cho các API auth, sử dụng:
    - `VITE_API_URL` từ `baseUrl.ts` (`API_BASE_URL`)
    - Đường dẫn tương đối từ `AUTH_API`
  - Trả về dữ liệu JSON hoặc `throw Error(code)` với **mã lỗi kỹ thuật** (`REGISTER_FAILED`, `LOGIN_FAILED`, `VERIFY_OTP_FAILED`).

- **`frontend/src/constants/messages.ts`**
  - Map **mã lỗi kỹ thuật** sang **thông báo tiếng Việt** hiển thị cho người dùng.

- **`frontend/src/contexts/Auth.tsx`**
  - Context quản lý trạng thái đăng nhập:
    - Lưu `accessToken`, `refreshToken`, `user`
    - Đọc / ghi vào `localStorage` hoặc `sessionStorage`
  - Dùng `apiLogin` từ `services/authClient.ts`
  - Chuyển hướng người dùng theo `primary_role` (`student`, `teacher`, `admin`).

- **`frontend/src/pages/RegisterPage.tsx`**
  - Màn hình đăng ký 2 bước:
    1. Gửi form đăng ký (email, mật khẩu, họ tên, role) → BE gửi OTP.
    2. Nhập OTP 6 ô → BE xác thực, tạo user thật, trả token.

- **`frontend/src/App.tsx`**
  - Khai báo route FE:
    - `/` → `LoginPage`
    - `/register` → `RegisterPage`
    - `/student/dashboard`, `/teacher/dashboard`, `/admin` → cần auth, bọc bằng `Authentication`.

---

### 2. Biến môi trường & base URL

- File: `frontend/src/baseUrl.ts`
- Nội dung:
  - `export const url = import.meta.env.VITE_API_URL;`
- Ý nghĩa:
  - Tất cả call HTTP dùng `API_BASE_URL = VITE_API_URL`.
  - Ví dụ nếu `.env` của Vite:
    - `VITE_API_URL=http://localhost:8000`
  - Thì một call login sẽ hit:
    - `http://localhost:8000/api/auth/login`

---

### 3. Luồng đăng ký + OTP (FE ↔ BE)

#### 3.1. Bước 1 – Đăng ký

- **Component**: `RegisterPage`
- **Hàm gọi**: `apiRegister` từ `services/authClient.ts`
- **Endpoint BE**: `POST {VITE_API_URL}/api/auth/register`
- **Payload**:
  - `email`: string
  - `password`: string
  - `full_name`: string
  - `role`: `"learner"` hoặc `"course_manager"`

**BE xử lý (tóm tắt):**

- Kiểm tra email đã tồn tại trong bảng `users` chưa.
- Tạo / cập nhật bản ghi trong bảng `pending_registrations`:
  - `email`, `full_name`, `password_hash`, `role_name`, `code` (OTP 6 số), `expires_at`.
- Gửi email OTP 6 số tới người dùng.
- **Không tạo user thật** cho đến khi OTP được xác thực.

**FE sau khi gọi thành công:**

- Không hiển thị thông báo thành công ngay.
- Chỉ chuyển sang bước OTP:
  - `setIsOtpStep(true);`

Nếu BE trả lỗi:

- `authClient` ném `Error("REGISTER_FAILED")` (hoặc `data.code` nếu BE có).
- `RegisterPage` bắt lỗi, map sang message UI thông qua `MESSAGES` trong `constants/messages.ts`.

---

#### 3.2. Bước 2 – Nhập OTP

- **UI**:
  - 6 ô input (mỗi ô 1 chữ số).
  - State: `otpDigits: string[]`, OTP gửi lên là `otpDigits.join("")`.

- **Hàm gọi**: `apiVerifyRegistrationOtp` từ `services/authClient.ts`
- **Endpoint BE**: `POST {VITE_API_URL}/api/auth/register/verify-otp`
- **Payload**:
  - `email`: string (email đã đăng ký ở bước 1)
  - `code`: string (OTP 6 chữ số)

**BE xử lý (tóm tắt):**

- Tìm `pending_registrations` theo `email`.
- Kiểm tra:
  - OTP khớp `code`.
  - `expires_at` còn hiệu lực.
- Nếu hợp lệ:
  - Tạo bản ghi user thật trong `users` (kích hoạt luôn).
  - Gán role theo `role_name` (`learner` hoặc `course_manager`) trong bảng `user_roles`.
  - Xóa bản ghi `pending_registrations`.
  - Tạo session, trả về:
    - `access_token`
    - `refresh_token`
    - `user` (chứa `primary_role`, `roles`, v.v.)

**FE sau khi OTP đúng:**

- `RegisterPage` hiển thị message:
  - `"Kích hoạt tài khoản thành công. Bạn có thể đăng nhập bằng email và mật khẩu."`
- Sau ~1.5s redirect về `/` (màn hình đăng nhập).

Nếu BE trả lỗi:

- `authClient` ném `Error("VERIFY_OTP_FAILED")` (hoặc `data.code`).
- `RegisterPage` map qua `MESSAGES` để hiển thị thông báo tiếng Việt.

---

### 4. Luồng đăng nhập (FE ↔ BE)

- **Component**: `LoginPage` (sử dụng `useAuth().login` từ `contexts/Auth.tsx`)
- **Hàm gọi**: `apiLogin` từ `services/authClient.ts`
- **Endpoint BE**: `POST {VITE_API_URL}/api/auth/login`
- **Payload**:
  - `email`: string
  - `password`: string

**BE xử lý (tóm tắt):**

- Kiểm tra email tồn tại, mật khẩu đúng.
- Kiểm tra tình trạng tài khoản:
  - Đã xác thực email (`email_verified_at`).
  - Không bị khóa tạm thời / vĩnh viễn.
- Tạo session mới, trả về:
  - `access_token`, `refresh_token`, `user`.

**FE xử lý trong `AuthContext.login`:**

- Gọi `apiLogin({ email, password })`.
- Nếu lỗi:
  - `apiLogin` ném `Error("LOGIN_FAILED")` (hoặc `data.code`).
  - `AuthContext` map sang message UI bằng `MESSAGES` rồi throw tiếp để `LoginPage` hiển thị.
- Nếu thành công:
  - Lưu tokens và `user` vào:
    - state (`accessToken`, `refreshToken`, `user`).
    - `localStorage` hoặc `sessionStorage` (tùy `remember`).
  - Gọi `redirectByRole(user, navigate)`:
    - Nếu `primary_role === "student"` → `/student/dashboard`
    - Nếu `"teacher"` → `/teacher/dashboard`
    - Nếu `"admin"` → `/admin`

---

### 5. Bảo vệ route trên FE

- **Component**: `router/Authentication` (bọc quanh dashboard trong `App.tsx`).
- **Cơ chế (tóm tắt)**:
  - Dùng `useAuth()` để kiểm tra:
    - Có `accessToken` và `user` hay không.
  - Nếu chưa đăng nhập:
    - Redirect về `/` (Login).
  - Nếu đã đăng nhập:
    - Cho phép render `StudentDashboard`, `TeacherDashboard`, `AdminDashboard`.

---

### 6. Tóm tắt vai trò các lớp

- **BE**:
  - `command-ingress/features/auth/...`: xử lý logic auth, OTP, vai trò, session.
  - `internal/model/...`: định nghĩa entity (`User`, `Role`, `UserRole`, `PendingRegistration`, ...).

- **FE**:
  - `api/auth.ts`: tập trung đường dẫn endpoint.
  - `services/authClient.ts`: gọi HTTP, trả về dữ liệu / mã lỗi kỹ thuật.
  - `constants/messages.ts`: chứa thông báo UI tiếng Việt.
  - `contexts/Auth.tsx`: quản lý trạng thái đăng nhập & điều hướng theo role.
  - `pages/*.tsx`: UI cụ thể (login, register, dashboard) gọi các service/ context ở trên.

