/**
 * Types cho Discussion feature
 */

// === Discussion Thread Types ===
export type DiscussionStatus = "open" | "resolved";

export type CreateDiscussionRequest = {
  title: string;
  content: string;
};

export type UpdateDiscussionRequest = {
  title?: string;
  content?: string;
  is_pinned?: boolean;
  is_resolved?: boolean;
};

export type DiscussionListQuery = {
  page?: number;
  page_size?: number;
  status?: "all" | DiscussionStatus;
  sort_by?: "created_at" | "reply_count" | "view_count";
  sort_dir?: "asc" | "desc";
};

export type DiscussionListResult = {
  items: DiscussionListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type DiscussionListItem = {
  id: number;
  lesson_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url: string | null;
  user_role: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  is_resolved: boolean;
  view_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
};

export type DiscussionDetail = DiscussionListItem & {
  replies: ReplyListItem[];
};

// === Reply Types ===
export type CreateReplyRequest = {
  content: string;
  parent_reply_id?: number | null;
};

export type ReplyListQuery = {
  page?: number;
  page_size?: number;
};

export type ReplyListResult = {
  items: ReplyListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type ReplyListItem = {
  id: number;
  discussion_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url: string | null;
  user_role: string | null;
  parent_reply_id: number | null;
  content: string;
  is_instructor_reply: boolean;
  created_at: string;
  updated_at: string;
  child_replies?: ReplyListItem[];
};
