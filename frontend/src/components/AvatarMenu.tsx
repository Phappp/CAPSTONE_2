import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import { ConfirmModal } from "./CommonModal";
import "./AvatarMenu.css";

function getRoleLabel(role?: string | null) {
  const key = String(role || "").toLowerCase();
  if (key === "course_manager" || key === "teacher") return "Course Manager";
  if (key === "learner" || key === "student") return "Learner";
  if (key === "admin") return "Administrator";
  return role || "Unknown Role";
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
            {user?.full_name || user?.email || "User"}
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
            Account Information
          </button>
          <button
            type="button"
            className="dropdownItem"
            onClick={() => {
              setOpen(false);
              navigate("/profile/security");
            }}
          >
            Security
          </button>
          <button
            type="button"
            className="dropdownItem dropdownItem--danger"
            onClick={() => {
              setOpen(false);
              setLogoutConfirmOpen(true);
            }}
          >
            Logout
          </button>
        </div>
      )}

      <ConfirmModal
        open={logoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to logout of this account? Any unsaved work may be lost."
        confirmText={loggingOut ? "Logging out..." : "Logout"}
        cancelText="Cancel"
        destructive
        onConfirm={handleLogout}
        onClose={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

