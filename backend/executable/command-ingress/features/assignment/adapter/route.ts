import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AssignmentController } from './controller';

import initSubmissionRoute from '../../submit-assignment/adapter/route';
import { SubmissionController } from '../../submit-assignment/adapter/controller';
import { SubmissionServiceImpl } from '../../submit-assignment/domain/service';

const initAssignmentRoute: (controller: AssignmentController) => express.Router = (controller) => {
  const router = express.Router({ mergeParams: true });

  // Create Assignment: POST /api/v1/lessons/:lessonId/assignments
  router.route('/lessons/:lessonId/assignments').post(requireAuthorizedUser, controller.createAssignment.bind(controller));

  // Khởi tạo SubmissionController và route cho submission
  const submissionController = new SubmissionController(new SubmissionServiceImpl());

  // mount submission routes
  router.use('/assignments/:assignmentId/submissions', initSubmissionRoute(submissionController));

  return router;
};

export default initAssignmentRoute;