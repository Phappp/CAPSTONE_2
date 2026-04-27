import type { Dispatch, SetStateAction } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Info,
  Link as LinkIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
  X,
  Youtube,
} from "lucide-react";
import AssignmentEditor from "../../../components/AssignmentEditor";
import LessonRichTextEditor from "../../../components/LessonRichTextEditor";
import ManualQuizEditor from "../../../components/ManualQuizEditor";
import type {
  AssignmentKind,
  AssignmentShortAnswerQuestion,
  AssignmentStudioPreview,
  LessonResource,
  ModuleItem,
  QuizPreviewConfig,
  SavedQuizQuestion,
} from "./types";
import { formatFileSize, getReviewStatusLabel } from "./utils";

function RejectReasonButton({ reason }: { reason?: string | null }) {
  const text = String(reason || "").trim();
  if (!text) return null;
  return (
    <button
      type="button"
      className="reject-reason-trigger"
      title="Xem lý do từ chối"
      onClick={() => window.alert(`Lý do từ chối:\n\n${text}`)}
    >
      <Info size={14} />
    </button>
  );
}

type LessonInfoCardProps = {
  activeSection: "content" | "quiz" | "assignment";
  lessonTitle: string;
  setLessonTitle: Dispatch<SetStateAction<string>>;
  lessonDescription: string;
  setLessonDescription: Dispatch<SetStateAction<string>>;
  moduleOptions: ModuleItem[];
  selectedModuleId: number | null;
  setSelectedModuleId: Dispatch<SetStateAction<number | null>>;
  showNewModuleInput: boolean;
  setShowNewModuleInput: Dispatch<SetStateAction<boolean>>;
  pendingNewModuleTitle: string;
  setPendingNewModuleTitle: Dispatch<SetStateAction<string>>;
  saving: boolean;
  loading: boolean;
  saveLessonMeta: () => void;
  createModuleFromStudio: () => Promise<void>;
  readOnly?: boolean;
};

export function LessonInfoCard({
  activeSection,
  lessonTitle,
  setLessonTitle,
  lessonDescription,
  setLessonDescription,
  moduleOptions,
  selectedModuleId,
  setSelectedModuleId,
  showNewModuleInput,
  setShowNewModuleInput,
  pendingNewModuleTitle,
  setPendingNewModuleTitle,
  saving,
  loading,
  saveLessonMeta,
  createModuleFromStudio,
  readOnly = false,
}: LessonInfoCardProps) {
  return (
    <div className="studio-card">
      <div className="studio-card-header">
        <div className="studio-card-title">
          <Edit3 size={18} />
          <h2>Thông tin bài học</h2>
        </div>
        <button type="button" className="btn-primary" onClick={saveLessonMeta} disabled={readOnly || saving || loading}>
          <Save size={16} />
          Lưu
        </button>
      </div>
      <div className="studio-card-content">
        <div className="form-group">
          <label className="form-label">Chương</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              className="form-input"
              value={selectedModuleId ?? ""}
              onChange={(e) => setSelectedModuleId(Number(e.target.value))}
              disabled={readOnly || saving || loading || !moduleOptions.length}
            >
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "auto", padding: "0.45rem" }}
              onClick={() => void createModuleFromStudio()}
              disabled={readOnly || saving || loading}
              title="Thêm chương mới"
            >
              <Plus size={16} />
            </button>
          </div>
          {showNewModuleInput && (
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                className="form-input"
                placeholder="Nhập tên chương mới (sẽ tạo khi bấm Lưu thông tin)"
                value={pendingNewModuleTitle}
                onChange={(e) => setPendingNewModuleTitle(e.target.value)}
                disabled={readOnly || saving || loading}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "0.45rem" }}
                onClick={() => {
                  setShowNewModuleInput(false);
                  setPendingNewModuleTitle("");
                }}
                disabled={readOnly || saving || loading}
                title="Hủy tạo chương mới"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">
            {activeSection === "quiz" ? "Quizz" : activeSection === "assignment" ? "Bài tập" : "Bài học"}
          </label>
          <input
            className="form-input"
            placeholder={
              activeSection === "quiz"
                ? "Nhập tên Quizz"
                : activeSection === "assignment"
                  ? "Nhập tên bài tập"
                  : "Nhập tên bài học"
            }
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            disabled={readOnly || saving || loading}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mô tả ngắn (tùy chọn)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Mô tả nội dung bài học..."
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
            disabled={readOnly || saving || loading}
          />
        </div>
      </div>
    </div>
  );
}

