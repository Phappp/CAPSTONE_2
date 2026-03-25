import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { CourseController } from './controller';
import initCourseUploadRoute from './upload';

const initCourseRoute: (controller: CourseController) => express.Router = (controller) => {
  const router = express.Router();

  // Public routes - Course catalog
  router.route('/catalog').get(controller.listPublishedCourses.bind(controller));
  router.route('/catalog/:slug').get(controller.getPublishedCourseBySlug.bind(controller));

  // Enrollment routes
  router.route('/:id/enroll').post(requireAuthorizedUser, controller.enrollCourse.bind(controller));
  router.route('/my-enrollments').get(requireAuthorizedUser, controller.listMyEnrollments.bind(controller));
  router.route('/:id/learning').get(requireAuthorizedUser, controller.getMyLearningCourse.bind(controller));
  router.route('/:id/progress').get(requireAuthorizedUser, controller.getMyCourseProgress.bind(controller));
  router.route('/:id/lessons/:lessonId/progress').post(requireAuthorizedUser, controller.addLessonProgressHeartbeat.bind(controller));
  router.route('/:id/lessons/:lessonId/complete').post(requireAuthorizedUser, controller.completeLesson.bind(controller));

  // Create course
  router.route('/').post(requireAuthorizedUser, controller.createCourse.bind(controller));

  // Instructor dashboard
  router.route('/my/stats').get(requireAuthorizedUser, controller.getMyCourseDashboardStats.bind(controller));
  router.route('/my').get(requireAuthorizedUser, controller.listMyCourses.bind(controller));

  // Content builder (modules & lessons)
  router.route('/:id/content').get(requireAuthorizedUser, controller.getMyCourseContentTree.bind(controller));
  router.route('/:id/content/reorder').patch(requireAuthorizedUser, controller.reorderContent.bind(controller));
  router.route('/:id/modules').post(requireAuthorizedUser, controller.createModule.bind(controller));
  router.route('/:id/modules/:moduleId').patch(requireAuthorizedUser, controller.updateModule.bind(controller));
  router.route('/:id/modules/:moduleId').delete(requireAuthorizedUser, controller.deleteModule.bind(controller));
  router.route('/:id/modules/:moduleId/lessons').post(requireAuthorizedUser, controller.createLesson.bind(controller));
  router.route('/:id/lessons/:lessonId').patch(requireAuthorizedUser, controller.updateLesson.bind(controller));
  router.route('/:id/lessons/:lessonId').delete(requireAuthorizedUser, controller.deleteLesson.bind(controller));
  router.route('/:id/lessons/:lessonId/resources').get(requireAuthorizedUser, controller.listLessonResources.bind(controller));
  router.route('/:id/lessons/:lessonId/resources/youtube').post(requireAuthorizedUser, controller.createLessonYoutubeResource.bind(controller));
  router.route('/:id/resources/:resourceId').delete(requireAuthorizedUser, controller.deleteLessonResource.bind(controller));
  router.route('/:id/resources/:resourceId/view').get(requireAuthorizedUser, controller.viewLessonResource.bind(controller));

  router.use(initCourseUploadRoute(controller));

  // Course actions
  router.route('/:id').get(requireAuthorizedUser, controller.getMyCourseDetail.bind(controller));
  router.route('/:id').patch(requireAuthorizedUser, controller.updateMyCourse.bind(controller));
  router.route('/:id/status').patch(requireAuthorizedUser, controller.setMyCourseStatus.bind(controller));
  router.route('/:id').delete(requireAuthorizedUser, controller.softDeleteMyCourse.bind(controller));

  return router;
};

export default initCourseRoute;