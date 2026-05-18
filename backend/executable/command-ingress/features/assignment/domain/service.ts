import { In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import Assignment from '../../../../../internal/model/assignment';
import GradeItem from '../../../../../internal/model/grade_items';
import Submission from '../../../../../internal/model/submissions';
import SubmissionAttachment from '../../../../../internal/model/submission_attachment';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import LessonProgress from '../../../../../internal/model/lesson_progress';
import LessonResource from '../../../../../internal/model/lesson_resource';
import LessonResourceReviewEvent from '../../../../../internal/model/lesson_resource_review_event';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import { uploadBufferToCloudinary, getSignedDeliveryUrl, isCloudinaryEnabled } from '../../../lib/cloudinary';
import type {
  AssignmentAttachmentPreview,
  AssignmentFormat,
  AssignmentKind,
  AssignmentService,
  AssignmentLearnerRosterResult,
  AssignmentLearnerRosterRow,
  AssignmentSubmissionListRow,
  CreateAssignmentRequest,
  ShortAnswerQuestionDef,
  UploadedAssignmentFile,
  UpdateAssignmentRequest,
  GradeSubmissionRequest
} from '../types';
import GradeEntity from '../../../../../internal/model/grade';
import SubmissionFeedback from '../../../../../internal/model/submission_feedback';

function safeJsonParse<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

async function isUserAdmin(userId: number): Promise<boolean> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } as any });
  if (!userRoles.length) return false;
  const roleIds = userRoles.map((ur: any) => Number(ur.role_id)).filter((id) => Number.isFinite(id));
  if (!roleIds.length) return false;
  const roles = await roleRepo.findByIds(roleIds);
  return roles.some((r: any) => String(r.name || '').toLowerCase() === 'admin');
}

function normalizeShortAnswerQuestionsForSave(raw: any): ShortAnswerQuestionDef[] {
  if (!Array.isArray(raw)) return [];
  const tmp: { text: string; oldId: string }[] = [];
  raw.forEach((q: any, i: number) => {
    const text = String(q?.question_text ?? '').trim();
    if (!text) return;
    tmp.push({ text, oldId: String(q?.id ?? `x${i}`) });
  });
  return tmp.map((row, i) => ({
    id: `q${i + 1}`,
    question_text: row.text,
    order_index: i,
  }));
}

function parseAssignmentKind(value: any): AssignmentKind {
  return String(value || '') === 'short_answer' ? 'short_answer' : 'file_prompt';
}

function mapShortAnswerQuestionsFromDb(raw: any): ShortAnswerQuestionDef[] {
  if (!Array.isArray(raw)) return [];
  return (raw as any[]).map((q, i) => ({
    id: String((q as any)?.id ?? `q${i + 1}`),
    question_text: String((q as any)?.question_text ?? ''),
    order_index: Number((q as any)?.order_index ?? i),
  }));
}

function getFormatFromFileName(fileName: string): AssignmentFormat | null {
  const ext = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (!ext) return null;

  // Normalize common image extensions
  if (ext === 'jpg') return 'jpg';
  if (ext === 'jpeg') return 'jpeg';
  if (ext === 'png') return 'png';

  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc') return 'doc';
  if (ext === 'docx') return 'docx';
  if (ext === 'xls') return 'xls';
  if (ext === 'xlsx') return 'xlsx';

  if (ext === 'zip') return 'zip';
  if (ext === 'rar') return 'rar';
  if (ext === '7z') return '7z';

  return null;
}

function mapRawToAssignmentSubmissionRow(r: any): AssignmentSubmissionListRow {
  let submissionShortAnswers: { question_id: string; answer_text: string }[] = [];
  const rawText = r.text_content != null ? String(r.text_content) : '';
  if (rawText) {
    try {
      const j = JSON.parse(rawText);
      if (j && j.kind === 'short_answer' && Array.isArray(j.answers)) {
        submissionShortAnswers = (j.answers as any[]).map((a) => ({
          question_id: String((a as any)?.question_id ?? ''),
          answer_text: String((a as any)?.answer_text ?? ''),
        }));
      }
    } catch {
      // plain text submission
    }
  }

  return {
    submission_id: Number(r.submission_id),
    user_id: Number(r.user_id),
    user_email: String(r.user_email ?? ''),
    user_full_name: String(r.user_full_name ?? ''),
    status: String(r.status ?? ''),
    submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
    is_late: Boolean(r.is_late),
    resubmission_count: Number(r.resubmission_count ?? 0),
    grade_item_id: r.grade_item_id != null ? Number(r.grade_item_id) : null,
    graded_score: r.graded_score != null ? Number(r.graded_score) : null,
    feedback_text: r.feedback_text != null ? String(r.feedback_text) : null,
    feedback_graded_at: r.feedback_graded_at ? new Date(r.feedback_graded_at).toISOString() : null,
    content_preview: buildSubmissionContentPreview(r.text_content, Number(r.attachment_count ?? 0)),
    attachment_count: Number(r.attachment_count ?? 0),
    attachment_files: [],
    submission_short_answers: submissionShortAnswers,
  };
}

function mapAttachmentRowsBySubmission(rows: any[]): Map<number, { file_name: string; file_path: string }[]> {
  const out = new Map<number, { file_name: string; file_path: string }[]>();
  for (const r of rows as any[]) {
    const sid = Number(r.submission_id);
    if (!Number.isFinite(sid)) continue;
    const cur = out.get(sid) ?? [];
    cur.push({
      file_name: String(r.file_name ?? ''),
      file_path: String(r.file_path ?? ''),
    });
    out.set(sid, cur);
  }
  return out;
}

