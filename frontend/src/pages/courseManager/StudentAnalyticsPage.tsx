import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import TeacherShell from "../../components/TeacherShell";
import "./StudentAnalyticsPage.css";

/**
 * StudentAnalyticsPage
 *
 * Teacher console for AI-driven student performance & engagement insights.
 *
 * API binding status:
 * - Course selector → COURSES_API.myList (existing).
 * - Risk roster, progress distribution, engagement heatmap →
 *   no analytics endpoints under backend/executable. Rendered from fixtures
 *   with TODO markers for when the analytics service ships.
 */

type RiskLevel = "high" | "medium" | "low";

type RiskRow = {
  id: string;
  name: string;
  course: string;
  avatarUrl?: string;
  engagementPct: number;
  quizAvgPct: number;
  risk: RiskLevel;
};

type ProgressBucket = {
  id: string;
  label: string;
  valuePct: number;
  tone: "low" | "med" | "high";
};

type HeatmapPoint = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  slot: number; // row index
  level: 0 | 1 | 2 | 3 | 4;
  valuePct?: number;
  tooltip?: string;
};

type CourseOption = { id: number | string; title: string };
type CourseListResponse = {
  items?: Array<{ id: number | string; title?: string; name?: string }>;
  data?: Array<{ id: number | string; title?: string; name?: string }>;
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FIXTURE_RISKS: RiskRow[] = [
  {
    id: "r-1",
    name: "Alex Thompson",
    course: "Computer Science II",
    engagementPct: 15,
    quizAvgPct: 42,
    risk: "high",
  },
  {
    id: "r-2",
    name: "Sarah Jenkins",
    course: "Data Ethics 101",
    engagementPct: 58,
    quizAvgPct: 68,
    risk: "medium",
  },
  {
    id: "r-3",
    name: "Marcus Wright",
    course: "Modern Architecture",
    engagementPct: 92,
    quizAvgPct: 95,
    risk: "low",
  },
];

const FIXTURE_PROGRESS: ProgressBucket[] = [
  { id: "p-1", label: "Module 1-3", valuePct: 18, tone: "low" },
  { id: "p-2", label: "Module 4-6", valuePct: 45, tone: "med" },
  { id: "p-3", label: "Module 7-10", valuePct: 37, tone: "high" },
];

// 3 rows × 7 days of heat — design source: HTML mockup.
const FIXTURE_HEATMAP: HeatmapPoint[] = [
  // Slot 0 — 8AM-12PM
  { day: 0, slot: 0, level: 3, valuePct: 84, tooltip: "Mon 8AM · Peak Quiz Activity" },
  { day: 1, slot: 0, level: 1 },
  { day: 2, slot: 0, level: 2 },
  { day: 3, slot: 0, level: 4 },
  { day: 4, slot: 0, level: 3 },
  { day: 5, slot: 0, level: 0 },
  { day: 6, slot: 0, level: 0 },
  // Slot 1 — 12PM-4PM
  { day: 0, slot: 1, level: 2 },
  { day: 1, slot: 1, level: 3 },
  { day: 2, slot: 1, level: 4 },
  { day: 3, slot: 1, level: 3 },
  { day: 4, slot: 1, level: 2 },
  { day: 5, slot: 1, level: 1 },
  { day: 6, slot: 1, level: 0 },
  // Slot 2 — 4PM-8PM
  { day: 0, slot: 2, level: 1 },
  { day: 1, slot: 2, level: 2 },
  { day: 2, slot: 2, level: 3 },
  { day: 3, slot: 2, level: 2 },
  { day: 4, slot: 2, level: 4 },
  { day: 5, slot: 2, level: 2 },
  { day: 6, slot: 2, level: 1 },
];

const HIGH_RISK_COUNT = 12;

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

const StudentAnalyticsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "at_risk">("all");
  const [risks] = useState<RiskRow[]>(FIXTURE_RISKS);
  const [progress] = useState<ProgressBucket[]>(FIXTURE_PROGRESS);
  const [heatmap] = useState<HeatmapPoint[]>(FIXTURE_HEATMAP);

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
        const data: CourseListResponse = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const rawList = data?.items ?? data?.data ?? [];
        const mapped: CourseOption[] = rawList.map((c) => ({
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

  const visibleRisks = useMemo(() => {
    if (filterMode === "at_risk") {
      return risks.filter((r) => r.risk !== "low");
    }
    return risks;
  }, [risks, filterMode]);

  // TODO(analytics-api): wire to backend when endpoints exist:
  //   - GET  /api/v1/courses/:courseId/analytics/risk?filter=
  //   - GET  /api/v1/courses/:courseId/analytics/progress-distribution
  //   - GET  /api/v1/courses/:courseId/analytics/engagement-heatmap?range=7d
  //   - POST /api/v1/messages/batch  (Message at-risk group)
  //   - POST /api/v1/sessions/batch-schedule
  const handleExport = () => {
    console.info("[Analytics] export report", { selectedCourseId });
  };
  const handleAiSync = () => {
    console.info("[Analytics] AI sync", { selectedCourseId });
  };
  const handleMessage = (studentId: string) => {
    console.info("[Analytics] message student", { studentId });
  };
  const handleScheduleOneOnOne = (studentId: string) => {
    console.info("[Analytics] schedule 1:1", { studentId });
  };
  const handleMessageGroup = () => {
    console.info("[Analytics] message at-risk group");
  };
  const handleBatchSchedule = () => {
    console.info("[Analytics] batch schedule 1:1s");
  };
  const handleViewRoster = () => {
    console.info("[Analytics] view full roster", { selectedCourseId });
  };
  const handleFabCreate = () => {
    console.info("[Analytics] FAB create");
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
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            AI Sync
          </button>
        </div>
      </header>

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
          {visibleRisks.length === 0 ? (
            <div className="san-empty">
              <span className="material-symbols-outlined">groups</span>
              <p>No data available.</p>
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
                    onMessage={handleMessage}
                    onSchedule={handleScheduleOneOnOne}
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
              <p className="san-risk-summary__body">
                There are <strong>{HIGH_RISK_COUNT} students</strong> identified
                as high risk this week. Intervention is recommended.
              </p>
              <div className="san-risk-summary__actions">
                <button
                  type="button"
                  className="san-summary-btn san-summary-btn--accent"
                  onClick={handleMessageGroup}
                >
                  <span className="material-symbols-outlined">group</span>
                  Message At-Risk Group
                </button>
                <button
                  type="button"
                  className="san-summary-btn san-summary-btn--outline"
                  onClick={handleBatchSchedule}
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
              <div className="san-dist">
                {progress.map((bucket) => (
                  <div key={bucket.id}>
                    <div className="san-dist__row-head">
                      <span>{bucket.label}</span>
                      <span>{bucket.valuePct}%</span>
                    </div>
                    <div className={`san-dist__bar ${bucket.tone}`}>
                      <span style={{ width: `${bucket.valuePct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
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
                  Student activity logged over the past 7 days across all
                  modules.
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
            <div className="san-heatmap__grid">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="san-heatmap__dayhead">
                  {d}
                </div>
              ))}
              {heatmap.map((cell) => (
                <div
                  key={`${cell.day}-${cell.slot}`}
                  className={`san-heatmap__cell lvl-${cell.level}${
                    cell.valuePct ? " show-value" : ""
                  }`}
                  title={cell.tooltip ?? ""}
                >
                  {cell.valuePct ? `${cell.valuePct}%` : null}
                  {cell.tooltip && (
                    <span className="san-heatmap__cell-tooltip">
                      {cell.tooltip}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        className="san-fab"
        aria-label="Create new"
        onClick={handleFabCreate}
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
    </TeacherShell>
  );
};

const RiskTableRow: React.FC<{
  row: RiskRow;
  onMessage: (id: string) => void;
  onSchedule: (id: string) => void;
}> = ({ row, onMessage, onSchedule }) => {
  const tone = engagementTone(row.engagementPct);
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
            {row.avatarUrl ? (
              <img src={row.avatarUrl} alt="" />
            ) : (
              initialsFrom(row.name)
            )}
          </div>
          <div>
            <div className="san-table__name">{row.name}</div>
            <div className="san-table__course">{row.course}</div>
          </div>
        </div>
      </td>
      <td>
        <div className={`san-progress san-progress--${tone}`}>
          <span style={{ width: `${row.engagementPct}%` }} />
        </div>
        <span className={`san-engagement-label ${tone}`}>
          {engagementLabel(row.engagementPct)}
        </span>
      </td>
      <td style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
        {row.quizAvgPct}%
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
            onClick={() => onMessage(row.id)}
          >
            <span className="material-symbols-outlined">mail</span>
          </button>
          <button
            type="button"
            className="san-icon-btn dark"
            aria-label="Schedule 1:1"
            onClick={() => onSchedule(row.id)}
          >
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

export default StudentAnalyticsPage;
