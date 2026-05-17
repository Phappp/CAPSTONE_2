import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import TeacherShell from "../../components/TeacherShell";
import "./DiscussionBoardManagementPage.css";

/**
 * DiscussionBoardManagementPage
 *
 * Teacher-facing console for monitoring and moderating student discussions.
 *
 * API binding status:
 * - Course selector → wired to COURSES_API.myList (existing backend).
 * - Thread list / AI suggestions / stats → no backend endpoints yet
 *   (no discussion routes found under backend/executable). Rendered from
 *   local fixtures; replace `useFixtures` with real fetch calls once the
 *   discussion service ships. See TODO markers below.
 */

type ThreadStatus = "unanswered" | "ai_answered" | "resolved";

type DiscussionThread = {
  id: string;
  studentName: string;
  studentAvatarUrl?: string;
  postedAt: string;
  unitLabel: string;
  status: ThreadStatus;
  title: string;
  excerpt: string;
  aiSuggestion?: string;
  views: number;
};

type TrendingTopic = {
  id: string;
  label: string;
  posts: number;
  dotColor: string;
};

type ResponseStats = {
  avgResponseHours: number;
  avgResponseDeltaPct: number; // positive = faster
  resolutionPct: number;
  resolutionTrend: "up" | "down" | "flat";
};

type CourseOption = {
  id: number | string;
  title: string;
};

type CourseListResponse = {
  items?: Array<{ id: number | string; title?: string; name?: string }>;
  data?: Array<{ id: number | string; title?: string; name?: string }>;
};

const FIXTURE_THREADS: DiscussionThread[] = [
  {
    id: "t-1",
    studentName: "Marcus Sterling",
    postedAt: "2 hours ago",
    unitLabel: "Unit 4: Variable Fonts",
    status: "unanswered",
    title: "Implementing Variable Fonts in CSS",
    excerpt:
      "I'm having trouble with the 'font-variation-settings' property. Does it always override specific weight declarations, or can they coexist? Specifically looking at how axes transition during animations.",
    views: 14,
  },
  {
    id: "t-2",
    studentName: "Julian Park",
    postedAt: "5 hours ago",
    unitLabel: "Unit 1: Color Theory",
    status: "ai_answered",
    title: "CMYK vs Spot Color for Brand Guides",
    excerpt:
      "When creating a brand identity for a client, should I prioritize CMYK values or defined Pantone colors? I'm worried about color shifting across different print shops.",
    aiSuggestion:
      "The best practice is to define both. Use Pantone for critical brand consistency (like logos) and provide CMYK equivalents for general collateral. Pantone 'Spot' colors ensure identical results regardless of the printer, while CMYK is more cost-effective for large-run digital prints…",
    views: 32,
  },
];

const FIXTURE_TRENDING: TrendingTopic[] = [
  { id: "tr-1", label: "Agile UX Workflow", posts: 24, dotColor: "#14b8a6" },
  { id: "tr-2", label: "Figma Auto-Layout v5", posts: 18, dotColor: "#3b82f6" },
  { id: "tr-3", label: "Accessible Color Palettes", posts: 12, dotColor: "#a855f7" },
];

