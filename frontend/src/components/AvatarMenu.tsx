import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import { ConfirmModal } from "./CommonModal";
import "./AvatarMenu.css";

function getRoleLabel(role?: string | null) {
  const key = String(role || "").toLowerCase();
  if (key === "course_manager" || key === "teacher") return "Giảng viên";
  if (key === "learner" || key === "student") return "Học viên";
  if (key === "admin") return "Quản trị viên";
  return role || "Học viên";
}

function getInitials(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  if (email) {
    return email[0]?.toUpperCase() ?? "U";
  }
  return "U";
}

export default function AvatarMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const initials = getInitials(user?.full_name, user?.email);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="avatarMenuContainer">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="avatarTrigger"
      >
        <div className="avatarImage">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" />
          ) : (
            initials
          )}
        </div>
        <div className="avatarInfo">
          <div className="avatarName">
            {user?.full_name || user?.email || "Người dùng"}
          </div>
          <div className="avatarRole">
            {getRoleLabel(user?.primary_role || user?.roles?.[0])}
          </div>
        </div>
      </button>

      {open && (
        <div className="avatarDropdown">
          <button
            type="button"
            className="dropdownItem"
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
          >
            Thông tin tài khoản
          </button>
          <button
            type="button"
            className="dropdownItem"
            onClick={() => {
              setOpen(false);
              navigate("/profile/security");
            }}
          >
            Bảo mật
          </button>
          <button
            type="button"
            className="dropdownItem dropdownItem--danger"
            onClick={() => {
              setOpen(false);
              setLogoutConfirmOpen(true);
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}

      <ConfirmModal
        open={logoutConfirmOpen}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này? Mọi phiên làm việc chưa lưu có thể bị mất."
        confirmText={loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        cancelText="Hủy"
        destructive
        onConfirm={handleLogout}
        onClose={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

