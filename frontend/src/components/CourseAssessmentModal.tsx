import { useEffect } from "react";
import AssignmentEditor from "./AssignmentEditor";
import ManualQuizEditor from "./ManualQuizEditor";
import "./CourseAssessmentModal.css";

export type CourseAssessmentModalTab = "quiz" | "assignment";

type CourseBrief = { id: number; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  tab: CourseAssessmentModalTab;
  onTabChange: (t: CourseAssessmentModalTab) => void;
  courses: CourseBrief[];
  token: string | null;
  loading: boolean;
  quizPanelCourseId: number | null;
  onQuizPanelCourseIdChange: (id: number | null) => void;
  pickedLessonId: number | null;
};

export default function CourseAssessmentModal({
  open,
  onClose,
  tab,
  onTabChange,
  courses,
  token,
  loading,
  quizPanelCourseId,
  onQuizPanelCourseIdChange,
  pickedLessonId,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="course-assessment-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="course-assessment-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-assessment-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="course-assessment-modal-header">
          <div>
            <h2 id="course-assessment-modal-title" className="course-assessment-modal-title">
              Soạn Quizz &amp; bài tập
            </h2>
            <p className="course-assessment-modal-sub">
              Chọn tab bên dưới và bài học trong form. Từ cây nội dung: menu <strong>⋯</strong> trên từng bài hoặc nút bài đầu chương.
            </p>
          </div>
          <button type="button" className="course-assessment-modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="course-assessment-modal-tabs" role="tablist" aria-label="Loại soạn">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "quiz"}
            className={`course-assessment-modal-tab ${tab === "quiz" ? "is-active" : ""}`}
            onClick={() => onTabChange("quiz")}
          >
            Quizz trắc nghiệm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "assignment"}
            className={`course-assessment-modal-tab ${tab === "assignment" ? "is-active" : ""}`}
            onClick={() => onTabChange("assignment")}
          >
            Bài tập
          </button>
        </div>

        <div className="course-assessment-modal-body">
          {tab === "quiz" ? (
            <ManualQuizEditor
              courses={courses}
              token={token}
              loading={loading}
              selectedCourseId={quizPanelCourseId}
              onSelectedCourseIdChange={onQuizPanelCourseIdChange}
              pickedLessonId={pickedLessonId}
            />
          ) : (
            <AssignmentEditor courses={courses} token={token} loading={loading} pickedLessonId={pickedLessonId} />
          )}
        </div>
      </div>
    </div>
  );
}
