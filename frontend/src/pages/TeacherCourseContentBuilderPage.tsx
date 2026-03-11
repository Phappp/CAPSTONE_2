import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { Toaster } from "react-hot-toast";
import CourseContentTreeEditor from "../components/CourseContentTreeEditor";

export default function TeacherCourseContentBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = Number(params.id);
  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="dashboard-page">
      <Toaster position="top-right" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="dashboard-title">Xây dựng nội dung</h1>
          <p className="dashboard-subtitle">
            Thêm chương/bài học, kéo-thả để sắp xếp. Tự động lưu thứ tự.
          </p>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            style={{ width: "auto" }}
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

