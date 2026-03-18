export const ADMIN_USERS_API_BASE = "/api/v1/admin/users";

export const ADMIN_USERS_API = {
  list: ADMIN_USERS_API_BASE,
  bulk: `${ADMIN_USERS_API_BASE}/bulk`,
  updateStatus: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/status`,
  updateRole: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/role`,
  resetPassword: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/reset-password`,
  softDelete: (userId: number | string) => `${ADMIN_USERS_API_BASE}/${userId}`,
  restore: (userId: number | string) => `${ADMIN_USERS_API_BASE}/${userId}/restore`,
  hardDelete: (userId: number | string) =>
    `${ADMIN_USERS_API_BASE}/${userId}/hard-delete`,
  auditLogs: `${ADMIN_USERS_API_BASE}/audit-logs`,
} as const;