function buildSubmissionContentPreview(textContent: string | null | undefined, attachmentCount: number): string {
  const n = Number(attachmentCount) || 0;
  const filePart = n > 0 ? `${n} file đính kèm` : '';
  if (!textContent || !String(textContent).trim()) {
    return filePart || '—';
  }
  const raw = String(textContent).trim();
  try {
    const j = JSON.parse(raw);
    if (j && j.kind === 'short_answer' && Array.isArray(j.answers)) {
      const lines = (j.answers as any[]).map((a, i) => `Câu ${i + 1}: ${String(a?.answer_text ?? '').slice(0, 200)}`);
      const block = lines.join(' · ');
      const extra = filePart ? ` · ${filePart}` : '';
      return block.slice(0, 600) + (block.length > 600 ? '…' : '') + extra;
    }
  } catch {
    // plain text
  }
  const snippet = raw.slice(0, 400);
  const extra = filePart ? ` · ${filePart}` : '';
  return snippet + (raw.length > 400 ? '…' : '') + extra;
}

function normalizeAllowedFormats(value: any, fallback: AssignmentFormat[]): AssignmentFormat[] {
  if (Array.isArray(value)) {
    const arr = value.filter(Boolean).map((x) => String(x).toLowerCase()) as AssignmentFormat[];
    // Filter out invalid formats just in case.
    const allowedSet = new Set(fallback);
    return arr.filter((x) => allowedSet.has(x));
  }
  return fallback;
}

function normalizeTimeLimitMinutes(raw: any): number | null {
  if (raw == null || raw === '') return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(600, n));
}

export class AssignmentServiceImpl implements AssignmentService {
  private async ensureCourseEditableForTeacher(course: any, lessonId?: number): Promise<void> {
    const status = String((course as any)?.status || '');
    if (status !== 'pending_review') return;
    if (!lessonId) {
      throw new Error('Khóa học đang chờ duyệt. Chỉ được sửa mục đang bị từ chối.');
    }
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const rejectedMarker = await resourceRepo
      .createQueryBuilder('r')
      .where('r.lesson_id = :lessonId', { lessonId: Number(lessonId) })
      .andWhere('r.url LIKE :prefix', { prefix: `internal://lesson/${Number(lessonId)}/assignment%` })
      .andWhere('r.review_status = :status', { status: 'rejected' })
      .getOne();
    if (!rejectedMarker) {
      throw new Error('Khóa học đang chờ duyệt. Chỉ được sửa mục đang bị từ chối.');
    }
  }

