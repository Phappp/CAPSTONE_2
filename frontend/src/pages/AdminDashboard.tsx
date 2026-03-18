import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AvatarMenu from "../components/AvatarMenu";
import { useAuth } from "../contexts/Auth";
import {
  AdminUser,
  AdminUsersStatistics,
  apiBulkAction,
  apiGetAdminUsers,
  apiGetAuditLogs,
  apiHardDeleteUser,
  apiResetUserPassword,
  apiRestoreUser,
  apiSoftDeleteUser,
  apiUpdateUserRole,
  apiUpdateUserStatus,
  AuditLogItem,
} from "../services/adminUsersClient";
import { toTitleCase } from "../utils/helper";

type RoleFilter = "all" | "learner" | "course_manager" | "admin";
type StatusFilter = "all" | "active" | "pending" | "banned" | "deleted";
type AdminView = "users" | "audit_logs";
type AdminTier = "admin" | "non_admin";

export default function AdminDashboard() {
  const { accessToken, user } = useAuth();

  const adminTier = getAdminTierFromUser(user);
  const queryClient = useQueryClient();

  const [view, setView] = useState<AdminView>("users");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [fuzzy, setFuzzy] = useState(false);
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [savedFilterName, setSavedFilterName] = useState("");
  const [savedFilters, setSavedFilters] = useState<
    Array<{
      name: string;
      value: {
        search: string;
        role: RoleFilter;
        status: StatusFilter;
        includeDeleted: boolean;
        fuzzy: boolean;
      };
    }>
  >([]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "activate" | "deactivate" | "set_role"
  >("activate");
  const [bulkRole, setBulkRole] = useState<RoleFilter>("learner");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [lastUndo, setLastUndo] = useState<
    | { action: "activate" | "deactivate"; userIds: number[] }
    | null
  >(null);

  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(20);
  const [auditActorId, setAuditActorId] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users", { page, limit, search: fuzzy ? "" : search, role, status, includeDeleted }],
    queryFn: () =>
      apiGetAdminUsers({
        page,
        limit,
        // Khi fuzzy ON: không gửi search lên BE, để BE trả toàn bộ page,
        // client-side fuzzy filter mới có data để lọc.
        search: fuzzy ? undefined : search.trim() || undefined,
        role,
        status,
        includeDeleted,
        accessToken: accessToken || "",
      }),
    enabled: !!accessToken,
    keepPreviousData: true,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const statistics: AdminUsersStatistics | undefined = data?.statistics;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("admin_users_saved_filters");
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (Array.isArray(parsed)) setSavedFilters(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "admin_users_saved_filters",
        JSON.stringify(savedFilters)
      );
    } catch {
      // ignore
    }
  }, [savedFilters]);

  useEffect(() => {
    // Clear selection when result set changes page/filter.
    setSelectedIds(new Set());
  }, [page, limit, search, role, status, includeDeleted]);

  const displayedUsers = useMemo(() => {
    if (!fuzzy || !search.trim()) return users;
    const q = normalize(search);
    return users.filter((u) => {
      const hay = normalize(`${u.email} ${u.full_name || ""} ${u.id}`);
      return fuzzyMatch(hay, q);
    });
  }, [users, fuzzy, search]);

  const selectedOnPage = useMemo(() => {
    const ids = new Set(displayedUsers.map((u) => u.id));
    return [...selectedIds].filter((id) => ids.has(id));
  }, [selectedIds, displayedUsers]);

  const allSelectedOnPage =
    displayedUsers.length > 0 && selectedOnPage.length === displayedUsers.length;

  const auditQuery = useQuery({
    queryKey: [
      "admin-audit-logs",
      { auditPage, auditLimit, auditActorId, auditAction, auditFrom, auditTo },
    ],
    queryFn: () =>
      apiGetAuditLogs({
        page: auditPage,
        limit: auditLimit,
        actorUserId: auditActorId.trim() ? Number(auditActorId.trim()) : undefined,
        action: auditAction.trim() || undefined,
        from: auditFrom || undefined,
        to: auditTo || undefined,
        accessToken: accessToken || "",
      }),
    enabled: !!accessToken && view === "audit_logs",
    keepPreviousData: true,
  });

  async function handleResetPassword(target: AdminUser) {
    if (!accessToken) return;
    if (!can(adminTier, "reset_password")) {
      alert("Bạn không có quyền reset password.");
      return;
    }
    const ok = confirmSensitive(
      `Reset password cho ${target.email} (ID: ${target.id})?`
    );
    if (!ok) return;
    const result = await apiResetUserPassword({ userId: target.id, accessToken });
    alert(`Mật khẩu tạm thời: ${result.temp_password}`);
  }

  async function handleUpdateRole(target: AdminUser, nextRole: RoleFilter) {
    if (!accessToken) return;
    if (!can(adminTier, "change_role")) {
      alert("Bạn không có quyền đổi role.");
      return;
    }
    const ok = confirmSensitive(
      `Đổi role của ${target.email} (ID: ${target.id}) sang ${nextRole.toUpperCase()}?`
    );
    if (!ok) return;
    await apiUpdateUserRole({
      userId: target.id,
      role: nextRole as any,
      accessToken,
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleUpdateStatus(
    target: AdminUser,
    nextStatus: Exclude<StatusFilter, "all" | "deleted">
  ) {
    if (!accessToken) return;
    if (!can(adminTier, "change_status")) {
      alert("Bạn không có quyền đổi trạng thái.");
      return;
    }
    const reasonInput = window.prompt(
      nextStatus === "banned"
        ? "Lý do (bắt buộc khi ban):"
        : "Lý do (optional):",
      ""
    );
    const reason = reasonInput ? reasonInput.trim() : "";
    if (nextStatus === "banned" && !reason) {
      alert("Bạn phải nhập lý do khi ban user.");
      return;
    }
    const ok = confirmSensitive(
      `Đổi trạng thái của ${target.email} (ID: ${target.id}) sang ${nextStatus.toUpperCase()}?`
    );
    if (!ok) return;
    await apiUpdateUserStatus({
      userId: target.id,
      status: nextStatus as any,
      reason: reason || undefined,
      accessToken,
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleSoftDelete(target: AdminUser) {
    if (!accessToken) return;
    if (!can(adminTier, "soft_delete")) {
      alert("Bạn không có quyền xóa (soft delete).");
      return;
    }
    const reasonInput = window.prompt("Lý do soft delete (bắt buộc):", "");
    const reason = reasonInput ? reasonInput.trim() : "";
    if (!reason) {
      alert("Bạn phải nhập lý do soft delete.");
      return;
    }
    const ok = confirmSensitive(`Soft delete ${target.email} (ID: ${target.id})?`);
    if (!ok) return;
    await apiSoftDeleteUser({ userId: target.id, reason, accessToken });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleRestore(target: AdminUser) {
    if (!accessToken) return;
    if (!can(adminTier, "restore")) {
      alert("Bạn không có quyền khôi phục user.");
      return;
    }
    const ok = confirmSensitive(`Khôi phục ${target.email} (ID: ${target.id})?`);
    if (!ok) return;
    await apiRestoreUser({ userId: target.id, accessToken });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleHardDelete(target: AdminUser) {
    if (!accessToken) return;
    if (!can(adminTier, "hard_delete")) {
      alert("Hệ thống hiện chỉ có role admin/learner/course_manager nên không hỗ trợ hard delete.");
      return;
    }
    const ok = confirmTyped(
      `Hard delete vĩnh viễn ${target.email} (ID: ${target.id}). Không thể hoàn tác.`,
      "DELETE"
    );
    if (!ok) return;
    await apiHardDeleteUser({ userId: target.id, accessToken });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!checked) {
        for (const u of displayedUsers) next.delete(u.id);
        return next;
      }
      for (const u of displayedUsers) {
        if (u.status !== "deleted") next.add(u.id);
      }
      return next;
    });
  }

  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function saveCurrentFilter() {
    const name = savedFilterName.trim();
    if (!name) {
      alert("Nhập tên filter để lưu.");
      return;
    }
    const value = { search, role, status, includeDeleted, fuzzy };
    setSavedFilters((prev) => {
      const without = prev.filter((f) => f.name !== name);
      return [...without, { name, value }];
    });
    setSavedFilterName("");
  }

  function applySavedFilter(name: string) {
    const found = savedFilters.find((f) => f.name === name);
    if (!found) return;
    setPage(1);
    setSearch(found.value.search);
    setRole(found.value.role);
    setStatus(found.value.status);
    setIncludeDeleted(found.value.includeDeleted);
    setFuzzy(found.value.fuzzy);
  }

  function deleteSavedFilter(name: string) {
    setSavedFilters((prev) => prev.filter((f) => f.name !== name));
  }

  async function runBulk() {
    if (!accessToken) return;
    if (!can(adminTier, "bulk")) {
      alert("Bạn không có quyền bulk actions.");
      return;
    }
    const userIds = selectedOnPage;
    if (userIds.length === 0) {
      alert("Chưa chọn user nào.");
      return;
    }
    const preview =
      bulkAction === "set_role"
        ? `Set role => ${bulkRole.toUpperCase()} cho ${userIds.length} users`
        : `${bulkAction.toUpperCase()} ${userIds.length} users`;
    const ok = confirmSensitive(`Bulk action:\n${preview}`);
    if (!ok) return;

    setBulkRunning(true);
    try {
      await apiBulkAction({
        userIds,
        action: bulkAction,
        role: bulkAction === "set_role" ? (bulkRole as any) : undefined,
        accessToken,
      });
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        setLastUndo({
          action: bulkAction,
          userIds,
        });
      } else {
        setLastUndo(null);
      }
      setSelectedIds(new Set());
      setPage((p) => p);
      alert("Bulk action thành công.");
    } catch (e: any) {
      alert(`Bulk action thất bại: ${String(e?.message || e)}`);
    } finally {
      setBulkRunning(false);
    }
  }

  async function undoLastBulk() {
    if (!accessToken || !lastUndo) return;
    if (!can(adminTier, "bulk")) return;
    const reverse = lastUndo.action === "activate" ? "deactivate" : "activate";
    const ok = confirmSensitive(
      `Undo bulk: ${lastUndo.action.toUpperCase()} -> ${reverse.toUpperCase()} (${lastUndo.userIds.length} users)`
    );
    if (!ok) return;
    setBulkRunning(true);
    try {
      await apiBulkAction({
        userIds: lastUndo.userIds,
        action: reverse,
        accessToken,
      });
      setLastUndo(null);
      setPage((p) => p);
      alert("Undo thành công.");
    } catch (e: any) {
      alert(`Undo thất bại: ${String(e?.message || e)}`);
    } finally {
      setBulkRunning(false);
    }
  }

  function exportCsv() {
    const rows = displayedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name || "",
      role: u.role || "",
      status: u.status,
      email_verified: u.email_verified ? "yes" : "no",
      last_login: u.last_login || "",
      created_at: u.created_at,
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <button
            type="button"
            className={view === "users" ? "primary-button" : "secondary-button"}
            onClick={() => setView("users")}
          >
            Users
          </button>
          <button
            type="button"
            className={
              view === "audit_logs" ? "primary-button" : "secondary-button"
            }
            onClick={() => setView("audit_logs")}
            disabled={!can(adminTier, "view_audit_logs")}
            title={
              can(adminTier, "view_audit_logs")
                ? "Xem audit logs"
                : "Chỉ Admin/Super Admin được xem audit logs"
            }
          >
            Audit Logs
          </button>
          <div
            style={{
              marginLeft: "auto",
              fontSize: "0.85rem",
              color: "#607489",
            }}
          >
            Quyền: <b>{adminTier === "admin" ? "ADMIN" : "NON-ADMIN"}</b>
          </div>
        </div>

        {view === "audit_logs" ? (
          <AuditLogsPanel
            data={auditQuery.data?.logs ?? []}
            pagination={auditQuery.data?.pagination}
            isLoading={auditQuery.isLoading}
            isError={auditQuery.isError}
            page={auditPage}
            setPage={setAuditPage}
            actorId={auditActorId}
            setActorId={setAuditActorId}
            action={auditAction}
            setAction={setAuditAction}
            from={auditFrom}
            setFrom={setAuditFrom}
            to={auditTo}
            setTo={setAuditTo}
          />
        ) : null}
      </section>

      {view === "users" ? (
        <>
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
          {renderStatCard("Học viên", statistics?.learners ?? 0)}
          {renderStatCard("Giảng viên", statistics?.course_managers ?? 0)}
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

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              color: "#607489",
              userSelect: "none",
            }}
            title="Fuzzy search (client-side, trong trang hiện tại)"
          >
            <input
              type="checkbox"
              checked={fuzzy}
              onChange={(e) => {
                setPage(1);
                setFuzzy(e.target.checked);
              }}
            />
            Fuzzy
          </label>

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
            <option value="learner">Learner</option>
            <option value="course_manager">Course Manager</option>
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
            <option value="deleted">Deleted</option>
          </select>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              color: "#607489",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setPage(1);
                setIncludeDeleted(e.target.checked);
              }}
            />
            Include deleted
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={exportCsv}
          >
            EXPORT
          </button>
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <input
            className="form-input"
            placeholder="Tên saved filter..."
            value={savedFilterName}
            onChange={(e) => setSavedFilterName(e.target.value)}
            style={{ width: 220 }}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={saveCurrentFilter}
          >
            Save filter
          </button>

          {savedFilters.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {savedFilters
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((f) => (
                  <div
                    key={f.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.2rem 0.45rem",
                      borderRadius: 999,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "#fff",
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => applySavedFilter(f.name)}
                      style={{ padding: "0.25rem 0.55rem" }}
                      title="Apply filter"
                    >
                      {f.name}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => deleteSavedFilter(f.name)}
                      style={{ padding: "0.25rem 0.55rem" }}
                      title="Delete filter"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Chưa có saved filters.
            </div>
          )}
        </div>
      </section>

      <section>
        <div
          style={{
            marginBottom: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.75rem",
            borderRadius: 12,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#607489" }}>
            Selected: <b>{selectedOnPage.length}</b> (trên trang hiện tại)
          </div>

          <select
            className="form-input"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as any)}
            disabled={!can(adminTier, "bulk") || bulkRunning}
            style={{ width: 160 }}
            title="Bulk action"
          >
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="set_role">Set role</option>
          </select>

          {bulkAction === "set_role" ? (
            <select
              className="form-input"
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as RoleFilter)}
              disabled={!can(adminTier, "bulk") || bulkRunning}
              style={{ width: 160 }}
              title="Role"
            >
              <option value="learner">Learner</option>
              <option value="course_manager">Course Manager</option>
              <option value="admin">Admin</option>
            </select>
          ) : null}

          <button
            type="button"
            className="secondary-button"
            onClick={runBulk}
            disabled={!can(adminTier, "bulk") || bulkRunning || selectedOnPage.length === 0}
            title="Preview + apply"
          >
            {bulkRunning ? "Running..." : "Apply bulk"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={undoLastBulk}
            disabled={!can(adminTier, "bulk") || bulkRunning || !lastUndo}
            title="Undo (chỉ activate/deactivate)"
          >
            Undo
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedOnPage.length === 0 || bulkRunning}
          >
            Clear selection
          </button>
        </div>

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
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    disabled={displayedUsers.length === 0}
                    title="Select all on this page"
                  />
                </th>
                <th style={thStyle}>USER</th>
                <th style={thStyle}>EMAIL</th>
                <th style={thStyle}>VAI TRÒ</th>
                <th style={thStyle}>TRẠNG THÁI</th>
                <th style={thStyle}>LẦN ĐĂNG NHẬP CUỐI</th>
                <th style={thStyle}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    Không thể tải danh sách người dùng. Vui lòng thử lại.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && users.length === 0 && (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    Không có người dùng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
              {displayedUsers.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  adminTier={adminTier}
                  selected={selectedIds.has(u.id)}
                  onToggleSelected={(checked) => toggleOne(u.id, checked)}
                  onResetPassword={() => handleResetPassword(u)}
                  onChangeRole={(r) => handleUpdateRole(u, r)}
                  onChangeStatus={(s) => handleUpdateStatus(u, s)}
                  onSoftDelete={() => handleSoftDelete(u)}
                  onRestore={() => handleRestore(u)}
                  onHardDelete={() => handleHardDelete(u)}
                />
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
        </>
      ) : null}
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

function UserRow({
  user,
  adminTier,
  selected,
  onToggleSelected,
  onResetPassword,
  onChangeRole,
  onChangeStatus,
  onSoftDelete,
  onRestore,
  onHardDelete,
}: {
  user: AdminUser;
  adminTier: AdminTier;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onResetPassword: () => void;
  onChangeRole: (role: RoleFilter) => void;
  onChangeStatus: (status: Exclude<StatusFilter, "all" | "deleted">) => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const roleLabel = toTitleCase(user.role || "unknown");

  const statusColor =
    user.status === "active"
      ? "#22c55e"
      : user.status === "pending"
      ? "#eab308"
      : user.status === "deleted"
      ? "#94a3b8"
      : "#ef4444";

  const statusText =
    user.status === "active"
      ? "Active"
      : user.status === "pending"
      ? "Pending"
      : user.status === "deleted"
      ? "Deleted"
      : "Banned";

  return (
    <tr>
      <td style={tdStyle}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelected(e.target.checked)}
          disabled={user.status === "deleted"}
        />
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
      <td style={tdStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onResetPassword}
            disabled={!can(adminTier, "reset_password") || user.status === "deleted"}
            title="Reset password (rate-limited)"
          >
            Reset pass
          </button>

          <select
            className="form-input"
            value={user.role || "learner"}
            onChange={(e) => onChangeRole(e.target.value as RoleFilter)}
            disabled={!can(adminTier, "change_role") || user.status === "deleted"}
            style={{ width: 130 }}
            title="Đổi role"
          >
            <option value="learner">Learner</option>
            <option value="course_manager">Course Manager</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className="form-input"
            value={user.status === "deleted" ? "banned" : user.status}
            onChange={(e) =>
              onChangeStatus(
                e.target.value as Exclude<StatusFilter, "all" | "deleted">
              )
            }
            disabled={!can(adminTier, "change_status") || user.status === "deleted"}
            style={{ width: 130 }}
            title="Đổi trạng thái"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
          </select>

          {user.status !== "deleted" ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onSoftDelete}
              disabled={!can(adminTier, "soft_delete")}
              title="Soft delete"
            >
              Soft delete
            </button>
          ) : (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={onRestore}
                disabled={!can(adminTier, "restore")}
                title="Restore"
              >
                Restore
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function getAdminTierFromUser(user: any): AdminTier {
  const roles: string[] = [
    user?.primary_role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]
    .filter(Boolean)
    .map((r: string) => String(r).toLowerCase());

  if (roles.includes("admin")) return "admin";
  return "non_admin";
}

function can(tier: AdminTier, action: string): boolean {
  if (tier !== "admin") return false;
  return action !== "hard_delete";
}

function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function fuzzyMatch(hay: string, needle: string): boolean {
  // Simple subsequence match: "mbr" matches "mindbridge"
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
  ];
  return lines.join("\n");
}

function confirmSensitive(message: string): boolean {
  return window.confirm(`${message}\n\nBạn có chắc chắn muốn thực hiện?`);
}

function confirmTyped(message: string, expected: string): boolean {
  const input = window.prompt(`${message}\n\nNhập "${expected}" để xác nhận:`, "");
  return (input || "").trim().toUpperCase() === expected.toUpperCase();
}

function AuditLogsPanel(props: {
  data: AuditLogItem[];
  pagination:
    | { total: number; page: number; limit: number; pages: number }
    | undefined;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (n: number | ((p: number) => number)) => void;
  actorId: string;
  setActorId: (s: string) => void;
  action: string;
  setAction: (s: string) => void;
  from: string;
  setFrom: (s: string) => void;
  to: string;
  setTo: (s: string) => void;
}) {
  const {
    data,
    pagination,
    isLoading,
    isError,
    page,
    setPage,
    actorId,
    setActorId,
    action,
    setAction,
    from,
    setFrom,
    to,
    setTo,
  } = props;

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "#1f2933",
          marginBottom: "0.75rem",
        }}
      >
        🧾 Audit Logs
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <input
          className="form-input"
          style={{ width: 160 }}
          placeholder="actor_user_id"
          value={actorId}
          onChange={(e) => {
            setPage(1);
            setActorId(e.target.value);
          }}
        />
        <input
          className="form-input"
          style={{ width: 240 }}
          placeholder="action (e.g. user_reset_password)"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        />
        <input
          className="form-input"
          type="datetime-local"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
          title="From"
        />
        <input
          className="form-input"
          type="datetime-local"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
          title="To"
        />
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
              <th style={thStyle}>TIME</th>
              <th style={thStyle}>ACTOR</th>
              <th style={thStyle}>ACTION</th>
              <th style={thStyle}>TARGET</th>
              <th style={thStyle}>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={emptyCellStyle}>
                  Đang tải audit logs...
                </td>
              </tr>
            )}
            {isError && !isLoading && (
              <tr>
                <td colSpan={5} style={emptyCellStyle}>
                  Không thể tải audit logs.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data.length === 0 && (
              <tr>
                <td colSpan={5} style={emptyCellStyle}>
                  Không có log nào.
                </td>
              </tr>
            )}
            {data.map((l) => (
              <tr key={l.id}>
                <td style={tdStyle}>
                  {new Date(l.created_at).toLocaleString("vi-VN")}
                </td>
                <td style={tdStyle}>#{l.actor_user_id}</td>
                <td style={tdStyle}>{l.action}</td>
                <td style={tdStyle}>
                  {l.target_user_id ? `#${l.target_user_id}` : "—"}
                </td>
                <td style={tdStyle}>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxWidth: 520,
                      fontSize: "0.75rem",
                      color: "#475569",
                    }}
                  >
                    {JSON.stringify(l.metadata || {}, null, 2)}
                  </pre>
                </td>
              </tr>
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

        <div style={{ fontSize: "0.8rem", color: "#607489" }}>
          Trang {page} / {pagination?.pages ?? 1}
        </div>
      </div>
    </section>
  );
}
