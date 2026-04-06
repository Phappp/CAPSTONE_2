import { useCallback, useEffect, useMemo, useState } from "react";
import { url } from "../baseUrl";
import { ASSIGNMENTS_API } from "../api/assignments";
import "./LearnerQuizTake.css";

export type MyAssignmentGradeRow = {
  title?: string;
  max_score?: number;
  submission_id: number | null;
  status?: string | null;
  submitted_at?: string | null;
  score?: number | string | null;
  feedback_text?: string | null;
  graded_at?: string | null;
};

export type LearnerAssignmentPayload = {
  assignment_id: number;
  lesson_id: number;
  title: string;
  description: string;
  due_date: string | null;
  max_score: number;
  passing_score: number | null;
  allow_late_submission: boolean;
  late_submission_days: number;
  late_penalty_percent: number;
  allow_resubmission: boolean;
  max_resubmissions: number;
  allowed_formats: string[];
  attachments: { file_name: string; file_path: string; signed_url: string }[];
  assignment_kind: "file_prompt" | "short_answer";
  short_answer_questions: { id: string; question_text: string; order_index: number }[];
};

export default function LearnerAssignmentSubmit(props: {
  lessonId: number;
  lessonTitle: string;
  token: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { lessonId, lessonTitle, token, onClose, onSubmitted } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<LearnerAssignmentPayload | null>(null);

  const [textSubmission, setTextSubmission] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [gradeRow, setGradeRow] = useState<MyAssignmentGradeRow | null>(null);
  const [gradeLoading, setGradeLoading] = useState(false);

  const authJsonHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const authBareHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadGrade = useCallback(
    async (assignmentId: number) => {
      setGradeLoading(true);
      try {
        const res = await fetch(`${url}${ASSIGNMENTS_API.myAssignmentGrade(assignmentId)}`, {
          headers: authJsonHeaders,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setGradeRow(null);
          return;
        }
        const row = (json as any)?.data ?? json;
        setGradeRow(row as MyAssignmentGradeRow);
      } catch {
        setGradeRow(null);
      } finally {
        setGradeLoading(false);
      }
    },
    [authJsonHeaders]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDoneMsg(null);
    setAssignment(null);
    setGradeRow(null);
    setTextSubmission("");
    setFiles([]);
    setShortAnswers({});
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.learnerAssignmentForLesson(lessonId)}`, {
        headers: authJsonHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.message || "Không tải được bài tập.");
      const a = data as LearnerAssignmentPayload;
      if (!a?.assignment_id) throw new Error("Dữ liệu bài tập không hợp lệ.");
      setAssignment(a);
      void loadGrade(a.assignment_id);
      if (a.assignment_kind === "short_answer" && Array.isArray(a.short_answer_questions)) {
        const init: Record<string, string> = {};
        a.short_answer_questions.forEach((q) => {
          init[q.id] = "";
        });
        setShortAnswers(init);
      }
    } catch (e: any) {
      setError(e?.message || "Lỗi tải bài tập.");
    } finally {
      setLoading(false);
    }
  }, [authJsonHeaders, lessonId, loadGrade]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!assignment || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = assignment.assignment_id;
      if (assignment.assignment_kind === "short_answer") {
        const list = (assignment.short_answer_questions || []).map((q) => ({
          question_id: q.id,
          answer_text: String(shortAnswers[q.id] ?? "").trim(),
        }));
        const empty = list.some((x) => !x.answer_text);
        if (empty) throw new Error("Vui lòng trả lời đầy đủ tất cả các câu.");
        const res = await fetch(`${url}${ASSIGNMENTS_API.submitAssignment(id)}`, {
          method: "POST",
          headers: authJsonHeaders,
          body: JSON.stringify({ short_answers: list }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Nộp bài thất bại.");
        setDoneMsg(String((data as any)?.message || "Đã nộp bài thành công."));
        void loadGrade(id);
        onSubmitted();
        return;
      } else {
        const hasText = textSubmission.trim().length > 0;
        const hasFiles = files.length > 0;
        if (!hasText && !hasFiles) {
          throw new Error("Vui lòng nhập nội dung hoặc đính kèm ít nhất một file.");
        }
        const form = new FormData();
        if (hasText) form.append("text_submission", textSubmission.trim());
        for (const f of files) form.append("files", f);
        const res = await fetch(`${url}${ASSIGNMENTS_API.submitAssignment(id)}`, {
          method: "POST",
          headers: authBareHeaders,
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.message || "Nộp bài thất bại.");
        setDoneMsg(String((data as any)?.message || "Đã nộp bài thành công."));
        void loadGrade(id);
      }
      onSubmitted();
    } catch (e: any) {
      setError(e?.message || "Nộp bài thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const dueLabel = assignment?.due_date
    ? new Date(assignment.due_date).toLocaleString("vi-VN")
    : "Không giới hạn";

  return (
    <div className="learner-quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="learner-asg-title">
      <div className="learner-quiz-modal" style={{ maxWidth: 760 }}>
        <div className="learner-quiz-header">
          <div>
            <h2 id="learner-asg-title">{assignment?.title || lessonTitle}</h2>
            <p>{assignment ? "Nộp bài tập theo hướng dẫn giảng viên." : "Đang tải…"}</p>
          </div>
          <button type="button" className="learner-quiz-close" onClick={onClose}>
            Đóng
          </button>
        </div>

        {assignment ? (
          <div className="learner-quiz-meta">
            <span>
              Hạn nộp: <strong>{dueLabel}</strong>
            </span>
            <span>
              Thang điểm: <strong>{assignment.max_score}</strong>
            </span>
            {assignment.passing_score != null ? (
              <span>
                Điểm đạt: <strong>{assignment.passing_score}</strong>
              </span>
            ) : null}
            <span>
              Dạng:{" "}
              <strong>{assignment.assignment_kind === "short_answer" ? "Trả lời ngắn" : "File / văn bản"}</strong>
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="learner-quiz-body" style={{ textAlign: "center", color: "#64748b" }}>
            Đang tải bài tập…
          </div>
        ) : null}

        {error && !loading ? <div className="learner-quiz-error">{error}</div> : null}
        {assignment && (gradeLoading || gradeRow) ? (
          <div
            className="learner-quiz-body"
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: "0.92rem",
              color: "#334155",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>Trạng thái &amp; điểm</div>
            {gradeLoading ? (
              <span style={{ color: "#64748b" }}>Đang tải…</span>
            ) : gradeRow && !gradeRow.submission_id ? (
              <span>Bạn chưa nộp bài tập.</span>
            ) : gradeRow?.status === "graded" ||
              (gradeRow?.graded_at != null &&
                gradeRow?.score != null &&
                String(gradeRow.score).trim() !== "") ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <strong>Điểm:</strong>{" "}
                  {gradeRow?.score != null && gradeRow?.score !== ""
                    ? `${gradeRow.score} / ${assignment.max_score}`
                    : "—"}
                </div>
                {gradeRow?.feedback_text ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    <strong>Nhận xét:</strong> {gradeRow.feedback_text}
                  </div>
                ) : (
                  <div style={{ color: "#64748b" }}>Chưa có nhận xét từ giảng viên.</div>
                )}
                {gradeRow?.graded_at ? (
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Chấm lúc: {new Date(gradeRow.graded_at).toLocaleString("vi-VN")}
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span>
                  <strong>Đã nộp</strong>
                  {gradeRow?.submitted_at
                    ? ` · ${new Date(gradeRow.submitted_at).toLocaleString("vi-VN")}`
                    : ""}
                </span>
                <span style={{ color: "#b45309" }}>Giảng viên chưa chấm điểm. Bạn sẽ thấy điểm và nhận xét tại đây sau khi được chấm.</span>
              </div>
            )}
          </div>
        ) : null}
        {doneMsg ? (
          <div className="learner-quiz-body" style={{ textAlign: "center", color: "#15803d", fontWeight: 600 }}>
            {doneMsg}
          </div>
        ) : null}

        {!loading && assignment && !doneMsg ? (
          <div className="learner-quiz-body">
            {assignment.description ? (
              <div style={{ marginBottom: 16, color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {assignment.description}
              </div>
            ) : null}

            {assignment.attachments?.length ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>Đề bài / tài liệu</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
                  {assignment.attachments.map((a) => (
                    <li key={a.file_path} style={{ marginBottom: 6 }}>
                      <a href={a.signed_url} target="_blank" rel="noreferrer">
                        {a.file_name || "Tải file"}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {assignment.assignment_kind === "short_answer" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(assignment.short_answer_questions || []).map((q, idx) => (
                  <div key={q.id} className="learner-quiz-q">
                    <div className="learner-quiz-q__badge">Câu {idx + 1}</div>
                    <p className="learner-quiz-q__text">{q.question_text}</p>
                    <textarea
                      rows={3}
                      value={shortAnswers[q.id] ?? ""}
                      onChange={(e) => setShortAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Nhập đáp án…"
                      style={{
                        width: "100%",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: "10px 12px",
                        fontFamily: "inherit",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>Nội dung bài làm (văn bản)</div>
                  <textarea
                    rows={6}
                    value={textSubmission}
                    onChange={(e) => setTextSubmission(e.target.value)}
                    placeholder="Bạn có thể ghi đáp án trực tiếp tại đây, hoặc chỉ nộp file bên dưới."
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      padding: "10px 12px",
                      fontFamily: "inherit",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>File đính kèm (tùy chọn)</div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                  />
                  {files.length > 0 ? (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                      Đã chọn: {files.map((f) => f.name).join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="learner-quiz-close"
                style={{ background: "#4f46e5", borderColor: "#4338ca", color: "#fff" }}
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Đang gửi…" : "Nộp bài"}
              </button>
              <button type="button" className="learner-quiz-close" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
