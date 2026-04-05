import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { Toaster } from "react-hot-toast";
import CourseContentTreeEditor from "../components/CourseContentTreeEditor";
import "./TeacherCourseContentBuilderPage.css";

export default function TeacherCourseContentBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="dashboard-page">
      <Toaster position="top-right" />

      <div className="content-builder-header">
        <div className="content-builder-title-section">
          <h1 className="dashboard-title">Xây dựng nội dung</h1>
          <p className="dashboard-subtitle">
            Thêm chương/bài học, kéo-thả để sắp xếp. Tự động lưu thứ tự.
          </p>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card content-builder-card">
        <div className="content-builder-actions">
          <button
            type="button"
            className="secondary-button back-button"
            onClick={() => navigate(`/teacher/courses/${courseId}`)}
          >
            ← Quay lại khóa học
          </button>
        </div>

        <CourseContentTreeEditor courseId={courseId} />
      </div>
    </div>
  );
}