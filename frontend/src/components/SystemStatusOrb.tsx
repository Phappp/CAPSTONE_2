import { useEffect, useRef, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import "./SystemStatusOrb.css";

type StatusTone = "idle" | "processing" | "success" | "error" | "offline";

type StatusSnapshot = {
  tone: StatusTone;
  label: string;
  detail: string;
  updatedAt: number;
};

const IDLE_STATUS: StatusSnapshot = { tone: "idle", label: "Ready", detail: "", updatedAt: Date.now() };

export default function SystemStatusOrb() {
  const [status, setStatus] = useState<StatusSnapshot>(IDLE_STATUS);
  const [expanded, setExpanded] = useState(false);
  const pendingRequestCount = useRef(0);

  useEffect(() => {
    if (status.tone === "processing") {
      setExpanded(true);
      return;
    }
    if (status.tone === "idle") {
      const idleCollapse = window.setTimeout(() => setExpanded(false), 500);
      return () => window.clearTimeout(idleCollapse);
    }
    const timeout = window.setTimeout(() => {
      setStatus(IDLE_STATUS);
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const isImportantRequest = (args: Parameters<typeof fetch>): boolean => {
      const [input, init] = args;
      const method = String(init?.method || "GET").toUpperCase();
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
      const normalizedUrl = String(url || "").toLowerCase();

      // Ignore high-frequency background traffic.
      if (normalizedUrl.includes("/api/v1/courses/") && normalizedUrl.includes("/lessons/") && normalizedUrl.endsWith("/progress")) {
        return false;
      }
      if (normalizedUrl.includes("/api/v1/courses/") && normalizedUrl.includes("/lessons/") && normalizedUrl.endsWith("/summary") && method === "GET") {
        return false;
      }

      return true;
    };
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setStatus({
          tone: "offline",
          label: "Offline",
          detail: "",
          updatedAt: Date.now(),
        });
        setExpanded(true);
      }
    };
    window.addEventListener("offline", updateNetworkStatus);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const important = isImportantRequest(args);
      if (important) {
        pendingRequestCount.current += 1;
        setStatus({
          tone: "processing",
          label: "Processing...",
          detail: "",
          updatedAt: Date.now(),
        });
        setExpanded(true);
      }

      try {
        const response = await originalFetch(...args);
        if (important) {
          pendingRequestCount.current = Math.max(0, pendingRequestCount.current - 1);
        }
        if (important && pendingRequestCount.current === 0) {
          if (response.ok) {
            setStatus({
              tone: "success",
              label: "Success",
              detail: "",
              updatedAt: Date.now(),
            });
          } else {
            setStatus({
              tone: "error",
              label: "Error",
              detail: "",
              updatedAt: Date.now(),
            });
          }
        }
        return response;
      } catch (error) {
        if (important) {
          pendingRequestCount.current = Math.max(0, pendingRequestCount.current - 1);
        }
        if (important && pendingRequestCount.current === 0) {
          setStatus({
            tone: "error",
            label: "Error",
            detail: "",
            updatedAt: Date.now(),
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);
  return (
    <div className="status-orb-wrap processing">
      <div className={`status-pill ${expanded ? "expanded" : ""}`} role="status" aria-live="polite">
        {status.tone === "processing" ? (
          <Loader2 size={16} className="status-orb-spin" />
        ) : (
          <span className="status-idle-ring">
            <Activity size={12} className="status-idle-ring-icon" />
          </span>
        )}
        <span className={`status-dot ${status.tone}`}></span>
        <span className="status-pill-label">
          {status.tone === "processing" ? (
            <span className="processing-label">
              <span>Processing</span>
              <span className="wave-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
          ) : (
            status.label
          )}
        </span>
      </div>
    </div>
  );
}

