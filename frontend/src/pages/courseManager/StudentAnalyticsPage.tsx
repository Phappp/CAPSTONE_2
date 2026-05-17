import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import TeacherShell from "../../components/TeacherShell";
import toast from "react-hot-toast";
import "./StudentAnalyticsPage.css";

/**
 * StudentAnalyticsPage
 *
 * Teacher console for AI-driven student performance & engagement insights.
 * 
 * API Endpoints:
 * - GET /api/v1/courses/:courseId/analytics/risk?filter=all|at_risk
 * - GET /api/v1/courses/:courseId/analytics/at-risk-summary
 * - GET /api/v1/courses/:courseId/analytics/progress-distribution
 * - GET /api/v1/courses/:courseId/analytics/engagement-heatmap?days=7
 */

type RiskLevel = "high" | "medium" | "low";

type RiskRow = {
  id: string;
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  course_id: number;
  course_title: string;
  engagement_pct: number;
  quiz_avg_pct: number | null;
  assignment_avg_pct: number | null;
  risk: RiskLevel;
  last_activity_at: string | null;
};

type AtRiskSummary = {
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_enrolled: number;
  at_risk_pct: number;
};

type ProgressBucket = {
  label: string;
  value_count: number;
  value_pct: number;
};

type HeatmapPoint = {
  day: number;
  hour_slot: number;
  activity_count: number;
  level: number;
};

type CourseOption = { id: number | string; title: string };

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = ["0-8h", "8-12h", "12-16h", "16-20h", "20-24h"];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function engagementTone(p: number): "low" | "med" | "high" {
  if (p < 35) return "low";
  if (p < 70) return "med";
  return "high";
}

function engagementLabel(p: number): string {
  if (p < 35) return `${p}% Very Low`;
  if (p < 70) return `${p}% Moderate`;
  if (p < 90) return `${p}% Strong`;
  return `${p}% Exceptional`;
}

function progressTone(pct: number): "low" | "med" | "high" {
  if (pct < 25) return "low";
  if (pct < 75) return "med";
  return "high";
}

const StudentAnalyticsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // State
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "at_risk">("all");
  
  // Data state
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [atRiskSummary, setAtRiskSummary] = useState<AtRiskSummary | null>(null);
  const [progress, setProgress] = useState<ProgressBucket[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses list
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const rawList = data?.items ?? data?.data ?? [];
        const mapped: CourseOption[] = rawList.map((c: any) => ({
          id: c.id,
          title: c.title || c.name || `Course #${c.id}`,
        }));
        setCourses(mapped);
        if (mapped.length && !selectedCourseId) {
          setSelectedCourseId(String(mapped[0].id));
        }
      } catch {
        // soft-fail
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!selectedCourseId || !accessToken) return;
    
    const courseId = Number(selectedCourseId);
    if (isNaN(courseId)) return;

    setDataLoading(true);
    setError(null);

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Fetch all data in parallel
      const [riskRes, summaryRes, progressRes, heatmapRes] = await Promise.all([
        fetch(`${url}/api/v1/courses/${courseId}/analytics/risk?filter=${filterMode}`, { headers }),
        fetch(`${url}/api/v1/courses/${courseId}/analytics/at-risk-summary`, { headers }),
        fetch(`${url}/api/v1/courses/${courseId}/analytics/progress-distribution`, { headers }),
        fetch(`${url}/api/v1/courses/${courseId}/analytics/engagement-heatmap?days=7`, { headers }),
      ]);

      // Parse risk data
      if (riskRes.ok) {
        const riskData = await riskRes.json();
        if (riskData.success) {
          setRisks(riskData.data || []);
        }
      }

      // Parse summary data
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success) {
          setAtRiskSummary(summaryData.data);
        }
      }

      // Parse progress distribution
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData.success) {
          setProgress(progressData.data || []);
        }
      }

      // Parse heatmap
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        if (heatmapData.success) {
          setHeatmap(heatmapData.data || []);
        }
      }
    } catch (err) {
      console.error("[Analytics] fetch error:", err);
      setError("Failed to load analytics data");
    } finally {
      setDataLoading(false);
    }
  }, [selectedCourseId, accessToken, filterMode]);

  // Refetch when course or filter changes
  useEffect(() => {
    if (selectedCourseId) {
      void fetchAnalyticsData();
    }
  }, [fetchAnalyticsData]);

  const visibleRisks = useMemo(() => {
    if (filterMode === "at_risk") {
      return risks.filter((r) => r.risk !== "low");
    }
    return risks;
  }, [risks, filterMode]);

  // Action handlers
  const handleExport = () => {
    toast.success("Exporting report...");
    console.info("[Analytics] export report", { selectedCourseId });
  };

  const handleAiSync = () => {
    toast.success("Syncing with AI analytics...");
    void fetchAnalyticsData();
  };

  const handleMessage = (userId: number) => {
    toast.success(`Opening message composer for user #${userId}...`);
    console.info("[Analytics] message student", { userId });
  };

  const handleScheduleOneOnOne = (userId: number) => {
    toast.success(`Opening scheduler for user #${userId}...`);
    console.info("[Analytics] schedule 1:1", { userId });
  };

  const handleMessageGroup = () => {
    const atRiskUsers = risks.filter(r => r.risk !== "low");
    toast.success(`Opening group message composer for ${atRiskUsers.length} at-risk students...`);
    console.info("[Analytics] message at-risk group", { count: atRiskUsers.length });
  };

  const handleBatchSchedule = () => {
    const atRiskUsers = risks.filter(r => r.risk !== "low");
    toast.success(`Opening batch scheduler for ${atRiskUsers.length} at-risk students...`);
    console.info("[Analytics] batch schedule 1:1s", { count: atRiskUsers.length });
  };

  const handleViewRoster = () => {
    if (selectedCourseId) {
      navigate(`/teacher/courses/${selectedCourseId}`);
    }
  };

  return (
    <TeacherShell activeNav="analytics" showFab={false}>
    <div className="san-page">
      <button
        type="button"
        className="san-back-btn"
        onClick={() => navigate("/teacher/dashboard")}
        aria-label="Back to Course Manager home"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Course Manager
      </button>
      <header className="san-header">
        <div>
          <h1 className="san-title">Student Insights</h1>
          <p className="san-subtitle">
            Real-time AI analysis of student performance and engagement.
          </p>
        </div>
        <div className="san-actions">
          <select
            className="san-btn san-btn--ghost"
            aria-label="Select course"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{ paddingRight: "1.75rem" }}
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
          <button
            type="button"
            className="san-btn san-btn--ghost"
            onClick={handleExport}
          >
            <span className="material-symbols-outlined">download</span>
            Export Report
          </button>
          <button
            type="button"
            className="san-btn san-btn--primary san-btn--ai"
            onClick={handleAiSync}
            disabled={dataLoading}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            AI Sync
          </button>
        </div>
      </header>

      {error && (
        <div className="san-error" style={{ padding: "12px 16px", background: "#fef2f2", borderRadius: 8, marginBottom: 16, color: "#dc2626" }}>
          {error}
        </div>
      )}

      <div className="san-grid">
        <section className="san-card san-grid__risk" aria-label="Student risk analysis">
          <div className="san-card__head">
            <div>
              <p className="san-card__title">Student Risk Analysis</p>
              <p className="san-card__sub">Powered by MindBridge AI</p>
            </div>
            <div className="san-filter-pills" role="tablist">
              <button
                role="tab"
                type="button"
                aria-selected={filterMode === "all"}
                className={`san-pill${filterMode === "all" ? " is-active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                All Students
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={filterMode === "at_risk"}
                className={`san-pill${
                  filterMode === "at_risk" ? " is-active" : ""
                }`}
                onClick={() => setFilterMode("at_risk")}
              >
                At Risk
              </button>
            </div>
          </div>
          {dataLoading ? (
            <div className="san-empty">
              <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>sync</span>
              <p>Loading analytics data...</p>
            </div>
          ) : visibleRisks.length === 0 ? (
            <div className="san-empty">
              <span className="material-symbols-outlined">groups</span>
              <p>No students found.</p>
            </div>
          ) : (
            <table className="san-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Engagement</th>
                  <th>Avg. Quiz</th>
                  <th>Risk Level</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRisks.map((row) => (
                  <RiskTableRow
                    key={row.id}
                    row={row}
                    onMessage={() => handleMessage(row.user_id)}
                    onSchedule={() => handleScheduleOneOnOne(row.user_id)}
                  />
                ))}
              </tbody>
            </table>
          )}
          <div className="san-card__foot">
            <button
              type="button"
              className="san-card__foot-btn"
              onClick={handleViewRoster}
            >
              View Full Class Roster
            </button>
          </div>
        </section>

        <aside className="san-grid__side" aria-label="At-risk summary and progress">
          <div className="san-card san-risk-summary">
            <div className="san-risk-summary__inner">
              <div className="san-risk-summary__head">
                <span className="material-symbols-outlined">warning</span>
                <h3>At-Risk Summary</h3>
              </div>
              {atRiskSummary ? (
                <>
                  <p className="san-risk-summary__body">
                    There are <strong>{atRiskSummary.high_risk_count + atRiskSummary.medium_risk_count} students</strong> identified
                    as at-risk ({atRiskSummary.at_risk_pct}% of {atRiskSummary.total_enrolled} enrolled).
                    {atRiskSummary.high_risk_count > 0 && " High priority intervention recommended."}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <span className="san-risk-badge san-risk-badge--high" style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                      {atRiskSummary.high_risk_count} High
                    </span>
                    <span className="san-risk-badge san-risk-badge--med" style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                      {atRiskSummary.medium_risk_count} Medium
                    </span>
                    <span className="san-risk-badge san-risk-badge--low" style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                      {atRiskSummary.low_risk_count} Low
                    </span>
                  </div>
                </>
              ) : (
                <p className="san-risk-summary__body">
                  Loading summary data...
                </p>
              )}
              <div className="san-risk-summary__actions">
                <button
                  type="button"
                  className="san-summary-btn san-summary-btn--accent"
                  onClick={handleMessageGroup}
                  disabled={!atRiskSummary || (atRiskSummary.high_risk_count + atRiskSummary.medium_risk_count) === 0}
                >
                  <span className="material-symbols-outlined">group</span>
                  Message At-Risk Group
                </button>
                <button
                  type="button"
                  className="san-summary-btn san-summary-btn--outline"
                  onClick={handleBatchSchedule}
                  disabled={!atRiskSummary || (atRiskSummary.high_risk_count + atRiskSummary.medium_risk_count) === 0}
                >
                  <span className="material-symbols-outlined">schedule</span>
                  Batch Schedule 1:1s
                </button>
              </div>
            </div>
          </div>

          <div className="san-card">
            <div className="san-card__head">
              <div>
                <p className="san-card__title">Progress Distribution</p>
                <p className="san-card__sub">Course Completion</p>
              </div>
            </div>
            <div className="san-card__body">
              {dataLoading ? (
                <p style={{ color: "#64748b" }}>Loading...</p>
              ) : progress.length > 0 ? (
                <div className="san-dist">
                  {progress.map((bucket, idx) => (
                    <div key={idx}>
                      <div className="san-dist__row-head">
                        <span>{bucket.label}</span>
                        <span>{bucket.value_pct}% ({bucket.value_count})</span>
                      </div>
                      <div className={`san-dist__bar ${progressTone(bucket.value_pct)}`}>
                        <span style={{ width: `${bucket.value_pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#64748b" }}>No progress data available.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="san-card san-grid__heatmap" aria-label="Engagement heatmap">
          <div className="san-heatmap">
            <div className="san-heatmap__head">
              <div>
                <p className="san-card__title" style={{ marginBottom: 4 }}>
                  Class Engagement Heatmap
                </p>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Student activity logged over the past 7 days across all modules.
                </p>
              </div>
              <div className="san-heatmap__legend" aria-hidden>
                <div className="san-heatmap__legend-item">
                  <span
                    className="san-heatmap__legend-swatch"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  Low
                </div>
                <div className="san-heatmap__legend-item">
                  <span
                    className="san-heatmap__legend-swatch"
                    style={{ background: "#ccfbf1" }}
                  />
                </div>
                <div className="san-heatmap__legend-item">
                  <span
                    className="san-heatmap__legend-swatch"
                    style={{ background: "#5eead4" }}
                  />
                </div>
                <div className="san-heatmap__legend-item">
                  <span
                    className="san-heatmap__legend-swatch"
                    style={{ background: "#14b8a6" }}
                  />
                </div>
                <div className="san-heatmap__legend-item">
                  <span
                    className="san-heatmap__legend-swatch"
                    style={{ background: "#0f766e" }}
                  />
                  High
                </div>
              </div>
            </div>
            <div className="san-heatmap__grid" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
              {DAY_HEADERS.map((d) => (
                <div key={d} className="san-heatmap__dayhead">
                  {d}
                </div>
              ))}
              {heatmap.map((cell) => (
                <div
                  key={`${cell.day}-${cell.hour_slot}`}
                  className={`san-heatmap__cell lvl-${cell.level}`}
                  title={`${DAY_HEADERS[cell.day]} ${TIME_SLOTS[cell.hour_slot]}: ${cell.activity_count} activities`}
                >
                  {cell.activity_count > 0 && (
                    <span style={{ fontSize: 10 }}>{cell.activity_count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
    </TeacherShell>
  );
};

const RiskTableRow: React.FC<{
  row: RiskRow;
  onMessage: () => void;
  onSchedule: () => void;
}> = ({ row, onMessage, onSchedule }) => {
  const tone = engagementTone(row.engagement_pct);
  const riskBadge =
    row.risk === "high"
      ? "san-risk-badge--high"
      : row.risk === "medium"
      ? "san-risk-badge--med"
      : "san-risk-badge--low";
  const riskLabel =
    row.risk === "high"
      ? "High Risk"
      : row.risk === "medium"
      ? "Medium Risk"
      : "Low Risk";

  return (
    <tr>
      <td>
        <div className="san-table__student">
          <div className="san-avatar" aria-hidden>
            {row.avatar_url ? (
              <img src={row.avatar_url} alt="" />
            ) : (
              initialsFrom(row.name)
            )}
          </div>
          <div>
            <div className="san-table__name">{row.name}</div>
            <div className="san-table__course">{row.email}</div>
          </div>
        </div>
      </td>
      <td>
        <div className={`san-progress san-progress--${tone}`}>
          <span style={{ width: `${row.engagement_pct}%` }} />
        </div>
        <span className={`san-engagement-label ${tone}`}>
          {engagementLabel(row.engagement_pct)}
        </span>
      </td>
      <td style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
        {row.quiz_avg_pct !== null ? `${row.quiz_avg_pct.toFixed(1)}%` : "—"}
      </td>
      <td>
        <span className={`san-risk-badge ${riskBadge}`}>{riskLabel}</span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div className="san-row-actions">
          <button
            type="button"
            className="san-icon-btn teal"
            aria-label="Message"
            onClick={onMessage}
          >
            <span className="material-symbols-outlined">mail</span>
          </button>
          <button
            type="button"
            className="san-icon-btn dark"
            aria-label="Schedule 1:1"
            onClick={onSchedule}
          >
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

export default StudentAnalyticsPage;
