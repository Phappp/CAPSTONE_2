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

