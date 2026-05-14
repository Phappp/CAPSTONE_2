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

export type CourseManagerVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface CourseManagerVerificationItem {
  user_id: number;
  full_name: string;
  email: string;
  status: CourseManagerVerificationStatus;
  application_note: string | null;
  expertise_areas?: string | null;
  years_experience?: number | null;
  organization_name?: string | null;
  portfolio_url?: string | null;
  certificate_links?: string | null;
  teaching_statement?: string | null;
  checklist_passed: boolean;
  review_note: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListCourseManagerVerificationsQuery {
  page: number;
  limit: number;
  q?: string;
  status?: CourseManagerVerificationStatus | 'all';
}

export interface ReviewCourseManagerVerificationRequest {
  status: Exclude<CourseManagerVerificationStatus, 'pending'>;
  note?: string;
}

export interface AdminRevenueSummaryQuery {
  from?: Date | null;
  to?: Date | null;
}

export interface AdminRevenueSummary {
  gross_amount: number;
  system_fee_amount: number;
  teacher_net_amount: number;
  paid_orders: number;
  refunded_orders: number;
}

export interface AdminRevenueByTeacherQuery {
  page: number;
  limit: number;
  from?: Date | null;
  to?: Date | null;
  search?: string;
}

export interface AdminRevenueByTeacherItem {
  teacher_user_id: number;
  teacher_name: string | null;
  teacher_email: string | null;
  gross_amount: number;
  system_fee_amount: number;
  teacher_net_amount: number;
  paid_orders: number;
  refunded_orders: number;
  last_recognized_at: string | null;
}

export interface AdminRevenueByTeacherResult {
  items: AdminRevenueByTeacherItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

