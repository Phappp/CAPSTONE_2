import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { ASSIGNMENTS_API } from "../api/assignments";
import "./AssignmentEditor.css";

type CourseBrief = { id: number; title: string };

type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: string;
  order_index: number;
};

type CourseContentTree = {
  course_id: number;
  modules: {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    order_index: number;
    lessons: LessonItem[];
  }[];
};

type AssignmentKind = "file_prompt" | "short_answer";

type AssignmentPreview = {
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
  created_at: string;
  assignment_kind?: AssignmentKind;
  short_answer_questions?: { id: string; question_text: string; order_index: number }[];
};

const DEFAULT_ALLOWED_FORMATS = [
  "pdf",
  "docx",
  "doc",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "zip",
  "rar",
  "7z",
];

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToIso(localValue: string): string {
  // Input from `datetime-local` is local time (no timezone). Convert to ISO for backend parsing.
  return new Date(localValue).toISOString();
}

export default function AssignmentEditor(props: {
  courses: CourseBrief[];
  token: string | null;
  loading: boolean;
  /** Đồng bộ từ cây nội dung (menu ⋯ hoặc nút chương). */
  pickedLessonId?: number | null;
}) {
  const { courses, token, loading, pickedLessonId } = props;

  const [selectedCourseId, setSelectedCourseId] = useState<number | "">(courses?.[0]?.id ?? "");
  const [lessonTree, setLessonTree] = useState<CourseContentTree | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const [lessonId, setLessonId] = useState<number | "">("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState<number>(10);
  const [passingScore, setPassingScore] = useState<string>(""); // empty => null
  const [dueDate, setDueDate] = useState<string>("");

  const [allowLate, setAllowLate] = useState<boolean>(false);
  const [lateDays, setLateDays] = useState<number>(0);
  const [latePenalty, setLatePenalty] = useState<number>(0);

  const [allowResubmission, setAllowResubmission] = useState<boolean>(false);
  const [maxResubmissions, setMaxResubmissions] = useState<number>(1);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<number | null>(null);

  /** Dạng 1: đề file + HV nộp file/văn bản. Dạng 2: câu trả lời ngắn. */
  const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>("file_prompt");
  const [shortAnswerLines, setShortAnswerLines] = useState<string[]>([""]);

  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  type SubmissionRow = {
    submission_id: number;
    user_email: string;
    user_full_name: string;
    status: string;
    submitted_at: string | null;
    is_late: boolean;
    graded_score: number | null;
    feedback_text: string | null;
    content_preview: string;
    attachment_count: number;
  };

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<number, string>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<number, string>>({});

  const readOnly = Boolean(preview) && !editing;

  const authHeaders = useMemo<Record<string, string>>(() => {
    if (!token) return {} as Record<string, string>;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  useEffect(() => {
    const firstCourseId = courses?.[0]?.id;
    if (selectedCourseId === "" && typeof firstCourseId === "number") {
      setSelectedCourseId(firstCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      setLessonsLoading(true);
      setLessonsError(null);
      try {
        const res = await fetch(`${url}${COURSES_API.contentTree(selectedCourseId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Không thể tải cây bài học.");
        setLessonTree(data as CourseContentTree);

        const allLessons = (data?.modules ?? []).flatMap((m: any) => m.lessons ?? []) as LessonItem[];
        const firstLessonId = allLessons[0]?.id;
        if (typeof firstLessonId === "number") setLessonId(firstLessonId);
      } catch (e: any) {
        setLessonsError(e?.message || "Đã xảy ra lỗi.");
        setLessonTree(null);
        setLessonId("");
      } finally {
        setLessonsLoading(false);
      }
    })();
  }, [selectedCourseId, authHeaders]);

  useEffect(() => {
    if (pickedLessonId == null || !Number.isFinite(Number(pickedLessonId))) return;
    if (!lessonTree) return;
    const ok = (lessonTree.modules ?? []).some((mod) =>
      (mod.lessons ?? []).some((l) => l.id === pickedLessonId)
    );
    if (ok) setLessonId(pickedLessonId);
  }, [pickedLessonId, lessonTree]);

  useEffect(() => {
    // Reset state when switching lesson (avoid editing wrong assignment).
    setPreview(null);
    setCurrentAssignmentId(null);
    setEditing(false);
    setAssignmentKind("file_prompt");
    setShortAnswerLines([""]);
    setSubmissions([]);
    setSubmissionsError(null);
    setScoreDraft({});
    setFeedbackDraft({});
  }, [lessonId]);

  useEffect(() => {
    if (!preview || !currentAssignmentId || !lessonId) {
      setSubmissions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const res = await fetch(
          `${url}${ASSIGNMENTS_API.assignmentSubmissions(lessonId, currentAssignmentId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Không tải được danh sách bài nộp.");
        const list = (json?.data?.submissions ?? []) as SubmissionRow[];
        if (cancelled) return;
        setSubmissions(Array.isArray(list) ? list : []);
        const sInit: Record<number, string> = {};
        const fInit: Record<number, string> = {};
        list.forEach((r) => {
          sInit[r.submission_id] =
            r.graded_score != null && !Number.isNaN(Number(r.graded_score)) ? String(r.graded_score) : "";
          fInit[r.submission_id] = r.feedback_text ?? "";
        });
        setScoreDraft(sInit);
        setFeedbackDraft(fInit);
      } catch (e: any) {
        if (!cancelled) {
          setSubmissionsError(e?.message || "Lỗi tải bài nộp.");
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) setSubmissionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, currentAssignmentId, lessonId, authHeaders]);

  const submitGrade = async (submissionId: number) => {
    const raw = scoreDraft[submissionId]?.trim();
    if (raw === "" || Number.isNaN(Number(raw))) {
      toast.error("Vui lòng nhập điểm hợp lệ.");
      return;
    }
    const max = Number(preview?.max_score ?? 10);
    const sc = Number(raw);
    if (sc < 0 || sc > max) {
      toast.error(`Điểm phải từ 0 đến ${max}.`);
      return;
    }
    setGradingId(submissionId);
    try {
      const res = await fetch(`${url}${ASSIGNMENTS_API.gradeSubmission(submissionId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          submissionId,
          score: sc,
          feedbackText: feedbackDraft[submissionId] ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Chấm điểm thất bại.");
      toast.success("Đã lưu điểm và nhận xét.");
      setSubmissions((prev) =>
        prev.map((r) =>
          r.submission_id === submissionId
            ? { ...r, status: "graded", graded_score: sc, feedback_text: feedbackDraft[submissionId] ?? "" }
            : r
        )
      );
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi chấm điểm.");
    } finally {
      setGradingId(null);
    }
  };

  const buildShortAnswerPayload = () => {
    const texts = shortAnswerLines.map((s) => s.trim()).filter(Boolean);
    return texts.map((question_text) => ({ question_text }));
  };

  const buildCreatePayload = () => {
    const passing = passingScore.trim() ? Number(passingScore) : null;
    return {
      title: title.trim(),
      description: description.trim(),
      max_score: Number(maxScore),
      passing_score: passing,
      due_date: dueDate ? datetimeLocalToIso(dueDate) : "",
      allow_late_submission: allowLate,
      late_submission_days: allowLate ? Number(lateDays) : 0,
      late_penalty_percent: allowLate ? Number(latePenalty) : 0,
      allow_resubmission: allowResubmission,
      max_resubmissions: allowResubmission ? Number(maxResubmissions) : 1,
      allowed_formats: DEFAULT_ALLOWED_FORMATS,
      assignment_kind: assignmentKind,
      short_answer_questions: assignmentKind === "short_answer" ? buildShortAnswerPayload() : null,
    };
  };

  const refreshPreview = async (aid: number, lid: number) => {
    const res = await fetch(`${url}${ASSIGNMENTS_API.previewAssignment(lid, aid)}`, {
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải preview.");
    setPreview(data as AssignmentPreview);
  };

  const handleSelectFiles = (files: FileList | null) => {
    setSelectedFiles(files ? Array.from(files) : []);
  };

  const handleCreate = async () => {
    if (loading || saving) return;
    if (!lessonId) {
      toast.error("Vui lòng chọn bài học.");
      return;
    }
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài tập.");
      return;
    }
    if (!description.trim()) {
      toast.error("Vui lòng nhập mô tả/yêu cầu.");
      return;
    }
    if (!dueDate) {
      toast.error("Vui lòng chọn hạn nộp.");
      return;
    }
    if (assignmentKind === "short_answer") {
      const n = shortAnswerLines.map((s) => s.trim()).filter(Boolean).length;
      if (n < 1) {
        toast.error("Dạng trả lời ngắn cần ít nhất một câu hỏi.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = buildCreatePayload();
      const createRes = await fetch(`${url}${ASSIGNMENTS_API.createAssignment(lessonId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createData?.message || "Tạo bài tập thất bại.");

      const assignmentId = Number(createData?.data?.assignment_id ?? createData?.assignment_id);
      if (!assignmentId) throw new Error("Không lấy được assignment_id.");

      setCurrentAssignmentId(assignmentId);
      setEditing(false);

      if (selectedFiles.length > 0) {
        const form = new FormData();
        for (const f of selectedFiles) form.append("files", f);
        const uploadRes = await fetch(
          `${url}${ASSIGNMENTS_API.uploadAttachments(lessonId, assignmentId)}`,
          {
            method: "POST",
            headers: { ...authHeaders },
            body: form,
          }
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.message || "Upload file thất bại.");
      }

      await refreshPreview(assignmentId, Number(lessonId));
      toast.success("Tạo bài tập thành công!");
      setSelectedFiles([]);
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewNow = async () => {
    if (!currentAssignmentId || !lessonId) return;
    try {
      await refreshPreview(currentAssignmentId, Number(lessonId));
    } catch (e: any) {
      toast.error(e?.message || "Không thể tải preview.");
    }
  };

  const loadIntoEditor = (p: AssignmentPreview) => {
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setMaxScore(Number(p.max_score ?? 10));
    setPassingScore(p.passing_score != null ? String(p.passing_score) : "");
    setDueDate(isoToDatetimeLocal(p.due_date));

    setAllowLate(Boolean(p.allow_late_submission));
    setLateDays(Number(p.late_submission_days ?? 0));
    setLatePenalty(Number(p.late_penalty_percent ?? 0));

    setAllowResubmission(Boolean(p.allow_resubmission));
    setMaxResubmissions(Number(p.max_resubmissions ?? 1));

    const k = p.assignment_kind === "short_answer" ? "short_answer" : "file_prompt";
    setAssignmentKind(k);
    const qs = (p.short_answer_questions || []).map((q) => q.question_text).filter(Boolean);
    setShortAnswerLines(qs.length ? qs : [""]);
  };

  const handleEditToggle = () => {
    if (!preview) return;
    if (!editing) loadIntoEditor(preview);
    setEditing((v) => !v);
  };

  const handleSaveEdit = async () => {
    if (!preview || !currentAssignmentId || !lessonId) return;
    if (assignmentKind === "short_answer") {
      const n = shortAnswerLines.map((s) => s.trim()).filter(Boolean).length;
      if (n < 1) {
        toast.error("Dạng trả lời ngắn cần ít nhất một câu hỏi.");
        return;
      }
    }
    setSaving(true);
    try {
      const passing = passingScore.trim() ? Number(passingScore) : null;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        max_score: Number(maxScore),
        passing_score: passing,
        due_date: dueDate ? datetimeLocalToIso(dueDate) : null,
        allow_late_submission: allowLate,
        late_submission_days: allowLate ? Number(lateDays) : 0,
        late_penalty_percent: allowLate ? Number(latePenalty) : 0,
        allow_resubmission: allowResubmission,
        max_resubmissions: allowResubmission ? Number(maxResubmissions) : 1,
        assignment_kind: assignmentKind,
        short_answer_questions: assignmentKind === "short_answer" ? buildShortAnswerPayload() : null,
        // allowed_formats: omitted so BE giữ nguyên cấu hình đã lưu
      };

      const res = await fetch(`${url}${ASSIGNMENTS_API.updateAssignment(lessonId, currentAssignmentId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Cập nhật thất bại.");
      }

      if (selectedFiles.length > 0) {
        const form = new FormData();
        for (const f of selectedFiles) form.append("files", f);
        const uploadRes = await fetch(
          `${url}${ASSIGNMENTS_API.uploadAttachments(lessonId, currentAssignmentId)}`,
          {
            method: "POST",
            headers: { ...authHeaders },
            body: form,
          }
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.message || "Upload file thất bại.");
        setSelectedFiles([]);
      }

      await refreshPreview(currentAssignmentId, Number(lessonId));
      setEditing(false);
      toast.success("Cập nhật thành công!");
    } catch (e: any) {
      toast.error(e?.message || "Đã xảy ra lỗi khi cập nhật.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-editor">
      <Toaster position="top-right" />
      <div className="editor-row">
        <label className="editor-label">Khóa học</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(Number(e.target.value))}
          disabled={loading || lessonsLoading || courses.length === 0}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-row">
        <label className="editor-label">Bài học</label>
        <select
          value={lessonId}
          onChange={(e) => setLessonId(Number(e.target.value))}
          disabled={!lessonTree || lessonsLoading || courses.length === 0}
        >
          {(lessonTree?.modules ?? []).map((mod, mi) => (
            <optgroup key={mod.id} label={`Chương ${mi + 1}: ${mod.title || "Không tên"}`}>
              {(mod.lessons ?? []).map((l, li) => (
                <option key={l.id} value={l.id}>
                  Bài {li + 1}: {l.title} · {l.lesson_type}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {lessonsError && <div className="error-box">{lessonsError}</div>}

      <p className="editor-hint" style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
        Mở khóa theo thứ tự bài trong khóa: học viên cần hoàn thành các bài đứng trước (trong chương và toàn khóa) trước khi
        làm bài tập.
      </p>

      <div className="assignment-form">
        <h3>Thông tin bài tập</h3>

        <div className="form-grid">
          <div className="field">
            <label>Tiêu đề *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving || readOnly} />
          </div>

          <div className="field">
            <label>Mô tả/yêu cầu *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={saving || readOnly} />
          </div>

          <div className="field">
            <label>Thang điểm</label>
            <input
              type="number"
              min={0}
              step={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              disabled={saving || readOnly}
            />
          </div>

          <div className="field">
            <label>Điểm đạt (optional)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              disabled={saving || readOnly}
              placeholder="Ví dụ: 6"
            />
          </div>

          <div className="field">
            <label>Hạn nộp *</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={saving || readOnly}
            />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Dạng bài tập</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <label className="checkbox-row" style={{ fontWeight: 400 }}>
              <input
                type="radio"
                name="assignmentKind"
                checked={assignmentKind === "file_prompt"}
                onChange={() => setAssignmentKind("file_prompt")}
                disabled={saving || readOnly}
              />
              <span>
                <strong>File / văn bản</strong> — tải đề kèm file; học viên nộp file đáp án và/hoặc ghi text.
              </span>
            </label>
            <label className="checkbox-row" style={{ fontWeight: 400 }}>
              <input
                type="radio"
                name="assignmentKind"
                checked={assignmentKind === "short_answer"}
                onChange={() => setAssignmentKind("short_answer")}
                disabled={saving || readOnly}
              />
              <span>
                <strong>Trả lời ngắn</strong> — bạn tạo từng câu hỏi; học viên điền đáp án cho mỗi câu.
              </span>
            </label>
          </div>
        </div>

        {assignmentKind === "short_answer" ? (
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Câu hỏi trả lời ngắn *</label>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 10px" }}>
              Ít nhất một câu. Hệ thống sẽ gán id q1, q2, … theo thứ tự khi lưu.
            </p>
            {shortAnswerLines.map((line, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ minWidth: 28, paddingTop: 8, color: "#6b7280" }}>{idx + 1}.</span>
                <textarea
                  rows={2}
                  value={line}
                  onChange={(e) =>
                    setShortAnswerLines((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))
                  }
                  disabled={saving || readOnly}
                  placeholder="Nội dung câu hỏi"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving || readOnly || shortAnswerLines.length <= 1}
                  onClick={() => setShortAnswerLines((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ marginTop: 4 }}
                >
                  Xóa
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              disabled={saving || readOnly}
              onClick={() => setShortAnswerLines((prev) => [...prev, ""])}
            >
              Thêm câu
            </button>
          </div>
        ) : null}

        <div className="policy-grid">
          <div className="policy">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllowLate(checked);
                  if (checked && lateDays <= 0) setLateDays(1);
                }}
                disabled={saving || readOnly}
              />
              Cho phép nộp muộn
            </label>

            <div className="subfields">
              <div className="field">
                <label>Số ngày nộp trễ</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={lateDays}
                  onChange={(e) => setLateDays(Number(e.target.value))}
                  disabled={saving || readOnly || !allowLate}
                />
              </div>
              <div className="field">
                <label>Phạt nộp muộn (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={latePenalty}
                  onChange={(e) => setLatePenalty(Number(e.target.value))}
                  disabled={saving || readOnly || !allowLate}
                />
              </div>
            </div>
          </div>

          <div className="policy">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={allowResubmission}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllowResubmission(checked);
                  if (checked && maxResubmissions < 1) setMaxResubmissions(1);
                }}
                disabled={saving || readOnly}
              />
              Cho phép nộp lại
            </label>

            <div className="subfields">
              <div className="field">
                <label>Số lần nộp lại tối đa</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={maxResubmissions}
                  onChange={(e) => setMaxResubmissions(Number(e.target.value))}
                  disabled={saving || readOnly || !allowResubmission}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="attachments-block">
          <h3>File đính kèm (optional)</h3>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar,.7z"
            onChange={(e) => handleSelectFiles(e.target.files)}
            disabled={saving || readOnly}
          />
          {selectedFiles.length > 0 && (
            <div className="file-list">
              {selectedFiles.map((f) => (
                <div key={f.name} className="file-item">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{Math.round(f.size / 1024)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="actions-row">
          <button className="btn-primary" onClick={handleCreate} disabled={saving || loading || !lessonId}>
            {saving ? "Đang xử lý..." : currentAssignmentId ? "Tạo lại (assignment mới)" : "Tạo bài tập"}
          </button>

          <button className="btn-secondary" onClick={handlePreviewNow} disabled={saving || !currentAssignmentId || !lessonId}>
            Xem preview
          </button>

          {preview && (
            <button className="btn-secondary" onClick={handleEditToggle} disabled={saving}>
              {editing ? "Hủy chỉnh sửa" : "Chỉnh sửa"}
            </button>
          )}
        </div>

        {preview && (
          <div className="preview-box">
            <h3>Preview bài tập</h3>
            <div className="preview-meta">
              <div>
                <b>Title:</b> {preview.title}
              </div>
              <div>
                <b>Due:</b> {preview.due_date ? new Date(preview.due_date).toLocaleString() : "Không có"}
              </div>
              <div>
                <b>Điểm:</b> {preview.max_score}
                {preview.passing_score != null ? ` (đạt: ${preview.passing_score})` : ""}
              </div>
              <div>
                <b>Muộn:</b> {preview.allow_late_submission ? `${preview.late_submission_days} ngày, phạt ${preview.late_penalty_percent}%` : "Không"}
              </div>
              <div>
                <b>Nộp lại:</b> {preview.allow_resubmission ? `tối đa ${preview.max_resubmissions} lần` : "Không"}
              </div>
              <div>
                <b>Dạng:</b>{" "}
                {preview.assignment_kind === "short_answer" ? "Trả lời ngắn" : "File / văn bản"}
              </div>
            </div>

            {preview.assignment_kind === "short_answer" && (preview.short_answer_questions?.length ?? 0) > 0 ? (
              <div className="preview-meta" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                <div style={{ width: "100%" }}>
                  <b>Câu hỏi:</b>
                  <ol style={{ margin: "8px 0 0 18px" }}>
                    {(preview.short_answer_questions || []).map((q) => (
                      <li key={q.id}>{q.question_text}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}

            <div className="preview-attachments">
              <h4>Đính kèm ({preview.attachments?.length ?? 0})</h4>
              {preview.attachments?.length ? (
                <div className="attachments-grid">
                  {preview.attachments.map((a) => {
                    const lower = a.file_name.toLowerCase();
                    const isImage = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif");
                    return (
                      <div key={a.file_path} className="attachment-card">
                        {isImage ? (
                          <img src={a.signed_url} alt={a.file_name} className="attachment-image" />
                        ) : (
                          <div className="attachment-placeholder">File</div>
                        )}
                        <div className="attachment-name" title={a.file_name}>
                          {a.file_name}
                        </div>
                        <a className="attachment-link" href={a.signed_url} target="_blank" rel="noreferrer">
                          Mở file
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">Chưa có file đính kèm.</div>
              )}
            </div>

            {editing && (
              <div className="edit-save-row">
                <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            )}
          </div>
        )}

        {preview && currentAssignmentId && lessonId ? (
          <div className="preview-box" style={{ marginTop: 16 }}>
            <h3>Bài nộp &amp; chấm điểm</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
              Xem nội dung tóm tắt, nhập điểm (0–{preview.max_score}) và nhận xét, rồi bấm Lưu điểm. Học viên xem kết quả trong màn hình làm bài tập.
            </p>
            {submissionsLoading ? <div style={{ color: "#64748b" }}>Đang tải danh sách…</div> : null}
            {submissionsError ? <div className="error-box">{submissionsError}</div> : null}
            {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
              <div className="muted">Chưa có học viên nộp bài.</div>
            ) : null}

            {submissions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {submissions.map((row) => (
                  <div
                    key={row.submission_id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {row.user_full_name || "Học viên"}{" "}
                      <span style={{ fontWeight: 400, color: "#64748b", fontSize: 13 }}>({row.user_email})</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                      Nộp: {row.submitted_at ? new Date(row.submitted_at).toLocaleString("vi-VN") : "—"} · Trạng thái:{" "}
                      <strong>{row.status}</strong>
                      {row.is_late ? " · Nộp muộn" : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#334155",
                        whiteSpace: "pre-wrap",
                        marginBottom: 10,
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {row.content_preview}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Điểm (max {preview.max_score})
                        <input
                          type="number"
                          min={0}
                          max={preview.max_score}
                          step={0.01}
                          value={scoreDraft[row.submission_id] ?? ""}
                          onChange={(e) =>
                            setScoreDraft((prev) => ({ ...prev, [row.submission_id]: e.target.value }))
                          }
                          style={{ width: 100, padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, flex: "1 1 220px" }}>
                        Nhận xét
                        <textarea
                          rows={2}
                          value={feedbackDraft[row.submission_id] ?? ""}
                          onChange={(e) =>
                            setFeedbackDraft((prev) => ({ ...prev, [row.submission_id]: e.target.value }))
                          }
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={gradingId === row.submission_id}
                        onClick={() => void submitGrade(row.submission_id)}
                        style={{ marginBottom: 2 }}
                      >
                        {gradingId === row.submission_id ? "Đang lưu…" : "Lưu điểm"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

