import { FormEvent, useState, useEffect } from "react";
import { useAuth } from "../contexts/Auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
      <div className="auth-layout">
        <div className="auth-card">
          <h1 className="auth-title">Xác thực hai yếu tố</h1>
          <p className="auth-subtitle">
            Vui lòng nhập mã xác thực đã được gửi đến email của bạn.
          </p>

          <form onSubmit={handleVerify2FA}>
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

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? "Đang xác thực..." : "Xác thực"}
            </button>
          </form>

          <div className="auth-redirect">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setShow2FA(false);
                setTwoFACode("");
                setTempEmail("");
              }}
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">
          Vui lòng đăng nhập để tiếp tục sử dụng hệ thống.
        </p>

        <form onSubmit={handleSubmit}>
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
              placeholder="Nhập mật khẩu"
            />
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
              className="link-button"
              onClick={() => {
                navigate("/forgot-password");
              }}
            >
              Quên mật khẩu?
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className="auth-divider">
            <span>Hoặc đăng nhập với</span>
          </div>

          <GoogleLoginButton onError={handleGoogleError} />
        </form>

        <div className="auth-redirect">
          Chưa có tài khoản?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/register")}
          >
            Đăng ký
          </button>
        </div>
      </div>
    </div>
  );
}