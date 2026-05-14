import { url as API_BASE_URL } from "../baseUrl";
import { LIVE_SESSIONS_API } from "../api/liveSessions";
import { AuthUser } from "./authClient";

export type LiveSessionStatus = 'scheduled' | 'live' | 'ended';

export type LiveSession = {
  id: number;
  courseId: number;
  courseTitle?: string;
  title: string;
  description: string | null;
  hostId: number;
  hostName?: string;
  jitsiRoomName: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: LiveSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type LiveSessionListResult = {
  items: LiveSession[];
  page: number;
  page_size: number;
  total: number;
};

export type CreateLiveSessionParams = {
  courseId: number;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
};

export type UpdateLiveSessionParams = {
  title?: string;
  description?: string | null;
  scheduledAt?: string | null;
};

async function fetchWithAuth(url: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.code || "API_ERROR");
  }

  return data;
}

export async function apiCreateLiveSession(
  params: CreateLiveSessionParams,
  token: string | null
): Promise<{ id: number }> {
  return fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.create()}`, {
    method: "POST",
    body: JSON.stringify(params),
  }, token);
}

export async function apiListLiveSessions(
  params: { courseId?: number; status?: LiveSessionStatus; page?: number; page_size?: number } = {},
  token: string | null
): Promise<LiveSessionListResult> {
  const searchParams = new URLSearchParams();
  if (params.courseId) searchParams.set("courseId", String(params.courseId));
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));

  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}${LIVE_SESSIONS_API.list()}${queryString ? `?${queryString}` : ""}`;

  return fetchWithAuth(url, { method: "GET" }, token);
}

export async function apiGetLiveSession(
  sessionId: number,
  token: string | null
): Promise<LiveSession> {
  return fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.get(sessionId)}`, {
    method: "GET",
  }, token);
}

export async function apiUpdateLiveSession(
  sessionId: number,
  params: UpdateLiveSessionParams,
  token: string | null
): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.update(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  }, token);
}

export async function apiDeleteLiveSession(
  sessionId: number,
  token: string | null
): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.delete(sessionId)}`, {
    method: "DELETE",
  }, token);
}

export async function apiStartLiveSession(
  sessionId: number,
  token: string | null
): Promise<LiveSession> {
  return fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.start(sessionId)}`, {
    method: "POST",
  }, token);
}

export async function apiEndLiveSession(
  sessionId: number,
  token: string | null
): Promise<LiveSession> {
  return fetchWithAuth(`${API_BASE_URL}${LIVE_SESSIONS_API.end(sessionId)}`, {
    method: "POST",
  }, token);
}
