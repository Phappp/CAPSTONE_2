import { Router } from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { QuizController } from './controller';
import { QuizServiceImpl } from '../domain/service';

export function createQuizRouter(): Router {
  const router = Router({ mergeParams: true });
  const service = new QuizServiceImpl();
  const controller = new QuizController(service);

  // GET /api/v1/lessons/:lessonId/quizzes
  router.get('/', requireAuthorizedUser, controller.getQuizByLesson.bind(controller));

  // POST /api/v1/lessons/:lessonId/quizzes
  router.post('/', requireAuthorizedUser, controller.createQuiz.bind(controller));

  return router;
}

export function createQuizByIdRouter(): Router {
  const router = Router();
  const service = new QuizServiceImpl();
  const controller = new QuizController(service);

  // GET /api/v1/quizzes/:quizId
  router.get('/:quizId', requireAuthorizedUser, controller.getQuizById.bind(controller));

  // GET /api/v1/quizzes/:quizId/attempts/latest
  router.get('/:quizId/attempts/latest', requireAuthorizedUser, controller.getLatestAttempt.bind(controller));

  // POST /api/v1/quizzes/:quizId/attempts
  router.post('/:quizId/attempts', requireAuthorizedUser, controller.createQuizAttempt.bind(controller));

  return router;
}

export function createQuizAttemptRouter(): Router {
  const router = Router();
  const service = new QuizServiceImpl();
  const controller = new QuizController(service);

  // GET /api/v1/quiz-attempts/:attemptId/responses
  router.get('/:attemptId/responses', requireAuthorizedUser, controller.getAttemptResponses.bind(controller));

  // PUT /api/v1/quiz-attempts/:attemptId/responses
  router.put('/:attemptId/responses', requireAuthorizedUser, controller.saveAttemptResponses.bind(controller));

  // POST /api/v1/quiz-attempts/:attemptId/submit
  router.post('/:attemptId/submit', requireAuthorizedUser, controller.submitAttempt.bind(controller));

  // POST /api/v1/quiz-attempts/:attemptId/auto-grade
  router.post('/:attemptId/auto-grade', requireAuthorizedUser, controller.autoGradeAttempt.bind(controller));

  return router;
}

export default createQuizRouter;
