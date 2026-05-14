export type LiveSessionStatus = 'scheduled' | 'live' | 'ended';

export type LiveSessionItem = {
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

export type CreateLiveSessionRequest = {
  courseId: number;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
};

export type UpdateLiveSessionRequest = {
  title?: string;
  description?: string | null;
  scheduledAt?: string | null;
};

export type LiveSessionListResult = {
  items: LiveSessionItem[];
  page: number;
  page_size: number;
  total: number;
};

export type LiveSessionListQuery = {
  courseId?: number;
  hostId?: number;
  status?: LiveSessionStatus;
  page?: number;
  page_size?: number;
};

export interface LiveSessionService {
  createSession(hostId: number, request: CreateLiveSessionRequest): Promise<{ id: number }>;
  getSessionById(hostId: number, sessionId: number): Promise<LiveSessionItem>;
  listSessions(query: LiveSessionListQuery): Promise<LiveSessionListResult>;
  updateSession(hostId: number, sessionId: number, request: UpdateLiveSessionRequest): Promise<void>;
  deleteSession(hostId: number, sessionId: number): Promise<void>;
  startSession(hostId: number, sessionId: number): Promise<LiveSessionItem>;
  endSession(hostId: number, sessionId: number): Promise<LiveSessionItem>;
}
