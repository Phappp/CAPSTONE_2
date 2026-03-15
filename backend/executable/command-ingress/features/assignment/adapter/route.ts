import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AssignmentController } from './controller';

const initAssignmentRoute: (controller: AssignmentController) => express.Router = (controller) => {
  const router = express.Router({ mergeParams: true });

  // Create Assignment: POST /api/v1/lessons/:lessonId/assignments
  router.route('/lessons/:lessonId/assignments').post(requireAuthorizedUser, controller.createAssignment.bind(controller));

  return router;
};

export default initAssignmentRoute;