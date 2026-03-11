import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";

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
  const navigate = useNavigate();

  const initials = getInitials(user?.full_name, user?.email);

  return (
    <div style={{ position: "relative", marginLeft: "auto" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.25rem 0.6rem",
          borderRadius: "999px",
          border: "1px solid rgba(40, 140, 200, 0.25)",
          background: "#ffffff",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(40,140,200,0.95), rgba(110,180,110,0.9))",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "#1f2933",
            }}
          >
            {user?.full_name || user?.email || "Người dùng"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#607489",
            }}
          >
            {user?.primary_role || user?.roles?.[0] || "learner"}
          </div>
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "0.5rem",
            minWidth: "180px",
            background: "#ffffff",
            borderRadius: 12,
            boxShadow:
              "0 14px 28px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15,23,42,0.04)",
            padding: "0.35rem 0.25rem",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              textAlign: "left",
              fontSize: "0.85rem",
              color: "#1f2933",
              cursor: "pointer",
            }}
          onClick={() => {
            setOpen(false);
            navigate("/profile");
          }}
          >
            Thông tin tài khoản
          </button>
          <button
            type="button"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              textAlign: "left",
              fontSize: "0.85rem",
              color: "#c0392b",
              cursor: "pointer",
            }}
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

