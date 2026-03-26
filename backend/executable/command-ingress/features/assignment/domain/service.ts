import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import Assignment from '../../../../../internal/model/assignment';
import GradeItem from '../../../../../internal/model/grade_items';
import Submission from '../../../../../internal/model/submissions';
import { uploadBufferToCloudinary, getSignedDeliveryUrl, isCloudinaryEnabled } from '../../../lib/cloudinary';
import type {
  AssignmentAttachmentPreview,
  AssignmentFormat,
  AssignmentService,
  CreateAssignmentRequest,
  UploadedAssignmentFile,
  UpdateAssignmentRequest,
} from '../types';

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

function normalizeAllowedFormats(value: any, fallback: AssignmentFormat[]): AssignmentFormat[] {
  if (Array.isArray(value)) {
    const arr = value.filter(Boolean).map((x) => String(x).toLowerCase()) as AssignmentFormat[];
    // Filter out invalid formats just in case.
    const allowedSet = new Set(fallback);
    return arr.filter((x) => allowedSet.has(x));
  }
  return fallback;
}

export class AssignmentServiceImpl implements AssignmentService {
  async createAssignment(subjectUserId: number, lessonId: number, request: CreateAssignmentRequest): Promise<any> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);

    // Kiểm tra Bài học và Module có tồn tại
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học!');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod) throw new Error('Không tìm thấy module chứa bài học này!');

    // Check quyền user gọi API là chủ sở hữu của khóa học này
    const course = await courseRepo.findOne({
        where: { id: (mod as any).course_id, created_by: subjectUserId, deleted_at: null as any } as any
    });
    if (!course) throw new Error('Không tìm thấy khóa học hoặc bạn không có quyền thực hiện thao tác này!');

    // validate một số lỗi login nghiệp vụ
    if (request.passing_score && request.passing_score > request.max_score) {
      throw new Error('Điểm đạt không được lớn hơn thang điểm 10!');
    }
    const dueDate = new Date(request.due_date);
    if (isNaN(dueDate.getTime())) {
      throw new Error('Định dạng hạn nộp (ở cột due_date) không hợp lệ!');
    }

    // thực thi db transaction giữa table assignments và grade_items
    return await AppDataSource.transaction(async (manager) => {
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
        attachments: request.attachments
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
  }> {
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
      allow_late_submission: Boolean((assignment as any).late_submission_days && Number((assignment as any).late_submission_days) > 0),
      late_submission_days: Number((assignment as any).late_submission_days ?? 0),
      late_penalty_percent: Number((assignment as any).late_penalty_percent ?? 0),
      allow_resubmission: Boolean((assignment as any).allow_resubmission),
      max_resubmissions: Number((assignment as any).max_resubmissions ?? 1),
      allowed_formats: allowedFormats,
      attachments,
      created_at: new Date((assignment as any).created_at).toISOString(),
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

    const assignment = await assignmentRepo.findOne({
      where: { id: assignmentId, lesson_id: lessonId } as any,
    });
    if (!assignment) throw new Error('Không tìm thấy bài tập!');

    const hasNonDraftSubmission = await submissionRepo.findOne({
      where: {
        assignment_id: assignmentId,
        status: ['submitted', 'graded', 'returned'] as any,
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
      throw new Error('Điểm đạt không được lớn hơn thang điểm.');
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
  }
}

