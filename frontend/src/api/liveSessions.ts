// API endpoints cho Live Session

export const LIVE_SESSIONS_API_BASE = "/api/v1/live-sessions";

export const LIVE_SESSIONS_API = {
  create: () => `${LIVE_SESSIONS_API_BASE}`,
  list: () => LIVE_SESSIONS_API_BASE,
  get: (id: number | string) => `${LIVE_SESSIONS_API_BASE}/${id}`,
  update: (id: number | string) => `${LIVE_SESSIONS_API_BASE}/${id}`,
  delete: (id: number | string) => `${LIVE_SESSIONS_API_BASE}/${id}`,
  start: (id: number | string) => `${LIVE_SESSIONS_API_BASE}/${id}/start`,
  end: (id: number | string) => `${LIVE_SESSIONS_API_BASE}/${id}/end`,
};
