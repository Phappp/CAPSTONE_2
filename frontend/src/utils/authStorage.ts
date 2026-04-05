export function getAccessToken(): string | null {
  const raw = window.localStorage.getItem("auth") || window.sessionStorage.getItem("auth");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

