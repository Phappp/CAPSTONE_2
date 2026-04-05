import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { AssignmentService } from '../types';
import { CreateAssignmentBody } from './dto';

export class AssignmentController extends BaseController {
  service: AssignmentService;

  constructor(service: AssignmentService) {
    super();
    this.service = service;
  }

  async createAssignment(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateAssignmentBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const uid = Number(req.getSubject()); // hàm này lấy user id của giảng viên từ token
      const lessonId = Number(req.params.lessonId);

      const result = await this.service.createAssignment(uid, lessonId, body);

      // trả về thông tin bài tập vừa tạo, bao gồm id, lesson_id, title, due_date, created_at theo định dạng JSON
      res.status(201).json({
        success: true,
        message: 'Tạo bài tập thành công!',
        data: {
          assignment_id: result.id,
          lesson_id: result.lesson_id,
          title: result.title,
          due_date: result.due_date,
          created_at: result.created_at
        }
      });
    });
  }

  async uploadAssignmentAttachments(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const lessonId = Number(req.params.lessonId);
      const assignmentId = Number(req.params.assignmentId);

      const files = ((req as any)?.files ?? []) as any[];
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ message: 'Vui lòng chọn file để upload.' });
        return;
      }

      const attachments = await this.service.uploadAssignmentAttachments(uid, lessonId, assignmentId, files);

      res.status(201).json({
        success: true,
        message: 'Upload đính kèm thành công!',
        data: { assignment_id: assignmentId, attachments },
      });
    });
  }

  async getAssignmentPreview(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const lessonId = Number(req.params.lessonId);
      const assignmentId = Number(req.params.assignmentId);

      const preview = await this.service.getAssignmentPreview(uid, lessonId, assignmentId);
      res.status(200).json(preview);
    });
  }

  async updateAssignment(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const lessonId = Number(req.params.lessonId);
      const assignmentId = Number(req.params.assignmentId);

      await this.service.updateAssignment(uid, lessonId, assignmentId, req.body);
      res.sendStatus(204);
    })
  }
  
  async gradeSubmission(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
        const graderId = Number(req.getSubject()); // Lấy ID giảng viên từ token
        const { submissionId, gradeItemId, userId, score, feedbackText } = req.body;

        await this.service.gradeSubmission({
            submissionId,
            gradeItemId,
            userId,
            score,
            feedbackText,
            graderId
        });

        res.status(200).json({
            success: true,
            message: 'Chấm điểm và gửi thông báo thành công!'
        });
    });
  }
  async getMyGrades(req: HttpRequest, res: Response, next: NextFunction) {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
        const studentId = Number(req.getSubject());
        const data = await this.service.getMyGradesSummary(studentId);
        
        res.status(200).json({
            success: true,
            data: { grades_summary: data }
        });
    });
  }

  async getMyAssignmentGradeDetail(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const studentId = Number(req.getSubject());
      const assignmentId = Number(req.params.assignmentId);

      const detail = await this.service.getMyAssignmentGradeDetail(studentId, assignmentId);
      res.status(200).json({
        success: true,
        data: detail
      });
    });
  }

  async sendGradeAppeal(req: HttpRequest, res: Response, next: NextFunction) {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
        const studentId = Number(req.getSubject());
        const submissionId = Number(req.params.submissionId);
        const { content } = req.body; // Nội dung khiếu nại

        // Gọi service lưu vào DB
        await this.service.createGradeAppeal(studentId, submissionId, content);

        res.status(201).json({ 
            success: true, 
            message: 'Đã gửi khiếu nại thành công cho giảng viên!' 
        });
    });
  }
}