const FIXTURE_STATS: ResponseStats = {
  avgResponseHours: 4.2,
  avgResponseDeltaPct: 12,
  resolutionPct: 94,
  resolutionTrend: "flat",
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

const DiscussionBoardManagementPage: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [filterStatus, setFilterStatus] =
    useState<"all" | ThreadStatus>("all");
  const [threads] = useState<DiscussionThread[]>(FIXTURE_THREADS);
  const [trending] = useState<TrendingTopic[]>(FIXTURE_TRENDING);
  const [stats] = useState<ResponseStats>(FIXTURE_STATS);

  // Load teacher's courses for the selector — same pattern as TeacherDashboard.
  useEffect(() => {
    let cancelled = false;
    const fetchMyCourses = async () => {
      try {
        const params = new URLSearchParams({
          status: "all",
          page: "1",
          page_size: "50",
          sort_by: "updated_at",
          sort_dir: "desc",
        });
        const res = await fetch(
          `${url}${COURSES_API.myList}?${params.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          },
        );
        const data: CourseListResponse = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const rawList = data?.items ?? data?.data ?? [];
        if (cancelled) return;
        const mapped: CourseOption[] = rawList.map((c) => ({
          id: c.id,
          title: c.title || c.name || `Course #${c.id}`,
        }));
        setCourses(mapped);
        if (mapped.length && !selectedCourseId) {
          setSelectedCourseId(String(mapped[0].id));
        }
      } catch {
        // soft-fail: leave the selector empty; the page still renders.
      }
    };
    void fetchMyCourses();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const filteredThreads = useMemo(() => {
    if (filterStatus === "all") return threads;
    return threads.filter((t) => t.status === filterStatus);
  }, [threads, filterStatus]);

  // TODO(discussion-api): wire to backend mutations once endpoints exist:
  //   - POST /api/v1/courses/:courseId/discussions/:threadId/reply
  //   - POST /api/v1/courses/:courseId/discussions/:threadId/ai-suggestion
  //   - POST /api/v1/courses/:courseId/discussions/:threadId/ai-suggestion/accept
  //   - DELETE /api/v1/courses/:courseId/discussions/:threadId/ai-suggestion
  const handleReply = (threadId: string) => {
    console.info("[Discussions] reply requested", { threadId });
  };
  const handleGenerateAi = (threadId: string) => {
    console.info("[Discussions] AI suggestion requested", { threadId });
  };
  const handleReviewAndPost = (threadId: string) => {
    console.info("[Discussions] review & post AI answer", { threadId });
  };
  const handleEditAi = (threadId: string) => {
    console.info("[Discussions] edit AI answer", { threadId });
  };
  const handleDiscardAi = (threadId: string) => {
    console.info("[Discussions] discard AI answer", { threadId });
  };

  return (
    <TeacherShell activeNav="discussions" showFab={false}>
    <div className="dbm-page">
      <button
        type="button"
        className="dbm-back-btn"
        onClick={() => navigate("/teacher/dashboard")}
        aria-label="Back to Course Manager home"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Course Manager
      </button>
      <header className="dbm-header">
        <div>
          <h1 className="dbm-title">Discussion Management</h1>
          <p className="dbm-subtitle">
            Monitor, engage, and facilitate student conversations with AI
            assistance.
          </p>
        </div>
        <div className="dbm-toolbar">
          <select
            className="dbm-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            aria-label="Select course"
          >
            {courses.length === 0 && (
              <option value="">No courses</option>
            )}
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="dbm-select"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "all" | ThreadStatus)
            }
            aria-label="Filter by status"
            style={{ minWidth: 180 }}
          >
            <option value="all">All statuses</option>
            <option value="unanswered">Unanswered</option>
            <option value="ai_answered">AI suggestion ready</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </header>

      <div className="dbm-layout">
        <section className="dbm-threads" aria-label="Discussion threads">
          {filteredThreads.length === 0 && (
            <div className="dbm-empty">
              <span className="material-symbols-outlined">forum</span>
              <p className="dbm-empty__title">No discussions yet</p>
              <p>Try changing the filter or selecting another course.</p>
            </div>
          )}
          {filteredThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onReply={handleReply}
              onGenerateAi={handleGenerateAi}
              onReviewAndPost={handleReviewAndPost}
              onEditAi={handleEditAi}
              onDiscardAi={handleDiscardAi}
            />
          ))}
        </section>

        <aside className="dbm-aside" aria-label="Insights">
          <ResponseStatsCard stats={stats} />
          <TrendingTopicsCard topics={trending} />
          <InstructorTipCard />
        </aside>
      </div>
    </div>
    </TeacherShell>
  );
};

/* ---------- Sub-components ---------- */

type ThreadCardProps = {
  thread: DiscussionThread;
  onReply: (id: string) => void;
  onGenerateAi: (id: string) => void;
  onReviewAndPost: (id: string) => void;
  onEditAi: (id: string) => void;
  onDiscardAi: (id: string) => void;
};

