import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AiSummaryController } from './controller';

const initAiSummaryRoute: (controller: AiSummaryController) => express.Router = (controller) => {
  const router = express.Router();

  router.route('/:id/lessons/:lessonId/summary').get(requireAuthorizedUser, controller.getLessonSummary.bind(controller));
  router.route('/:id/lessons/:lessonId/summary/request').post(requireAuthorizedUser, controller.requestLessonSummary.bind(controller));
  router.route('/:id/lessons/:lessonId/summary/regenerate').post(requireAuthorizedUser, controller.regenerateLessonSummary.bind(controller));

  return router;
};

export default initAiSummaryRoute;
