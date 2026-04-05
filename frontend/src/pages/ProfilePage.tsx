// ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { PROFILE_API } from "../api/profile";
import { useAuth } from "../contexts/Auth";
import "./ProfilePage.css"; // Import CSS file

type ProfileTab = "info" | "password" | "security";

interface ProfileStatistics {
  courses_enrolled: number;
  courses_completed: number;
  assignments_submitted: number;
  average_score: number;
}

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  created_at: string;
  roles?: string[];
  statistics?: ProfileStatistics;
}

interface ProfileFormState {
  full_name: string;
  phone_number: string;
  bio: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    full_name: "",
    phone_number: "",
    bio: "",
  });
  const [originalForm, setOriginalForm] = useState<ProfileFormState | null>(
    null
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginNotification, setLoginNotification] = useState(true);
  const [deviceTrust, setDeviceTrust] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${url}${PROFILE_API.getProfile}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Không thể tải thông tin hồ sơ.");
        }

        const json = await res.json();
        const data: ProfileData = json.data;

        if (!ignore) {
          setProfile(data);
          const formState: ProfileFormState = {
            full_name: data.full_name || "",
            phone_number: data.phone_number || "",
            bio: data.bio || "",
          };
          setForm(formState);
          setOriginalForm(formState);
          setAvatarPreview(data.avatar_url || null);
        }
      } catch (e: any) {
        if (!ignore) {
          setErrorMessage(e.message || "Đã xảy ra lỗi khi tải hồ sơ.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalForm) return false;
    return (
      originalForm.full_name !== form.full_name ||
      originalForm.phone_number !== form.phone_number ||
      originalForm.bio !== form.bio
    );
  }, [form, originalForm]);

  const handleFormChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (!originalForm) return;
    setForm(originalForm);
    setAvatarPreview(profile?.avatar_url || null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    const trimmedPhone = form.phone_number.trim();
    if (trimmedPhone && !/^0\d{9,10}$/.test(trimmedPhone)) {
      setErrorMessage("Số điện thoại không hợp lệ. Vui lòng nhập dạng 0xxxxxxxxx.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("access_token");
      const body = {
        full_name: form.full_name.trim(),
        phone_number: trimmedPhone || "",
        bio: form.bio.trim(),
      };

      const res = await fetch(`${url}${PROFILE_API.updateProfile}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Không thể cập nhật hồ sơ.";
        try {
          const json = await res.json();
          if (json?.message) {
            message = json.message;
          } else if (json?.error) {
            message = json.error;
          }
          if (
            typeof message === "string" &&
            message.toLowerCase().includes("phone") &&
            message.toLowerCase().includes("exist")
          ) {
            message = "Số điện thoại đã được sử dụng.";
          }
        } catch {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const updated = await res.json();
      const newData: ProfileData = updated.data ?? {
        ...profile,
        full_name: body.full_name,
        phone_number: body.phone_number,
        bio: body.bio,
      };

      setProfile(newData);
      const newFormState: ProfileFormState = {
        full_name: newData.full_name || "",
        phone_number: newData.phone_number || "",
        bio: newData.bio || "",
      };
      setForm(newFormState);
      setOriginalForm(newFormState);
      setSuccessMessage("Cập nhật hồ sơ thành công!");
    } catch (e: any) {
      setErrorMessage(e.message || "Đã xảy ra lỗi khi cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setErrorMessage("Vui lòng chọn file ảnh JPEG, PNG hoặc GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Dung lượng ảnh tối đa 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${url}${PROFILE_API.uploadAvatar}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Không thể upload ảnh đại diện.");
      }

      const json = await res.json();
      const avatarUrl =
        json.data?.avatar_url || json.avatar_url || profile?.avatar_url || null;
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      setAvatarPreview(avatarUrl);
      if (avatarUrl) {
        updateUser({ avatar_url: avatarUrl });
      }
      setSuccessMessage("Cập nhật ảnh đại diện thành công!");
    } catch (e: any) {
      setErrorMessage(e.message || "Đã xảy ra lỗi khi upload ảnh đại diện.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa ảnh đại diện?")) return;
    setAvatarDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${url}${PROFILE_API.deleteAvatar}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Không thể xóa ảnh đại diện.");
      }

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: null } : prev
      );
      setAvatarPreview(null);
      setSuccessMessage("Đã xóa ảnh đại diện, sử dụng avatar mặc định.");
    } catch (e: any) {
      setErrorMessage(e.message || "Đã xảy ra lỗi khi xóa ảnh đại diện.");
    } finally {
      setAvatarDeleting(false);
    }
  };

  const formattedJoinedAt = useMemo(() => {
    if (!profile?.created_at) return "";
    const d = new Date(profile.created_at);
    if (Number.isNaN(d.getTime())) return profile.created_at;
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [profile?.created_at]);

  const canChangePassword =
    currentPassword.trim().length >= 6 &&
    newPassword.trim().length >= 6 &&
    newPassword === confirmPassword;

  const renderTabHeader = () => (
    <div className="wizard-steps" style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        className={`wizard-step ${activeTab === "info" ? "active" : ""}`}
        onClick={() => setActiveTab("info")}
      >
        <div className="wizard-step-circle">1</div>
        <div className="wizard-step-label">Thông tin cá nhân</div>
      </button>
      <button
        type="button"
        className={`wizard-step ${activeTab === "password" ? "active" : ""}`}
        onClick={() => setActiveTab("password")}
      >
        <div className="wizard-step-circle">2</div>
        <div className="wizard-step-label">Đổi mật khẩu</div>
      </button>
      <button
        type="button"
        className={`wizard-step ${activeTab === "security" ? "active" : ""}`}
        onClick={() => setActiveTab("security")}
      >
        <div className="wizard-step-circle">3</div>
        <div className="wizard-step-label">Cài đặt bảo mật</div>
      </button>
    </div>
  );

  const renderAvatarSection = () => (
    <div className="profile-avatar-container">
      <div className="profile-avatar-wrapper">
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Avatar"
            className="profile-avatar-img"
          />
        ) : (
          (profile?.full_name?.[0] || profile?.email?.[0] || "U").toUpperCase()
        )}
      </div>
      <div className="profile-avatar-info">
        <div className="profile-avatar-label">Ảnh đại diện</div>
        <div className="profile-avatar-actions">
          <label
            className="primary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              style={{ display: "none" }}
              onChange={(e) =>
                handleAvatarFileChange(e.target.files?.[0] ?? null)
              }
              disabled={avatarUploading || avatarDeleting}
            />
            {avatarUploading ? "Đang tải ảnh..." : "Tải ảnh lên"}
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowCropper(true)}
            disabled={!avatarPreview}
          >
            Cắt ảnh
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleDeleteAvatar}
            disabled={avatarDeleting || avatarUploading || !avatarPreview}
          >
            {avatarDeleting ? "Đang xóa..." : "Xóa ảnh"}
          </button>
        </div>
        <div className="profile-avatar-hint">
          Hỗ trợ JPEG, PNG, GIF. Dung lượng tối đa 5MB.
        </div>
      </div>
    </div>
  );

  const renderInfoTab = () => (
    <div className="wizard-body">
      {renderAvatarSection()}

      <div className="profile-two-column">
        <div>
          <div className="form-group">
            <label className="form-label">Họ và tên</label>
            <input
              className="form-input"
              value={form.full_name}
              onChange={(e) => handleFormChange("full_name", e.target.value)}
              placeholder="Nhập họ và tên của bạn"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email (không thể thay đổi)</label>
            <input
              className="form-input"
              value={profile?.email || ""}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-input"
              value={form.phone_number}
              onChange={(e) =>
                handleFormChange("phone_number", e.target.value)
              }
              placeholder="Ví dụ: 0901234567"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Giới thiệu / Bio</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.bio}
              onChange={(e) => handleFormChange("bio", e.target.value)}
              placeholder="Viết đôi dòng về bản thân, kinh nghiệm, sở thích học tập..."
            />
          </div>
        </div>

        <div>
          <div className="profile-info-card">
            <div className="profile-info-card-title">Thông tin tài khoản</div>
            <div className="profile-info-card-subtitle">
              Quản lý các thông tin cơ bản của hồ sơ cá nhân.
            </div>
            <div className="profile-info-detail">
              <div className="profile-info-row">
                <span className="profile-info-label">Ngày tham gia</span>
                <span className="profile-info-value">
                  {formattedJoinedAt || "-"}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Vai trò</span>
                <span className="profile-info-value">
                  {profile?.roles?.join(", ") || "Người dùng"}
                </span>
              </div>
            </div>
          </div>

          {profile?.statistics && (
            <div className="profile-stats-card">
              <div className="profile-stats-title">Thống kê học tập</div>
              <div className="profile-stats-grid">
                <div>
                  <div className="profile-stat-label">Khóa đã đăng ký</div>
                  <div className="profile-stat-value">
                    {profile.statistics.courses_enrolled}
                  </div>
                </div>
                <div>
                  <div className="profile-stat-label">Khóa đã hoàn thành</div>
                  <div className="profile-stat-value">
                    {profile.statistics.courses_completed}
                  </div>
                </div>
                <div>
                  <div className="profile-stat-label">Bài nộp</div>
                  <div className="profile-stat-value">
                    {profile.statistics.assignments_submitted}
                  </div>
                </div>
                <div>
                  <div className="profile-stat-label">Điểm trung bình</div>
                  <div className="profile-stat-value">
                    {profile.statistics.average_score}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer" style={{ marginTop: "1.5rem" }}>
        <div className="wizard-footer-left">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(-1)}
            style={{ marginRight: "0.5rem" }}
          >
            Quay lại
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleCancel}
            disabled={saving || !hasUnsavedChanges}
          >
            Hủy
          </button>
        </div>
        <div className="wizard-footer-right">
          <button
            type="button"
            className="primary-button"
            onClick={handleSaveProfile}
            disabled={saving || !hasUnsavedChanges}
            style={{ minWidth: "160px" }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPasswordTab = () => (
    <div className="wizard-body">
      <div className="profile-password-container">
        <div className="form-group">
          <label className="form-label">Mật khẩu hiện tại</label>
          <input
            className="form-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu hiện tại"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mật khẩu mới</label>
          <input
            className="form-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Xác nhận mật khẩu mới</label>
          <input
            className="form-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
        </div>

        {newPassword &&
          confirmPassword &&
          newPassword !== confirmPassword && (
            <div className="profile-password-error">
              Mật khẩu mới và xác nhận không khớp.
            </div>
          )}

        <div className="profile-password-hint">
          * Chỉ tạo UI - chức năng đổi mật khẩu sẽ được kết nối với API sau.
        </div>

        <div className="wizard-footer">
          <div />
          <div className="wizard-footer-right">
            <button
              type="button"
              className="primary-button"
              disabled={!canChangePassword}
              style={{ minWidth: "160px" }}
            >
              Lưu mật khẩu mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="wizard-body">
      <div className="profile-security-two-column">
        <div>
          <div className="profile-security-section-title">Cài đặt bảo mật</div>

          <div className="profile-security-settings">
            <div className="profile-security-item">
              <div>
                <div className="profile-security-item-title">
                  Xác thực hai lớp (2FA)
                </div>
                <div className="profile-security-item-desc">
                  Thêm một lớp bảo mật khi đăng nhập bằng mã OTP.
                </div>
              </div>
              <label className="profile-toggle">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="profile-toggle-input"
                />
                <div className={`profile-toggle-slider ${twoFactorEnabled ? "active" : ""}`}>
                  <div className={`profile-toggle-knob ${twoFactorEnabled ? "right" : "left"}`} />
                </div>
              </label>
            </div>

            <div className="profile-security-item">
              <div>
                <div className="profile-security-item-title">
                  Thông báo đăng nhập mới
                </div>
                <div className="profile-security-item-desc">
                  Gửi email khi tài khoản đăng nhập trên thiết bị hoặc vị trí lạ.
                </div>
              </div>
              <label className="profile-toggle">
                <input
                  type="checkbox"
                  checked={loginNotification}
                  onChange={(e) => setLoginNotification(e.target.checked)}
                  className="profile-toggle-input"
                />
                <div className={`profile-toggle-slider ${loginNotification ? "active" : ""}`}>
                  <div className={`profile-toggle-knob ${loginNotification ? "right" : "left"}`} />
                </div>
              </label>
            </div>

            <div className="profile-security-item">
              <div>
                <div className="profile-security-item-title">
                  Tin cậy thiết bị này
                </div>
                <div className="profile-security-item-desc">
                  Bỏ qua một số bước xác minh trên thiết bị hiện tại.
                </div>
              </div>
              <label className="profile-toggle">
                <input
                  type="checkbox"
                  checked={deviceTrust}
                  onChange={(e) => setDeviceTrust(e.target.checked)}
                  className="profile-toggle-input"
                />
                <div className={`profile-toggle-slider ${deviceTrust ? "active" : ""}`}>
                  <div className={`profile-toggle-knob ${deviceTrust ? "right" : "left"}`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="profile-security-tips">
          <div className="profile-security-tips-title">Gợi ý bảo mật</div>
          <ul className="profile-security-tips-list">
            <li>Không chia sẻ mật khẩu cho bất kỳ ai.</li>
            <li>Sử dụng mật khẩu mạnh, có chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
            <li>Kích hoạt 2FA để bảo vệ tài khoản tốt hơn.</li>
            <li>Đăng xuất khỏi các thiết bị công cộng sau khi sử dụng.</li>
          </ul>
        </div>
      </div>

      <div className="wizard-footer" style={{ marginTop: "1.5rem" }}>
        <div />
        <div className="wizard-footer-right">
          <button
            type="button"
            className="primary-button"
            style={{ minWidth: "160px" }}
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );

  const renderCropperModal = () => {
    if (!showCropper || !avatarPreview) return null;
    return (
      <div className="profile-cropper-modal-overlay" onClick={() => setShowCropper(false)}>
        <div className="profile-cropper-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-cropper-title">Cắt ảnh đại diện</div>
          <div className="profile-cropper-hint">
            (Prototype) Tính năng crop chi tiết sẽ được bổ sung sau. Hiện tại
            ảnh sẽ được sử dụng như kích thước gốc.
          </div>
          <div className="profile-cropper-preview">
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div className="profile-cropper-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowCropper(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowCropper(false)}
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "info":
        return renderInfoTab();
      case "password":
        return renderPasswordTab();
      case "security":
        return renderSecurityTab();
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="dashboard-title">Hồ sơ cá nhân</h1>
          <p className="dashboard-subtitle">
            Quản lý thông tin tài khoản, mật khẩu và cài đặt bảo mật của bạn.
          </p>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card">
        {renderTabHeader()}

        {loading ? (
          <div className="profile-loading">
            Đang tải thông tin hồ sơ...
          </div>
        ) : (
          renderActiveTab()
        )}

        {errorMessage && (
          <div className="error-box" style={{ marginTop: "1rem" }}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="profile-success-message">
            {successMessage}
          </div>
        )}
      </div>

      {renderCropperModal()}
    </div>
  );
}