  private async ensureOwnerOrAdmin(courseId: number, subjectUserId: number): Promise<void> {
    const courseRepo = AppDataSource.getRepository(Course);
    const own = await courseRepo.findOne({
      where: { id: courseId, created_by: subjectUserId, deleted_at: null as any } as any,
    });
    if (own) return;
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) {
      throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');
    }
  }

  private buildAssignmentReviewSpecs(params: {
    lessonId: number;
    title?: string | null;
    attachments?: Array<{ file_name?: string | null; file_path?: string | null }> | null;
  }): Array<{
    url: string;
    filename: string;
    mime_type: string;
    note: string;
  }> {
    const baseTitle = String(params.title || 'Assignment nội dung').trim() || 'Assignment nội dung';
    const specs: Array<{ url: string; filename: string; mime_type: string; note: string }> = [
      {
        url: `internal://lesson/${params.lessonId}/assignment/description`,
        filename: `[ASSIGNMENT] ${baseTitle} - Mô tả`,
        mime_type: 'text/html',
        note: 'assignment:description',
      },
    ];
    const attachments = Array.isArray(params.attachments) ? params.attachments : [];
    attachments.forEach((att, idx) => {
      const attName = String(att?.file_name || '').trim() || `Tệp đính kèm #${idx + 1}`;
      specs.push({
        url: `internal://lesson/${params.lessonId}/assignment/attachment/${idx}`,
        filename: `[ASSIGNMENT] ${baseTitle} - ${attName}`.slice(0, 255),
        mime_type: 'application/octet-stream',
        note: `assignment:attachment:${idx}`,
      });
    });
    return specs;
  }

  private async upsertAssignmentReviewItem(params: {
    lessonId: number;
    actorUserId: number;
    title?: string | null;
    description?: string | null;
    attachments?: Array<{ file_name?: string | null; file_path?: string | null }> | null;
  }): Promise<void> {
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const eventRepo = AppDataSource.getRepository(LessonResourceReviewEvent);
    const allExisting = await resourceRepo.find({
      where: { lesson_id: params.lessonId } as any,
      order: { id: 'DESC' } as any,
    });
    const assignmentResources = (allExisting as any[]).filter((row) =>
      String((row as any).url || '').startsWith(`internal://lesson/${params.lessonId}/assignment`)
    );
    const existingByUrl = new Map<string, any>();
    for (const item of assignmentResources) {
      const rowUrl = String((item as any).url || '');
      if (!existingByUrl.has(rowUrl)) existingByUrl.set(rowUrl, item);
    }

    const nextSpecs = this.buildAssignmentReviewSpecs({
      lessonId: params.lessonId,
      title: params.title,
      attachments: params.attachments,
    });
    const keepUrls = new Set(nextSpecs.map((x) => x.url));

    for (const spec of nextSpecs) {
      const existing = existingByUrl.get(spec.url);
      const fromStatus = existing
        ? (String((existing as any).review_status || 'pending') as 'pending' | 'approved' | 'rejected')
        : null;
      if (!existing) {
        const created = await resourceRepo.save(
          resourceRepo.create({
            lesson_id: params.lessonId,
            resource_type: 'file',
            resource_kind: 'other',
            url: spec.url,
            filename: spec.filename.slice(0, 255),
            mime_type: spec.mime_type,
            size_bytes: null,
            preview_url: null,
            review_status: 'pending',
            review_reason: null,
            reviewed_by: null,
            reviewed_at: null,
          } as any)
        );
        await eventRepo.save(
          eventRepo.create({
            resource_id: Number((created as any).id),
            actor_user_id: params.actorUserId,
            from_status: null,
            to_status: 'pending',
            decision: 'submit',
            note: spec.note,
          } as any)
        );
        continue;
      }

      await resourceRepo.update(
        { id: (existing as any).id } as any,
        {
          filename: spec.filename.slice(0, 255),
          mime_type: spec.mime_type,
          review_status: 'pending',
          review_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        } as any
      );
      await eventRepo.save(
        eventRepo.create({
          resource_id: Number((existing as any).id),
          actor_user_id: params.actorUserId,
          from_status: fromStatus,
          to_status: 'pending',
          decision: fromStatus === 'rejected' ? 'resubmit' : 'submit',
          note: spec.note,
        } as any)
      );
    }

    const removeIds = assignmentResources
      .filter((row) => !keepUrls.has(String((row as any).url || '')))
      .map((row) => Number((row as any).id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (removeIds.length > 0) {
      await resourceRepo.delete(removeIds as any);
    }
  }

  async createAssignment(subjectUserId: number, lessonId: number, request: CreateAssignmentRequest): Promise<any> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);

    // Kiểm tra Bài học và Module có tồn tại
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');
    if (String((lesson as any).lesson_type || '') === 'quiz') {
      throw new Error('Không thể gắn bài tập cho lesson loại Quizz.');
    }

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    // Check quyền user gọi API là chủ sở hữu của khóa học này
    const course = await courseRepo.findOne({
        where: { id: (mod as any).course_id, created_by: subjectUserId, deleted_at: null as any } as any
    });
    if (!course) throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');
    await this.ensureCourseEditableForTeacher(course, lessonId);

    // validate một số lỗi login nghiệp vụ
    if (request.passing_score != null && request.passing_score > request.max_score) {
      throw new Error(`Điểm đạt không được lớn hơn thang điểm ${request.max_score}.`);
    }
    const dueDate = new Date(request.due_date);
    if (isNaN(dueDate.getTime())) {
      throw new Error('Định dạng hạn nộp (ở cột due_date) không hợp lệ!');
    }

    const kind: AssignmentKind =
      (request as any).assignment_kind === 'short_answer' ? 'short_answer' : 'file_prompt';
    const saq =
      kind === 'short_answer'
        ? normalizeShortAnswerQuestionsForSave((request as any).short_answer_questions)
        : [];
    const timeLimitMinutes = kind === 'short_answer' ? normalizeTimeLimitMinutes((request as any).time_limit_minutes) : null;
    if (kind === 'short_answer' && saq.length < 1) {
      throw new Error('Dạng trả lời ngắn cần ít nhất một câu hỏi.');
    }
    if (kind === 'short_answer' && timeLimitMinutes == null) {
      throw new Error('Dạng trả lời ngắn cần cấu hình thời gian làm bài (phút).');
    }

    // thực thi db transaction giữa table assignments và grade_items
    const savedAssignment = await AppDataSource.transaction(async (manager) => {
      const assignmentRepo = manager.getRepository(Assignment);
      const gradeItemRepo = manager.getRepository(GradeItem);

      // xử lý logic nộp muộn trước khi insert
      const lateDays = request.allow_late_submission ? request.late_submission_days : 0;
      const latePenalty = request.allow_late_submission ? request.late_penalty_percent : 0;
      const maxResub = request.allow_resubmission ? request.max_resubmissions : 1;

      // step1. Insert vào bảng assignments
      const newAssignment = assignmentRepo.create({
        lesson_id: lessonId,
        title: request.title,
        description: request.description,
        max_score: request.max_score,
        passing_score: request.passing_score,
        due_date: dueDate,
        late_submission_days: lateDays,
        late_penalty_percent: latePenalty,
        allow_resubmission: request.allow_resubmission,
        max_resubmissions: maxResub,
        submission_format: request.allowed_formats, // map từ allowed_formats sang submission_format vì lỡ lưu tên cột trong db hơi khác với tên biến trong request
        attachments: request.attachments,
        allow_late_submission: Boolean(request.allow_late_submission),
        assignment_kind: kind,
        short_answer_questions: kind === 'short_answer' ? saq : null,
        time_limit_minutes: kind === 'short_answer' ? timeLimitMinutes : null,
      } as any);

      const savedAssignment = await assignmentRepo.save(newAssignment as any);

      // step2. Insert vào bảng grade_items (tích cực cho hệ thống chấm điểm)
      const newGradeItem = gradeItemRepo.create({
        course_id: (course as any).id,
        item_type: 'assignment',
        item_id: (savedAssignment as any).id,
        name: request.title,
        max_score: request.max_score,
        weight: 1.0,
        due_date: dueDate
      } as any);

      await gradeItemRepo.save(newGradeItem as any);

      return savedAssignment; // Trả về nếu cả 2 bảng đều insert thành công
    });
    await this.upsertAssignmentReviewItem({
      lessonId,
      actorUserId: subjectUserId,
      title: String((savedAssignment as any)?.title || request.title || 'Assignment nội dung'),
      description: String((savedAssignment as any)?.description ?? request.description ?? ''),
      attachments: Array.isArray((savedAssignment as any)?.attachments) ? ((savedAssignment as any).attachments as any[]) : [],
    });
    return savedAssignment;
  }

  async uploadAssignmentAttachments(
    subjectUserId: number,
    lessonId: number,
    assignmentId: number,
    files: UploadedAssignmentFile[]
  ): Promise<AssignmentAttachmentPreview[]> {
    if (!isCloudinaryEnabled()) {
      throw new Error(
        'Cloudinary chưa được cấu hình. Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
      );
    }

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    const course = await courseRepo.findOne({
      where: { id: (mod as any).course_id, created_by: subjectUserId, deleted_at: null as any } as any,
    });
    if (!course) throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');
    await this.ensureCourseEditableForTeacher(course, lessonId);

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId, lesson_id: lessonId } as any,
    });
    if (!assignment) throw new Error('Không tìm thấy bài tập!');

    const fallbackAllowed: AssignmentFormat[] = ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip', 'rar', '7z'];
    const allowedFormats = normalizeAllowedFormats(assignment.submission_format, fallbackAllowed);

    if (!files?.length) throw new Error('Vui lòng chọn file để upload.');

    const attachments = await Promise.all(
      files.map(async (file) => {
        const fmt = getFormatFromFileName(file.originalname);
        if (!fmt || !allowedFormats.includes(fmt)) {
          throw new Error(`Định dạng file không được phép: ${file.originalname}`);
        }

        const resultUpload = await uploadBufferToCloudinary({
          buffer: file.buffer,
          folder: `capstone/courses/${(course as any).id}/lessons/${lessonId}/assignments/${assignmentId}/attachments`,
          originalFilename: file.originalname,
          resourceType: 'raw',
        });

        return {
          file_name: file.originalname,
          file_path: resultUpload.secure_url,
        };
      })
    );

    assignment.attachments = attachments as any;
    await assignmentRepo.save(assignment as any);
    await this.upsertAssignmentReviewItem({
      lessonId,
      actorUserId: subjectUserId,
      title: String((assignment as any)?.title || 'Assignment nội dung'),
      description: String((assignment as any)?.description ?? ''),
      attachments: attachments as any[],
    });

    return (attachments as any as AssignmentAttachmentPreview[]).map((a) => ({
      ...a,
      signed_url: getSignedDeliveryUrl(a.file_path),
    }));
  }

  async getAssignmentPreview(
    subjectUserId: number,
    lessonId: number,
    assignmentId: number
  ): Promise<{
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
    allowed_formats: AssignmentFormat[];
    attachments: AssignmentAttachmentPreview[];
    created_at: string;
    assignment_kind: AssignmentKind;
    short_answer_questions: ShortAnswerQuestionDef[];
    time_limit_minutes: number | null;
  }> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    await this.ensureOwnerOrAdmin(Number((mod as any).course_id), subjectUserId);

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId, lesson_id: lessonId } as any,
    });
    if (!assignment) throw new Error('Không tìm thấy bài tập!');

    const fallbackAllowed: AssignmentFormat[] = ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip', 'rar', '7z'];
    const allowedFormats = normalizeAllowedFormats(assignment.submission_format, fallbackAllowed);

    const attachmentsRaw = Array.isArray(assignment.attachments) ? assignment.attachments : [];
    const attachments = (attachmentsRaw as any[]).map((a) => ({
      file_name: String(a.file_name ?? ''),
      file_path: String(a.file_path ?? ''),
      signed_url: getSignedDeliveryUrl(String(a.file_path ?? '')),
    }));

    return {
      assignment_id: (assignment as any).id,
      lesson_id: lessonId,
      title: String((assignment as any).title ?? ''),
      description: String((assignment as any).description ?? ''),
      due_date: (assignment as any).due_date ? new Date((assignment as any).due_date).toISOString() : null,
      max_score: Number((assignment as any).max_score ?? 0),
      passing_score: (assignment as any).passing_score != null ? Number((assignment as any).passing_score) : null,
      allow_late_submission: Boolean((assignment as any).allow_late_submission),
      late_submission_days: Number((assignment as any).late_submission_days ?? 0),
      late_penalty_percent: Number((assignment as any).late_penalty_percent ?? 0),
      allow_resubmission: Boolean((assignment as any).allow_resubmission),
      max_resubmissions: Number((assignment as any).max_resubmissions ?? 1),
      allowed_formats: allowedFormats,
      attachments,
      created_at: new Date((assignment as any).created_at).toISOString(),
      assignment_kind: parseAssignmentKind((assignment as any).assignment_kind),
      short_answer_questions: mapShortAnswerQuestionsFromDb((assignment as any).short_answer_questions),
      time_limit_minutes:
        (assignment as any).time_limit_minutes != null ? Number((assignment as any).time_limit_minutes) : null,
    };
  }

  async getLearnerAssignmentForLesson(subjectUserId: number, lessonId: number): Promise<{
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
    allowed_formats: AssignmentFormat[];
    attachments: AssignmentAttachmentPreview[];
    assignment_kind: AssignmentKind;
    short_answer_questions: ShortAnswerQuestionDef[];
    time_limit_minutes: number | null;
  }> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy chương.');

    const enroll = await enrollmentRepo.findOne({
      where: {
        user_id: subjectUserId,
        course_id: (mod as any).course_id,
        status: In(['active', 'completed']),
      } as any,
    });
    if (!enroll) throw new Error('Bạn chưa ghi danh khóa học này.');

    const assignment = await assignmentRepo.findOne({
      where: { lesson_id: lessonId } as any,
      order: { id: 'DESC' } as any,
    });
    if (!assignment) throw new Error('Chưa có bài tập cho bài học này.');
    const assignmentKind = parseAssignmentKind((assignment as any).assignment_kind);
    const limitMinutes = Number((assignment as any).time_limit_minutes ?? 0);
    if (assignmentKind === 'short_answer' && Number.isFinite(limitMinutes) && limitMinutes > 0) {
      const progressRepo = AppDataSource.getRepository(LessonProgress);
      const existingProgress = await progressRepo.findOne({
        where: {
          user_id: subjectUserId,
          course_id: Number((mod as any).course_id),
          lesson_id: lessonId,
        } as any,
      });
      if (!existingProgress) {
        await progressRepo.save(
          progressRepo.create({
            user_id: subjectUserId,
            course_id: Number((mod as any).course_id),
            lesson_id: lessonId,
            time_spent_seconds: 0,
          } as any)
        );
      }
    }

    const fallbackAllowed: AssignmentFormat[] = ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip', 'rar', '7z'];
    const allowedFormats = normalizeAllowedFormats(assignment.submission_format, fallbackAllowed);

    const attachmentsRaw = Array.isArray(assignment.attachments) ? assignment.attachments : [];
    const attachments = (attachmentsRaw as any[]).map((a) => ({
      file_name: String(a.file_name ?? ''),
      file_path: String(a.file_path ?? ''),
      signed_url: getSignedDeliveryUrl(String(a.file_path ?? '')),
    }));

    return {
      assignment_id: (assignment as any).id,
      lesson_id: lessonId,
      title: String((assignment as any).title ?? ''),
      description: String((assignment as any).description ?? ''),
      due_date: (assignment as any).due_date ? new Date((assignment as any).due_date).toISOString() : null,
      max_score: Number((assignment as any).max_score ?? 0),
      passing_score: (assignment as any).passing_score != null ? Number((assignment as any).passing_score) : null,
      allow_late_submission: Boolean((assignment as any).allow_late_submission),
      late_submission_days: Number((assignment as any).late_submission_days ?? 0),
      late_penalty_percent: Number((assignment as any).late_penalty_percent ?? 0),
      allow_resubmission: Boolean((assignment as any).allow_resubmission),
      max_resubmissions: Number((assignment as any).max_resubmissions ?? 1),
      allowed_formats: allowedFormats,
      attachments,
      assignment_kind: assignmentKind,
      short_answer_questions: mapShortAnswerQuestionsFromDb((assignment as any).short_answer_questions),
      time_limit_minutes:
        (assignment as any).time_limit_minutes != null ? Number((assignment as any).time_limit_minutes) : null,
    };
  }

  async updateAssignment(
    subjectUserId: number,
    lessonId: number,
    assignmentId: number,
    request: UpdateAssignmentRequest
  ): Promise<void> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const gradeItemRepo = AppDataSource.getRepository(GradeItem);
    const submissionRepo = AppDataSource.getRepository(Submission);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    const course = await courseRepo.findOne({
      where: { id: (mod as any).course_id, created_by: subjectUserId, deleted_at: null as any } as any,
    });
    if (!course) throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');
    await this.ensureCourseEditableForTeacher(course, lessonId);

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId, lesson_id: lessonId } as any,
    });
    if (!assignment) throw new Error('Không tìm thấy bài tập!');

    const hasNonDraftSubmission = await submissionRepo.findOne({
      where: {
        assignment_id: assignmentId,
        status: In(['submitted', 'graded', 'returned']) as any,
      } as any,
    });

    if (hasNonDraftSubmission) {
      throw new Error('Không thể sửa bài tập sau khi học viên đã có bài nộp.');
    }

    const currentMax = Number((assignment as any).max_score ?? 0);
    const currentPassing = (assignment as any).passing_score != null ? Number((assignment as any).passing_score) : null;
    const nextMax = request.max_score != null ? Number(request.max_score) : currentMax;
    const nextPassing =
      request.passing_score !== undefined
        ? request.passing_score != null
          ? Number(request.passing_score)
          : null
        : currentPassing;

    if (nextPassing != null && nextPassing > nextMax) {
      throw new Error(`Điểm đạt không được lớn hơn thang điểm ${nextMax}.`);
    }

    if (request.title != null) assignment.title = String(request.title);
    if ('description' in request) {
      if (request.description == null) throw new Error('Mô tả bài tập là bắt buộc.');
      assignment.description = String(request.description);
    }
    if (request.max_score != null) assignment.max_score = Number(request.max_score);
    if (request.passing_score !== undefined) {
      assignment.passing_score = request.passing_score != null ? Number(request.passing_score) : null;
    }

    if (request.due_date != null) {
      const dueDate = new Date(request.due_date);
      if (isNaN(dueDate.getTime())) {
        throw new Error('Định dạng hạn nộp (ở cột due_date) không hợp lệ!');
      }
      assignment.due_date = dueDate;
    }

    const allowLate = request.allow_late_submission != null ? Boolean(request.allow_late_submission) : false;
    if (request.allow_late_submission != null) {
      assignment.late_submission_days = allowLate ? Number(request.late_submission_days ?? 0) : 0;
      assignment.late_penalty_percent = allowLate ? Number(request.late_penalty_percent ?? 0) : 0;
    }

    if (request.allow_resubmission != null) {
      assignment.allow_resubmission = Boolean(request.allow_resubmission);
      assignment.max_resubmissions = assignment.allow_resubmission ? Number(request.max_resubmissions ?? 1) : 1;
    }

    if (request.allowed_formats != null) {
      assignment.submission_format = request.allowed_formats;
    }
    if (request.attachments !== undefined) {
      assignment.attachments = request.attachments ?? null;
    }

    if (request.assignment_kind != null) {
      const nk = parseAssignmentKind(request.assignment_kind);
      (assignment as any).assignment_kind = nk;
      if (nk === 'short_answer') {
        const sa = normalizeShortAnswerQuestionsForSave(request.short_answer_questions);
        if (sa.length < 1) throw new Error('Dạng trả lời ngắn cần ít nhất một câu hỏi.');
        (assignment as any).short_answer_questions = sa;
        const tl = normalizeTimeLimitMinutes(request.time_limit_minutes);
        if (tl == null) throw new Error('Dạng trả lời ngắn cần cấu hình thời gian làm bài (phút).');
        (assignment as any).time_limit_minutes = tl;
      } else {
        (assignment as any).short_answer_questions = null;
        (assignment as any).time_limit_minutes = null;
      }
    } else if (request.short_answer_questions !== undefined && parseAssignmentKind((assignment as any).assignment_kind) === 'short_answer') {
      const sa = normalizeShortAnswerQuestionsForSave(request.short_answer_questions);
      if (sa.length < 1) throw new Error('Cần ít nhất một câu hỏi.');
      (assignment as any).short_answer_questions = sa;
    }

    if (
      request.time_limit_minutes !== undefined &&
      parseAssignmentKind((assignment as any).assignment_kind) === 'short_answer'
    ) {
      const tl = normalizeTimeLimitMinutes(request.time_limit_minutes);
      if (tl == null) throw new Error('Thời gian làm bài (phút) không hợp lệ.');
      (assignment as any).time_limit_minutes = tl;
    }

    await assignmentRepo.save(assignment as any);

    // Sync grade item basics so gradebook stays consistent.
    const dueDateForGrade = assignment.due_date ? new Date(assignment.due_date) : null;
    await gradeItemRepo.update(
      {
        course_id: (course as any).id,
        item_type: 'assignment',
        item_id: assignmentId,
      } as any,
      {
        name: assignment.title,
        max_score: assignment.max_score,
        due_date: dueDateForGrade as any,
      } as any
    );
    await this.upsertAssignmentReviewItem({
      lessonId,
      actorUserId: subjectUserId,
      title: String((assignment as any).title || 'Assignment nội dung'),
      description: String((assignment as any).description ?? ''),
      attachments: Array.isArray((assignment as any).attachments) ? ((assignment as any).attachments as any[]) : [],
    });
  }

  async listAssignmentSubmissions(
    subjectUserId: number,
    lessonId: number,
    assignmentId: number
  ): Promise<AssignmentSubmissionListRow[]> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    const course = await courseRepo.findOne({
      where: { id: (mod as any).course_id, created_by: subjectUserId, deleted_at: null as any } as any,
    });
    if (!course) throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId, lesson_id: lessonId } as any,
    });
    if (!assignment) throw new Error('Không tìm thấy bài tập!');

    const rows = await AppDataSource.query(
      `
      SELECT
        s.id AS submission_id,
        s.user_id,
        s.status,
        s.submitted_at,
        s.is_late,
        s.resubmission_count,
        u.email AS user_email,
        u.full_name AS user_full_name,
        st.content AS text_content,
        (SELECT COUNT(*) FROM submission_attachments sa WHERE sa.submission_id = s.id) AS attachment_count,
        sf.score AS graded_score,
        sf.feedback_text,
        sf.graded_at AS feedback_graded_at,
        gi.id AS grade_item_id
      FROM submissions s
      INNER JOIN assignments a ON a.id = s.assignment_id AND a.id = ? AND a.lesson_id = ?
      INNER JOIN lessons l ON l.id = a.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id AND c.id = ? AND c.created_by = ? AND c.deleted_at IS NULL
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN submission_text st ON st.submission_id = s.id
      LEFT JOIN grade_items gi ON gi.course_id = c.id AND gi.item_type = 'assignment' AND gi.item_id = a.id
      LEFT JOIN submission_feedback sf ON sf.submission_id = s.id
      ORDER BY s.submitted_at DESC
    `,
      [assignmentId, lessonId, (course as any).id, subjectUserId]
    );

    const mapped = (rows as any[]).map((r) => mapRawToAssignmentSubmissionRow(r));
    const submissionIds = mapped.map((r) => r.submission_id).filter((x) => Number.isFinite(Number(x)));
    if (!submissionIds.length) return mapped;

    const attRows = await AppDataSource.getRepository(SubmissionAttachment).find({
      where: { submission_id: In(submissionIds) } as any,
      order: { uploaded_at: 'ASC', id: 'ASC' } as any,
      select: ['submission_id', 'file_name', 'file_path'] as any,
    });
    const attMap = mapAttachmentRowsBySubmission(attRows as any[]);
    return mapped.map((r) => ({
      ...r,
      attachment_files: attMap.get(r.submission_id) ?? [],
    }));
  }

  async getAssignmentLearnerRosterByLesson(
    subjectUserId: number,
    lessonId: number
  ): Promise<AssignmentLearnerRosterResult> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    const courseId = Number((mod as any).course_id);
    await this.ensureOwnerOrAdmin(courseId, subjectUserId);

    const assignment = await assignmentRepo.findOne({
      where: { lesson_id: lessonId } as any,
      order: { id: 'DESC' } as any,
    });
    if (!assignment) {
      return { assignment: null, learners: [] };
    }

    const assignmentId = Number((assignment as any).id);

    const rows = await AppDataSource.query(
      `
      SELECT
        u.id AS user_id,
        u.email AS user_email,
        u.full_name AS user_full_name,
        s.id AS submission_id,
        s.user_id,
        s.status,
        s.submitted_at,
        s.is_late,
        s.resubmission_count,
        st.content AS text_content,
        (SELECT COUNT(*) FROM submission_attachments sa WHERE sa.submission_id = s.id) AS attachment_count,
        sf.score AS graded_score,
        sf.feedback_text,
        sf.graded_at AS feedback_graded_at,
        gi.id AS grade_item_id
      FROM course_enrollments ce
      INNER JOIN users u ON u.id = ce.user_id
      LEFT JOIN submissions s ON s.id = (
        SELECT s2.id FROM submissions s2
        WHERE s2.assignment_id = ? AND s2.user_id = ce.user_id
        ORDER BY s2.created_at DESC
        LIMIT 1
      )
      LEFT JOIN submission_text st ON st.submission_id = s.id
      LEFT JOIN grade_items gi ON gi.course_id = ce.course_id AND gi.item_type = 'assignment' AND gi.item_id = ?
      LEFT JOIN submission_feedback sf ON sf.submission_id = s.id
      WHERE ce.course_id = ? AND ce.status IN ('active', 'completed')
      ORDER BY u.full_name ASC
    `,
      [assignmentId, assignmentId, courseId]
    );

    const learners: AssignmentLearnerRosterRow[] = (rows as any[]).map((r) => {
      const has = r.submission_id != null;
      return {
        user_id: Number(r.user_id),
        email: String(r.user_email ?? ''),
        full_name: String(r.user_full_name ?? ''),
        has_submitted: has,
        submission: has ? mapRawToAssignmentSubmissionRow(r) : null,
      };
    });

    const submissionIds = learners
      .map((x) => x.submission?.submission_id)
      .filter((x): x is number => x != null && Number.isFinite(Number(x)));
    if (submissionIds.length) {
      const attRows = await AppDataSource.getRepository(SubmissionAttachment).find({
        where: { submission_id: In(submissionIds) } as any,
        order: { uploaded_at: 'ASC', id: 'ASC' } as any,
        select: ['submission_id', 'file_name', 'file_path'] as any,
      });
      const attMap = mapAttachmentRowsBySubmission(attRows as any[]);
      for (const row of learners) {
        if (row.submission) {
          row.submission.attachment_files = attMap.get(row.submission.submission_id) ?? [];
        }
      }
    }

    return {
      assignment: {
        id: assignmentId,
        title: String((assignment as any).title ?? ''),
        max_score: Number((assignment as any).max_score ?? 0),
      },
      learners,
    };
  }

  async gradeSubmission(data: GradeSubmissionRequest): Promise<void> {
    const submissionRepo = AppDataSource.getRepository(Submission);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);
    const gradeItemRepo = AppDataSource.getRepository(GradeItem);

    const submission = await submissionRepo.findOne({ where: { id: data.submissionId } as any });
    if (!submission) throw new Error('Không tìm thấy bài nộp.');

    const assignment = await assignmentRepo.findOne({ where: { id: (submission as any).assignment_id } as any });
    if (!assignment) throw new Error('Không tìm thấy bài tập.');

    const lesson = await lessonRepo.findOne({ where: { id: (assignment as any).lesson_id } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    const course = await courseRepo.findOne({
      where: { id: (mod as any).course_id, created_by: data.graderId, deleted_at: null as any } as any,
    });
    if (!course) throw new Error('Bạn không có quyền chấm bài này.');

    const maxScore = Number((assignment as any).max_score ?? 0);
    const sc = Number(data.score);
    if (Number.isNaN(sc) || sc < 0 || sc > maxScore) {
      throw new Error(`Điểm phải từ 0 đến ${maxScore}.`);
    }

    const gi = await gradeItemRepo.findOne({
      where: {
        course_id: (course as any).id,
        item_type: 'assignment',
        item_id: (assignment as any).id,
      } as any,
    });
    if (!gi) throw new Error('Không tìm thấy hạng mục điểm cho bài tập này.');

    const feedbackStr = data.feedbackText != null ? String(data.feedbackText) : '';
    const studentId = Number((submission as any).user_id);

    await AppDataSource.transaction(async (manager) => {
      const fbRepo = manager.getRepository(SubmissionFeedback);
      const existing = await fbRepo.findOne({ where: { submission_id: data.submissionId } as any });
      const row = existing ?? fbRepo.create({ submission_id: data.submissionId } as any);
      (row as any).grader_id = data.graderId;
      (row as any).score = sc;
      (row as any).feedback_text = feedbackStr;
      (row as any).is_auto_graded = false;
      await fbRepo.save(row as any);

      await manager.getRepository(Submission).update({ id: data.submissionId } as any, { status: 'graded' } as any);

      const gradeRepo = manager.getRepository(GradeEntity);
      let g: GradeEntity | null = await gradeRepo.findOne({
        where: { grade_item_id: (gi as any).id, user_id: studentId } as any,
      });
      const now = new Date();
      if (!g) {
        g = gradeRepo.create({
          grade_item_id: (gi as any).id,
          user_id: studentId,
          score: sc,
          feedback: feedbackStr || null,
          graded_by: data.graderId,
          graded_at: now,
        } as Partial<GradeEntity>) as GradeEntity;
      } else {
        g.score = sc as any;
        g.feedback = feedbackStr || null;
        g.graded_by = data.graderId;
        g.graded_at = now;
      }
      await gradeRepo.save(g);

      try {
        await manager.query(
          `
            INSERT INTO notifications (user_id, type_id, title, content, data, created_at)
            SELECT ?, id, ?, ?, ?, NOW()
            FROM notification_types
            WHERE name = 'assignment_graded'
            LIMIT 1
          `,
          [
            studentId,
            'Bài tập đã được chấm điểm',
            `Điểm của bạn: ${sc}/${maxScore}`,
            JSON.stringify({ score: sc, assignment_id: (assignment as any).id }),
          ]
        );
      } catch {
        // Bảng thông báo có thể chưa seed type — không chặn chấm điểm.
      }
    });
  }

  async getMyGradesSummary(studentId: number): Promise<any[]> {
    const rawData = await AppDataSource.query(`
        SELECT 
            c.id as course_id,
            c.title as course_title,
            gi.id as item_id,
            gi.name as item_title,
            gi.item_type as type,
            g.score,
            gi.max_score,
            g.graded_at,
            s.created_at as submitted_at
        FROM courses c
        JOIN enrollments e ON e.course_id = c.id
        JOIN grade_items gi ON gi.course_id = c.id
        LEFT JOIN submissions s ON s.assignment_id = gi.item_id AND s.user_id = e.user_id
        LEFT JOIN grades g ON g.grade_item_id = gi.id AND g.user_id = e.user_id
        WHERE e.user_id = ? AND c.deleted_at IS NULL
    `, [studentId]);

    return this.formatGradesSummary(rawData);
  }

  private formatGradesSummary(rawData: any[]): any[] {
    const map = new Map<number, any>();
    for (const row of rawData) {
        if (!map.has(row.course_id)) {
            map.set(row.course_id, {
                course_id: row.course_id,
                course_title: row.course_title,
                average_score: 0,
                items: []
            });
        }
        const course = map.get(row.course_id)!;
        course.items.push({
            id: row.item_id,
            name: row.item_title,
            type: row.type,
            score: row.score !== null ? Number(row.score) : null,
            max_score: Number(row.max_score),
            percentage: row.score !== null ? (Number(row.score) / Number(row.max_score)) * 100 : 0,
            submitted_at: row.submitted_at,
            graded_at: row.graded_at
        });
    }
    map.forEach(course => {
      const gradedItems = course.items.filter(i => i.score !== null);
      if (gradedItems.length > 0) {
          // 1. Tính điểm trung bình (hệ 10)
          const total = gradedItems.reduce((sum, i) => sum + (i.score! / i.max_score) * 10, 0);
          course.average_score = Math.round((total / gradedItems.length) * 10) / 10;
          
          // 2. Logic Xếp loại học lực
          let rank = 'Yếu';
          if (course.average_score >= 9.0) rank = 'Xuất sắc';
          else if (course.average_score >= 8.0) rank = 'Giỏi';
          else if (course.average_score >= 6.5) rank = 'Khá';
          else if (course.average_score >= 5.0) rank = 'Trung bình';
          
          (course as any).rank = rank; 

          // 3. Logic Trạng thái Đạt (✅)
          (course as any).is_passed = course.average_score >= 5.0; 
      }
    });
    return Array.from(map.values());
  }

  async getMyAssignmentGradeDetail(studentId: number, assignmentId: number): Promise<any> {
    const data = await AppDataSource.query(`
        SELECT 
            a.title, a.description, a.due_date, a.max_score,
            s.id as submission_id, s.status, s.resubmission_count, s.created_at as submitted_at,
            sf.score, sf.feedback_text, sf.graded_at
        FROM assignments a
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = ?
        LEFT JOIN submission_feedback sf ON sf.submission_id = s.id
        WHERE a.id = ?
        ORDER BY s.created_at DESC LIMIT 1
    `, [studentId, assignmentId]);

    if (!data.length) throw new Error('Không tìm thấy thông tin bài tập!');
    const row = data[0];
    const submissionId = row?.submission_id != null ? Number(row.submission_id) : null;
    if (!submissionId) {
      return {
        ...row,
        submission_text: null,
        submission_short_answers: [],
        submission_attachments: [],
      };
    }

    const texts = await AppDataSource.query(
      `SELECT content FROM submission_text WHERE submission_id = ? ORDER BY id DESC LIMIT 1`,
      [submissionId]
    );
    const textContent = texts?.[0]?.content != null ? String(texts[0].content) : null;
    let submissionText: string | null = textContent;
    let submissionShortAnswers: { question_id: string; answer_text: string }[] = [];
    if (textContent) {
      try {
        const j = JSON.parse(textContent);
        if (j && j.kind === 'short_answer' && Array.isArray(j.answers)) {
          submissionText = null;
          submissionShortAnswers = (j.answers as any[]).map((a) => ({
            question_id: String((a as any)?.question_id ?? ''),
            answer_text: String((a as any)?.answer_text ?? ''),
          }));
        }
      } catch {
        // text submission dạng tự do
      }
    }

    const atts = await AppDataSource.query(
      `
      SELECT file_name, file_path, file_size, mime_type, uploaded_at
      FROM submission_attachments
      WHERE submission_id = ?
      ORDER BY uploaded_at ASC, id ASC
      `,
      [submissionId]
    );
    const submissionAttachments = (atts as any[]).map((a) => ({
      file_name: String(a.file_name ?? ''),
      file_path: String(a.file_path ?? ''),
      signed_url: getSignedDeliveryUrl(String(a.file_path ?? '')),
      file_size: Number(a.file_size ?? 0),
      mime_type: String(a.mime_type ?? ''),
      uploaded_at: a.uploaded_at ? new Date(a.uploaded_at).toISOString() : null,
    }));

    return {
      ...row,
      submission_text: submissionText,
      submission_short_answers: submissionShortAnswers,
      submission_attachments: submissionAttachments,
    };
  }

  async createGradeAppeal(studentId: number, submissionId: number, content: string): Promise<void> {
    // Logic lưu khiếu nại vào bảng submission_appeals và gửi thông báo cho giảng viên
    await AppDataSource.query(`
        INSERT INTO submission_appeals (submission_id, user_id, content, created_at)
        VALUES (?, ?, ?, NOW())
    `, [submissionId, studentId, content]);
  }

  /** Learner: get assignment content for chatbot context */
  async getAssignmentContentForLearner(
    subjectUserId: number,
    assignmentId: number
  ): Promise<{
    id: number;
    lesson_id: number;
    title: string;
    description: string | null;
    short_answer_questions: any[];
    attachments: any[];
  }> {
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const assignment = await assignmentRepo.findOne({ where: { id: assignmentId } as any });
    if (!assignment) throw new Error('Assignment not found');

    // Check if user is enrolled in the course
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: { user_id: subjectUserId, course_id: (assignment as any).course_id } as any,
    });
    if (!enrollment) throw new Error('You are not enrolled in this course');

    // Get attachments from JSON field (stored as JSON in assignment.attachments)
    const attachmentsRaw = safeJsonParse<any[]>((assignment as any).attachments, []);
    const attachments = attachmentsRaw.map((att: any, idx: number) => ({
      id: att.id ?? idx + 1,
      filename: att.filename || att.file_name || '',
      url: att.url || att.file_path || '',
      mime_type: att.mime_type || null,
    }));

    // Parse short answer questions
    const shortAnswerQuestions = safeJsonParse<any[]>((assignment as any).short_answer_questions, []);

    return {
      id: Number((assignment as any).id),
      lesson_id: Number((assignment as any).lesson_id),
      title: String((assignment as any).title || ''),
      description: (assignment as any).description || null,
      short_answer_questions: shortAnswerQuestions.map((q, idx) => ({
        id: q.id ?? idx + 1,
        question_text: q.question_text || '',
        order_index: idx + 1,
      })),
      attachments,
    };
  }
}
