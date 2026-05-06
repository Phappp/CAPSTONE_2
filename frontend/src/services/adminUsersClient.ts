import { url as API_BASE_URL } from "../baseUrl";
import { ADMIN_USERS_API, ADMIN_USERS_API_BASE } from "../api/adminUsers";
import { COURSES_API } from "../api/courses";

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

export type OpenRouterConfig = {
  models: string[];
  default_model: string | null;
  keys: Array<{
    id: number;
    label: string | null;
    key_preview: string;
    is_active: boolean;
    cooldown_until: string | null;
    error_count: number;
    last_used_at: string | null;
    last_error_at: string | null;
    last_test_status: string | null;
    last_test_message: string | null;
    is_available_now: boolean;
  }>;
  active_available_keys: number;
};

export type PendingReviewCourse = {
  id: number;
  title: string;
  slug: string;
  status: "pending_review" | "draft" | "published" | "archived";
  short_description: string | null;
  updated_at: string;
  created_at: string;
  category?: string | null;
  quality_gate?: {
    ready: boolean;
    issues: string[];
  };
};

export type PendingLessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  resource_kind: "pdf" | "word" | "video" | "youtube" | "other";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url: string | null;
  review_status: "pending" | "approved" | "rejected";
  review_decision?: "add" | "update" | "delete";
  review_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  course_id: number;
  course_title: string;
  lesson_title: string;
  teacher_id: number;
  is_resubmitted?: boolean;
  last_review_decision?: "submit" | "approve" | "reject" | "resubmit" | null;
  last_review_note?: string | null;
  last_reviewed_at?: string | null;
  previous_rejected_reason?: string | null;
};

export type TeacherRejectedLessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  resource_kind: "pdf" | "word" | "video" | "youtube" | "other";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url: string | null;
  review_status: "pending" | "approved" | "rejected";
  review_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  course_id: number;
  course_title: string;
  module_id: number;
  module_title: string;
  lesson_title: string;
  lesson_type: "text" | "video" | "quiz" | "assignment";
  review_event_note: string | null;
  review_event_at: string | null;
};

export type LessonResourceReviewTimelineItem = {
  id: number;
  resource_id: number;
  actor_user_id: number;
  from_status: "pending" | "approved" | "rejected" | null;
  to_status: "pending" | "approved" | "rejected";
  decision: "submit" | "approve" | "reject" | "resubmit";
  note: string | null;
  created_at: string;
};

export type CourseReviewTimelineItem = {
  id: number;
  course_id: number;
  actor_user_id: number;
  from_status: "draft" | "pending_review" | "published" | "archived" | null;
  to_status: "draft" | "pending_review" | "published" | "archived";
  decision: "submit" | "approve" | "reject" | "archive" | "revert_draft";
  note: string | null;
  created_at: string;
};

export type CourseManagerVerification = {
  user_id: number;
  full_name: string;
  email: string;
  status: "pending" | "verified" | "rejected" | "suspended";
  application_note: string | null;
  expertise_areas?: string | null;
  years_experience?: number | null;
  organization_name?: string | null;
  portfolio_url?: string | null;
  certificate_links?: string | null;
  teaching_statement?: string | null;
  checklist_passed?: boolean;
  review_note: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminRevenueSummary = {
  gross_amount: number;
  system_fee_amount: number;
  teacher_net_amount: number;
  paid_orders: number;
  refunded_orders: number;
};

export type AdminRevenueByTeacherItem = {
  teacher_user_id: number;
  teacher_name: string | null;
  teacher_email: string | null;
  gross_amount: number;
  system_fee_amount: number;
  teacher_net_amount: number;
  paid_orders: number;
  refunded_orders: number;
  last_recognized_at: string | null;
};

export async function apiGetPendingReviewCourses(params: {
  accessToken: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<{ items: PendingReviewCourse[]; page: number; page_size: number; total: number }> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("page_size", String(params.pageSize));
  if (params.q?.trim()) q.set("q", params.q.trim());
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminPendingReview}${suffix}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_PENDING_REVIEW_FETCH_FAILED");
  }
  return data as { items: PendingReviewCourse[]; page: number; page_size: number; total: number };
}

export async function apiReviewCourseByAdmin(params: {
  accessToken: string;
  courseId: number;
  decision: "approve" | "reject";
  note?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminReview(params.courseId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      decision: params.decision,
      note: params.note?.trim() || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_COURSE_REVIEW_FAILED");
  }
}

export async function apiGetPendingLessonResources(params: {
  accessToken: string;
  page?: number;
  pageSize?: number;
  q?: string;
  kind?: "pdf" | "word" | "video" | "youtube" | "other" | "all";
  courseId?: number;
}): Promise<{ items: PendingLessonResource[]; page: number; page_size: number; total: number }> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("page_size", String(params.pageSize));
  if (params.q?.trim()) q.set("q", params.q.trim());
  if (params.kind && params.kind !== "all") q.set("kind", params.kind);
  if (params.courseId) q.set("course_id", String(params.courseId));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminPendingLessonResources}${suffix}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_PENDING_RESOURCE_FETCH_FAILED");
  }
  return data as { items: PendingLessonResource[]; page: number; page_size: number; total: number };
}

