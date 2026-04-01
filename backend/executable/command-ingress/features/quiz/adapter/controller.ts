import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { QuizService } from '../types';
import { CreateQuizBody } from './dto';

export class QuizController extends BaseController {
  service: QuizService;

  constructor(service: QuizService) {
    super();
    this.service = service;
  }

  async createQuiz(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const lessonId = Number(req.params.lessonId);
      const subject = (req as any)?.getSubject?.();
      if (!subject) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const instructorId = Number(subject);

      const body = new CreateQuizBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        res.status(400).json({ success: false, message: 'Invalid request body' });
        return;
      }

      const result = await this.service.createQuiz(instructorId, lessonId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo bài kiểm tra thành công',
        data: result,
      });
    });
  }

  async getQuizByLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const lessonId = Number(req.params.lessonId);
      const userId = Number(req.getSubject());
      const quiz = await this.service.getQuizByLesson(lessonId, userId);
      res.status(200).json({ success: true, data: quiz });
    });
  }

  async getQuizById(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const quizId = Number(req.params.quizId);
      const userId = Number(req.getSubject());
      const quiz = await this.service.getQuizById(quizId, userId);
      res.status(200).json({ success: true, data: quiz });
    });
  }

  async getLatestAttempt(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const quizId = Number(req.params.quizId);
      const userId = Number(req.getSubject());
      const attempt = await this.service.getLatestInProgressAttempt(quizId, userId);
      res.status(200).json({ success: true, data: attempt });
    });
  }

  async createQuizAttempt(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const quizId = Number(req.params.quizId);
      const userId = Number(req.getSubject());
      const attempt = await this.service.createQuizAttempt(quizId, userId);
      res.status(201).json({ success: true, data: attempt });
    });
  }

  async getAttemptResponses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const attemptId = Number(req.params.attemptId);
      const userId = Number(req.getSubject());
      const responses = await this.service.getAttemptResponses(attemptId, userId);
      res.status(200).json({ success: true, data: responses });
    });
  }

  async saveAttemptResponses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const attemptId = Number(req.params.attemptId);
      const userId = Number(req.getSubject());
      const responses = req.body?.responses;
      if (!Array.isArray(responses)) {
        res.status(400).json({ success: false, message: 'responses must be an array' });
        return;
      }
      await this.service.saveAttemptResponses(attemptId, userId, responses);
      res.status(200).json({ success: true, message: 'Lưu tạm bài làm thành công' });
    });
  }

  async submitAttempt(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const attemptId = Number(req.params.attemptId);
      const userId = Number(req.getSubject());
      const result = await this.service.submitAttempt(attemptId, userId);
      res.status(200).json({ success: true, data: result });
    });
  }

  async autoGradeAttempt(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const attemptId = Number(req.params.attemptId);
      const userId = Number(req.getSubject());
      const result = await this.service.autoGradeAttempt(attemptId, userId);
      res.status(200).json({ success: true, message: 'Chấm điểm tự động thành công', data: result });
    });
  }
}


