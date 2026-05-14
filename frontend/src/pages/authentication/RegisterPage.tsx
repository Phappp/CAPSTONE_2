// RegisterPage.tsx
import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  apiRegister,
  apiVerifyRegistrationOtp,
} from "../../services/authClient";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import { MESSAGES } from "../../constants/messages";
import transLogo from "../../assets/trans-logo.png";
import {
  ArrowRight,
  BookOpenText,
  Eye,
  EyeOff,
  GraduationCap,
  House,
  Lightbulb,
  Sparkles,
  UsersRound,
} from "lucide-react";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "instructor">("student");
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

    // Map role từ student/instructor sang learner/course_manager cho API
    const apiRole = role === "student" ? "learner" : "course_manager";

    try {
      await apiRegister({
        email,
        password,
        full_name: fullName,
        role: apiRole,
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
        "Kích hoạt tài khoản thành công! Bạn sẽ được chuyển hướng đến trang đăng nhập."
      );
      setTimeout(() => {
        navigate("/login");
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
    <section className="auth-section">
      <div className="auth-container">
        {/* Left Panel: Brand & Illustration */}
        <div className="auth-left">
          <div className="bg-blur bg-blur-top"></div>
          <div className="bg-blur bg-blur-bottom"></div>

          <div className="left-content">
            <div className="brand">
              <img src={transLogo} alt="MindBridge Logo" />
            </div>

            <div className="glass-card">
              <div className="glass-icon">
                <Sparkles size={22} />
              </div>
              <div className="glass-line line-long"></div>
              <div className="glass-line line-short"></div>
              <div className="glass-avatars">
                <div className="avatar avatar-1">
                  <UsersRound size={14} />
                </div>
                <div className="avatar avatar-2">
                  <Lightbulb size={14} />
                </div>
                <div className="avatar avatar-3">
                  <BookOpenText size={14} />
                </div>
              </div>
            </div>

            <div className="quote-block">
              <h2 className="quote-text">
                The future of learning is personalized and proactive.
              </h2>
              <div className="quote-author">
                <div className="author-divider"></div>
                <span className="author-name">MindBridge Co.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="auth-right">
          <div className="form-wrapper">
            <Link to="/" className="auth-home-link" aria-label="Về trang landing">
              <House size={16} />
              <span>Landing</span>
            </Link>
            <header className="form-header">
              <h1 className="form-title">
                {!isOtpStep ? "Create an account" : "Verify your email"}
              </h1>
              <p className="form-subtitle">
                {!isOtpStep
                  ? "Join our community of lifelong learners."
                  : `We sent a 6-digit code to ${email}`}
              </p>
            </header>

            {!isOtpStep ? (
              <form onSubmit={handleSubmit} className="signup-form">
                <div className="form-group">
                  <label className="form-label">Choose your role</label>
                  <div className="role-options">
                    <label
                      className={`role-card ${role === "student" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="student"
                        checked={role === "student"}
                        onChange={() => setRole("student")}
                      />
                      <GraduationCap className="role-icon" size={22} />
                      <span className="role-name">I'm a Student</span>
                    </label>
                    <label
                      className={`role-card ${role === "instructor" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="instructor"
                        checked={role === "instructor"}
                        onChange={() => setRole("instructor")}
                      />
                      <BookOpenText className="role-icon" size={22} />
                      <span className="role-name">I'm an Instructor</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fullname</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tuan, Le Minh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="leminhtuank0@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-with-icon">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="error-box">{error}</div>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="divider-container">
                    <div className="divider-line"></div>
                    <span className="divider-text">OR</span>
                    <div className="divider-line"></div>
                  </div>

                  <GoogleLoginButton onError={handleGoogleError} text="Sign up with Google" />
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="signup-form">
                <div className="form-group">
                  <label className="form-label">OTP Code</label>
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
                        className="otp-input"
                        required
                      />
                    ))}
                  </div>
                  <p className="otp-hint">
                    Enter the 6-digit code sent to your email. Valid for 5 minutes.
                  </p>
                </div>

                {error && <div className="error-box">{error}</div>}
                {success && <div className="success-box">{success}</div>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <span className="loading-spinner"></span> : "Verify Account"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => setIsOtpStep(false)}
                  >
                    ← Back to edit information
                  </button>
                </div>
              </form>
            )}

            <div className="form-footer">
              <p>
                Already have an account? <Link to="/login" className="login-link">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}