import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AiShortAnswerController } from './controller';
import { AiShortAnswerServiceImpl } from '../domain/service';

export default (controller: AiShortAnswerController): express.Router => {
  const router = express.Router();
  router.post('/generate-short-answer-questions', requireAuthorizedUser, controller.generateShortAnswerQuestions.bind(controller));
  return router;
};
