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

export default function AssignmentEditor(props: { courses: CourseBrief[]; token: string | null; loading: boolean }) {
  const { courses, token, loading } = props;

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

  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

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
    // Reset state when switching lesson (avoid editing wrong assignment).
    setPreview(null);
    setCurrentAssignmentId(null);
    setEditing(false);
  }, [lessonId]);

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
      // attachments: keep empty; we upload via multipart after create
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
  };

  const handleEditToggle = () => {
    if (!preview) return;
    if (!editing) loadIntoEditor(preview);
    setEditing((v) => !v);
  };

  const handleSaveEdit = async () => {
    if (!preview || !currentAssignmentId || !lessonId) return;
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
          {(lessonTree?.modules ?? []).flatMap((m) => m.lessons ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} (#{l.id})
            </option>
          ))}
        </select>
      </div>

      {lessonsError && <div className="error-box">{lessonsError}</div>}

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
            </div>

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
      </div>
    </div>
  );
}

