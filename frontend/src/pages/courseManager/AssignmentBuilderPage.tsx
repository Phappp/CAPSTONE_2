import { useNavigate } from "react-router-dom";
import TeacherShell from "../../components/TeacherShell";
import "./AssignmentBuilderPage.css";

export default function AssignmentBuilderPage() {
  const navigate = useNavigate();

  return (
    <TeacherShell activeNav="assignments" showFab={false}>
      <div className="ab-page">
        <button
          type="button"
          className="ab-back-btn"
          onClick={() => navigate("/teacher/courses")}
          aria-label="Back to courses"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Courses
        </button>

        <header className="ab-header">
          <div className="ab-header-left">
            <h1 className="ab-title">Assignment Builder</h1>
            <p className="ab-subtitle">Create comprehensive tasks and define grading parameters with AI assistance.</p>
          </div>
          <div className="ab-actions">
            <button type="button" className="ab-btn ab-btn--ghost">
              Save Draft
            </button>
            <button type="button" className="ab-btn ab-btn--primary">
              Publish Assignment
            </button>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="ab-grid">
          {/* Left Column: Core Content */}
          <div className="ab-grid__main">
            {/* Basic Information Card */}
            <section className="ab-card">
              <h2 className="ab-card__title">
                <span className="material-symbols-outlined">edit_note</span>
                Assignment Details
              </h2>
              <div className="ab-form">
                <div className="ab-form__field">
                  <label className="ab-form__label">Assignment Title</label>
                  <input
                    className="ab-form__input"
                    placeholder="e.g., Advanced Machine Learning Case Study"
                    type="text"
                  />
                </div>
                <div className="ab-form__field">
                  <label className="ab-form__label">Detailed Brief</label>
                  <div className="ab-editor">
                    <div className="ab-editor__toolbar">
                      <button type="button" className="ab-editor__tool">
                        <span className="material-symbols-outlined">format_bold</span>
                      </button>
                      <button type="button" className="ab-editor__tool">
                        <span className="material-symbols-outlined">format_italic</span>
                      </button>
                      <button type="button" className="ab-editor__tool">
                        <span className="material-symbols-outlined">format_list_bulleted</span>
                      </button>
                      <div className="ab-editor__divider"></div>
                      <button type="button" className="ab-editor__tool">
                        <span className="material-symbols-outlined">link</span>
                      </button>
                      <button type="button" className="ab-editor__tool">
                        <span className="material-symbols-outlined">image</span>
                      </button>
                    </div>
                    <textarea
                      className="ab-editor__textarea"
                      placeholder="Define the objectives, requirements, and expected outcomes..."
                      rows={10}
                    ></textarea>
                  </div>
                </div>
              </div>
            </section>

            {/* Upload Zone */}
            <section className="ab-upload">
              <div className="ab-upload__icon">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <h3 className="ab-upload__title">Upload Attachments</h3>
              <p className="ab-upload__desc">Drag and drop supporting documents or datasets here</p>
              <button type="button" className="ab-upload__btn">
                Browse Files
              </button>
            </section>
          </div>

          {/* Right Column: Settings & Config */}
          <div className="ab-grid__sidebar">
            {/* Grading Configuration */}
            <section className="ab-card ab-settings">
              <h2 className="ab-card__title">
                <span className="material-symbols-outlined">settings_suggest</span>
                Grading Configuration
              </h2>
              <div className="ab-form">
                <div className="ab-toggle-row">
                  <div className="ab-toggle-row__text">
                    <p>AI-Assisted Grading</p>
                    <p>Instant feedback & scoring</p>
                  </div>
                  <label className="ab-toggle">
                    <input defaultChecked type="checkbox" />
                    <span className="ab-toggle__slider"></span>
                  </label>
                </div>
                <div className="ab-slider-field">
                  <div className="ab-slider__header">
                    <label className="ab-slider__label">Passing Score</label>
                    <span className="ab-slider__value">75%</span>
                  </div>
                  <input
                    className="ab-slider__input"
                    max="100"
                    min="0"
                    type="range"
                    defaultValue="75"
                  />
                  <div className="ab-slider__labels">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule */}
            <section className="ab-card">
              <h2 className="ab-card__title">
                <span className="material-symbols-outlined">calendar_month</span>
                Schedule
              </h2>
              <div className="ab-form">
                <div className="ab-date-field">
                  <label className="ab-date-field__label">Start Date</label>
                  <div className="ab-date-input-wrapper">
                    <span className="material-symbols-outlined">event_available</span>
                    <input
                      className="ab-date-input"
                      type="datetime-local"
                    />
                  </div>
                </div>
                <div className="ab-date-field">
                  <label className="ab-date-field__label">Due Date</label>
                  <div className="ab-date-input-wrapper">
                    <span className="material-symbols-outlined ab-date-icon--error">event_busy</span>
                    <input
                      className="ab-date-input"
                      type="datetime-local"
                    />
                  </div>
                </div>
                <div className="ab-date-field">
                  <label className="ab-date-field__label">Grace Period</label>
                  <select className="ab-select">
                    <option>None (Hard Deadline)</option>
                    <option>1 Hour</option>
                    <option>24 Hours</option>
                    <option>3 Days</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Preview Card */}
            <div className="ab-preview">
              <div className="ab-preview__bg"></div>
              <img
                alt="Assignment Preview"
                className="ab-preview__image"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNkvFAXFf07mXgul0epbpOx0mKcC4QOKXlJGM_lp1ofy9iM1Ix3RzKtj0aKY0rEUAV-FP5rsTlT76oB4cJ97Q1L5L9IZWXGctCgHjJC7F8H5oQ31xnqUuz-D1EGugOrdgue-BRrTkz_2MZ8W5_NrH92I_kr0UCk9UV9BFpGzehub9Wqkn_oIveMJr1iqN7iaYKceQGIuPy1NX708mgQnOv_FwL31Z90vLIgfXal9ZBYzTVMH30ipqKMrq4UyUARAfpYHxuoRklaQ"
              />
              <div className="ab-preview__overlay">
                <span className="ab-preview__badge">PREVIEW MODE</span>
                <h3 className="ab-preview__title">See how students view this assignment</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
