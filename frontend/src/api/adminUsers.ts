export const ADMIN_USERS_API_BASE = "/api/v1/admin/users";

export const ADMIN_USERS_API = {
  list: ADMIN_USERS_API_BASE,
  updateStatus: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/status`,
  updateRole: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/role`,
} as const;
