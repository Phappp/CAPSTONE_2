export type UserStatusFilter = 'all' | 'active' | 'pending' | 'banned';

export type UserRoleFilter = 'all' | 'student' | 'instructor' | 'admin';

export interface ListUsersQuery {
  page: number;
  limit: number;
  role?: UserRoleFilter;
  status?: UserStatusFilter;
  search?: string;
  joinedFrom?: Date | null;
  joinedTo?: Date | null;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'banned' | 'pending';
  reason?: string;
}

export interface UpdateUserRoleRequest {
  role: 'student' | 'instructor' | 'admin';
}

export type BulkActionType = 'activate' | 'deactivate' | 'set_role';

export interface BulkUserActionRequest {
  user_ids: number[];
  action: BulkActionType;
  role?: 'student' | 'instructor' | 'admin';
}

