import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/Auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password, remember });
    } catch (err: any) {
      setError(err?.message ?? "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

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
                // TODO: điều hướng sang màn hình "Quên mật khẩu" khi có
                alert("Chức năng quên mật khẩu sẽ được triển khai sau.");
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
        </form>

        <div
          style={{
            marginTop: "0.9rem",
            fontSize: "0.85rem",
            textAlign: "center",
            color: "#607489",
          }}
        >
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


