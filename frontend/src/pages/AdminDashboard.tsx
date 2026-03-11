import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AvatarMenu from "../components/AvatarMenu";
import { useAuth } from "../contexts/Auth";
import {
  AdminUser,
  AdminUsersStatistics,
  apiGetAdminUsers,
} from "../services/adminUsersClient";
import { toTitleCase } from "../utils/helper";

type RoleFilter = "all" | "student" | "instructor" | "admin";
type StatusFilter = "all" | "active" | "pending" | "banned";

export default function AdminDashboard() {
  const { accessToken, user } = useAuth();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users", { page, limit, search, role, status }],
    queryFn: () =>
      apiGetAdminUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role,
        status,
        accessToken: accessToken || "",
      }),
    enabled: !!accessToken,
    keepPreviousData: true,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const statistics: AdminUsersStatistics | undefined = data?.statistics;

  return (
    <div className="dashboard-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 className="dashboard-title">Admin Panel</h1>
          <p className="dashboard-subtitle">
            Quản lý người dùng trong hệ thống MindBridge.
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <AvatarMenu />
        </div>
      </div>

      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#607489",
              marginBottom: "0.25rem",
            }}
          >
            Đang đăng nhập với tư cách:
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "#1f2933",
            }}
          >
            {user?.email} ({user?.primary_role || user?.roles?.[0] || "admin"})
          </div>
        </div>
      </div>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#1f2933",
            marginBottom: "0.75rem",
          }}
        >
          📊 Thống kê
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          {renderStatCard("Tổng số", statistics?.total ?? 0)}
          {renderStatCard("Học viên", statistics?.students ?? 0)}
          {renderStatCard("Giảng viên", statistics?.instructors ?? 0)}
          {renderStatCard("Admin", statistics?.admins ?? 0)}
        </div>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#1f2933",
            marginBottom: "0.75rem",
          }}
        >
          🔍 Tìm kiếm và lọc
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Tìm kiếm theo email, tên, SĐT..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="form-input"
            style={{ minWidth: "260px", flex: "1 1 260px" }}
          />

          <select
            className="form-input"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as RoleFilter);
            }}
            style={{ width: 140 }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className="form-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as StatusFilter);
            }}
            style={{ width: 140 }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
          </select>

          <button type="button" className="secondary-button">
            FILTERS
          </button>
          <button type="button" className="secondary-button">
            EXPORT
          </button>
        </div>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            color: "#607489",
          }}
        >
          <div>
            Kết quả: {pagination?.total ?? 0} users (hiển thị{" "}
            {users.length > 0 ? `${(page - 1) * limit + 1} - ${(page - 1) * limit + users.length}` : "0"}
            )
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            background: "#ffffff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead
              style={{
                background: "#f8fafc",
                textAlign: "left",
                color: "#607489",
              }}
            >
              <tr>
                <th style={thStyle}>
                  <input type="checkbox" disabled />
                </th>
                <th style={thStyle}>USER</th>
                <th style={thStyle}>EMAIL</th>
                <th style={thStyle}>VAI TRÒ</th>
                <th style={thStyle}>TRẠNG THÁI</th>
                <th style={thStyle}>LẦN ĐĂNG NHẬP CUỐI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    Không thể tải danh sách người dùng. Vui lòng thử lại.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && users.length === 0 && (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    Không có người dùng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.75rem",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="secondary-button"
              disabled={!pagination || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ⟵ Previous
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!pagination || page >= (pagination?.pages ?? 1)}
              onClick={() =>
                setPage((p) =>
                  !pagination ? p : Math.min(pagination.pages, p + 1)
                )
              }
            >
              Next ⟶
            </button>
          </div>

          <div
            style={{
              fontSize: "0.8rem",
              color: "#607489",
            }}
          >
            Trang {page} / {pagination?.pages ?? 1}
          </div>
        </div>
      </section>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.65rem 0.9rem",
  fontWeight: 500,
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderBottom: "1px solid rgba(15, 23, 42, 0.04)",
  verticalAlign: "middle",
};

const emptyCellStyle: React.CSSProperties = {
  padding: "1.5rem",
  textAlign: "center",
  color: "#607489",
};

function renderStatCard(label: string, value: number) {
  return (
    <div
      style={{
        padding: "0.9rem 1.1rem",
        borderRadius: 14,
        background:
          "radial-gradient(circle at top left, #e0f2fe 0, #f8fafc 45%, #ffffff 100%)",
        border: "1px solid rgba(15, 23, 42, 0.05)",
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          color: "#607489",
          marginBottom: "0.15rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "#1f2933",
        }}
      >
        {value.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const roleLabel = toTitleCase(user.role);

  const statusColor =
    user.status === "active"
      ? "#22c55e"
      : user.status === "pending"
      ? "#eab308"
      : "#ef4444";

  const statusText =
    user.status === "active"
      ? "Active"
      : user.status === "pending"
      ? "Pending"
      : "Banned";

  return (
    <tr>
      <td style={tdStyle}>
        <input type="checkbox" />
      </td>
      <td style={tdStyle}>
        <div style={{ fontWeight: 500, color: "#111827" }}>
          {user.full_name || user.email}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#9ca3af",
            marginTop: "0.1rem",
          }}
        >
          ID: {user.id}
        </div>
      </td>
      <td style={tdStyle}>{user.email}</td>
      <td style={tdStyle}>{roleLabel}</td>
      <td style={tdStyle}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "999px",
              backgroundColor: statusColor,
            }}
          />
          <span
            style={{
              fontSize: "0.8rem",
              color: "#4b5563",
            }}
          >
            {statusText}
          </span>
        </span>
      </td>
      <td style={tdStyle}>
        <span
          style={{
            fontSize: "0.78rem",
            color: "#6b7280",
          }}
        >
          {user.last_login
            ? new Date(user.last_login).toLocaleString("vi-VN")
            : "—"}
        </span>
      </td>
    </tr>
  );
}

