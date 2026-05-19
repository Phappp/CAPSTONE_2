// API endpoints for Lesson Discussion feature

import { url } from "../baseUrl";

export const DISCUSSIONS_API_BASE = "/api/v1/lessons";

export const DISCUSSIONS_API = {
  // List discussions for a lesson
  list: (lessonId: number | string) => `${DISCUSSIONS_API_BASE}/${lessonId}/discussions`,

  // Create a new discussion
  create: (lessonId: number | string) => `${DISCUSSIONS_API_BASE}/${lessonId}/discussions`,

  // Get discussion detail
  detail: (lessonId: number | string, discussionId: number | string) =>
    `${DISCUSSIONS_API_BASE}/${lessonId}/discussions/${discussionId}`,

  // Update a discussion
  update: (lessonId: number | string, discussionId: number | string) =>
    `${DISCUSSIONS_API_BASE}/${lessonId}/discussions/${discussionId}`,

  // Delete a discussion
  delete: (lessonId: number | string, discussionId: number | string) =>
    `${DISCUSSIONS_API_BASE}/${lessonId}/discussions/${discussionId}`,

  // Create a reply
  createReply: (lessonId: number | string, discussionId: number | string) =>
    `${DISCUSSIONS_API_BASE}/${lessonId}/discussions/${discussionId}/replies`,

  // Delete a reply
  deleteReply: (lessonId: number | string, discussionId: number | string, replyId: number | string) =>
    `${DISCUSSIONS_API_BASE}/${lessonId}/discussions/${discussionId}/replies/${replyId}`,
} as const;

// Types
export type DiscussionStatus = "open" | "resolved";

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

export type DiscussionDetail = DiscussionListItem & {
  replies: ReplyListItem[];
};

export type DiscussionListResponse = {
  success: boolean;
  data: {
    items: DiscussionListItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
};

export type DiscussionDetailResponse = {
  success: boolean;
  data: DiscussionDetail;
};

export type CreateDiscussionRequest = {
  title: string;
  content: string;
};

export type CreateReplyRequest = {
  content: string;
  parent_reply_id?: number | null;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  message?: string;
  data: T;
};

// API functions
const getToken = (): string | null => {
  // Ưu tiên lấy từ sessionStorage (nếu không remember)
  let token = window.sessionStorage.getItem("access_token");
  if (token) return token;
  // Fallback sang localStorage (nếu có remember)
  token = window.localStorage.getItem("access_token");
  return token;
};
const getAuthHeader = (token: string | null): Record<string, string> => {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export async function getDiscussions(
  lessonId: number,
  params?: {
    page?: number;
    page_size?: number;
    status?: "all" | DiscussionStatus;
    sort_by?: "created_at" | "reply_count" | "view_count";
    sort_dir?: "asc" | "desc";
  }
): Promise<DiscussionListResponse | null> {
  const token = getToken();
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_dir) searchParams.set("sort_dir", params.sort_dir);

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `${DISCUSSIONS_API.list(lessonId)}?${queryString}`
    : DISCUSSIONS_API.list(lessonId);

  const res = await fetch(`${url}${endpoint}`, {
    headers: getAuthHeader(token),
  });

  if (!res.ok) {
    console.error("Failed to fetch discussions:", res.status);
    return null;
  }

  return res.json();
}

export async function getDiscussionDetail(
  lessonId: number,
  discussionId: number
): Promise<DiscussionDetailResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.detail(lessonId, discussionId)}`, {
    headers: getAuthHeader(token),
  });

  if (!res.ok) {
    console.error("Failed to fetch discussion detail:", res.status);
    return null;
  }

  return res.json();
}

export async function createDiscussion(
  lessonId: number,
  data: CreateDiscussionRequest
): Promise<ApiSuccessResponse<DiscussionDetail> | ApiErrorResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.create(lessonId)}`, {
    method: "POST",
    headers: {
      ...getAuthHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Không thể tạo thảo luận" }));
    return { success: false, message: error.message };
  }

  return res.json();
}

export async function updateDiscussion(
  lessonId: number,
  discussionId: number,
  data: Partial<CreateDiscussionRequest> & { is_pinned?: boolean; is_resolved?: boolean }
): Promise<ApiSuccessResponse<DiscussionListItem> | ApiErrorResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.update(lessonId, discussionId)}`, {
    method: "PATCH",
    headers: {
      ...getAuthHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Không thể cập nhật thảo luận" }));
    return { success: false, message: error.message };
  }

  return res.json();
}

export async function deleteDiscussion(
  lessonId: number,
  discussionId: number
): Promise<ApiSuccessResponse | ApiErrorResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.delete(lessonId, discussionId)}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Không thể xóa thảo luận" }));
    return { success: false, message: error.message };
  }

  return res.json();
}

export async function createReply(
  lessonId: number,
  discussionId: number,
  data: CreateReplyRequest
): Promise<ApiSuccessResponse<ReplyListItem> | ApiErrorResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.createReply(lessonId, discussionId)}`, {
    method: "POST",
    headers: {
      ...getAuthHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Không thể gửi reply" }));
    return { success: false, message: error.message };
  }

  return res.json();
}

export async function deleteReply(
  lessonId: number,
  discussionId: number,
  replyId: number
): Promise<ApiSuccessResponse | ApiErrorResponse | null> {
  const token = getToken();
  const res = await fetch(`${url}${DISCUSSIONS_API.deleteReply(lessonId, discussionId, replyId)}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Không thể xóa reply" }));
    return { success: false, message: error.message };
  }

  return res.json();
}
