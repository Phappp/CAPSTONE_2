import type { LessonResource } from "./types";

export function buildLessonHtmlPayload(title: string, richTextHtml: string): { blob: Blob; filename: string } {
  const safeTitle = (title || "lesson").trim();
  const filename = `${safeTitle.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "lesson"}-notes.html`;
  const normalizedHtml = (richTextHtml || "").trim();
  const documentHtml = `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${safeTitle}</title></head>
<body>${normalizedHtml}</body>
</html>`;
  return {
    blob: new Blob([documentHtml], { type: "text/html" }),
    filename,
  };
}

export function isLikelyVideoResource(r: LessonResource): boolean {
  const mime = (r.mime_type || "").toLowerCase();
  const name = (r.filename || "").toLowerCase();
  const urlLower = (r.url || "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  if (/\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/.test(name)) return true;
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) return true;
  return false;
}

export function isLikelyVideoFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("video/")) return true;
  return /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(file.name || "");
}

export function parseYoutubeVideoId(inputUrl: string): string | null {
  try {
    const u = new URL((inputUrl || "").trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || null;
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function getReviewStatusLabel(status?: LessonResource["review_status"]): { text: string; className: string } {
  if (status === "approved") return { text: "Đã duyệt", className: "approved" };
  if (status === "rejected") return { text: "Từ chối", className: "rejected" };
  return { text: "Chờ duyệt", className: "pending" };
}

export function truncateLabel(text: string, maxLen = 30): string {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}...` : s;
}

export function shuffleBySeed<T>(items: T[], seedRaw: string): T[] {
  const out = [...items];
  let seed = 0;
  for (let i = 0; i < seedRaw.length; i += 1) {
    seed = (seed * 31 + seedRaw.charCodeAt(i)) >>> 0;
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
