import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function TeacherQuizEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = Number(id);
  const lessonIdRaw = searchParams.get("lessonId");
  const pickedLessonId = lessonIdRaw ? Number(lessonIdRaw) : null;

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) {
      navigate("/teacher/dashboard", { replace: true });
      return;
    }
    if (!pickedLessonId || Number.isNaN(pickedLessonId)) {
      navigate(`/teacher/courses/${courseId}/assessments`, { replace: true });
      return;
    }
    navigate(`/teacher/courses/${courseId}/lessons/${pickedLessonId}/studio?section=quiz`, { replace: true });
  }, [courseId, pickedLessonId, navigate]);

  return null;
}
