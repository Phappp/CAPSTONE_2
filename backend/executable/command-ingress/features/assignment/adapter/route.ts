import express from 'express';
import multer from 'multer';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AssignmentController } from './controller';

import initSubmissionRoute from '../../submit-assignment/adapter/route';
import { SubmissionController } from '../../submit-assignment/adapter/controller';
import { SubmissionServiceImpl } from '../../submit-assignment/domain/service';

const initAssignmentRoute: (controller: AssignmentController) => express.Router = (controller) => {
  const router = express.Router({ mergeParams: true });

  // Create Assignment: POST /api/v1/lessons/:lessonId/assignments
  router.route('/lessons/:lessonId/assignments').post(requireAuthorizedUser, controller.createAssignment.bind(controller));

  // Upload attachments for an assignment
  // FE tối ưu: tạo assignment trước rồi upload nhiều file sau.
  // Field name: `files`
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB/file
  });

  router.route('/lessons/:lessonId/assignments/:assignmentId/attachments/upload').post(
    requireAuthorizedUser,
    upload.array('files', 20),
    controller.uploadAssignmentAttachments.bind(controller)
  );

  // Preview assignment (signed URLs để FE hiển thị giống học viên)
  router.route('/lessons/:lessonId/assignments/:assignmentId/preview').get(
    requireAuthorizedUser,
    controller.getAssignmentPreview.bind(controller)
  );

  // Edit assignment (K3)
  router.route('/lessons/:lessonId/assignments/:assignmentId').patch(
    requireAuthorizedUser,
    controller.updateAssignment.bind(controller)
  );
  // Khởi tạo SubmissionController và route cho submission
  const submissionController = new SubmissionController(new SubmissionServiceImpl());

  // mount submission routes
  router.use('/assignments/:assignmentId/submissions', initSubmissionRoute(submissionController));

  // Route cho xem điểm và phản hồi
  router.route('/my/grades').get(
    requireAuthorizedUser, 
    controller.getMyGrades.bind(controller)
  );

  // Lấy chi tiết bài tập 
  router.route('/:assignmentId/my-grade').get(requireAuthorizedUser, controller.getMyAssignmentGradeDetail.bind(controller));

  // Route gửi khiếu nại (Appeal)
  router.route('/assignments/submissions/:submissionId/appeals').post(
    requireAuthorizedUser,
    controller.sendGradeAppeal.bind(controller)
  );
  router.route('/assignments/:assignmentId/my-grade').get(
    requireAuthorizedUser, 
    controller.getMyAssignmentGradeDetail.bind(controller)
  );
  // Route cho chấm điểm
  router.route('/submissions/:submissionId/grade').post(requireAuthorizedUser, controller.gradeSubmission.bind(controller));
  return router;

  
};

export default initAssignmentRoute;