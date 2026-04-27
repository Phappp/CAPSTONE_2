import type { AuthUser } from "../services/authClient";

const ROLE_PRIORITY = [
  "admin",
  "course_manager",
  "teacher",
  "learner",
  "student",
] as const;

export function normalizeRoles(user: AuthUser | null | undefined): string[] {
  const fromList = (user?.roles ?? [])
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);
  const primary = String(user?.primary_role ?? "").trim().toLowerCase();
  const merged = primary ? [...fromList, primary] : fromList;
  return Array.from(new Set(merged));
}

export function resolvePrimaryRole(user: AuthUser | null | undefined): string {
  const roles = normalizeRoles(user);
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return roles[0] ?? "";
}

export function hasAnyRole(
  user: AuthUser | null | undefined,
  allowedRoles: string[]
): boolean {
  if (!allowedRoles.length) return true;
  const userRoles = normalizeRoles(user);
  const accepted = allowedRoles.map((role) => role.trim().toLowerCase());
  return accepted.some((role) => userRoles.includes(role));
}
