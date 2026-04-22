import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { House, Lock, Save, Shield } from "lucide-react";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { PROFILE_API } from "../api/profile";
import { useAuth } from "../contexts/Auth";
import "./ProfilePage.css";

export default function ProfileSecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginNotification, setLoginNotification] = useState(true);
  const [deviceTrust, setDeviceTrust] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const goToDashboard = () => {
    const roleSet = new Set((user?.roles || []).map((r) => r.toLowerCase()));
    if (roleSet.has("admin")) return navigate("/admin");
    if (roleSet.has("teacher") || roleSet.has("course_manager")) return navigate("/teacher/dashboard");
    navigate("/student/dashboard");
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    setSavingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${url}${PROFILE_API.changePassword}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          old_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Không thể đổi mật khẩu.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Đổi mật khẩu thành công.");
    } catch (e: any) {
      setErrorMessage(e?.message || "Không thể đổi mật khẩu.");
    } finally {
      setSavingPassword(false);
    }
  };

  const saveSecurity = async () => {
    setSavingSecurity(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${url}${PROFILE_API.updateSecurity}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          is_2fa_enabled: twoFactorEnabled,
          notify_new_login: loginNotification,
          is_trusted_device: deviceTrust,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Không thể lưu cài đặt bảo mật.");
      }
      setSuccessMessage("Đã lưu cài đặt bảo mật.");
    } catch (e: any) {
      setErrorMessage(e?.message || "Không thể lưu cài đặt bảo mật.");
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <div className="dashboard-page profile-page-shell">
      <div className="profile-page-header">
        <div>
          <div className="profile-page-kicker">Security center</div>
          <h1 className="dashboard-title profile-page-title">Bảo mật tài khoản</h1>
          <p className="dashboard-subtitle profile-page-subtitle">
            Quản lý mật khẩu và các thiết lập an toàn cho tài khoản của bạn.
          </p>
        </div>
        <div className="profile-top-actions">
          <button type="button" className="secondary-button" onClick={goToDashboard}>
            <House size={16} />
            Dashboard
          </button>
          <AvatarMenu />
        </div>
      </div>

      <div className="profile-main-card">
        <div className="profile-security-grid">
          <div className="profile-glass-card">
            <div className="profile-stats-title">
              <Lock size={16} />
              Đổi mật khẩu
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu hiện tại</label>
              <input className="form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div className="profile-manager-submit">
              <button type="button" className="primary-button" onClick={changePassword} disabled={savingPassword}>
                <Save size={16} />
                {savingPassword ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>

          <div className="profile-glass-card">
            <div className="profile-stats-title">
              <Shield size={16} />
              Cài đặt bảo mật
            </div>
            <div className="profile-security-item">
              <span className="profile-info-label">Xác thực hai lớp (2FA)</span>
              <input type="checkbox" checked={twoFactorEnabled} onChange={(e) => setTwoFactorEnabled(e.target.checked)} />
            </div>
            <div className="profile-security-item">
              <span className="profile-info-label">Thông báo đăng nhập mới</span>
              <input type="checkbox" checked={loginNotification} onChange={(e) => setLoginNotification(e.target.checked)} />
            </div>
            <div className="profile-security-item">
              <span className="profile-info-label">Tin cậy thiết bị hiện tại</span>
              <input type="checkbox" checked={deviceTrust} onChange={(e) => setDeviceTrust(e.target.checked)} />
            </div>
            <div className="profile-manager-submit">
              <button type="button" className="primary-button" onClick={saveSecurity} disabled={savingSecurity}>
                <Save size={16} />
                {savingSecurity ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
        {successMessage ? <div className="profile-success-message">{successMessage}</div> : null}
      </div>
    </div>
  );
}
