import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiForgotPassword } from "../services/authClient";
import "./LoginPage.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await apiForgotPassword({ email });
      setSuccess(
        "Liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email."
      );
    } catch (err: any) {
      setError(err?.message ?? "Không thể gửi yêu cầu, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Quên mật khẩu</h1>
        <p className="auth-subtitle">
          Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
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

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <button type="submit" disabled={loading} className="primary-button">
            {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          </button>
        </form>

        <div className="auth-redirect">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/login")}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
