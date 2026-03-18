import { url as API_BASE_URL } from "../baseUrl";
import { ADMIN_USERS_API, ADMIN_USERS_API_BASE } from "../api/adminUsers";

export type AdminUserRole = "learner" | "course_manager" | "admin";
export type AdminUserStatus = "active" | "pending" | "banned" | "deleted";

export type AdminUser = {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AdminUserRole | null;
  status: AdminUserStatus;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
  roles?: string[];
};

export type AdminUsersStatistics = {
  total: number;
  learners: number;
  course_managers: number;
  admins: number;
  pending: number;
  banned: number;
};

export type AdminUsersPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type AdminUsersListResponse = {
  success: boolean;
  data: {
    users: AdminUser[];
    pagination: AdminUsersPagination;
    statistics: AdminUsersStatistics;
  };
};

export async function apiGetAdminUsers(params: {
  page?: number;
  limit?: number;
  role?: AdminUserRole | "all";
  status?: AdminUserStatus | "all";
  search?: string;
  includeDeleted?: boolean;
  accessToken: string;
}): Promise<AdminUsersListResponse["data"]> {
  const { page, limit, role, status, search, includeDeleted, accessToken } =
    params;

  const url = new URL(
    `${API_BASE_URL}${ADMIN_USERS_API.list}`,
    window.location.origin
  );

  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (role && role !== "all") url.searchParams.set("role", role);
  if (status && status !== "all") url.searchParams.set("status", status);
  if (search) url.searchParams.set("search", search);
  if (includeDeleted) url.searchParams.set("include_deleted", "true");

  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json = (await res.json().catch(() => ({}))) as AdminUsersListResponse;

  if (!res.ok || !json.success) {
    const code = (json as any)?.code || "ADMIN_USERS_FETCH_FAILED";
    throw new Error(code);
  }

  return json.data;
}

export async function apiUpdateUserStatus(params: {
  userId: number;
  status: Exclude<AdminUserStatus, "deleted">;
  reason?: string;
  accessToken: string;
}): Promise<void> {
  const { userId, status, reason, accessToken } = params;

  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.updateStatus(userId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status,
        reason: reason || undefined,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as any)?.code || "ADMIN_UPDATE_STATUS_FAILED";
    throw new Error(code);
  }
}

export async function apiUpdateUserRole(params: {
  userId: number;
  role: AdminUserRole;
  accessToken: string;
}): Promise<void> {
  const { userId, role, accessToken } = params;

  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.updateRole(userId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        role,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as any)?.code || "ADMIN_UPDATE_ROLE_FAILED";
    throw new Error(code);
  }
}

export type ResetPasswordResponse = {
  success: boolean;
  data?: { temp_password: string };
};

export async function apiResetUserPassword(params: {
  userId: number;
  accessToken: string;
}): Promise<{ temp_password: string }> {
  const { userId, accessToken } = params;
  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.resetPassword(userId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const json = (await res.json().catch(() => ({}))) as ResetPasswordResponse;
  if (!res.ok || !json.success || !json.data?.temp_password) {
    const code = (json as any)?.code || "ADMIN_RESET_PASSWORD_FAILED";
    throw new Error(code);
  }
  return { temp_password: json.data.temp_password };
}

export async function apiSoftDeleteUser(params: {
  userId: number;
  reason?: string;
  accessToken: string;
}): Promise<void> {
  const { userId, reason, accessToken } = params;
  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.softDelete(userId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason: reason || undefined }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as any)?.code || "ADMIN_SOFT_DELETE_FAILED";
    throw new Error(code);
  }
}

export async function apiRestoreUser(params: {
  userId: number;
  accessToken: string;
}): Promise<void> {
  const { userId, accessToken } = params;
  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.restore(userId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as any)?.code || "ADMIN_RESTORE_FAILED";
    throw new Error(code);
  }
}

export async function apiHardDeleteUser(params: {
  userId: number;
  accessToken: string;
}): Promise<void> {
  const { userId, accessToken } = params;
  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.hardDelete(userId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as any)?.code || "ADMIN_HARD_DELETE_FAILED";
    throw new Error(code);
  }
}

export type AuditLogItem = {
  id: number;
  actor_user_id: number;
  target_user_id: number | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogsResponse = {
  success: boolean;
  data: {
    logs: AuditLogItem[];
    pagination: AdminUsersPagination;
  };
};

export async function apiGetAuditLogs(params: {
  page?: number;
  limit?: number;
  actorUserId?: number;
  action?: string;
  from?: string;
  to?: string;
  accessToken: string;
}): Promise<AuditLogsResponse["data"]> {
  const { page, limit, actorUserId, action, from, to, accessToken } = params;
  const url = new URL(
    `${API_BASE_URL}${ADMIN_USERS_API.auditLogs}`,
    window.location.origin
  );
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (actorUserId) url.searchParams.set("actor_user_id", String(actorUserId));
  if (action) url.searchParams.set("action", action);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as AuditLogsResponse;
  if (!res.ok || !json.success) {
    const code = (json as any)?.code || "ADMIN_AUDIT_LOGS_FETCH_FAILED";
    throw new Error(code);
  }
  return json.data;
}

export type BulkActionType = "activate" | "deactivate" | "set_role";

export async function apiBulkAction(params: {
  userIds: number[];
  action: BulkActionType;
  role?: AdminUserRole;
  accessToken: string;
}): Promise<void> {
  const { userIds, action, role, accessToken } = params;
  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.bulk}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        user_ids: userIds,
        action,
        role: action === "set_role" ? role : undefined,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      (data as any)?.code ||
      "ADMIN_BULK_ACTION_FAILED";
    throw new Error(String(msg));
  }
}

