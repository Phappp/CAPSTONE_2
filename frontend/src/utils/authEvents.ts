export const SESSION_UNAUTHORIZED_EVENT = "app:session-unauthorized";

type SessionUnauthorizedDetail = {
  url?: string;
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

export function isUnauthorizedMessage(err: unknown): boolean {
  const message = toErrorMessage(err).trim().toLowerCase();
  return message === "unauthorized" || message.includes("401");
}

function isAuthLoginEndpoint(url: string): boolean {
  return url.includes("/api/auth/login");
}

export function emitSessionUnauthorized(detail?: SessionUnauthorizedDetail) {
  const href = detail?.url ?? "";
  if (href && isAuthLoginEndpoint(href)) return;
  window.dispatchEvent(
    new CustomEvent<SessionUnauthorizedDetail>(SESSION_UNAUTHORIZED_EVENT, {
      detail,
    })
  );
}
