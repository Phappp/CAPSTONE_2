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
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [tempEmail, setTempEmail] = useState("");

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

      // Kiểm tra nếu yêu cầu 2FA
      if (result?.requires2FA) {
        setTempEmail(email);
        setShow2FA(true);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err?.message ?? "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Trong LoginPage.tsx, sửa hàm handleVerify2FA
  const handleVerify2FA = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // ✅ Gọi login với email, password (cần lưu lại password tạm thời)
      await login({
        email: tempEmail,
        password: password, // Cần lưu password tạm
        twoFACode,
        remember
      });
    } catch (err: any) {
      setError(err?.message ?? "Mã xác thực không đúng.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (show2FA) {
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
                <h2 className="quote-text">Secure access to your personalized learning journey.</h2>
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
                <h1 className="form-title">Two-factor verification</h1>
                <p className="form-subtitle">Nhập mã xác thực được gửi đến email của bạn.</p>
              </header>
              <form onSubmit={handleVerify2FA} className="signup-form">
                <div className="form-group">
                  <label htmlFor="2fa-code" className="form-label">
                    Mã xác thực
                  </label>
                  <input
                    id="2fa-code"
                    type="text"
                    required
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    className="form-input"
                    placeholder="Nhập mã 6 chữ số"
                    maxLength={6}
                  />
                </div>
                {error && <div className="error-box">{error}</div>}
                <div className="form-actions">
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      <>
                        Xác thực
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => {
                      setShow2FA(false);
                      setTwoFACode("");
                      setTempEmail("");
                    }}
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
              <h1 className="form-title">Welcome back</h1>
              <p className="form-subtitle">Đăng nhập để tiếp tục học tập và quản lý khóa học của bạn.</p>
            </header>
            <form onSubmit={handleSubmit} className="signup-form">
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
                <div className="input-with-icon">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
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
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <button
                  type="button"
                  className="btn btn-link forgot-link"
                  onClick={() => {
                    navigate("/forgot-password");
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {error && <div className="error-box">{error}</div>}

              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Đăng nhập
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="divider-container">
                  <div className="divider-line"></div>
                  <span className="divider-text">OR</span>
                  <div className="divider-line"></div>
                </div>

                <GoogleLoginButton onError={handleGoogleError} text="Sign in with Google" />
              </div>
            </form>

            <div className="form-footer">
              <p>
                Chưa có tài khoản?{" "}
                <Link to="/register" className="login-link">
                  Đăng ký
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}