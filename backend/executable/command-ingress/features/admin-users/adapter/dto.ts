export interface ListUsersDto {
  page?: string;
  limit?: string;
  role?: string;
  status?: string;
  search?: string;
  joined_from?: string;
  joined_to?: string;
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

