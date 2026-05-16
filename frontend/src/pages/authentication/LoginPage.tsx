import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../contexts/Auth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import transLogo from "../../assets/trans-logo.png";
import {
  ArrowRight,
  BookOpenText,
  Eye,
  EyeOff,
  House,
  Lightbulb,
  Sparkles,
  UsersRound,
} from "lucide-react";
import "./LoginPage.css";

export default function LoginPage() {
  const { login, remember: savedRemember, user: savedUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(savedRemember ? (savedUser?.email ?? "") : "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(savedRemember);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Xử lý lỗi từ redirect
  useEffect(() => {
    const errorMsg = searchParams.get("error");
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password, remember });

      // Nếu yêu cầu 2FA, chuyển sang trang xác thực OTP riêng.
      // Lưu ý: chỉ truyền email + remember; MFA verify dùng OTP qua email,
      // không cần password nữa.
      if (result?.requires2FA) {
        setLoading(false);
        navigate("/mfa-verify", { state: { email, remember }, replace: true });
        return;
      }
    } catch (err: any) {
      setError(err?.message ?? "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <section className="auth-section login-section">
      <div className="auth-container">
        <div className="auth-left">
          <div className="bg-blur bg-blur-top"></div>
          <div className="bg-blur bg-blur-bottom"></div>
          <div className="left-content">
            <div className="brand">
              <img src={transLogo} alt="MindBridge logo" />
            </div>
            <div className="glass-card">
              <div className="glass-icon">
                <Sparkles size={24} />
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
              <h2 className="quote-text">The future of learning is personalized and proactive.</h2>
              <div className="quote-author">
                <div className="author-divider"></div>
                <span className="author-name">MindBridge Co.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="form-wrapper">
            <Link to="/" className="auth-home-link" aria-label="Về trang landing">
              <House size={16} />
              <span>Landing</span>
            </Link>
            <header className="form-header">
              <h1 className="form-title">Welcome Back, Ready to Continue?</h1>
              <p className="form-subtitle">Sign in to access your courses, track your progress, and continue learning without interruption.</p>
            </header>
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  EMAIL ADDRESS
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Enter your email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  PASSWORD
                </label>
                <div className="input-with-icon">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter your password"
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

              <div className="auth-footer">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span>Keep me signed in</span>
                </label>

                <button
                  type="button"
                  className="btn btn-link forgot-link"
                  onClick={() => {
                    navigate("/forgot-password");
                  }}
                >
                  Forgot your password?
                </button>
              </div>

              {error && <div className="error-box">{error}</div>}

              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Access My Account
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="divider-container">
                  <div className="divider-line"></div>
                  <span className="divider-text">OR CONTINUE WITH</span>
                  <div className="divider-line"></div>
                </div>

                <GoogleLoginButton onError={handleGoogleError} text="Continue with Google" />
              </div>
            </form>

            <div className="form-footer">
              <p>
                Don’t have an account yet?{" "}
                <Link to="/register" className="login-link">
                  Create Account?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}