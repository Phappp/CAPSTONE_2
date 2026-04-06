import { useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LearnerQuizTake from "../components/LearnerQuizTake";
import { getAccessToken } from "../utils/authStorage";
import "./LearnerQuizTakePage.css";

export default function LearnerQuizTakePage() {
  const { courseId, lessonId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => getAccessToken(), []);
  const [ready, setReady] = useState(false);

  const cid = Number(courseId);
  const lid = Number(lessonId);
  if (!cid || Number.isNaN(cid) || !lid || Number.isNaN(lid)) return null;

  const lessonTitle = search.get("title") || `Bài ${lid}`;

  const closePage = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
    navigate(-1);
  };

  useLayoutEffect(() => {
    document.body.classList.add("minimal-quiz-page");
    setReady(true);
    return () => {
      document.body.classList.remove("minimal-quiz-page");
    };
  }, []);

  if (!ready) return <main className="minimal-page-loading">Đang tải...</main>;

  return (
    <LearnerQuizTake
      courseId={cid}
      lessonId={lid}
      lessonTitle={lessonTitle}
      token={token}
      onClose={closePage}
      onCompleted={() => {
        // Không cần cập nhật tab gốc tại đây.
      }}
    />
  );
}

