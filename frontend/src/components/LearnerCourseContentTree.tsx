import { useEffect, useMemo, useRef, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./LearnerCourseContentTree.css";

type LessonType = "video" | "text";

export type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  order_index: number;
  open_at?: string | null;
};

export type ModuleItem = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  open_at?: string | null;
  order_index: number;
  lessons: LessonItem[];
};

type CourseProgress = {
  course_id: number;
  progress_percent: number;
  completed_lesson_ids: number[];
  unlocked_lesson_ids: number[];
  next_locked_lesson_id: number | null;
};

type LessonHeartbeatDto = {
  lesson_id: number;
  time_spent_seconds: number;
  required_seconds: number;
  can_complete: boolean;
  progress_percent: number;
};

type LessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url?: string | null;
  created_at: string;
};

type ResourceViewerState =
  | { type: "youtube"; youtubeId: string; filename: string; loading: boolean }
  | { type: "lessonText"; filename: string; content: string; loading: boolean }
  | { type: "office"; filename: string; iframeUrl: string; loading: boolean }
  | { type: "pdf" | "text" | "image" | "video" | "other"; blobUrl: string; filename: string; contentType: string; loading: boolean };

function formatDurationSeconds(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad2 = (x: number) => String(x).padStart(2, "0");
  if (h > 0) return `${h}:${pad2(m)}:${pad2(ss)}`;
  return `${m}:${pad2(ss)}`;
}

let ytApiPromise: Promise<void> | null = null;
function ensureYoutubeIframeApiLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      const tick = () => {
        if (w.YT?.Player) resolve();
        else setTimeout(tick, 50);
      };
      tick();
      return;
    }
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.body.appendChild(s);
  });
  return ytApiPromise;
}

async function computeYoutubeDurationSeconds(videoId: string): Promise<number | null> {
  await ensureYoutubeIframeApiLoaded();
  const w = window as any;
  const YT = w.YT;
  if (!YT?.Player) return null;

  return await new Promise<number | null>((resolve) => {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    host.style.top = "-9999px";
    host.style.width = "1px";
    host.style.height = "1px";
    document.body.appendChild(host);

    const player = new YT.Player(host, {
      height: "1",
      width: "1",
      videoId,
      playerVars: { controls: 0, autoplay: 0 },
      events: {
        onReady: () => {
          try {
            const d = Number(player.getDuration?.() ?? 0);
            resolve(Number.isFinite(d) && d > 0 ? d : null);
          } catch {
            resolve(null);
          } finally {
            try {
              player.destroy();
            } catch {
              // ignore
            }
            host.remove();
          }
        },
        onError: () => {
          try {
            player.destroy();
          } catch {
            // ignore
          }
          host.remove();
          resolve(null);
        },
      },
    });
  });
}

