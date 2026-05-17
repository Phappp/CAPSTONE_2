import { useNavigate } from "react-router-dom";
import TeacherShell from "../../components/TeacherShell";
import "./GradingFeedbackStationPage.css";

export default function GradingFeedbackStationPage() {
  const navigate = useNavigate();

  return (
    <TeacherShell activeNav="grading" showFab={false}>
      <div className="gf-page">
        <button
          type="button"
          className="gf-back-btn"
          onClick={() => navigate("/teacher/courses")}
          aria-label="Back to courses"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>

        <header className="gf-header">
          <div className="gf-header-left">
            <h1 className="gf-title">Grading & Feedback Station</h1>
            <p className="gf-subtitle">
              Assignment: <strong>Responsive Design Architecture</strong> • Student: <strong>Alex Rivera</strong>
            </p>
          </div>
          <div className="gf-actions">
            <span className="gf-status-badge">
              Draft Saved 2m ago
            </span>
            <button type="button" className="gf-icon-btn">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </header>

        <div className="gf-main">
          {/* Left Pane: Student Submission */}
          <div className="gf-submission">
            <div className="gf-submission__head">
              <div className="gf-submission__title">
                <span className="material-symbols-outlined">description</span>
                <span className="gf-submission__filename">rivera_assignment_final.pdf</span>
              </div>
              <div className="gf-submission__tools">
                <button type="button" className="gf-submission__tool">
                  <span className="material-symbols-outlined">zoom_in</span>
                </button>
                <button type="button" className="gf-submission__tool">
                  <span className="material-symbols-outlined">zoom_out</span>
                </button>
                <div className="gf-submission__divider"></div>
                <button type="button" className="gf-submission__tool">
                  <span className="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
            </div>
            <div className="gf-submission__body">
              <div className="gf-submission__doc">
                <h2>Reflective Analysis: User Interface Patterns</h2>
                <p>
                  In this module, I focused on implementing responsive pivots for complex data tables. The primary challenge was maintaining context when shifting from a wide desktop view to a narrow mobile viewport. My approach involved using a card-based transformation for each table row...
                </p>
                <img
                  alt="Interface Design Sample"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqnkwsnJyMckMXfWyj4yuKpob1wY7k3Z9d9Yqx-0QIGQDUiIL-xXgUadIo1szrSCWD6YKIqtoOpZahHUFDqyz-0FsboD0MyO1CzjVuBPEZWCWjSLl-4V9Dj3uggeEt9h1N9jM_mt3n_flJMzKLJox2n7nuU3fLsUjyXbtpA8VHrOtoDmGWWLqvykAxOqwSoqtuOYdat5a_tLarSY1KCn59MWBylA1OrpQZJjwH-9QoMUBdX5PrNQyouc2TcPsD_FHIzbztvxBsbA"
                />
                <p>
                  By utilizing CSS container queries, I ensured that components respond to their container size rather than the global viewport. This "Responsive Pivot" strategy (Module 4) allowed for much cleaner breakpoint logic...
                </p>
                <div className="gf-submission__quote">
                  <p>"The transition between views should feel seamless, prioritize content over chrome."</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Grading Tools */}
          <div className="gf-grading">
            {/* AI Insight Card */}
            <div className="gf-ai-card">
              <div className="gf-ai-card__head">
                <span className="material-symbols-outlined">auto_awesome</span>
                <h3 className="gf-ai-card__title">AI Insight</h3>
              </div>
              <p className="gf-ai-card__body">
                Student successfully applied <strong>Module 4 concepts (Responsive Pivots)</strong> correctly. The reflection shows a deep understanding of container queries versus viewport media queries.
              </p>
            </div>

            {/* Feedback Generator */}
            <div className="gf-feedback-card">
              <div className="gf-feedback-card__head">
                <h3 className="gf-feedback-card__title">Suggested Feedback</h3>
                <button type="button" className="gf-feedback-card__regen">Regenerate</button>
              </div>
              <textarea className="gf-feedback-textarea" defaultValue={`Great job on this assignment, Alex. Your implementation of responsive pivots is technically sound and well-documented. Your understanding of container queries (Module 4) is clearly demonstrated in both the code structure and your reflection.

One area for potential improvement: consider how the typography hierarchy might shift as radically as the layout during these pivots to maintain optimal line-lengths.`} />
            </div>

            {/* Grading Section */}
            <div className="gf-grade-card">
              <div className="gf-grade-grid">
                <div>
                  <label className="gf-grade-field__label">Final Grade</label>
                  <div className="gf-grade-input-wrapper">
                    <input className="gf-grade-input" type="text" defaultValue="92" />
                    <span className="gf-grade-input__suffix">/100</span>
                  </div>
                </div>
                <div>
                  <label className="gf-grade-field__label">Rubric Category</label>
                  <div className="gf-rubric-display">
                    <span>Advanced Mastery</span>
                  </div>
                </div>
              </div>

              <div className="gf-score-breakdown">
                <div className="gf-score-row">
                  <div className="gf-score-row__header">
                    <span>Technical Execution</span>
                    <span>25/25</span>
                  </div>
                  <div className="gf-score-bar">
                    <div className="gf-score-bar__fill"></div>
                  </div>
                </div>
                <div className="gf-score-row">
                  <div className="gf-score-row__header">
                    <span>Conceptual Understanding</span>
                    <span>23/25</span>
                  </div>
                  <div className="gf-score-bar">
                    <div className="gf-score-bar__fill gf-score-bar__fill--partial"></div>
                  </div>
                </div>
              </div>

              <button type="button" className="gf-submit-btn">
                Submit Grade <span className="material-symbols-outlined">send</span>
              </button>
              <button type="button" className="gf-draft-btn">
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
