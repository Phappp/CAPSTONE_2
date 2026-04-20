import { useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LearnerAssignmentSubmit from "../components/LearnerAssignmentSubmit";
import { getAccessToken } from "../utils/authStorage";
import "./LearnerAssignmentSubmitPage.css";

export default function LearnerAssignmentSubmitPage() {
  const { lessonId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => getAccessToken(), []);
  const [ready, setReady] = useState(false);

  const lid = Number(lessonId);
  if (!lid || Number.isNaN(lid)) return null;

  const lessonTitle = search.get("title") || `Bài ${lid}`;
  const learningCourseId = Number(search.get("courseId"));
  const learningSlug = search.get("slug");

  const closePage = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
    if (learningSlug && learningCourseId > 0 && !Number.isNaN(learningCourseId)) {
      navigate(`/learning/${learningCourseId}/${encodeURIComponent(learningSlug)}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  useLayoutEffect(() => {
    document.body.classList.add("minimal-assignment-page");
    setReady(true);
    return () => {
      document.body.classList.remove("minimal-assignment-page");
    };
  }, []);

  if (!ready) return <main className="minimal-page-loading">Đang tải...</main>;

  return (
    <LearnerAssignmentSubmit
      lessonId={lid}
      lessonTitle={lessonTitle}
      token={token}
      onClose={closePage}
      onSubmitted={() => {
        // Không cần cập nhật tab gốc tại đây.
      }}
    />
  );
}

