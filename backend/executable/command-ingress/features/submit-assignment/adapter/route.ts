import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { SubmissionController } from './controller';
import upload from '../../../utils/upload';

const initSubmissionAssignmentRoute: (controller: SubmissionController) => express.Router = (controller) => {
    const router = express.Router({ mergeParams: true});

    // Submit Assignment: POST /api/v1/assignments/:assignmentId/submissions
    router.route('/').post(
        requireAuthorizedUser,
        upload.array('files[]', 5),
        controller.submitAssignment.bind(controller)
    );

    return router;
};

export default initSubmissionAssignmentRoute;