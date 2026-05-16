import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  FileText,
  CheckCircle2,
  FolderArchive,
  FileDown,
  Package,
  Download,
  Bold,
  Italic,
  List,
  Link2,
  UploadCloud,
  CalendarClock,
  History,
  CheckCheck,
  Mail,
  TrendingUp,
  Users,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { ASSIGNMENTS_API } from '../../api/assignments';
import { getAccessToken } from '../../utils/authStorage';
import './AssignmentSubmission.css';

interface ResourceItem {
  key: string;
  name: string;
  size: string;
  type: string;
  icon: React.ReactNode;
  href?: string;
}

interface HistoryItem {
  key: string;
  title: string;
  score?: string;
  status: 'passed' | 'pending';
  meta: string;
  badge?: string;
}

interface AssignmentPayload {
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
  attachments: { file_name: string; file_path: string; signed_url: string; file_size?: number }[];
  assignment_kind: 'file_prompt' | 'short_answer';
  short_answer_questions: { id: string; question_text: string; order_index: number }[];
  time_limit_minutes: number | null;
}

interface GradeRow {
  submission_id: number | null;
  status?: string | null;
  submitted_at?: string | null;
  score?: number | string | null;
  feedback_text?: string | null;
  graded_at?: string | null;
  resubmission_count?: number | null;
}

const fallbackInstructions = [
  'Analyze the provided "Current Dashboard" PDF to identify at least 5 major accessibility violations.',
  'Create a high-fidelity prototype in Figma (or your choice of tool) showcasing the redesigned components.',
  'Write a 500-word reflection explaining your design choices and how they solve the identified issues.',
  'Ensure all typography meets the minimum 4.5:1 contrast ratio.',
];

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDueLabel = (iso: string | null): { label: string; pill: string | null; isPast: boolean } => {
  if (!iso) return { label: 'No deadline', pill: null, isPast: false };
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return { label: 'No deadline', pill: null, isPast: false };
  const now = Date.now();
  const diffMs = due.getTime() - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const label = due.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (diffMs < 0) {
    return { label, pill: 'OVERDUE', isPast: true };
  }
  if (days === 0) {
    return { label, pill: 'DUE TODAY', isPast: false };
  }
  if (days < 7) {
    return { label, pill: `${days} DAY${days === 1 ? '' : 'S'} LEFT`, isPast: false };
  }
  return { label, pill: null, isPast: false };
};