const ThreadCard: React.FC<ThreadCardProps> = ({
  thread,
  onReply,
  onGenerateAi,
  onReviewAndPost,
  onEditAi,
  onDiscardAi,
}) => {
  const badgeClass =
    thread.status === "unanswered"
      ? "dbm-badge--unanswered"
      : thread.status === "ai_answered"
      ? "dbm-badge--ai"
      : "dbm-badge--resolved";
  const badgeLabel =
    thread.status === "unanswered"
      ? "Unanswered"
      : thread.status === "ai_answered"
      ? "AI Answer Generated"
      : "Resolved";

  return (
    <article className="dbm-thread">
      <div className="dbm-thread__body">
        <div className="dbm-thread__head">
          <div className="dbm-thread__author">
            <div className="dbm-avatar" aria-hidden>
              {thread.studentAvatarUrl ? (
                <img src={thread.studentAvatarUrl} alt="" />
              ) : (
                initialsFrom(thread.studentName)
              )}
            </div>
            <div>
              <h4 className="dbm-thread__author-name">{thread.studentName}</h4>
              <p className="dbm-thread__meta">
                Posted {thread.postedAt} in{" "}
                <span className="dbm-thread__meta-unit">{thread.unitLabel}</span>
              </p>
            </div>
          </div>
          <span className={`dbm-badge ${badgeClass}`}>{badgeLabel}</span>
        </div>
        <h3 className="dbm-thread__title">{thread.title}</h3>
        <p className="dbm-thread__excerpt">{thread.excerpt}</p>
      </div>

      {thread.aiSuggestion && (
        <div className="dbm-ai-suggestion">
          <span
            className="material-symbols-outlined dbm-ai-suggestion__icon"
            aria-hidden
          >
            smart_toy
          </span>
          <div className="dbm-ai-suggestion__label">
            <span className="material-symbols-outlined" aria-hidden>
              auto_awesome
            </span>
            AI-Suggested Answer
          </div>
          <p className="dbm-ai-suggestion__text">"{thread.aiSuggestion}"</p>
        </div>
      )}

      <div className="dbm-thread__footer">
        <div className="dbm-thread__footer-actions">
          {thread.aiSuggestion ? (
            <>
              <button
                type="button"
                className="dbm-btn dbm-btn--teal"
                onClick={() => onReviewAndPost(thread.id)}
              >
                Review &amp; Post
              </button>
              <button
                type="button"
                className="dbm-btn dbm-btn--ghost"
                onClick={() => onEditAi(thread.id)}
              >
                <span className="material-symbols-outlined">edit</span>
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="dbm-btn dbm-btn--primary"
                onClick={() => onReply(thread.id)}
              >
                <span className="material-symbols-outlined">reply</span>
                Reply
              </button>
              <button
                type="button"
                className="dbm-btn dbm-btn--ai"
                onClick={() => onGenerateAi(thread.id)}
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                Generate AI Response
              </button>
            </>
          )}
        </div>
        {thread.aiSuggestion ? (
          <button
            type="button"
            className="dbm-btn--icon danger"
            aria-label="Discard AI suggestion"
            onClick={() => onDiscardAi(thread.id)}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        ) : (
          <span className="dbm-thread__views" aria-label={`${thread.views} views`}>
            <span className="material-symbols-outlined">visibility</span>
            {thread.views} Views
          </span>
        )}
      </div>
    </article>
  );
};

const ResponseStatsCard: React.FC<{ stats: ResponseStats }> = ({ stats }) => {
  const trendIcon =
    stats.resolutionTrend === "up"
      ? "arrow_upward"
      : stats.resolutionTrend === "down"
      ? "arrow_downward"
      : "horizontal_rule";
  const trendLabel =
    stats.resolutionTrend === "up"
      ? "Up"
      : stats.resolutionTrend === "down"
      ? "Down"
      : "Stable";
  return (
    <div className="dbm-card dbm-stats">
      <h3 className="dbm-card__title">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined">monitoring</span>
          Response Stats
        </span>
      </h3>
      <div className="dbm-stats__grid">
        <div className="dbm-stats__cell">
          <p className="dbm-stats__label">Avg Response</p>
          <p className="dbm-stats__value">{stats.avgResponseHours}h</p>
          <p className="dbm-stats__delta">
            <span className="material-symbols-outlined">arrow_upward</span>
            {stats.avgResponseDeltaPct}% faster
          </p>
        </div>
        <div className="dbm-stats__cell">
          <p className="dbm-stats__label">Resolution</p>
          <p className="dbm-stats__value">{stats.resolutionPct}%</p>
          <p
            className={`dbm-stats__delta${
              stats.resolutionTrend === "flat" ? " muted" : ""
            }`}
          >
            <span className="material-symbols-outlined">{trendIcon}</span>
            {trendLabel}
          </p>
        </div>
      </div>
    </div>
  );
};

const TrendingTopicsCard: React.FC<{ topics: TrendingTopic[] }> = ({
  topics,
}) => (
  <div className="dbm-card">
    <h3 className="dbm-card__title">
      Trending Topics
      <span className="dbm-card__title-sub">Last 7 Days</span>
    </h3>
    <div>
      {topics.map((t) => (
        <button key={t.id} type="button" className="dbm-trending__row">
          <span className="dbm-trending__row-left">
            <span
              className="dbm-trending__dot"
              style={{ background: t.dotColor }}
              aria-hidden
            />
            <span className="dbm-trending__label">{t.label}</span>
          </span>
          <span className="dbm-trending__count">{t.posts} posts</span>
        </button>
      ))}
    </div>
  </div>
);

const InstructorTipCard: React.FC = () => (
  <div className="dbm-card dbm-tip">
    <span className="material-symbols-outlined dbm-tip__bg-icon" aria-hidden>
      tips_and_updates
    </span>
    <p className="dbm-tip__label">
      <span className="material-symbols-outlined">lightbulb</span>
      Instructor Tip
    </p>
    <p className="dbm-tip__text">
      For complex technical questions, try{" "}
      <span className="dbm-tip__highlight">Guided Socratic Responses</span>.
      Instead of answering directly, ask leading questions so students can
      discover the solution themselves.
    </p>
  </div>
);

export default DiscussionBoardManagementPage;