type ContentEditorSectionProps = {
  activeSection: "content" | "quiz" | "assignment";
  isAssessmentLesson: boolean;
  videoInputMode: "file" | "youtube";
  setVideoInputMode: Dispatch<SetStateAction<"file" | "youtube">>;
  saving: boolean;
  loading: boolean;
  setPendingFile: Dispatch<SetStateAction<File | null>>;
  pendingFile: File | null;
  uploadFile: () => Promise<void>;
  uploadProgress: number | null;
  youtubeUrl: string;
  setYoutubeUrl: Dispatch<SetStateAction<string>>;
  addYoutube: () => Promise<void>;
  currentVideoResource: LessonResource | null;
  currentYoutubeId: string | null;
  removeResource: (resourceId: number, resourceName?: string) => Promise<void>;
  otherResources: LessonResource[];
  contentHtmlResource: LessonResource | null;
  saveStudio: () => Promise<void>;
  richHtml: string;
  setRichHtml: Dispatch<SetStateAction<string>>;
  isRejectedContext?: boolean;
  readOnly?: boolean;
};

export function ContentEditorSection({
  activeSection,
  isAssessmentLesson,
  videoInputMode,
  setVideoInputMode,
  saving,
  loading,
  setPendingFile,
  pendingFile,
  uploadFile,
  uploadProgress,
  youtubeUrl,
  setYoutubeUrl,
  addYoutube,
  currentVideoResource,
  currentYoutubeId,
  removeResource,
  otherResources,
  contentHtmlResource,
  saveStudio,
  richHtml,
  setRichHtml,
  isRejectedContext = false,
  readOnly = false,
}: ContentEditorSectionProps) {
  if (activeSection !== "content" || isAssessmentLesson) return null;
  return (
    <>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <Video size={18} />
            <h2>Video / Tài nguyên</h2>
          </div>
        </div>
        <div className="studio-card-content">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <button
              type="button"
              className={videoInputMode === "file" ? "btn-primary" : "btn-secondary"}
              onClick={() => setVideoInputMode("file")}
              disabled={readOnly || saving || loading}
              style={{ width: "auto" }}
            >
              <Upload size={16} />
              Upload file
            </button>
            <button
              type="button"
              className={videoInputMode === "youtube" ? "btn-primary" : "btn-secondary"}
              onClick={() => setVideoInputMode("youtube")}
              disabled={readOnly || saving || loading}
              style={{ width: "auto" }}
            >
              <Youtube size={16} />
              YouTube
            </button>
          </div>
          {videoInputMode === "file" ? (
            <div className="upload-section">
              <div className="upload-row">
                <label className="btn-secondary" style={{ cursor: "pointer" }}>
                  <Upload size={16} />
                  Chọn file
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                    disabled={readOnly || saving || loading}
                    accept="video/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  />
                </label>
                <span className="file-name">{pendingFile ? pendingFile.name : "Chưa chọn file"}</span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void uploadFile()}
                  disabled={readOnly || saving || loading || !pendingFile}
                >
                  {uploadProgress !== null ? `${uploadProgress}%` : "Upload"}
                </button>
              </div>
              {uploadProgress !== null && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="youtube-section">
              <div className="youtube-row">
                <Youtube size={18} className="youtube-icon" />
                <input
                  className="form-input"
                  placeholder="Dán link YouTube để thêm video..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={readOnly || saving || loading}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void addYoutube()}
                  disabled={readOnly || saving || loading || !youtubeUrl.trim()}
                >
                  <Plus size={16} />
                  Thêm
                </button>
              </div>
            </div>
          )}
          <div className="current-video-section">
            <div className="section-label">Video hiện tại</div>
            {currentVideoResource ? (
              <div className="current-video-item">
                <div className="video-info">
                  {currentYoutubeId ? <Youtube size={16} /> : <Video size={16} />}
                  <span className="video-name">{currentVideoResource.filename || currentVideoResource.url || "Video"}</span>
                  <span className={`resource-review-badge ${getReviewStatusLabel(currentVideoResource.review_status).className}`}>
                    {getReviewStatusLabel(currentVideoResource.review_status).text}
                  </span>
                  {currentVideoResource.review_status === "rejected" ? (
                    <RejectReasonButton reason={currentVideoResource.review_reason} />
                  ) : null}
                  {currentVideoResource.review_status === "pending" && currentVideoResource.is_resubmitted ? (
                    <span className="resource-review-badge review-pending">Đã gửi lại chờ duyệt</span>
                  ) : null}
                  {currentVideoResource.size_bytes && (
                    <span className="video-size">{formatFileSize(currentVideoResource.size_bytes)}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => void removeResource(currentVideoResource.id, currentVideoResource.filename || "video")}
                  disabled={readOnly || saving}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <Video size={32} />
                <p>Chưa có video. Hãy upload file hoặc thêm link YouTube.</p>
              </div>
            )}
          </div>
          {otherResources.length > 0 && (
            <div className="other-resources-section">
              <div className="section-label">Tài nguyên khác</div>
              {otherResources.map((r) => (
                <div key={r.id} className="resource-item">
                  <div className="resource-info">
                    <FileText size={16} />
                    <span className="resource-name">{r.filename || "Tài nguyên"}</span>
                    <span className={`resource-review-badge ${getReviewStatusLabel(r.review_status).className}`}>
                      {getReviewStatusLabel(r.review_status).text}
                    </span>
                    {r.review_status === "rejected" ? <RejectReasonButton reason={r.review_reason} /> : null}
                    {r.review_status === "pending" && r.is_resubmitted ? (
                      <span className="resource-review-badge review-pending">Đã gửi lại</span>
                    ) : null}
                    {r.size_bytes && <span className="resource-size">{formatFileSize(r.size_bytes)}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-icon-danger"
                    onClick={() => void removeResource(r.id, r.filename || "tài nguyên")}
                    disabled={saving}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <FileText size={18} />
            <h2>Nội dung phụ</h2>
            {contentHtmlResource ? (
              <>
                <span className={`resource-review-badge ${getReviewStatusLabel(contentHtmlResource.review_status).className}`}>
                  {getReviewStatusLabel(contentHtmlResource.review_status).text}
                </span>
                {contentHtmlResource.review_status === "rejected" ? (
                  <RejectReasonButton reason={contentHtmlResource.review_reason} />
                ) : null}
              </>
            ) : null}
          </div>
          <button
            type="button"
            className={isRejectedContext ? "btn-resubmit-warning" : "btn-primary"}
            onClick={() => void saveStudio()}
            disabled={readOnly || saving || loading}
          >
            <Save size={16} />
            {isRejectedContext ? "Gửi lại" : "Lưu"}
          </button>
        </div>
        <div className="studio-card-content">
          <LessonRichTextEditor value={richHtml} onChange={setRichHtml} disabled={readOnly || saving || loading} />
          <div className="editor-hint">
            <Info size={14} />
            <span>Hỗ trợ định dạng văn bản, hình ảnh, video nhúng. Nội dung sẽ được lưu dưới dạng HTML.</span>
          </div>
        </div>
      </div>
    </>
  );
}

type QuizEditorSectionProps = {
  activeSection: "content" | "quiz" | "assignment";
  fixedCourses: Array<{ id: number; title: string }>;
  token: string | null;
  loading: boolean;
  saving: boolean;
  courseId: number;
  lessonId: number;
  lessonTitle: string;
  setSavedQuizQuestions: Dispatch<SetStateAction<SavedQuizQuestion[]>>;
  setQuizPreviewConfig: Dispatch<SetStateAction<QuizPreviewConfig>>;
  quizSaveSignal: number;
  setQuizSaveSignal: Dispatch<SetStateAction<number>>;
  quizQuestionsDraft: SavedQuizQuestion[];
  setQuizQuestionsDraft: Dispatch<SetStateAction<SavedQuizQuestion[]>>;
  expandedSavedQuestions: number[];
  setExpandedSavedQuestions: Dispatch<SetStateAction<number[]>>;
  editingSavedQuestions: number[];
  setEditingSavedQuestions: Dispatch<SetStateAction<number[]>>;
  editingBuffers: Record<number, SavedQuizQuestion>;
  setEditingBuffers: Dispatch<SetStateAction<Record<number, SavedQuizQuestion>>>;
  quizReviewResource: LessonResource | null;
  isRejectedContext?: boolean;
  readOnly?: boolean;
};

export function QuizEditorSection({
  activeSection,
  fixedCourses,
  token,
  loading,
  saving,
  courseId,
  lessonId,
  lessonTitle,
  setSavedQuizQuestions,
  setQuizPreviewConfig,
  quizSaveSignal,
  setQuizSaveSignal,
  quizQuestionsDraft,
  setQuizQuestionsDraft,
  expandedSavedQuestions,
  setExpandedSavedQuestions,
  editingSavedQuestions,
  setEditingSavedQuestions,
  editingBuffers,
  setEditingBuffers,
  quizReviewResource,
  isRejectedContext = false,
  readOnly = false,
}: QuizEditorSectionProps) {
  if (activeSection !== "quiz") return null;
  return (
    <>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <FileText size={18} />
            <h2>Quizz</h2>
            {quizReviewResource ? (
              <>
                <span className={`resource-review-badge ${getReviewStatusLabel(quizReviewResource.review_status).className}`}>
                  {getReviewStatusLabel(quizReviewResource.review_status).text}
                </span>
                {quizReviewResource.review_status === "rejected" ? (
                  <RejectReasonButton reason={quizReviewResource.review_reason} />
                ) : null}
              </>
            ) : null}
          </div>
          <button
            type="button"
            className={isRejectedContext ? "btn-resubmit-warning" : "btn-primary"}
            onClick={() => setQuizSaveSignal((prev) => prev + 1)}
            disabled={readOnly || loading || saving}
          >
            <Save size={16} />
            {isRejectedContext ? "Gửi lại" : "Luu"}
          </button>
        </div>
        <div className="studio-card-content" style={{ paddingTop: "0.85rem" }}>
          <ManualQuizEditor
            courses={fixedCourses}
            token={token}
            loading={loading || saving || readOnly}
            selectedCourseId={courseId}
            onSelectedCourseIdChange={() => {}}
            pickedLessonId={lessonId}
            embeddedMode
            embeddedQuizTitle={lessonTitle}
            showSavedQuestionsSection={false}
            onSavedQuestionsChange={setSavedQuizQuestions}
            onQuizConfigChange={setQuizPreviewConfig}
            hideSaveButton
            externalSaveSignal={quizSaveSignal}
            questionsOverride={quizQuestionsDraft}
          />
        </div>
      </div>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <FileText size={18} />
            <h2>Danh sach cau hoi</h2>
          </div>
          {!!quizQuestionsDraft.length && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={isRejectedContext ? "btn-resubmit-warning" : "btn-primary"}
                style={{ width: "auto", padding: "6px 10px" }}
                title="Luu thay doi danh sach cau hoi"
                onClick={() => setQuizSaveSignal((prev) => prev + 1)}
                disabled={readOnly || loading || saving}
              >
                <Save size={16} />
                {isRejectedContext ? "Gửi lại" : "Luu"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "6px 8px" }}
                title="Mo rong tat ca"
                onClick={() => setExpandedSavedQuestions(quizQuestionsDraft.map((_, idx) => idx))}
                disabled={readOnly}
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "6px 8px" }}
                title="Thu gon tat ca"
                onClick={() => setExpandedSavedQuestions([])}
                disabled={readOnly}
              >
                <ChevronUp size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="studio-card-content" style={{ paddingTop: "0.85rem" }}>
          {!quizQuestionsDraft.length ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              Chua co cau hoi da luu. Nhap thu cong trong khoi Quizz va bam Luu Quizz de cap nhat danh sach.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {quizQuestionsDraft.map((item, idx) => {
                const correct = item.options.find((o) => o.is_correct)?.option_text || "(chua co)";
                const expanded = expandedSavedQuestions.includes(idx);
                return (
                  <div
                    key={`saved-question-${idx}`}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Cau {idx + 1}: {item.question_text || "(trong)"}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#475569", flex: 1 }}>Dap an dung: {correct}</div>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 8px" }}
                        title={editingSavedQuestions.includes(idx) ? "Tat chinh sua" : "Bat chinh sua"}
                        onClick={() => {
                          if (readOnly) return;
                          const isEditing = editingSavedQuestions.includes(idx);
                          setEditingSavedQuestions((prev) => (isEditing ? prev.filter((x) => x !== idx) : [...prev, idx]));
                          setEditingBuffers((prev) => {
                            if (isEditing) {
                              const next = { ...prev };
                              delete next[idx];
                              return next;
                            }
                            return { ...prev, [idx]: JSON.parse(JSON.stringify(item)) as SavedQuizQuestion };
                          });
                          setExpandedSavedQuestions((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 8px" }}
                        title="Xoa cau"
                        onClick={() => setQuizQuestionsDraft((prev) => prev.filter((_, qIdx) => qIdx !== idx))}
                        disabled={readOnly}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 8px" }}
                        title={expanded ? "Thu gon" : "Xem chi tiet"}
                        onClick={() =>
                          setExpandedSavedQuestions((prev) =>
                            prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                          )
                        }
                      >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

type AssignmentEditorSectionProps = {
  activeSection: "content" | "quiz" | "assignment";
  fixedCourses: Array<{ id: number; title: string }>;
  token: string | null;
  loading: boolean;
  saving: boolean;
  lessonId: number;
  setAssignmentShortQuestions: Dispatch<SetStateAction<AssignmentShortAnswerQuestion[]>>;
  setAssignmentPreview: Dispatch<SetStateAction<AssignmentStudioPreview | null>>;
  assignmentSaveSignal: number;
  setAssignmentSaveSignal: Dispatch<SetStateAction<number>>;
  assignmentEditSignal: number;
  setAssignmentEditSignal: Dispatch<SetStateAction<number>>;
  assignmentCancelEditSignal: number;
  setAssignmentCancelEditSignal: Dispatch<SetStateAction<number>>;
  assignmentLocked: boolean;
  setAssignmentLocked: Dispatch<SetStateAction<boolean>>;
  assignmentEditing: boolean;
  setAssignmentEditing: Dispatch<SetStateAction<boolean>>;
  setAssignmentDirty: Dispatch<SetStateAction<boolean>>;
  requestedAssignmentKind: AssignmentKind | null;
  autoSaveKindSwitch: boolean;
  assignmentPreview: AssignmentStudioPreview | null;
  currentAssignmentKind: AssignmentKind;
  assignmentShortQuestions: AssignmentShortAnswerQuestion[];
  pendingAssignmentFiles: File[];
  setPendingAssignmentFiles: Dispatch<SetStateAction<File[]>>;
  appendAssignmentAttachments: () => Promise<void>;
  removeAssignmentAttachment: (filePath: string) => Promise<void>;
  isRejectedContext?: boolean;
  readOnly?: boolean;
};

export function AssignmentEditorSection({
  activeSection,
  fixedCourses,
  token,
  loading,
  saving,
  lessonId,
  setAssignmentShortQuestions,
  setAssignmentPreview,
  assignmentSaveSignal,
  setAssignmentSaveSignal,
  assignmentEditSignal,
  setAssignmentEditSignal,
  assignmentCancelEditSignal,
  setAssignmentCancelEditSignal,
  assignmentLocked,
  setAssignmentLocked,
  assignmentEditing,
  setAssignmentEditing,
  setAssignmentDirty,
  requestedAssignmentKind,
  autoSaveKindSwitch,
  assignmentPreview,
  currentAssignmentKind,
  assignmentShortQuestions,
  pendingAssignmentFiles,
  setPendingAssignmentFiles,
  appendAssignmentAttachments,
  removeAssignmentAttachment,
  isRejectedContext = false,
  readOnly = false,
}: AssignmentEditorSectionProps) {
  if (activeSection !== "assignment") return null;
  return (
    <>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <FileText size={18} />
            <h2>Bai tap</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={isRejectedContext ? "btn-resubmit-warning" : "btn-primary"}
              onClick={() => setAssignmentSaveSignal((prev) => prev + 1)}
              disabled={readOnly || saving || loading}
            >
              <Save size={16} />
              {isRejectedContext ? "Gửi lại" : "Luu"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (assignmentEditing) {
                  setAssignmentLocked(true);
                  setAssignmentEditing(false);
                  setAssignmentCancelEditSignal((prev) => prev + 1);
                  return;
                }
                setAssignmentLocked(false);
                setAssignmentEditing(true);
                setAssignmentEditSignal((prev) => prev + 1);
              }}
              disabled={readOnly || saving || loading || !assignmentPreview}
            >
              <Pencil size={16} />
              {assignmentEditing ? "Huy chinh sua" : "Chinh sua"}
            </button>
          </div>
        </div>
        <div className="studio-card-content" style={{ paddingTop: "0.85rem" }}>
          <AssignmentEditor
            courses={fixedCourses}
            token={token}
            loading={loading || saving || readOnly}
            pickedLessonId={lessonId}
            embeddedMode
            hidePreviewSections
            onShortAnswerQuestionsChange={setAssignmentShortQuestions}
            onAssignmentPreviewChange={setAssignmentPreview}
            saveSignal={assignmentSaveSignal}
            editSignal={assignmentEditSignal}
            cancelEditSignal={assignmentCancelEditSignal}
            forceReadOnly={assignmentLocked || readOnly}
            hidePrimarySaveButton
            hideInlineEditButton
            onSavedSuccessfully={() => {
              setAssignmentLocked(true);
              setAssignmentEditing(false);
            }}
            onDirtyChange={setAssignmentDirty}
            forcedAssignmentKind={requestedAssignmentKind}
            hideAssignmentKindSwitch={Boolean(requestedAssignmentKind)}
            autoSaveOnForcedKindSwitch={autoSaveKindSwitch}
          />
        </div>
      </div>
      <div className="studio-card">
        <div className="studio-card-header">
          <div className="studio-card-title">
            <FileText size={18} />
            <h2>{currentAssignmentKind === "short_answer" ? "Danh sach cau tra loi ngan" : "Danh sach file dinh kem"}</h2>
          </div>
        </div>
        <div className="studio-card-content" style={{ paddingTop: "0.85rem" }}>
          {assignmentPreview ? (
            <div style={{ display: "grid", gap: 8 }}>
              {currentAssignmentKind === "short_answer" ? (
                !assignmentShortQuestions.length ? (
                  <p style={{ margin: 0, color: "#64748b" }}>Chua co cau hoi tra loi ngan.</p>
                ) : (
                  assignmentShortQuestions
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((item, idx) => (
                      <div
                        key={`assignment-short-question-${item.id}-${idx}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          background: "#f8fafc",
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        <strong style={{ color: "#0f172a" }}>Cau {idx + 1}:</strong> {item.question_text || "(trong)"}
                      </div>
                    ))
                )
              ) : (
                <>
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: 10,
                      padding: "10px",
                      background: "#f8fafc",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setPendingAssignmentFiles(Array.from(e.target.files || []))}
                      disabled={readOnly || saving || loading}
                    />
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {pendingAssignmentFiles.length
                        ? `Da chon ${pendingAssignmentFiles.length} file de chen them.`
                        : "Chua chon file moi."}
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "fit-content" }}
                      onClick={() => void appendAssignmentAttachments()}
                      disabled={readOnly || saving || loading || !pendingAssignmentFiles.length}
                    >
                      <Upload size={15} />
                      Them file vao danh sach
                    </button>
                  </div>
                  {assignmentPreview.attachments?.length ? (
                    assignmentPreview.attachments.map((attachment, idx) => (
                      <div
                        key={`assignment-attachment-${attachment.file_path}-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          background: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: "#334155",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={attachment.file_name || "Tep dinh kem"}
                        >
                          {attachment.file_name || "Tep dinh kem"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <a href={attachment.signed_url} target="_blank" rel="noreferrer" className="attachment-link">
                            <LinkIcon size={14} />
                            Mo
                          </a>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: "auto", padding: "0.35rem 0.55rem" }}
                            onClick={() => void removeAssignmentAttachment(attachment.file_path)}
                            disabled={readOnly || saving || loading}
                            title="Xoa file dinh kem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: "#64748b" }}>Chua co file dinh kem.</div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#64748b" }}>Chua co bai tap da luu de hien thi thong tin.</p>
          )}
        </div>
      </div>
    </>
  );
}
