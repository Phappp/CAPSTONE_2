import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { PROFILE_API } from "../api/profile";
import { useAuth } from "../contexts/Auth";

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
    <div
      style={{
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid rgba(40,140,200,0.3)",
          background:
            "linear-gradient(135deg, rgba(40,140,200,0.95), rgba(110,180,110,0.9))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
          color: "#ffffff",
          fontWeight: 600,
        }}
      >
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          (profile?.full_name?.[0] || profile?.email?.[0] || "U").toUpperCase()
        )}
      </div>
      <div>
        <div style={{ marginBottom: "0.5rem", fontWeight: 500 }}>
          Ảnh đại diện
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          Hỗ trợ JPEG, PNG, GIF. Dung lượng tối đa 5MB.
        </div>
      </div>
    </div>
  );

  const renderInfoTab = () => (
    <div className="wizard-body">
      {renderAvatarSection()}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
          gap: "2rem",
        }}
      >
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
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: 16,
              background:
                "radial-gradient(circle at top left, rgba(40,140,200,0.18), transparent 60%), #ffffff",
              boxShadow:
                "0 18px 45px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15,23,42,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Thông tin tài khoản
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginBottom: "0.75rem",
              }}
            >
              Quản lý các thông tin cơ bản của hồ sơ cá nhân.
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Ngày tham gia</span>
                <span style={{ fontWeight: 500 }}>
                  {formattedJoinedAt || "-"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Vai trò</span>
                <span style={{ fontWeight: 500 }}>
                  {profile?.roles?.join(", ") || "Người dùng"}
                </span>
              </div>
            </div>
          </div>

          {profile?.statistics && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem 1.25rem",
                borderRadius: 16,
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                Thống kê học tập
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ color: "#6b7280" }}>Khóa đã đăng ký</div>
                  <div style={{ fontWeight: 600 }}>
                    {profile.statistics.courses_enrolled}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>Khóa đã hoàn thành</div>
                  <div style={{ fontWeight: 600 }}>
                    {profile.statistics.courses_completed}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>Bài nộp</div>
                  <div style={{ fontWeight: 600 }}>
                    {profile.statistics.assignments_submitted}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280" }}>Điểm trung bình</div>
                  <div style={{ fontWeight: 600 }}>
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
      <div
        style={{
          maxWidth: 520,
        }}
      >
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
            <div
              style={{
                fontSize: "0.8rem",
                color: "#b91c1c",
                marginBottom: "0.75rem",
              }}
            >
              Mật khẩu mới và xác nhận không khớp.
            </div>
          )}

        <div
          style={{
            fontSize: "0.8rem",
            color: "#6b7280",
            marginBottom: "1.25rem",
          }}
        >
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: "2rem",
        }}
      >
        <div>
          <div
            style={{
              marginBottom: "1.25rem",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            Cài đặt bảo mật
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Xác thực hai lớp (2FA)
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Thêm một lớp bảo mật khi đăng nhập bằng mã OTP.
                </div>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    width: 42,
                    height: 22,
                    borderRadius: 999,
                    background: twoFactorEnabled ? "#16a34a" : "#d1d5db",
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: twoFactorEnabled ? 22 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
              </label>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Thông báo đăng nhập mới
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Gửi email khi tài khoản đăng nhập trên thiết bị hoặc vị trí
                  lạ.
                </div>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={loginNotification}
                  onChange={(e) => setLoginNotification(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    width: 42,
                    height: 22,
                    borderRadius: 999,
                    background: loginNotification ? "#16a34a" : "#d1d5db",
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: loginNotification ? 22 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
              </label>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Tin cậy thiết bị này
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Bỏ qua một số bước xác minh trên thiết bị hiện tại.
                </div>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={deviceTrust}
                  onChange={(e) => setDeviceTrust(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    width: 42,
                    height: 22,
                    borderRadius: 999,
                    background: deviceTrust ? "#16a34a" : "#d1d5db",
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: deviceTrust ? 22 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: 16,
            background: "#f9fafb",
            fontSize: "0.85rem",
            color: "#4b5563",
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Gợi ý bảo mật
          </div>
          <ul style={{ paddingLeft: "1.1rem", margin: 0, display: "grid", gap: "0.25rem" }}>
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
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
        onClick={() => setShowCropper(false)}
      >
        <div
          style={{
            width: "min(420px, 90vw)",
            background: "#ffffff",
            borderRadius: 16,
            padding: "1.25rem 1.5rem",
            boxShadow:
              "0 20px 50px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15,23,42,0.06)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Cắt ảnh đại diện
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
              marginBottom: "0.75rem",
            }}
          >
            (Prototype) Tính năng crop chi tiết sẽ được bổ sung sau. Hiện tại
            ảnh sẽ được sử dụng như kích thước gốc.
          </div>
          <div
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              marginBottom: "1rem",
            }}
          >
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
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
          <div
            style={{
              padding: "2rem 1.5rem",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "0.9rem",
            }}
          >
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
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: 12,
              background: "rgba(34,197,94,0.08)",
              color: "#166534",
              fontSize: "0.85rem",
              border: "1px solid rgba(34,197,94,0.35)",
            }}
          >
            {successMessage}
          </div>
        )}
      </div>

      {renderCropperModal()}
    </div>
  );
}

