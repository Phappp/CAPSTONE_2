import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { optionalAuthorizedUser } from '../../../middlewares/auth';
import { CourseController } from './controller';
import initCourseUploadRoute from './upload';

const initCourseRoute: (controller: CourseController) => express.Router = (controller) => {
  const router = express.Router();

  // Public routes - Course catalog
  router.route('/catalog').get(optionalAuthorizedUser, controller.listPublishedCourses.bind(controller));
  router.route('/catalog/:slug').get(optionalAuthorizedUser, controller.getPublishedCourseBySlug.bind(controller));
  router.route('/catalog/:slug/prerequisite-graph').get(optionalAuthorizedUser, controller.getPublishedCoursePrerequisiteGraphBySlug.bind(controller));

  // Enrollment routes
  router.route('/:id/enroll').post(requireAuthorizedUser, controller.enrollCourse.bind(controller));
  router.route('/my-enrollments').get(requireAuthorizedUser, controller.listMyEnrollments.bind(controller));
  router.route('/my/learning-activity').get(requireAuthorizedUser, controller.getMyLearningActivity.bind(controller));
  router.route('/:id/learning').get(requireAuthorizedUser, controller.getMyLearningCourse.bind(controller));
  router.route('/:id/progress').get(requireAuthorizedUser, controller.getMyCourseProgress.bind(controller));
  router.route('/:id/leaderboard').get(requireAuthorizedUser, controller.getCourseLeaderboard.bind(controller));
  router.route('/:id/lessons/:lessonId/progress').post(requireAuthorizedUser, controller.addLessonProgressHeartbeat.bind(controller));
  router.route('/:id/lessons/:lessonId/complete').post(requireAuthorizedUser, controller.completeLesson.bind(controller));
  router.route('/:id/lessons/:lessonId/quiz/take').get(requireAuthorizedUser, controller.getLearnerQuizTake.bind(controller));
  router.route('/:id/lessons/:lessonId/quiz/submit').post(requireAuthorizedUser, controller.submitLearnerQuizTake.bind(controller));
  /** Giảng viên: điểm quiz theo từng học viên (ghi danh). */
  router
    .route('/:id/lessons/:lessonId/quiz/learner-scores')
    .get(requireAuthorizedUser, controller.listQuizLearnerScoresForLesson.bind(controller));
  router
    .route('/:id/lessons/:lessonId/quiz/attempts/:attemptId')
    .get(requireAuthorizedUser, controller.getQuizAttemptDetailForTeacher.bind(controller));

  // Create course
  router.route('/').post(requireAuthorizedUser, controller.createCourse.bind(controller));

  // Instructor dashboard
  router.route('/my/stats').get(requireAuthorizedUser, controller.getMyCourseDashboardStats.bind(controller));
  router.route('/my/revenue/summary').get(requireAuthorizedUser, controller.getMyRevenueSummary.bind(controller));
  router.route('/my/revenue/trend').get(requireAuthorizedUser, controller.getMyRevenueTrend.bind(controller));
  router.route('/my/revenue/transactions').get(requireAuthorizedUser, controller.listMyRevenueTransactions.bind(controller));
  router.route('/my').get(requireAuthorizedUser, controller.listMyCourses.bind(controller));
  router.route('/admin/pending-review').get(requireAuthorizedUser, controller.listPendingReviewCourses.bind(controller));
  router.route('/admin/resources/pending-review').get(requireAuthorizedUser, controller.listPendingLessonResourcesByAdmin.bind(controller));
  router.route('/:id/admin-review').patch(requireAuthorizedUser, controller.reviewCourseByAdmin.bind(controller));
  router.route('/:id/admin-review/timeline').get(requireAuthorizedUser, controller.getCourseReviewTimelineByAdmin.bind(controller));
  router.route('/resources/:resourceId/admin-review').patch(requireAuthorizedUser, controller.reviewLessonResourceByAdmin.bind(controller));
  router.route('/resources/:resourceId/admin-review/timeline').get(requireAuthorizedUser, controller.getLessonResourceReviewTimelineByAdmin.bind(controller));
  router.route('/:id/review-timeline').get(requireAuthorizedUser, controller.getMyCourseReviewTimeline.bind(controller));
  router.route('/:id/rejected-resources').get(requireAuthorizedUser, controller.listMyRejectedLessonResources.bind(controller));
  router.route('/:id/pending-resources').get(requireAuthorizedUser, controller.listMyPendingLessonResources.bind(controller));
  router.route('/:id/approved-resources').get(requireAuthorizedUser, controller.listMyApprovedLessonResources.bind(controller));

  // Content builder (modules & lessons)
  router.route('/:id/content').get(requireAuthorizedUser, controller.getMyCourseContentTree.bind(controller));
  router.route('/:id/completion-rules').get(requireAuthorizedUser, controller.getMyCourseCompletionRules.bind(controller));
  router.route('/:id/completion-rules').patch(requireAuthorizedUser, controller.updateMyCourseCompletionRules.bind(controller));
  router.route('/:id/learners/progress').get(requireAuthorizedUser, controller.listMyCourseLearnerProgress.bind(controller));
  router.route('/:id/manager-overview').get(requireAuthorizedUser, controller.getMyCourseManagerOverview.bind(controller));
  router.route('/:id/content/reorder').patch(requireAuthorizedUser, controller.reorderContent.bind(controller));
  router.route('/:id/modules').post(requireAuthorizedUser, controller.createModule.bind(controller));
  router.route('/:id/modules/:moduleId').patch(requireAuthorizedUser, controller.updateModule.bind(controller));
  router.route('/:id/modules/:moduleId').delete(requireAuthorizedUser, controller.deleteModule.bind(controller));
  router.route('/:id/modules/:moduleId/lessons').post(requireAuthorizedUser, controller.createLesson.bind(controller));
  router.route('/:id/lessons/:lessonId').patch(requireAuthorizedUser, controller.updateLesson.bind(controller));
  router.route('/:id/lessons/:lessonId').delete(requireAuthorizedUser, controller.deleteLesson.bind(controller));
  router
    .route('/:id/lessons/:lessonId/quiz/manual')
    .get(requireAuthorizedUser, controller.getManualQuizForLesson.bind(controller))
    .post(requireAuthorizedUser, controller.upsertManualQuizForLesson.bind(controller));
  router
    .route('/:id/lessons/:lessonId/quiz/manual/ai-generate')
    .post(requireAuthorizedUser, controller.generateManualQuizByAi.bind(controller));
  router.route('/:id/lessons/:lessonId/resources').get(requireAuthorizedUser, controller.listLessonResources.bind(controller));
  router.route('/:id/lessons/:lessonId/resources/youtube').post(requireAuthorizedUser, controller.createLessonYoutubeResource.bind(controller));
  router.route('/:id/resources/:resourceId').delete(requireAuthorizedUser, controller.deleteLessonResource.bind(controller));
  router.route('/:id/resources/:resourceId/view').get(requireAuthorizedUser, controller.viewLessonResource.bind(controller));

  router.use(initCourseUploadRoute(controller));

  // Course actions
  router.route('/:id').get(requireAuthorizedUser, controller.getMyCourseDetail.bind(controller));
  router.route('/:id/prerequisite-graph').get(requireAuthorizedUser, controller.getMyCoursePrerequisiteGraph.bind(controller));
  router.route('/:id/prerequisite-options').get(requireAuthorizedUser, controller.listMyCoursePrerequisiteOptions.bind(controller));
  router.route('/:id').patch(requireAuthorizedUser, controller.updateMyCourse.bind(controller));
  router.route('/:id/status').patch(requireAuthorizedUser, controller.setMyCourseStatus.bind(controller));
  router.route('/:id').delete(requireAuthorizedUser, controller.softDeleteMyCourse.bind(controller));
  router.route('/:id/permanent').delete(requireAuthorizedUser, controller.hardDeleteMyCourse.bind(controller));

  return router;
};

export default initCourseRoute;