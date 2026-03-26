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
      const uid = Number(req.getSubject());
      const assignmentId = Number(req.params.assignmentId);

      if (!assignmentId || isNaN(assignmentId) || assignmentId <= 0) {
        res.status(400).json({ error: 'err_validation', message: ['Assignment ID không hợp lệ'] });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const body = new SubmitAssignmentBody(req.body, files, uid, assignmentId);

      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const result = await this.service.submitAssignment(body);

      res.status(201).json({
        success: true,
        message: 'Nộp bài thành công',
        data: result
      });
    });
  }
}