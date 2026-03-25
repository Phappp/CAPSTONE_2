import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { SubmissionService } from '../types';
import { SubmitAssignmentBody } from './dto';

export class SubmissionController extends BaseController {
  service: SubmissionService;

  constructor(service: SubmissionService) {
    super();
    this.service = service;
  }

  async submitAssignment(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      // lấy thông tin ID từ Token và URL
      const uid = Number(req.getSubject()); // lấy user id của học viên từ token
      const assignmentId = Number(req.params.assignmentId);

      // khởi tạo DTO (Ép kiểu và gộp dữ liệu từ form-data)
      const body = new SubmitAssignmentBody(req.body, req.files, uid, assignmentId);

      // chạy Validate dùng base class
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      // gọi Service xử lý nghiệp vụ nộp bài
      const result = await this.service.submitAssignment(body);

      // trả về Response theo đúng JSON schema của SCRUM-19
      res.status(201).json({
        success: true,
        message: 'Nộp bài thành công',
        data: result
      });
    });
  }
}