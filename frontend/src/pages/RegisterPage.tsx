import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  apiRegister,
  apiVerifyRegistrationOtp,
} from "../services/authClient";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { MESSAGES } from "../constants/messages";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"learner" | "course_manager">("learner");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const otp = otpDigits.join("");

  // Xử lý lỗi từ redirect Google
  useEffect(() => {
    const errorMsg = searchParams.get("error");
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await apiRegister({
        email,
        password,
        full_name: fullName,
        role,
      });

      setIsOtpStep(true);
    } catch (err: any) {
      const code = err?.message as keyof typeof MESSAGES;
      setError(MESSAGES[code] ?? MESSAGES.REGISTER_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await apiVerifyRegistrationOtp({
        email,
        code: otp,
      });

      setSuccess(
        "Kích hoạt tài khoản thành công. Bạn có thể đăng nhập bằng email và mật khẩu."
      );
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      const code = err?.message as keyof typeof MESSAGES;
      setError(MESSAGES[code] ?? MESSAGES.VERIFY_OTP_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < otpDigits.length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Đăng ký</h1>
        <p className="auth-subtitle">
          Tạo tài khoản mới để bắt đầu sử dụng hệ thống.
        </p>

        {!isOtpStep && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Họ và tên
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="learner"
                    checked={role === "learner"}
                    onChange={() => setRole("learner")}
                  />
                  <span>Học viên</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="course_manager"
                    checked={role === "course_manager"}
                    onChange={() => setRole("course_manager")}
                  />
                  <span>Giảng viên</span>
                </label>
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>

            <div className="auth-divider">
              <span>Hoặc đăng ký với</span>
            </div>

            <GoogleLoginButton
              onError={handleGoogleError}
              text="Đăng ký với Google"
            />
          </form>
        )}

        {isOtpStep && (
          <form onSubmit={handleVerifyOtp} className="otp-form">
            <div className="form-group">
              <label htmlFor="otp" className="form-label">
                Mã OTP
              </label>
              <div className="otp-input-group">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="form-input otp-input"
                    required
                  />
                ))}
              </div>
              <p className="otp-hint">
                Nhập mã OTP 6 chữ số được gửi tới email của bạn.
              </p>
            </div>

            {error && <div className="error-box">{error}</div>}
            {success && (
              <div className="success-box">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? "Đang xác thực..." : "Xác thực OTP"}
            </button>
          </form>
        )}

        <div className="auth-redirect">
          Đã có tài khoản?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/")}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}