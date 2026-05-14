export interface ListUsersDto {
  page?: string;
  limit?: string;
  role?: string;
  status?: string;
  search?: string;
  joined_from?: string;
  joined_to?: string;
  include_deleted?: string;
}

export interface UpdateStatusDto {
  status: string;
  reason?: string;
}

export interface UpdateRoleDto {
  role: string;
}

export interface BulkActionDto {
  user_ids: number[];
  action: string;
  role?: string;
}

export interface ListAuditLogsDto {
  page?: string;
  limit?: string;
  actor_user_id?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface UpdateOpenRouterConfigDto {
  api_key?: string;
  models?: string[];
  default_model?: string;
}

export interface CreateOpenRouterKeyDto {
  api_key: string;
  label?: string;
}

export interface UpdateOpenRouterKeyDto {
  label?: string;
  is_active?: boolean;
  cooldown_minutes?: number;
  clear_cooldown?: boolean;
}

export interface ListCourseManagerVerificationsDto {
  page?: string;
  limit?: string;
  q?: string;
  status?: string;
}

export interface ReviewCourseManagerVerificationDto {
  status: string;
  note?: string;
}

export interface AdminRevenueSummaryDto {
  from?: string;
  to?: string;
}

export interface AdminRevenueByTeacherDto {
  page?: string;
  limit?: string;
  from?: string;
  to?: string;
  search?: string;
}

