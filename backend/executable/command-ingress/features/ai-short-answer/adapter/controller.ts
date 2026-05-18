import express, { Request, Response, NextFunction } from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AiShortAnswerServiceImpl } from '../domain/service';
import { AiShortAnswerService } from '../domain/types';

export class AiShortAnswerController {
  private service: AiShortAnswerService;

  constructor(service?: AiShortAnswerService) {
    this.service = service || new AiShortAnswerServiceImpl();
  }

  async generateShortAnswerQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = Number((req as any).getSubject?.());
      if (!uid || Number.isNaN(uid)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { topic, count = 5, extra_instructions = '' } = req.body || {};
      if (!topic || !String(topic).trim()) {
        res.status(400).json({ error: 'Vui lòng nhập chủ đề.' });
        return;
      }

      const result = await this.service.generateShortAnswerQuestions({
        topic: String(topic).trim(),
        question_count: Number(count) || 5,
        extra_instructions: String(extra_instructions || '').trim(),
      });

      res.status(200).json({ success: true, questions: result.questions });
    } catch (err: any) {
      const message = String(err?.message || err || 'Đã xảy ra lỗi.');
      if (message.includes('không khả dụng') || message.includes('giải mã') || message.includes('OpenRouter')) {
        res.status(503).json({ error: message });
        return;
      }
      next(err);
    }
  }
}

export default (service?: AiShortAnswerService): express.Router => {
  const router = express.Router();
  router.post('/generate-short-answer-questions', requireAuthorizedUser, new AiShortAnswerController(service).generateShortAnswerQuestions.bind(new AiShortAnswerController(service)));
  return router;
};
