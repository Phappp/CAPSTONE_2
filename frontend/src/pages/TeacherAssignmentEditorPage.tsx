import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import AssignmentEditor from "../components/AssignmentEditor";
import { getAccessToken } from "../utils/authStorage";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";

export default function TeacherAssignmentEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = Number(id);
  const lessonIdRaw = searchParams.get("lessonId");
  const pickedLessonId = lessonIdRaw ? Number(lessonIdRaw) : null;
  const token = getAccessToken();

  const courses = useMemo(() => {
    if (!courseId || Number.isNaN(courseId)) return [];
    return [{ id: courseId, title: `Khóa học #${courseId}` }];
  }, [courseId]);

  if (!courseId || Number.isNaN(courseId)) return null;

  return (
    <div className="dashboard-page teacher-course-overview">
      <div className="dashboard-container">
        <div className="dashboard-header teacher-course-overview__top">
          <div className="teacher-course-overview__topLeft" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="secondary-button back-button" onClick={() => navigate(`/teacher/courses/${courseId}/assessments`)}>
              ← Quản lý Quizz & bài tập
            </button>
          </div>
          <AvatarMenu />
        </div>
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <h1 className="teacher-course-overview__title" style={{ margin: "0 0 8px" }}>
            Soạn bài tập
          </h1>
        </div>
        <div className="chart-card">
          <AssignmentEditor
            courses={courses}
            token={token}
            loading={false}
            pickedLessonId={pickedLessonId}
          />
        </div>
      </div>
    </div>
  );
}
