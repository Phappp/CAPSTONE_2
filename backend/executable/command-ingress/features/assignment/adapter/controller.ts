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
}