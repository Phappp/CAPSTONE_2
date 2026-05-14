# RegisterPage — UI Specification

**Source:** `frontend/src/pages/authentication/RegisterPage.tsx`
**Route:** `/register`
**Purpose:** Register a new user account with role selection, dispatch the API call, then verify the email via a 6-digit OTP before redirecting to login.

## Overview

The page mirrors the LoginPage two-column layout (decorative brand panel on the left, form on the right) and toggles between a registration form and an OTP verification form via the `isOtpStep` boolean. The registration step collects role (`student` / `instructor`), `fullName`, `email`, `password` (with show/hide toggle), and submits to `apiRegister`, mapping `instructor` -> `course_manager` and `student` -> `learner`. The OTP step renders six single-character numeric inputs with automatic focus advancement and Backspace navigation, then calls `apiVerifyRegistrationOtp` and navigates to `/login` after a 1.5-second delay. Error messages are translated through the `MESSAGES` constant lookup; redirect errors from Google OAuth are surfaced via the `error` query param on mount.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Image        | Brand Logo | `<img src={transLogo} alt="MindBridge Logo">` inside the left panel `.brand` container. |
| 2   | View       | Container    | Background Blurs | Two decorative `.bg-blur` elements (top/bottom) inside `.auth-left`. |
| 3   | View       | Icon         | Glass Sparkle Icon | Lucide `Sparkles` (size 22) inside `.glass-icon`. |
| 4   | View       | Container    | Glass Avatar Stack | Three avatars displaying `UsersRound`, `Lightbulb`, `BookOpenText` icons (size 14). |
| 5   | View       | Heading      | Brand Quote | Renders "The future of learning is personalized and proactive." as `.quote-text`. |
| 6   | View       | Text         | Quote Author | Renders "MindBridge Co." beneath the divider. |
| 7   | View       | Link         | Landing Home Link | `<Link to="/">` with `House` icon and "Landing" label; aria-label "Về trang landing". |
| 8   | View       | Heading      | Form Title | Reads "Create an account" when `isOtpStep` is false, otherwise "Verify your email". |
| 9   | View       | Text         | Form Subtitle | Default "Join our community of lifelong learners."; switches to template literal `We sent a 6-digit code to {email}` during OTP step. |
| 10  | View       | Text         | Role Group Label | Label "Choose your role" above the role cards. |
| 11  | Click      | Radio        | Student Role Card | `<input type="radio" name="role" value="student">` wrapped in `.role-card`, icon `GraduationCap` (size 22), label "I'm a Student". Selected when `role === "student"`; mapped to API role `learner`. |
| 12  | Click      | Radio        | Instructor Role Card | `<input type="radio" name="role" value="instructor">` wrapped in `.role-card`, icon `BookOpenText` (size 22), label "I'm an Instructor". Mapped to API role `course_manager`. |
| 13  | View       | Text         | Fullname Label | Label "Fullname" tied to the full name input. |
| 14  | View       | TextInput    | Full Name Field | `<input type="text" required>` bound to `fullName`, placeholder "Tuan, Le Minh". |
| 15  | View       | Text         | Email Label | Label "Email" tied to the email input. |
| 16  | View       | EmailInput   | Email Field | `<input type="email" required>` bound to `email`, placeholder "leminhtuank0@gmail.com". HTML5 email validation. |
| 17  | View       | Text         | Password Label | Label "Password" tied to the password input. |
| 18  | View       | PasswordInput | Password Field | `<input>` whose `type` toggles via `showPassword`, bound to `password`, placeholder "••••••••", required. |
| 19  | Click      | Button       | Password Visibility Toggle | Inline icon button rendering `Eye` / `EyeOff` (size 18); flips `showPassword`. aria-label "Ẩn mật khẩu" / "Hiện mật khẩu". |
| 20  | Error      | Container    | Error Box | `.error-box` rendered when `error` is non-null; text resolved from `MESSAGES[code]` or fallback `MESSAGES.REGISTER_FAILED` / `MESSAGES.VERIFY_OTP_FAILED`. |
| 21  | Submit     | Button       | Create Account Submit | `<button type="submit">` labeled "Create Account" + `ArrowRight` icon; disabled while `loading`. Calls `handleSubmit` -> `apiRegister({ email, password, full_name, role })`. |
| 22  | Loading    | Spinner      | Submit Spinner | `.loading-spinner` rendered inside the active submit button while `loading`. |
| 23  | View       | Divider      | OR Divider | Two `.divider-line` segments wrapping `.divider-text` "OR" between primary CTA and Google button. |
| 24  | Click      | Button       | Google Sign-up Button | `<GoogleLoginButton text="Sign up with Google" onError={handleGoogleError}>`; routes errors to `setError`. |
| 25  | View (OTP) | Text         | OTP Label | Label "OTP Code" above the digit group. |
| 26  | View (OTP) | TextInput    | OTP Digit Inputs | Six `<input id="otp-{i}" type="text" inputMode="numeric" maxLength={1} required>` rendered from `otpDigits`; sanitized to digits via regex `/\D/g`. |
| 27  | Input (OTP) | Behavior    | OTP Auto-advance | `handleOtpChange` focuses `otp-{i+1}` after a digit is entered. |
| 28  | KeyDown (OTP) | Behavior  | OTP Backspace Navigation | `handleOtpKeyDown` focuses `otp-{i-1}` when Backspace is pressed on an empty cell. |
| 29  | View (OTP) | Text         | OTP Hint | Helper text "Enter the 6-digit code sent to your email. Valid for 5 minutes." |
| 30  | Submit (OTP) | Button     | Verify Account Button | Primary submit labeled "Verify Account"; disabled while `loading`. Calls `handleVerifyOtp` -> `apiVerifyRegistrationOtp({ email, code })`. |
| 31  | Success    | Container    | Success Box | `.success-box` rendered when `success` is set; default text "Kích hoạt tài khoản thành công! Bạn sẽ được chuyển hướng đến trang đăng nhập." |
| 32  | Click (OTP) | Button      | Back to Edit Button | `.btn-link` labeled "← Back to edit information"; resets `isOtpStep` to false. |
| 33  | View       | Text         | Login Footer | "Already have an account?" followed by `<Link to="/login">` "Log in". |

## States & Validation Notes

- Component state: `fullName`, `email`, `password`, `showPassword`, `role`, `otpDigits` (string[6]), `isOtpStep`, `loading`, `error`, `success`. Derived `otp = otpDigits.join("")`.
- `useEffect` reads `searchParams.get("error")` on mount and surfaces decoded redirect errors (e.g., from Google OAuth).
- Role mapping is performed at submit time: `apiRole = role === "student" ? "learner" : "course_manager"`.
- HTML5 validation enforces required fields and email format; OTP cells enforce numeric-only via `replace(/\D/g, "")` and `maxLength={1}`.
- On successful OTP verification, `setSuccess(...)` then `setTimeout(() => navigate("/login"), 1500)`.
- Error strings are looked up via `MESSAGES[code]` keyed by `err.message`; unknown codes fall back to `MESSAGES.REGISTER_FAILED` (register step) or `MESSAGES.VERIFY_OTP_FAILED` (OTP step).
- Both forms reuse the `.signup-form` and shared brand panel layout; the OTP form does not render the role/credentials fields.