export async function apiGetMyRejectedLessonResources(params: {
  accessToken: string;
  courseId: number;
}): Promise<{ course_id: number; items: TeacherRejectedLessonResource[] }> {
  const res = await fetch(`${API_BASE_URL}${COURSES_API.myRejectedResources(params.courseId)}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "TEACHER_REJECTED_RESOURCE_FETCH_FAILED");
  }
  return data as { course_id: number; items: TeacherRejectedLessonResource[] };
}

export async function apiReviewLessonResourceByAdmin(params: {
  accessToken: string;
  resourceId: number;
  decision: "approve" | "reject";
  note?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminReviewLessonResource(params.resourceId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      decision: params.decision,
      note: params.note?.trim() || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_RESOURCE_REVIEW_FAILED");
  }
}

export async function apiGetLessonResourceReviewTimeline(params: {
  accessToken: string;
  resourceId: number;
}): Promise<{ resource_id: number; items: LessonResourceReviewTimelineItem[] }> {
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminReviewLessonResourceTimeline(params.resourceId)}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_RESOURCE_REVIEW_TIMELINE_FAILED");
  }
  return data as { resource_id: number; items: LessonResourceReviewTimelineItem[] };
}

export async function apiGetCourseReviewTimeline(params: {
  accessToken: string;
  courseId: number;
}): Promise<{ course_id: number; items: CourseReviewTimelineItem[] }> {
  const res = await fetch(`${API_BASE_URL}${COURSES_API.adminReviewTimeline(params.courseId)}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_COURSE_REVIEW_TIMELINE_FAILED");
  }
  return data as { course_id: number; items: CourseReviewTimelineItem[] };
}

export async function apiGetCourseManagerVerifications(params: {
  accessToken: string;
  page?: number;
  limit?: number;
  q?: string;
  status?: "all" | "pending" | "verified" | "rejected" | "suspended";
}): Promise<{ items: CourseManagerVerification[]; pagination: AdminUsersPagination }> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.q?.trim()) q.set("q", params.q.trim());
  if (params.status && params.status !== "all") q.set("status", params.status);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.courseManagerVerifications}${suffix}`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_CM_VERIFICATIONS_FETCH_FAILED");
  }
  return data.data as { items: CourseManagerVerification[]; pagination: AdminUsersPagination };
}

export async function apiReviewCourseManagerVerification(params: {
  accessToken: string;
  userId: number;
  status: "verified" | "rejected" | "suspended";
  note?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.courseManagerVerificationReview(params.userId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      status: params.status,
      note: params.note?.trim() || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_CM_VERIFICATION_REVIEW_FAILED");
  }
}

export async function apiGetAdminRevenueSummary(params: {
  accessToken: string;
  from?: string;
  to?: string;
}): Promise<AdminRevenueSummary> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.revenueSummary}${suffix}`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_REVENUE_SUMMARY_FAILED");
  }
  return data.data as AdminRevenueSummary;
}

export async function apiGetAdminRevenueByTeacher(params: {
  accessToken: string;
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
}): Promise<{ items: AdminRevenueByTeacherItem[]; pagination: AdminUsersPagination }> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.revenueByTeacher}${suffix}`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error((data as any)?.message || (data as any)?.code || "ADMIN_REVENUE_BY_TEACHER_FAILED");
  }
  return data.data as { items: AdminRevenueByTeacherItem[]; pagination: AdminUsersPagination };
}

export async function apiGetOpenRouterConfig(params: {
  accessToken: string;
}): Promise<OpenRouterConfig> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterConfig}`, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error((data as any)?.code || "ADMIN_OPENROUTER_FETCH_FAILED");
  }
  return data.data as OpenRouterConfig;
}

export async function apiUpdateOpenRouterConfig(params: {
  accessToken: string;
  models: string[];
  defaultModel?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterConfig}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      models: params.models,
      default_model: params.defaultModel || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error((data as any)?.code || "ADMIN_OPENROUTER_UPDATE_FAILED");
  }
}

export async function apiCreateOpenRouterKey(params: {
  accessToken: string;
  apiKey: string;
  label?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterKeys}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      api_key: params.apiKey,
      label: params.label || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error((data as any)?.code || "ADMIN_OPENROUTER_KEY_CREATE_FAILED");
  }
}

export async function apiUpdateOpenRouterKey(params: {
  accessToken: string;
  keyId: number;
  label?: string;
  isActive?: boolean;
  cooldownMinutes?: number;
  clearCooldown?: boolean;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterKeyItem(params.keyId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      label: params.label,
      is_active: params.isActive,
      cooldown_minutes: params.cooldownMinutes,
      clear_cooldown: params.clearCooldown,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error((data as any)?.code || "ADMIN_OPENROUTER_KEY_UPDATE_FAILED");
  }
}

export async function apiDeleteOpenRouterKey(params: {
  accessToken: string;
  keyId: number;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterKeyItem(params.keyId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error((data as any)?.code || "ADMIN_OPENROUTER_KEY_DELETE_FAILED");
  }
}

export async function apiTestOpenRouterKey(params: {
  accessToken: string;
  keyId: number;
}): Promise<{
  ok: boolean;
  status: "ok" | "rate_limited" | "unauthorized" | "network_error" | "unknown_error";
  message: string;
  cooldown_applied_minutes?: number;
}> {
  const res = await fetch(`${API_BASE_URL}${ADMIN_USERS_API.openrouterKeyTest(params.keyId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(
      (data as any)?.message ||
      (data as any)?.error ||
      (data as any)?.code ||
      "ADMIN_OPENROUTER_KEY_TEST_FAILED"
    );
  }
  return data.data;
}

