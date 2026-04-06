import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import CourseAssessmentModal, { type CourseAssessmentModalTab } from "../components/CourseAssessmentModal";
import TeacherLessonRosterModal from "../components/TeacherLessonRosterModal";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./TeacherDashboard.css";
import "./TeacherCourseOverviewPage.css";

type LessonRow = {
  id: number;
  title: string;
  lesson_type: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonOrder: number;
  has_quiz?: boolean;
  has_assignment?: boolean;
};

export default function TeacherCourseAssessmentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);
  const token = getAccessToken();

  const [courseTitle, setCourseTitle] = useState("");
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<CourseAssessmentModalTab>("quiz");
  const [pickedLessonId, setPickedLessonId] = useState<number | null>(null);
  const [quizPanelCourseId, setQuizPanelCourseId] = useState<number | null>(null);

  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterLesson, setRosterLesson] = useState<{ id: number; title: string; has_quiz?: boolean; has_assignment?: boolean } | null>(
    null
  );

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const load = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId)) return;
    setLoading(true);
    setError(null);
    try {
      const [detRes, treeRes] = await Promise.all([
        fetch(`${url}${COURSES_API.detail(courseId)}`, { headers: { ...authHeaders } }),
        fetch(`${url}${COURSES_API.contentTree(courseId)}`, { headers: { ...authHeaders } }),
      ]);
      const det = await detRes.json().catch(() => ({}));
      if (!detRes.ok) throw new Error(det?.message || "Không tải được khóa học.");
      setCourseTitle(String(det?.title ?? ""));

      const tree = await treeRes.json().catch(() => ({}));
      if (!treeRes.ok) throw new Error(tree?.message || "Không tải được nội dung khóa học.");

      const out: LessonRow[] = [];
      (tree.modules ?? []).forEach((mod: any, mi: number) => {
        (mod.lessons ?? []).forEach((l: any, li: number) => {
          out.push({
            id: l.id,
            title: l.title,
            lesson_type: l.lesson_type || "text",
            moduleTitle: mod.title || `Chương ${mi + 1}`,
            moduleOrder: mi + 1,
            lessonOrder: li + 1,
            has_quiz: Boolean(l.has_quiz),
            has_assignment: Boolean(l.has_assignment),
          });
        });
      });
      setRows(out);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải dữ liệu.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = (lessonId: number, tab: CourseAssessmentModalTab) => {
    setPickedLessonId(lessonId);
    setQuizPanelCourseId(courseId);
    setModalTab(tab);
    setModalOpen(true);
  };

  const openRoster = (r: LessonRow) => {
    setRosterLesson({
      id: r.id,
      title: r.title,
      has_quiz: r.has_quiz,
      has_assignment: r.has_assignment,
    });
    setRosterOpen(true);
  };

  const courses = useMemo(
    () => (courseTitle ? [{ id: courseId, title: courseTitle }] : []),
    [courseId, courseTitle]
  );

  if (!courseId || Number.isNaN(courseId)) {
    return null;
  }

  return (
    <div className="dashboard-page teacher-course-overview">
      <div className="dashboard-container">
        <div className="dashboard-header teacher-course-overview__top">
          <div className="teacher-course-overview__topLeft" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="secondary-button back-button" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
              ← Tổng quan khóa học
            </button>
            <button type="button" className="secondary-button back-button" onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}>
              Chỉnh sửa khóa học
            </button>
          </div>
          <AvatarMenu />
        </div>

        <div className="chart-card" style={{ marginBottom: 16 }}>
          <h1 className="teacher-course-overview__title" style={{ margin: "0 0 8px" }}>
            Quản lý Quizz &amp; bài tập
          </h1>
          <p className="course-stats" style={{ margin: 0, lineHeight: 1.5 }}>
            {courseTitle ? <strong>{courseTitle}</strong> : "—"} · chọn bài trong bảng rồi mở form soạn. Tiến độ học viên mở khóa
            theo thứ tự bài trong khóa học.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
              Tải lại
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate(`/teacher/courses/${courseId}/content`)}>
              Xây dựng nội dung
            </button>
          </div>
        </div>

        {error ? <div className="error-box">{error}</div> : null}
        {loading && !rows.length ? <div className="chart-card teacher-course-overview__loading">Đang tải…</div> : null}

        {!loading || rows.length ? (
          <div className="chart-card" style={{ overflowX: "auto" }}>
            <div className="chart-card-title" style={{ marginBottom: 12 }}>
              Danh sách bài học
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "8px 10px" }}>Chương</th>
                  <th style={{ padding: "8px 10px" }}>Bài</th>
                  <th style={{ padding: "8px 10px" }}>Loại</th>
                  <th style={{ padding: "8px 10px" }}>Quizz</th>
                  <th style={{ padding: "8px 10px" }}>Bài tập</th>
                  <th style={{ padding: "8px 10px", minWidth: 220 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px", color: "#475569" }}>
                      {r.moduleOrder}. {r.moduleTitle}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {r.lessonOrder}. {r.title}
                    </td>
                    <td style={{ padding: "10px", color: "#64748b" }}>{r.lesson_type}</td>
                    <td style={{ padding: "10px" }}>{r.has_quiz ? "Có" : "—"}</td>
                    <td style={{ padding: "10px" }}>{r.has_assignment ? "Có" : "—"}</td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button type="button" className="secondary-button" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => openModal(r.id, "quiz")}>
                          Soạn Quizz
                        </button>
                        <button type="button" className="secondary-button" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => openModal(r.id, "assignment")}>
                          Soạn bài tập
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "6px 12px", fontSize: 13, borderColor: "#4f46e5", color: "#4338ca" }}
                          onClick={() => openRoster(r)}
                        >
                          Danh sách / điểm
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && !loading ? <p className="course-stats" style={{ marginTop: 12 }}>Chưa có bài học. Hãy thêm chương/bài ở trang xây dựng nội dung.</p> : null}
          </div>
        ) : null}
      </div>

      <CourseAssessmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tab={modalTab}
        onTabChange={setModalTab}
        courses={courses}
        token={token}
        loading={loading}
        quizPanelCourseId={quizPanelCourseId}
        onQuizPanelCourseIdChange={setQuizPanelCourseId}
        pickedLessonId={pickedLessonId}
      />

      {rosterLesson ? (
        <TeacherLessonRosterModal
          open={rosterOpen}
          onClose={() => {
            setRosterOpen(false);
            setRosterLesson(null);
          }}
          courseId={courseId}
          lessonId={rosterLesson.id}
          lessonTitle={rosterLesson.title}
          hasAssignment={Boolean(rosterLesson.has_assignment)}
          hasQuiz={Boolean(rosterLesson.has_quiz)}
          token={token}
        />
      ) : null}
    </div>
  );
}