function parseYoutubeVideoId(inputUrl: string): string | null {
  try {
    const u = new URL(inputUrl.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || "";
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function formatTimeVi(date: Date): string {
  try {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateTimeVi(date: Date): string {
  try {
    return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function guessViewerKind(args: { contentType: string; filename: string; mimeType: string | null }): ResourceViewerState["type"] {
  const { contentType, filename, mimeType } = args;
  const ct = (contentType || "").toLowerCase();
  const mt = (mimeType || "").toLowerCase();
  const fn = filename.toLowerCase();

  if (ct.includes("application/pdf") || fn.endsWith(".pdf")) return "pdf";
  if (ct.startsWith("image/") || mt.startsWith("image/") || fn.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return "image";
  if (ct.startsWith("video/") || mt.startsWith("video/") || fn.match(/\.(mp4|webm|ogg|mov|m4v|avi)$/)) return "video";
  if (ct.startsWith("text/") || ct.includes("application/json") || fn.match(/\.(txt|md|html|htm)$/)) return "text";
  return "other";
}

function FilePreviewIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="2" width="14" height="20" rx="2" stroke="#60a5fa" strokeWidth="2" />
      <path d="M14 2v6h6" stroke="#60a5fa" strokeWidth="2" />
      <path d="M8 13h8" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 17h6" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResourceViewer({ state, onClose }: { state: ResourceViewerState; onClose: () => void }) {
  const renderContent = () => {
    switch (state.type) {
      case "youtube":
        return (
          <iframe
            title="YouTube player"
            src={`https://www.youtube.com/embed/${state.youtubeId}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            frameBorder={0}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        );
      case "lessonText":
        return (
          <div style={{ padding: 18, color: "#111827", fontWeight: 800, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {state.content ? state.content : "Không có nội dung."}
          </div>
        );
      case "office":
        return (
          <iframe
            title={state.filename}
            src={state.iframeUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
              background: "#fff",
            }}
          />
        );
      case "pdf":
      case "text":
        return (
          <iframe
            src={state.blobUrl}
            title={state.filename}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        );
      case "image":
        return (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={state.blobUrl}
              alt={state.filename}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        );
      case "video":
        return (
          <video
            src={state.blobUrl}
            controls
            autoPlay
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        );
      default:
        return (
          <div className="learnerTreeViewer__download">
            <a href={state.blobUrl} download={state.filename} target="_blank" rel="noreferrer">
              Tải xuống: {state.filename}
            </a>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "100%",
          maxWidth: state.type === "youtube" || state.type === "video" ? 1200 : 1000,
          maxHeight: "90vh",
          background: state.type === "youtube" || state.type === "video" ? "#000" : "#fff",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: state.type === "youtube" || state.type === "video" ? "1px solid #333" : "1px solid #e5e7eb",
            background: state.type === "youtube" || state.type === "video" ? "#111" : "#fff",
            color: state.type === "youtube" || state.type === "video" ? "#fff" : "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontWeight: 600 }}>{state.loading ? "Đang tải..." : state.filename}</span>
          </div>
          <button
            type="button"
            className={state.type === "youtube" || state.type === "video" ? "primary-button" : "secondary-button"}
            style={{
              width: "auto",
              background: state.type === "youtube" || state.type === "video" ? "transparent" : undefined,
              borderColor: state.type === "youtube" || state.type === "video" ? "#333" : undefined,
              color: state.type === "youtube" || state.type === "video" ? "#fff" : undefined,
            }}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        <div
          style={{
            flex: 1,
            // Với iframe absolute (pdf/text/office), cần có chiều cao hữu hình để iframe không bị co về 0.
            minHeight: state.type === "youtube" || state.type === "video" ? 0 : 560,
            position: "relative",
            background: state.type === "youtube" || state.type === "video" ? "#000" : "#fff",
            aspectRatio: state.type === "youtube" || state.type === "video" ? "16/9" : undefined,
          }}
        >
          {state.loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Đang tải...</div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}

export default function LearnerCourseContentTree(props: {
  courseId: number;
  modules: ModuleItem[];
  courseThumbnailUrl?: string | null;
  progress?: CourseProgress | null;
  refreshProgress?: () => Promise<void> | void;
  variant?: "full" | "module-lessons";
}) {
  const { courseId, modules, courseThumbnailUrl, progress, refreshProgress, variant = "full" } = props;
  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);

  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const [resourcesByLessonId, setResourcesByLessonId] = useState<Record<number, LessonResource[]>>({});

  const [viewer, setViewer] = useState<ResourceViewerState | null>(null);
  const viewerRef = useRef<ResourceViewerState | null>(null);

  const [durationByResourceId, setDurationByResourceId] = useState<Record<number, number | null>>({});
  const inFlightDurations = useRef<Set<number>>(new Set());

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const completedSet = useMemo(() => new Set<number>((progress?.completed_lesson_ids || []).map((x) => Number(x))), [progress]);
  const unlockedSet = useMemo(() => new Set<number>((progress?.unlocked_lesson_ids || []).map((x) => Number(x))), [progress]);

  const inFlightResources = useRef<Set<number>>(new Set());
  const inFlightResourcePromises = useRef<Partial<Record<number, Promise<LessonResource[]>>>>({});

  const heartbeatTimerRef = useRef<number | null>(null);
  const completedAttemptedRef = useRef<Set<number>>(new Set());
  const [heartbeat, setHeartbeat] = useState<LessonHeartbeatDto | null>(null);

  // Countdown ring should feel smooth even if the backend heartbeat response is slow.
  // We render using a locally predicted time based on the last heartbeat baseline.
  const [countdownRemainingPct, setCountdownRemainingPct] = useState<number>(100);
  const countdownRequiredSecondsRef = useRef<number>(0);
  const countdownBaselineTimeSpentRef = useRef<number>(0);
  const countdownBaselineAtMsRef = useRef<number>(0);
  const countdownAnimTimerRef = useRef<number | null>(null);

  const syncCountdownBaseline = (data: LessonHeartbeatDto) => {
    const req = Number(data?.required_seconds || 0);
    const spent = Number(data?.time_spent_seconds || 0);
    if (!Number.isFinite(req) || req <= 0) return;
    countdownRequiredSecondsRef.current = req;
    countdownBaselineTimeSpentRef.current = Math.max(0, spent);
    countdownBaselineAtMsRef.current = Date.now();

    const elapsedSeconds = (Date.now() - countdownBaselineAtMsRef.current) / 1000;
    const predictedSpent = countdownBaselineTimeSpentRef.current + elapsedSeconds;
    const remaining = Math.max(0, Math.min(100, (1 - predictedSpent / req) * 100));
    setCountdownRemainingPct(Math.round(remaining * 10) / 10);
  };

  const postHeartbeat = async (lessonId: number, deltaSeconds: number) => {
    const res = await fetch(`${url}${COURSES_API.lessonHeartbeat(courseId, lessonId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ delta_seconds: deltaSeconds }),
    });
    const json = (await res.json().catch(() => ({}))) as Partial<LessonHeartbeatDto> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể cập nhật tiến độ bài học.");
    return json as LessonHeartbeatDto;
  };

  const tryCompleteLesson = async (lessonId: number) => {
    if (completedAttemptedRef.current.has(lessonId)) return;
    completedAttemptedRef.current.add(lessonId);
    try {
      const res = await fetch(`${url}${COURSES_API.completeLesson(courseId, lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<{ message?: string }>;
      if (!res.ok) throw new Error(json?.message || "Không thể hoàn thành bài học.");
      await Promise.resolve(refreshProgress?.());
    } catch (e: any) {
      // If completion fails (not enough time, locked, etc), allow retry later.
      completedAttemptedRef.current.delete(lessonId);
      setResourceError(e?.message || "Không thể hoàn thành bài học.");
    }
  };

  useEffect(() => {
    // Heartbeat only while viewer is open for an unlocked lesson.
    if (!viewer || !selectedLessonId) return;
    if (progress && !unlockedSet.has(selectedLessonId)) return;

    setResourceError(null);
    setHeartbeat(null);
    setCountdownRemainingPct(100);
    countdownRequiredSecondsRef.current = 0;
    countdownBaselineTimeSpentRef.current = 0;
    countdownBaselineAtMsRef.current = Date.now();

    const lessonId = selectedLessonId;
    const tick = async (deltaSeconds: number) => {
      try {
        const data = await postHeartbeat(lessonId, deltaSeconds);
        setHeartbeat(data);
        syncCountdownBaseline(data);
        if (data?.can_complete) {
          void tryCompleteLesson(lessonId);
        }
      } catch (e: any) {
        setResourceError(e?.message || "Không thể cập nhật tiến độ.");
      }
    };

    void tick(1);
    // Update countdown more frequently for smoother UX.
    // Using smaller delta reduces "jumpiness" caused by server round-trips.
    heartbeatTimerRef.current = window.setInterval(() => {
      void tick(3);
    }, 3000);

    return () => {
      if (heartbeatTimerRef.current != null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      // Best-effort final ping.
      void tick(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, selectedLessonId, courseId, token]);

  // Local animation: keep the ring moving based on elapsed time since the last heartbeat baseline.
  // This makes the countdown feel continuous while FE waits for backend responses.
  useEffect(() => {
    if (!viewer || !selectedLessonId) return;
    const req = countdownRequiredSecondsRef.current;
    if (!req || req <= 0) return;

    if (countdownAnimTimerRef.current != null) {
      window.clearInterval(countdownAnimTimerRef.current);
      countdownAnimTimerRef.current = null;
    }

    countdownAnimTimerRef.current = window.setInterval(() => {
      const localReq = countdownRequiredSecondsRef.current;
      if (!localReq || localReq <= 0) return;
      const elapsedSeconds = (Date.now() - countdownBaselineAtMsRef.current) / 1000;
      const predictedSpent = countdownBaselineTimeSpentRef.current + elapsedSeconds;
      const remaining = Math.max(0, Math.min(100, (1 - predictedSpent / localReq) * 100));
      setCountdownRemainingPct(Math.round(remaining * 10) / 10);
    }, 120);

    return () => {
      if (countdownAnimTimerRef.current != null) {
        window.clearInterval(countdownAnimTimerRef.current);
        countdownAnimTimerRef.current = null;
      }
    };
  }, [viewer, selectedLessonId, heartbeat]);

  const fetchLessonResources = async (lessonId: number): Promise<LessonResource[]> => {
    const cached = resourcesByLessonId[lessonId];
    if (cached !== undefined) return cached;
    const inFlightPromise = inFlightResourcePromises.current[lessonId];
    if (inFlightPromise) return inFlightPromise;

    const promise: Promise<LessonResource[]> = (async () => {
      if (inFlightResources.current.has(lessonId)) {
        // Fallback: nếu đang fetch nhưng promise chưa kịp lưu, chờ lần sau.
        await new Promise((r) => setTimeout(r, 50));
        const after = resourcesByLessonId[lessonId];
        return after ?? [];
      }

      inFlightResources.current.add(lessonId);
      try {
        const res = await fetch(`${url}${COURSES_API.listLessonResources(courseId, lessonId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const json = (await res.json().catch(() => ({}))) as Partial<{ items: LessonResource[]; message?: string }>;
        if (!res.ok) throw new Error(json?.message || "Không thể tải tài nguyên bài học.");

        const items = Array.isArray(json.items) ? (json.items as LessonResource[]) : [];
        setResourcesByLessonId((prev) => ({
          ...prev,
          [lessonId]: items,
        }));
        return items;
      } catch (e: any) {
        const msg = e?.message || "Không thể tải tài nguyên bài học.";
        setResourceError(msg);
        return [];
      } finally {
        inFlightResources.current.delete(lessonId);
        delete inFlightResourcePromises.current[lessonId];
      }
    })();

    inFlightResourcePromises.current[lessonId] = promise;
    return await promise;
  };

  const ensureUnlockedLessonResources = async (lessonIds: number[]) => {
    if (!lessonIds.length) return;
    setLoading(true);
    try {
      const concurrency = 4;
      let idx = 0;
      const worker = async () => {
        while (idx < lessonIds.length) {
          const current = lessonIds[idx++];
          if (typeof current !== "number") continue;
          await fetchLessonResources(current).catch(() => {
            // ignore: resource errors are handled per-click; avoid noisy banners for locked/forbidden.
          });
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, lessonIds.length) }, () => worker()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prefetch only unlocked lessons (BE enforces lock; fetching locked lessons would fail).
    const allLessonIds = (modules || []).flatMap((m) => (m.lessons || []).map((l) => l.id));
    const ids =
      progress?.unlocked_lesson_ids?.length
        ? allLessonIds.filter((id) => unlockedSet.has(id))
        : allLessonIds.length
          ? [allLessonIds[0]]
          : [];
    void ensureUnlockedLessonResources(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, progress]);

  const ensureDurationForYoutubeResource = async (resource: LessonResource) => {
    const resId = resource.id;
    if (inFlightDurations.current.has(resId)) return;
    if (durationByResourceId[resId] !== undefined) return;

    const ytId = parseYoutubeVideoId(resource.url || "");
    if (!ytId) return;

    inFlightDurations.current.add(resId);
    try {
      const d = await computeYoutubeDurationSeconds(ytId);
      setDurationByResourceId((prev) => ({ ...prev, [resId]: d }));
    } catch {
      setDurationByResourceId((prev) => ({ ...prev, [resId]: null }));
    } finally {
      inFlightDurations.current.delete(resId);
    }
  };

  useEffect(() => {
    // Khi đã có danh sách resources, chỉ tính duration cho tài nguyên YouTube.
    const pending: LessonResource[] = [];
    for (const lessonIdStr of Object.keys(resourcesByLessonId)) {
      const lessonId = Number(lessonIdStr);
      if (!Number.isFinite(lessonId)) continue;
      const list = resourcesByLessonId[lessonId];
      const latest = list && list.length ? list[0] : null;
      if (!latest) continue;

      const ytId = parseYoutubeVideoId(latest.url || "");
      if (!ytId) continue;
      if (durationByResourceId[latest.id] !== undefined) continue;
      pending.push(latest);
    }

    if (!pending.length) return;
    void Promise.all(pending.map((r) => ensureDurationForYoutubeResource(r)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesByLessonId, durationByResourceId]);

  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount.
      const current = viewerRef.current;
      if (current && current.type !== "youtube" && "blobUrl" in current && current.blobUrl) {
        try {
          URL.revokeObjectURL(current.blobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const closeViewer = () => {
    setViewer((prev) => {
      if (prev && prev.type !== "youtube" && "blobUrl" in prev && prev.blobUrl) {
        try {
          URL.revokeObjectURL(prev.blobUrl);
        } catch {
          // ignore
        }
      }
      return null;
    });
  };

  const openResource = async (resource: LessonResource) => {
    const filename = resource.filename || "Tài nguyên";

    const ytId = parseYoutubeVideoId(resource.url || "");
    if (ytId) {
      setViewer({ type: "youtube", youtubeId: ytId, filename, loading: false });
      return;
    }

    // Docx/doc: sử dụng Office Online Viewer để xem trực tiếp trong iframe.
    // Lưu ý: cần URL truy cập được công khai (hoặc signed URL) từ BE cho resource.url.
    const fnLower = filename.toLowerCase();
    const mimeLower = (resource.mime_type || "").toLowerCase();
    const isDoc =
      fnLower.endsWith(".doc") ||
      fnLower.endsWith(".docx") ||
      mimeLower.includes("wordprocessingml") ||
      mimeLower === "application/msword";
    if (isDoc) {
      const srcUrl = resource.url || "";
      if (srcUrl) {
        const iframeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(srcUrl)}`;
        setViewer({ type: "office", filename, iframeUrl, loading: false });
        return;
      }
    }

    setViewer({ type: "other", blobUrl: "", filename, contentType: "", loading: true });
    try {
      const viewRes = await fetch(`${url}${COURSES_API.viewLessonResource(courseId, resource.id)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!viewRes.ok) {
        const data = await viewRes.json().catch(() => ({}));
        throw new Error((data as any)?.message || "Không thể mở tài nguyên.");
      }

      const blob = await viewRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const contentType = viewRes.headers.get("Content-Type") || resource.mime_type || "";
      const kind = guessViewerKind({ contentType, filename, mimeType: resource.mime_type });

      if (kind === "pdf" || kind === "text" || kind === "image" || kind === "video" || kind === "other") {
        setViewer({ type: kind, blobUrl, filename, contentType: contentType || "application/octet-stream", loading: false } as ResourceViewerState);
      } else {
        setViewer({ type: "other", blobUrl, filename, contentType: contentType || "application/octet-stream", loading: false });
      }
    } catch (e: any) {
      setViewer(null);
      setResourceError(e?.message || "Không thể mở tài nguyên.");
    }
  };

  const openLessonFallback = (lesson: LessonItem) => {
    setViewer({
      type: "lessonText",
      filename: lesson.title,
      content: lesson.description || "",
      loading: false,
    });
  };

  return (
    <div className="learnerTreeWrap">
      {resourceError ? <div className="learnerTreeError">{resourceError}</div> : null}
      {loading && !Object.keys(resourcesByLessonId).length ? <div className="learnerTreeLoading">Đang tải nội dung...</div> : null}

      {viewer && heartbeat && heartbeat.required_seconds > 0 ? (
        (() => {
          const isReady = Boolean(heartbeat.can_complete);
          return (
            <div
              className={`learnerTreeCountdown ${isReady ? "learnerTreeCountdown--ready" : ""}`}
              aria-hidden="true"
              style={{ ["--pct" as any]: countdownRemainingPct }}
            >
              <svg className="learnerTreeCountdown__svg" viewBox="0 0 48 48">
                <circle className="learnerTreeCountdown__track" cx="24" cy="24" r="20" />
                <circle className="learnerTreeCountdown__ring" cx="24" cy="24" r="20" />
                <path className="learnerTreeCountdown__tick" d="M16.5 24.5l5.2 5.4L32.5 18.6" />
              </svg>
            </div>
          );
        })()
      ) : null}

      <div className="learnerTree">
        {(modules || []).map((m, moduleIdx) => {
          const isCollapsed = variant === "module-lessons" ? false : Boolean(collapsedModules[m.id]);
          const moduleOpenAt = m.open_at ? new Date(m.open_at) : null;
          const moduleNotOpenedYet = moduleOpenAt && moduleOpenAt.getTime() > Date.now();
          const lessonIds = (m.lessons || []).map((l) => l.id);
          const moduleHasAnyUnlockedLesson = !progress ? moduleIdx === 0 : lessonIds.some((id) => unlockedSet.has(id));
          const moduleLocked = Boolean(moduleNotOpenedYet) || !moduleHasAnyUnlockedLesson;
          const canToggleModule = !moduleLocked && variant !== "module-lessons";
          return (
            <section key={m.id} className="learnerTreeModule">
              {variant === "module-lessons" ? null : (
                <header className="learnerTreeModule__header">
                  <div className="learnerTreeModule__left">
                    <span className="learnerTreeModule__badge">Chương {moduleIdx + 1}</span>
                    <button
                      type="button"
                      className="learnerTreeModule__titleBtn"
                      disabled={!canToggleModule}
                      onClick={() => setCollapsedModules((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                      aria-expanded={!isCollapsed}
                      aria-disabled={!canToggleModule ? "true" : "false"}
                    >
                      {m.title}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="learnerTreeModule__collapseBtn"
                    disabled={!canToggleModule}
                    onClick={() => setCollapsedModules((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                    aria-disabled={!canToggleModule ? "true" : "false"}
                  >
                    {isCollapsed ? "＋" : "−"}
                  </button>
                </header>
              )}

              {!moduleLocked && !isCollapsed ? (
                <div className="learnerTreeLessons">
                  {(m.lessons || []).map((l, lessonIdx) => {
                    const list = resourcesByLessonId[l.id];
                    const latest = list && list.length ? list[0] : null;
                    const hasResource = !!latest;
                    const ytId = latest ? parseYoutubeVideoId(latest.url || "") : null;
                    const isImage =
                      !!latest &&
                      ((latest.mime_type || "").startsWith("image/") ||
                        (latest.filename || "").toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|svg)$/));
                    const thumbSrcFromResource =
                      ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : isImage ? latest?.preview_url || latest?.url : null;
                    const thumbSrc = courseThumbnailUrl || thumbSrcFromResource;
                    const isUnlocked = progress ? unlockedSet.has(l.id) : moduleIdx === 0 && lessonIdx === 0;
                    const isCompleted = completedSet.has(l.id);
                    const isLocked = !isUnlocked;
                    const shouldShowDefaultThumb = !ytId && !isImage && hasResource && !courseThumbnailUrl;
                    const lessonOpenAt = l.open_at ? new Date(l.open_at) : null;
                    const lessonNotOpenedYet = lessonOpenAt && lessonOpenAt.getTime() > Date.now();

                    return (
                      <div
                        key={l.id}
                        className={[
                          "learnerTreeLesson",
                          selectedLessonId === l.id ? "learnerTreeLesson--active" : "",
                          isLocked ? "learnerTreeLesson--locked" : "",
                          isCompleted ? "learnerTreeLesson--completed" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role={isLocked ? "group" : "button"}
                        tabIndex={isLocked ? -1 : 0}
                        aria-disabled={isLocked ? "true" : "false"}
                        onClick={() => {
                          if (isLocked) return;
                          setSelectedLessonId(l.id);
                          if (latest) {
                            void openResource(latest);
                            return;
                          }

                          // Nếu đã fetch xong và lesson không có tài nguyên -> vẫn mở modal hiển thị mô tả/bài học.
                          if (list !== undefined) {
                            openLessonFallback(l);
                            return;
                          }

                          // Nếu chưa fetch xong -> đợi fetch rồi quyết định.
                          void fetchLessonResources(l.id).then((items) => {
                            if (items?.[0]) void openResource(items[0]);
                            else openLessonFallback(l);
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          if (isLocked) return;
                          setSelectedLessonId(l.id);
                          if (latest) {
                            void openResource(latest);
                            return;
                          }
                          if (list !== undefined) {
                            openLessonFallback(l);
                            return;
                          }
                          void fetchLessonResources(l.id).then((items) => {
                            if (items?.[0]) void openResource(items[0]);
                            else openLessonFallback(l);
                          });
                        }}
                      >
                        <div className="learnerTreeLesson__row">
                          <button
                            type="button"
                            className="learnerTreeLesson__thumbBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLocked) return;
                              if (!latest) return;
                              setSelectedLessonId(l.id);
                              void openResource(latest);
                            }}
                            disabled={!latest || isLocked}
                            aria-label={latest ? `Mở tài nguyên: ${latest.filename || l.title}` : `Không có tài nguyên: ${l.title}`}
                          >
                            {thumbSrc ? (
                              <img src={thumbSrc} alt={latest?.filename || l.title} className="learnerTreeLesson__thumb" />
                            ) : (
                              <div className="learnerTreeLesson__thumbPlaceholder">
                                {list === undefined ? <div className="learnerTreeLesson__thumbLoading">...</div> : null}
                                {list !== undefined ? (
                                  <>
                                    {shouldShowDefaultThumb || !hasResource ? <FilePreviewIcon /> : null}
                                  </>
                                ) : null}
                              </div>
                            )}

                            {hasResource && ytId ? (
                              <>
                                <div className="learnerTreeLesson__playOverlay" aria-hidden="true">
                                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                                    <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="#ffffff" />
                                  </svg>
                                </div>
                                {durationByResourceId[latest.id] != null ? (
                                  <div className="learnerTreeLesson__durationPill">
                                    {formatDurationSeconds(durationByResourceId[latest.id])}
                                  </div>
                                ) : null}
                              </>
                            ) : null}
                          </button>

                          <div className="learnerTreeLesson__meta">
                            <div className="learnerTreeLesson__title">
                              <span className="learnerTreeLesson__index">Bài {lessonIdx + 1}</span>
                              <span className="learnerTreeLesson__titleText">{l.title}</span>
                            </div>
                          </div>

                          <div className="learnerTreeLesson__right" aria-hidden="true">
                            {isLocked ? (
                              <span
                                className="learnerTreeLesson__statusPill learnerTreeLesson__statusPill--locked"
                                title={
                                  moduleNotOpenedYet && moduleOpenAt
                                    ? `Mở lúc: ${formatDateTimeVi(moduleOpenAt)}`
                                    : lessonNotOpenedYet && lessonOpenAt
                                      ? `Mở lúc: ${formatDateTimeVi(lessonOpenAt)}`
                                      : undefined
                                }
                              >
                                {moduleNotOpenedYet && moduleOpenAt
                                  ? `Bị khóa (mở ${formatTimeVi(moduleOpenAt)})`
                                  : lessonNotOpenedYet && lessonOpenAt
                                    ? `Bị khóa (mở ${formatTimeVi(lessonOpenAt)})`
                                    : "Bị khóa"}
                              </span>
                            ) : null}
                            {isCompleted ? (
                              <span className="learnerTreeLesson__statusPill learnerTreeLesson__statusPill--completed">Hoàn thành</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {viewer ? <ResourceViewer state={viewer} onClose={closeViewer} /> : null}
    </div>
  );
}

