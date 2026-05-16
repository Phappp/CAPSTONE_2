import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { AiSummaryService } from '../types';

export class AiSummaryController extends BaseController {
  service: AiSummaryService;

  constructor(service: AiSummaryService) {
    super();
    this.service = service;
  }

  async requestLessonSummary(req: HttpRequest, res: Response, _next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, _next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.requestLessonSummary(uid, courseId, lessonId);
      res.status(200).json(data);
    });
  }

  async getLessonSummary(req: HttpRequest, res: Response, _next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, _next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.getLessonSummary(uid, courseId, lessonId);
      res.status(200).json(data);
    });
  }

  async regenerateLessonSummary(req: HttpRequest, res: Response, _next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, _next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.regenerateLessonSummary(uid, courseId, lessonId);
      res.status(200).json(data);
    });
  }
}
