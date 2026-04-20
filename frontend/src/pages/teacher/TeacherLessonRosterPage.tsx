import { useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TeacherLessonRosterModal from "../../components/TeacherLessonRosterModal";
import { getAccessToken } from "../../utils/authStorage";
import "./TeacherLessonRosterPage.css";

export default function TeacherLessonRosterPage() {
  const { id, lessonId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => getAccessToken(), []);
  const [ready, setReady] = useState(false);

  const courseId = Number(id);
  const lid = Number(lessonId);
  if (!courseId || Number.isNaN(courseId) || !lid || Number.isNaN(lid)) return null;

  const title = search.get("title") || `Bài ${lid}`;
  const hasQuiz = search.get("hasQuiz") === "1";
  const hasAssignment = search.get("hasAssignment") === "1";

  const closePage = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
    navigate(`/teacher/courses/${courseId}/assessments`);
  };

  useLayoutEffect(() => {
    document.body.classList.add("minimal-roster-page");
    setReady(true);
    return () => {
      document.body.classList.remove("minimal-roster-page");
    };
  }, []);

  if (!ready) return <main className="minimal-page-loading">Đang tải...</main>;

  return (
    <TeacherLessonRosterModal
      open
      onClose={closePage}
      courseId={courseId}
      lessonId={lid}
      lessonTitle={title}
      hasAssignment={hasAssignment}
      hasQuiz={hasQuiz}
      token={token}
    />
  );
}