const AssignmentSubmission: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const queryLessonId = Number(
    routeParams.lessonId ?? searchParams.get('lessonId') ?? ''
  );
  const lessonTitleFromQuery = searchParams.get('title') || '';

  const [reflection, setReflection] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [assignment, setAssignment] = useState<AssignmentPayload | null>(null);
  const [grade, setGrade] = useState<GradeRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!queryLessonId || Number.isNaN(queryLessonId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `${url}${ASSIGNMENTS_API.learnerAssignmentForLesson(queryLessonId)}`,
          { headers }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error((data as any)?.message || 'Could not load assignment.');
        if (cancelled) return;
        setAssignment(data as AssignmentPayload);

        const gradeRes = await fetch(
          `${url}${ASSIGNMENTS_API.myAssignmentGrade((data as AssignmentPayload).assignment_id)}`,
          { headers }
        );
        const gradeJson = await gradeRes.json().catch(() => ({}));
        if (gradeRes.ok && !cancelled) {
          setGrade(((gradeJson as any)?.data ?? gradeJson) as GradeRow);
        }
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load assignment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [queryLessonId]);

  const instructions = useMemo(() => {
    if (!assignment?.description) return fallbackInstructions.map((t, i) => ({ key: `i${i}`, text: t }));
    return assignment.description
      .split(/\r?\n|•/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((t, i) => ({ key: `i${i}`, text: t }));
  }, [assignment]);

  const resources: ResourceItem[] = useMemo(() => {
    if (!assignment?.attachments?.length) {
      return [
        {
          key: 'r1',
          name: 'Project_Brief.pdf',
          size: '2.4 MB',
          type: 'PDF Document',
          icon: <FileDown size={24} strokeWidth={2} />,
        },
        {
          key: 'r2',
          name: 'Assets_Pack.zip',
          size: '45.8 MB',
          type: 'Compressed Archive',
          icon: <Package size={24} strokeWidth={2} />,
        },
      ];
    }
    return assignment.attachments.map((a, idx) => ({
      key: `att-${idx}`,
      name: a.file_name,
      size: formatBytes(a.file_size),
      type: a.file_name.split('.').pop()?.toUpperCase() || 'File',
      icon: a.file_name.toLowerCase().endsWith('.pdf') ? (
        <FileDown size={24} strokeWidth={2} />
      ) : (
        <Package size={24} strokeWidth={2} />
      ),
      href: a.signed_url,
    }));
  }, [assignment]);

  const dueInfo = useMemo(
    () => formatDueLabel(assignment?.due_date ?? null),
    [assignment]
  );

  const submissionHistory: HistoryItem[] = useMemo(() => {
    const items: HistoryItem[] = [];
    if (grade?.submission_id) {
      const isGraded = grade.status === 'graded' || grade.graded_at != null;
      items.push({
        key: 'g-current',
        title: `Attempt ${(grade.resubmission_count ?? 0) + 1}`,
        score: isGraded && grade.score != null
          ? `${grade.score}/${assignment?.max_score ?? 100}`
          : undefined,
        status: isGraded ? 'passed' : 'pending',
        meta: grade.submitted_at
          ? new Date(grade.submitted_at).toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Awaiting review',
        badge: isGraded ? 'Graded' : 'Pending',
      });
    }
    items.push({
      key: 'g-draft',
      title: reflection.length > 0 || files.length > 0 ? 'New Submission' : 'No draft yet',
      status: 'pending',
      meta:
        reflection.length > 0 || files.length > 0
          ? `Draft prepared (${reflection.length} chars, ${files.length} file${
              files.length === 1 ? '' : 's'
            })`
          : 'Type your reflection or attach files to begin.',
    });
    return items;
  }, [grade, reflection, files, assignment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitOk(null);

    if (!assignment) {
      setSubmitError(
        'Open this page from a lesson (?lessonId=…) to load the assignment to submit.'
      );
      return;
    }
    const hasText = reflection.trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasText && !hasFiles) {
      setSubmitError('Please add a reflection or attach at least one file.');
      return;
    }

    setSubmitting(true);
    try {
      const token = getAccessToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const form = new FormData();
      if (hasText) form.append('text_submission', reflection.trim());
      for (const f of files) form.append('files', f);

      const res = await fetch(
        `${url}${ASSIGNMENTS_API.submitAssignment(assignment.assignment_id)}`,
        {
          method: 'POST',
          headers,
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.message || 'Failed to submit assignment.');
      }
      setSubmitOk(String((data as any)?.message || 'Assignment submitted successfully.'));
      setFiles([]);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setReflection('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSubmitOk(null);
    setSubmitError(null);
  };

  return (
    <div className="as-page">
      <main className="as-main">
        <header className="as-page-head">
          <nav className="as-crumbs">
            <span className="as-crumb">My Courses</span>
            <ChevronRight size={14} strokeWidth={2.2} className="as-crumb-sep" />
            <span className="as-crumb">UI/UX Design Masterclass</span>
            <ChevronRight size={14} strokeWidth={2.2} className="as-crumb-sep" />
            <span className="as-crumb as-crumb--active">Assignments</span>
          </nav>
          <h1 className="as-page-title">
            {assignment?.title ||
              lessonTitleFromQuery ||
              'Project: Designing an Accessibility-First Dashboard'}
          </h1>
        </header>

        {!queryLessonId && (
          <div className="as-hint-banner">
            Add <code>?lessonId=&lt;id&gt;</code> to the URL to load a specific
            assignment, or open this page from a lesson card to auto-bind.
          </div>
        )}
        {loadError && <div className="as-error-banner">{loadError}</div>}

        <div className="as-grid">
          <div className="as-col-main">
            <section className="as-card as-overview">
              <h2 className="as-section-title">
                <span className="as-section-icon as-section-icon--teal">
                  <FileText size={18} strokeWidth={2.2} />
                </span>
                Assignment Overview
              </h2>
              <p className="as-overview-body">
                {assignment?.description ||
                  'In this final project, you are tasked with redesigning a complex financial dashboard with a primary focus on WCAG 2.1 Level AA compliance. You must consider color contrast, screen reader compatibility, and keyboard navigation.'}
              </p>

              <h3 className="as-overview-sub">Detailed Instructions</h3>
              <ul className="as-instructions">
                {instructions.map((inst) => (
                  <li key={inst.key} className="as-instruction">
                    <span className="as-check-icon">
                      <CheckCircle2 size={18} strokeWidth={2.2} />
                    </span>
                    <span className="as-instruction-text">{inst.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="as-resources">
              <div className="as-resources-glow" />
              <h2 className="as-section-title as-section-title--dark">
                <span className="as-section-icon as-section-icon--dark">
                  <FolderArchive size={18} strokeWidth={2.2} />
                </span>
                Learning Resources
              </h2>

              <div className="as-resources-grid">
                {resources.map((r) => (
                  <a
                    key={r.key}
                    href={r.href || '#'}
                    target={r.href ? '_blank' : undefined}
                    rel={r.href ? 'noreferrer' : undefined}
                    className="as-resource"
                  >
                    <span className="as-resource-icon">{r.icon}</span>
                    <div className="as-resource-info">
                      <div className="as-resource-name">{r.name}</div>
                      <div className="as-resource-meta">
                        {r.size} • {r.type}
                      </div>
                    </div>
                    <span className="as-resource-download">
                      <Download size={18} strokeWidth={2.2} />
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section className="as-card as-submission">
              <h2 className="as-section-title">Your Submission</h2>

              <div className="as-field">
                <label className="as-label" htmlFor="as-reflection">
                  Written Reflection
                </label>
                <div className="as-editor">
                  <div className="as-editor-toolbar">
                    <button type="button" className="as-tool" aria-label="Bold">
                      <Bold size={15} strokeWidth={2.2} />
                    </button>
                    <button type="button" className="as-tool" aria-label="Italic">
                      <Italic size={15} strokeWidth={2.2} />
                    </button>
                    <button type="button" className="as-tool" aria-label="List">
                      <List size={15} strokeWidth={2.2} />
                    </button>
                    <span className="as-tool-divider" />
                    <button type="button" className="as-tool" aria-label="Link">
                      <Link2 size={15} strokeWidth={2.2} />
                    </button>
                    <span className="as-editor-counter">
                      {reflection.trim().length} chars
                    </span>
                  </div>
                  <textarea
                    id="as-reflection"
                    className="as-textarea"
                    placeholder="Type your reflection here..."
                    rows={6}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                  />
                </div>
              </div>

              <div className="as-field">
                <label className="as-label">Upload Project Files</label>
                <label className="as-dropzone">
                  <span className="as-drop-icon">
                    <UploadCloud size={28} strokeWidth={2} />
                  </span>
                  <span className="as-drop-title">
                    Click to upload or drag and drop
                  </span>
                  <span className="as-drop-sub">
                    {assignment?.allowed_formats?.length
                      ? `Allowed: ${assignment.allowed_formats.join(', ')}`
                      : 'Figma Link, PDF, or ZIP (max. 100MB)'}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="as-drop-input"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>

                {files.length > 0 && (
                  <ul className="as-file-list">
                    {files.map((f, idx) => (
                      <li key={`${f.name}-${idx}`} className="as-file-row">
                        <span className="as-file-name">{f.name}</span>
                        <span className="as-file-size">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          className="as-file-remove"
                          onClick={() => handleRemoveFile(idx)}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={14} strokeWidth={2.4} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {submitError && <div className="as-error-banner">{submitError}</div>}
              {submitOk && <div className="as-success-banner">{submitOk}</div>}

              <div className="as-submit-row">
                <button
                  type="button"
                  className="as-cancel-btn-inline"
                  onClick={handleDiscard}
                  disabled={submitting}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="as-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 size={16} className="as-spin" />
                  ) : (
                    <Send size={16} strokeWidth={2.4} />
                  )}
                  {submitting ? 'Submitting…' : 'Submit Assignment'}
                </button>
              </div>
            </section>
          </div>

          <aside className="as-col-side">
            <div className="as-card as-info">
              <div className="as-info-row">
                <div className="as-info-block">
                  <div className="as-info-head">
                    <span className="as-info-label">Due Date</span>
                    {dueInfo.pill && (
                      <span className={`as-info-pill ${dueInfo.isPast ? 'as-info-pill--past' : ''}`}>
                        {dueInfo.pill}
                      </span>
                    )}
                  </div>
                  <div className="as-info-value">
                    <span className="as-info-icon">
                      <CalendarClock size={20} strokeWidth={2.2} />
                    </span>
                    <span className="as-info-text">{dueInfo.label}</span>
                  </div>
                </div>
              </div>

              <div className="as-info-divider" />

              <div className="as-info-row">
                <div className="as-info-block">
                  <div className="as-info-label">Passing Score</div>
                  <div className="as-score">
                    <span className="as-score-value">
                      {assignment?.passing_score ?? '—'}
                    </span>
                    <span className="as-score-unit">
                      / {assignment?.max_score ?? 100} points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="as-card as-history">
              <h3 className="as-side-title">
                <History size={16} strokeWidth={2.2} />
                Submission History
              </h3>

              <div className="as-timeline">
                {submissionHistory.map((h, idx) => (
                  <div key={h.key} className="as-history-item">
                    <div
                      className={`as-history-dot ${
                        h.status === 'passed'
                          ? 'as-history-dot--passed'
                          : 'as-history-dot--pending'
                      }`}
                    >
                      {h.status === 'passed' ? (
                        <CheckCheck size={14} strokeWidth={2.4} />
                      ) : (
                        <History size={14} strokeWidth={2.2} />
                      )}
                    </div>
                    {idx < submissionHistory.length - 1 && (
                      <span className="as-history-line" />
                    )}
                    <div className="as-history-content">
                      <div className="as-history-row">
                        <span className="as-history-title">{h.title}</span>
                        {h.score ? (
                          <span className="as-history-score">{h.score}</span>
                        ) : (
                          <span className="as-history-pending">Pending</span>
                        )}
                      </div>
                      <div className="as-history-meta">{h.meta}</div>
                      {h.badge && (
                        <span className="as-history-badge">{h.badge}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="as-instructor">
              <span className="as-instructor-glow" />
              <h3 className="as-instructor-eyebrow">Instructor Support</h3>
              <div className="as-instructor-row">
                <div className="as-instructor-avatar">
                  <img
                    alt="Instructor"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEDCmFmnsc0cnPX0wd-rl2xzTgoGGEfgMyJj1qzK_D9m-gAu_yxGC7CEDwmfGPugR6Wkr1z4OQz4gkH_CXBfyjVc2-OzDfls3QQo3pMz_O_g5N3OiOPPWkZ3XcZD7Za1FI0D5Kq8HIJNLe3PTVspLF_EMQwlVYxyeI0--N25CNGSJPYMifb0VA6gZDvp70HPudehlsBRtLw18Di3f7FaUBqL0UWQ92MiYEzR4KSX6AdJ1xpjf5oIRiiwG1QBqxENWiI26_Xt6eiQ"
                  />
                </div>
                <div className="as-instructor-info">
                  <div className="as-instructor-name">Sarah Jenkins</div>
                  <div className="as-instructor-role">Senior UX Architect</div>
                </div>
              </div>
              <button type="button" className="as-ask-btn">
                <Mail size={16} strokeWidth={2.2} />
                Ask a Question
              </button>
              <p className="as-instructor-note">
                Typical response time: <strong>under 2 hours</strong>
              </p>
            </div>

            <div className="as-stats">
              <div className="as-stat as-stat--teal">
                <span className="as-stat-icon">
                  <TrendingUp size={16} strokeWidth={2.4} />
                </span>
                <div className="as-stat-label">Max Score</div>
                <div className="as-stat-value">{assignment?.max_score ?? 100}</div>
              </div>
              <div className="as-stat as-stat--sky">
                <span className="as-stat-icon">
                  <Users size={16} strokeWidth={2.4} />
                </span>
                <div className="as-stat-label">Attempts</div>
                <div className="as-stat-value">
                  {assignment?.allow_resubmission
                    ? `${(grade?.resubmission_count ?? 0) + (grade?.submission_id ? 1 : 0)}/${(assignment.max_resubmissions || 0) + 1}`
                    : '1/1'}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {loading && (
        <div className="as-loading-overlay">
          <Loader2 size={20} className="as-spin" />
          <span>Loading assignment…</span>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmission;
