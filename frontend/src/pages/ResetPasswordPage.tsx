import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiResetPassword } from "../services/authClient";
import "./LoginPage.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword({
        token,
        new_password: newPassword,
      });
      setSuccess("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.");
    } catch (err: any) {
      setError(err?.message ?? "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Đặt lại mật khẩu</h1>
        <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new-password" className="form-label">
              Mật khẩu mới
            </label>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="Nhập mật khẩu mới"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Nhập lại mật khẩu mới"
              minLength={6}
            />
          </div>

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <button type="submit" disabled={loading} className="primary-button">
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
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
