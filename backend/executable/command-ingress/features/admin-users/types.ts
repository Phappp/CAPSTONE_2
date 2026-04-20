export type UserStatusFilter = 'all' | 'active' | 'pending' | 'banned' | 'deleted';

export type UserRoleFilter = 'all' | 'learner' | 'course_manager' | 'admin';

export interface ListUsersQuery {
  page: number;
  limit: number;
  role?: UserRoleFilter;
  status?: UserStatusFilter;
  search?: string;
  joinedFrom?: Date | null;
  joinedTo?: Date | null;
  includeDeleted?: boolean;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'banned' | 'pending';
  reason?: string;
}

export interface UpdateUserRoleRequest {
  role: 'learner' | 'course_manager' | 'admin';
}

export type BulkActionType = 'activate' | 'deactivate' | 'set_role';

export interface BulkUserActionRequest {
  user_ids: number[];
  action: BulkActionType;
  role?: 'learner' | 'course_manager' | 'admin';
}

export interface ListAuditLogsQuery {
  page: number;
  limit: number;
  actor_user_id?: number | null;
  action?: string | null;
  from?: Date | null;
  to?: Date | null;
}

export interface UpdateOpenRouterConfigRequest {
  api_key?: string;
  models?: string[];
  default_model?: string;
}

export interface CreateOpenRouterKeyRequest {
  api_key: string;
  label?: string;
}

export interface UpdateOpenRouterKeyRequest {
  label?: string;
  is_active?: boolean;
  cooldown_minutes?: number;
  clear_cooldown?: boolean;
}

