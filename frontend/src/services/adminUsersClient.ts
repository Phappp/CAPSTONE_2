import { url as API_BASE_URL } from "../baseUrl";
import { ADMIN_USERS_API } from "../api/adminUsers";

export type AdminUserRole = "student" | "instructor" | "admin";
export type AdminUserStatus = "active" | "pending" | "banned";

export type AdminUser = {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
};

export type AdminUsersStatistics = {
  total: number;
  students: number;
  instructors: number;
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
  accessToken: string;
}): Promise<AdminUsersListResponse["data"]> {
  const { page, limit, role, status, search, accessToken } = params;

  const url = new URL(
    `${API_BASE_URL}${ADMIN_USERS_API.list}`,
    window.location.origin
  );

  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (role && role !== "all") url.searchParams.set("role", role);
  if (status && status !== "all") url.searchParams.set("status", status);
  if (search) url.searchParams.set("search", search);

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
  status: AdminUserStatus;
  reason?: string;
  accessToken: string;
}): Promise<void> {
  const { userId, status, reason, accessToken } = params;

  const res = await fetch(
    `${API_BASE_URL}${ADMIN_USERS_API.updateStatus(userId).replace(
      ADMIN_USERS_API_BASE,
      ""
    )}`,
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
    `${API_BASE_URL}${ADMIN_USERS_API.updateRole(userId).replace(
      ADMIN_USERS_API_BASE,
      ""
    )}`,
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

