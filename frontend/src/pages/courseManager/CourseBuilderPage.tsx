import { useNavigate } from "react-router-dom";
import TeacherShell from "../../components/TeacherShell";
import "./CourseBuilderPage.css";

export default function CourseBuilderPage() {
  const navigate = useNavigate();

  return (
    <TeacherShell activeNav="courses" showFab={false}>
      <div className="cb-page">
        <button
          type="button"
          className="cb-back-btn"
          onClick={() => navigate("/teacher/courses")}
          aria-label="Back to Course Manager"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Courses
        </button>

        <header className="cb-header">
          <div className="cb-header-left">
            <nav className="cb-breadcrumb">
              <span className="cb-breadcrumb-link">Courses</span>
              <span>/</span>
              <span>Course Builder</span>
            </nav>
            <h1 className="cb-title">Advanced Machine Learning</h1>
          </div>
          <div className="cb-actions">
            <button type="button" className="cb-btn cb-btn--ghost">
              Save Draft
            </button>
            <button type="button" className="cb-btn cb-btn--primary">
              <span className="material-symbols-outlined">publish</span>
              Publish Course
            </button>
          </div>
        </header>

        {/* Dashboard Layout: 3 Columns Asymmetric */}
        <div className="cb-grid">
          {/* Left Column: Media Library */}
          <div className="cb-grid__media">
            <div className="cb-card cb-media">
              <div className="cb-card__head cb-media__header">
                <h3 className="cb-card__title">Media Library</h3>
                <button type="button" className="cb-media__upload-btn">
                  <span className="material-symbols-outlined">upload</span>
                </button>
              </div>
              <div className="cb-media__content">
                <div className="cb-media__item">
                  <span className="material-symbols-outlined cb-media__icon--video">video_library</span>
                  <div className="cb-media__info">
                    <p className="cb-media__name">intro_lecture.mp4</p>
                    <p className="cb-media__size">12.5 MB</p>
                  </div>
                </div>
                <div className="cb-media__item">
                  <span className="material-symbols-outlined cb-media__icon--pdf">picture_as_pdf</span>
                  <div className="cb-media__info">
                    <p className="cb-media__name">reading_guide.pdf</p>
                    <p className="cb-media__size">2.1 MB</p>
                  </div>
                </div>
                <div className="cb-media__item">
                  <span className="material-symbols-outlined cb-media__icon--video">video_library</span>
                  <div className="cb-media__info">
                    <p className="cb-media__name">neural_networks_01.mp4</p>
                    <p className="cb-media__size">45.0 MB</p>
                  </div>
                </div>
                <div className="cb-media__item">
                  <span className="material-symbols-outlined cb-media__icon--csv">description</span>
                  <div className="cb-media__info">
                    <p className="cb-media__name">dataset_v2.csv</p>
                    <p className="cb-media__size">0.8 MB</p>
                  </div>
                </div>
              </div>
              <div className="cb-media__footer">
                <p className="cb-media__tip">Drag items into the syllabus to attach</p>
              </div>
            </div>
          </div>

          {/* Middle Column: Main Editor */}
          <div className="cb-grid__editor">
            {/* Course Details */}
            <div className="cb-card">
              <div className="cb-card__body">
                <h3 className="cb-card__title" style={{ marginBottom: "1rem" }}>Course Info</h3>
                <div className="cb-form">
                  <div className="cb-form__field">
                    <label className="cb-form__label">Course Title</label>
                    <input
                      className="cb-form__input"
                      type="text"
                      defaultValue="Advanced Machine Learning"
                    />
                  </div>
                  <div className="cb-form__field">
                    <label className="cb-form__label">Description</label>
                    <textarea
                      className="cb-form__textarea"
                      rows={4}
                      defaultValue="A comprehensive deep dive into neural architectures, reinforcement learning, and advanced optimization techniques for scalable AI solutions."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus Structure */}
            <div className="cb-card">
              <div className="cb-card__head cb-syllabus__header">
                <div className="cb-syllabus__header-left">
                  <h3 className="cb-card__title">Syllabus Structure</h3>
                  <p>Organize your content into modules and lessons</p>
                </div>
                <button type="button" className="cb-syllabus__add-btn">
                  <span className="material-symbols-outlined">add_circle</span>
                  Add Module
                </button>
              </div>
              <div className="cb-syllabus__content">
                {/* Module 1 */}
                <div className="cb-module">
                  <div className="cb-module__header">
                    <span className="material-symbols-outlined cb-module__drag">drag_indicator</span>
                    <input
                      className="cb-module__title-input"
                      type="text"
                      defaultValue="Module 1: Fundamentals Recap"
                    />
                  </div>
                  <div className="cb-lessons">
                    <div className="cb-lesson">
                      <div className="cb-lesson__info">
                        <span className="material-symbols-outlined cb-lesson__icon cb-lesson__icon--video">smart_display</span>
                        <span className="cb-lesson__title">1.1 Introduction to Advanced ML</span>
                      </div>
                      <div className="cb-lesson__actions">
                        <span className="cb-lesson__badge cb-lesson__badge--video">Video</span>
                        <button type="button" className="cb-lesson__edit-btn">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    </div>
                    <div className="cb-lesson">
                      <div className="cb-lesson__info">
                        <span className="material-symbols-outlined cb-lesson__icon cb-lesson__icon--reading">auto_stories</span>
                        <span className="cb-lesson__title">1.2 Linear Algebra Refresher</span>
                      </div>
                      <div className="cb-lesson__actions">
                        <span className="cb-lesson__badge cb-lesson__badge--reading">Reading</span>
                        <button type="button" className="cb-lesson__edit-btn">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    </div>
                    <button type="button" className="cb-add-lesson-btn">
                      <span className="material-symbols-outlined">add</span>
                      New Lesson
                    </button>
                  </div>
                </div>

                {/* Module 2 */}
                <div className="cb-module">
                  <div className="cb-module__header">
                    <span className="material-symbols-outlined cb-module__drag">drag_indicator</span>
                    <input
                      className="cb-module__title-input"
                      type="text"
                      defaultValue="Module 2: Deep Neural Networks"
                    />
                  </div>
                  <div className="cb-lessons">
                    <div className="cb-lesson">
                      <div className="cb-lesson__info">
                        <span className="material-symbols-outlined cb-lesson__icon cb-lesson__icon--assignment">assignment</span>
                        <span className="cb-lesson__title">2.1 Backpropagation Exercise</span>
                      </div>
                      <div className="cb-lesson__actions">
                        <span className="cb-lesson__badge cb-lesson__badge--assignment">Assignment</span>
                        <button type="button" className="cb-lesson__edit-btn">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    </div>
                    <button type="button" className="cb-add-lesson-btn">
                      <span className="material-symbols-outlined">add</span>
                      New Lesson
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Course Settings */}
          <div className="cb-grid__settings">
            <div className="cb-card cb-settings">
              <div className="cb-card__body">
                <h3 className="cb-settings__title">Course Settings</h3>
                <div className="cb-settings__form">
                  {/* Pricing */}
                  <div className="cb-settings__section">
                    <label className="cb-form__label">Pricing (USD)</label>
                    <div className="cb-price">
                      <span className="cb-price__prefix">$</span>
                      <input
                        className="cb-price__input"
                        type="number"
                        defaultValue="199.00"
                      />
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="cb-settings__section">
                    <label className="cb-form__label">Course Visibility</label>
                    <div className="cb-visibility">
                      <button type="button" className="cb-visibility__btn is-active">Public</button>
                      <button type="button" className="cb-visibility__btn">Private</button>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="cb-settings__section">
                    <label className="cb-form__label">Prerequisites</label>
                    <div className="cb-prereq__list">
                      <div className="cb-prereq__tag">
                        <span className="cb-prereq__name">Python Basics</span>
                        <button type="button" className="cb-prereq__remove">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      <button type="button" className="cb-prereq__add">
                        Add Required Skill
                      </button>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="cb-stats">
                    <div className="cb-stats__row">
                      <span className="cb-stats__label">Total Lessons</span>
                      <span className="cb-stats__value">12</span>
                    </div>
                    <div className="cb-stats__row">
                      <span className="cb-stats__label">Estimated Duration</span>
                      <span className="cb-stats__value">8.5 Hours</span>
                    </div>
                    <div className="cb-stats__row">
                      <span className="cb-stats__label">Target Audience</span>
                      <span className="cb-stats__value">Advanced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Tip */}
            <div className="cb-card cb-tip">
              <div className="cb-tip__inner">
                <div className="cb-tip__header">
                  <span className="material-symbols-outlined cb-tip__icon">lightbulb</span>
                  <h4 className="cb-tip__title">Instructor Tip</h4>
                </div>
                <p className="cb-tip__text">
                  Courses with video content have 3.4x higher engagement. Ensure at least 60% of your lessons are interactive video components.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
