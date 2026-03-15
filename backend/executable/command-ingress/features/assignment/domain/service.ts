import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import Assignment from '../../../../../internal/model/assignment';
import GradeItem from '../../../../../internal/model/grade_items';
import { AssignmentService, CreateAssignmentRequest } from '../types';

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
}

