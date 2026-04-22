import { FormEvent, useState } from "react";
import GoogleLoginButton from "./GoogleLoginButton";
import "./SessionReauthModal.css";

type SessionReauthModalProps = {
  open: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmitPassword: (password: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onClose?: () => void;
  error?: string | null;
  loading?: boolean;
};

export default function SessionReauthModal({
  open,
  email,
  onEmailChange,
  onSubmitPassword,
  onGoogleLogin,
  onClose,
  error,
  loading = false,
}: SessionReauthModalProps) {
  const [password, setPassword] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGoogleError(null);
    await onSubmitPassword(password);
    setPassword("");
  };

  const handleGoogleError = (message: string) => {
    setGoogleError(message);
  };

  const handleGoogleClick = async () => {
    setGoogleError(null);
    await onGoogleLogin();
  };

  return (
    <div className="session-reauth-overlay" role="dialog" aria-modal="true">
      <div className="session-reauth-card">
        <h3>Phiên đăng nhập đã hết hạn</h3>
        <p>Vui lòng xác thực lại để tiếp tục ngay tại trang hiện tại.</p>

        <form onSubmit={handleSubmit} className="session-reauth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {(error || googleError) && (
            <div className="session-reauth-error">{error ?? googleError}</div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập lại"}
          </button>
        </form>

        <div className="session-reauth-divider">hoặc</div>
        <GoogleLoginButton
          text="Đăng nhập lại bằng Google"
          onError={handleGoogleError}
          className="session-reauth-google-btn"
        />

        {onClose && (
          <button
            type="button"
            className="session-reauth-close"
            onClick={onClose}
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}
