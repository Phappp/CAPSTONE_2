import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { SubmissionController } from './controller';
import upload from '../../../utils/upload';

const initSubmissionAssignmentRoute: (controller: SubmissionController) => express.Router = (controller) => {
  const router = express.Router({ mergeParams: true });

  const maybeMultipart = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ct = String(req.headers['content-type'] || '');
    if (ct.includes('multipart/form-data')) {
      return upload.array('files', 15)(req, res, next);
    }
    return next();
  };

  router.route('/').post(
    requireAuthorizedUser,
    maybeMultipart,
    controller.submitAssignment.bind(controller)
  );

  return router;
};

export default initSubmissionAssignmentRoute;