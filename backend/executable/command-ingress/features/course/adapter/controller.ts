import { NextFunction, Response } from 'express';
import axios from 'axios';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { CourseService, CourseStatus } from '../types';
import {
  CreateCourseBody,
  CreateLessonBody,
  CreateLessonYoutubeResourceBody,
  CreateModuleBody,
  LearnerLessonProgressBody,
  ListPendingReviewCoursesQuery,
  ListPendingLessonResourcesQuery,
  ListAdminCoursesQuery,
  ReviewCourseBody,
  ReviewLessonResourceBody,
  UpdateCourseCompletionRulesBody,
  ListMyCoursesQuery,
  ListPublishedCoursesQuery,
  ReorderContentBody,
  SetCourseStatusBody,
  UpdateCourseBody,
  UpdateLessonBody,
  UpdateModuleBody,
  UpsertManualQuizBody,
  GenerateManualQuizAiBody,
  SubmitLearnerQuizBody,
} from './dto';

export class CourseController extends BaseController {
  service: CourseService;

  constructor(service: CourseService) {
    super();
    this.service = service;
  }

  // Public routes - Course catalog
  async listPublishedCourses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const query = new ListPublishedCoursesQuery(req.query);
      const subjectRaw = (req as any)?.getSubject?.();
      const uid = subjectRaw != null ? Number(subjectRaw) : undefined;
      const result = await this.service.listPublishedCourses(uid, {
        q: query.q,
        level: query.level,
        language: query.language,
        page: query.page,
        page_size: query.page_size,
        sort_by: query.sort_by,
        sort_dir: query.sort_dir,
      });
      res.status(200).json(result);
    });
  }

  async getPublishedCourseBySlug(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const slug = req.params.slug;
      const subjectRaw = (req as any)?.getSubject?.();
      const uid = subjectRaw != null ? Number(subjectRaw) : undefined;
      const course = await this.service.getPublishedCourseBySlug(uid, slug);
      res.status(200).json(course);
    });
  }

  async getPublishedCoursePrerequisiteGraphBySlug(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const slug = req.params.slug;
      const subjectRaw = (req as any)?.getSubject?.();
      const uid = subjectRaw != null ? Number(subjectRaw) : undefined;
      const graph = await this.service.getPublishedCoursePrerequisiteGraphBySlug(uid, slug);
      res.status(200).json(graph);
    });
  }

  async listInstructorsCatalog(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const result = await this.service.listInstructorsCatalog();
      res.status(200).json(result);
    });
  }

  async getInstructorById(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const instructorId = Number(req.params.id);
      if (isNaN(instructorId)) {
        res.status(400).json({ message: 'Invalid instructor ID' });
        return;
      }
      const item = await this.service.getInstructorById(instructorId);
      if (!item) {
        res.status(404).json({ message: 'Instructor not found' });
        return;
      }
      res.status(200).json({ item });
    });
  }

  // Course review routes
  async createReview(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const { rating, comment } = req.body as { rating: number; comment?: string };
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        return;
      }
      const review = await this.service.createCourseReview(uid, courseId, rating, comment ?? null);
      res.status(201).json(review);
    });
  }

  async listReviews(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const courseId = Number(req.params.id);
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.page_size || 10);
      const result = await this.service.listCourseReviews(courseId, page, pageSize);
      res.status(200).json(result);
    });
  }

  async updateReview(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const reviewId = Number(req.params.reviewId);
      const { rating, comment } = req.body as { rating: number; comment?: string };
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        return;
      }
      const review = await this.service.updateCourseReview(reviewId, uid, rating, comment ?? null);
      res.status(200).json(review);
    });
  }

  async deleteReview(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const reviewId = Number(req.params.reviewId);
      await this.service.deleteCourseReview(reviewId, uid);
      res.status(204).send();
    });
  }

  // Enrollment routes
  async enrollCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const enrollment = await this.service.enrollCourse(uid, courseId);
      res.status(201).json(enrollment);
    });
  }

  async listMyEnrollments(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const page = req.query.page ? Number(req.query.page) : 1;
      const page_size = req.query.page_size ? Number(req.query.page_size) : 12;
      const status = req.query.status as string;
      const q = req.query.q != null ? String(req.query.q) : undefined;

      const result = await this.service.listMyEnrollments(uid, {
        page,
        page_size,
        status: status as any,
        q,
      });
      res.status(200).json(result);
    });
  }

  async getMyLearningCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const course = await this.service.getMyLearningCourse(uid, courseId);
      res.status(200).json(course);
    });
  }

  async getMyCourseProgress(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.getMyCourseProgress(uid, courseId);
      res.status(200).json(result);
    });
  }

  async getCourseLeaderboard(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.getCourseLeaderboard(uid, courseId);
      res.status(200).json(result);
    });
  }

  async addLessonProgressHeartbeat(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const body = new LearnerLessonProgressBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const result = await this.service.addLessonProgressHeartbeat(uid, courseId, lessonId, body.delta_seconds);
      res.status(200).json(result);
    });
  }

  async completeLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const result = await this.service.completeLesson(uid, courseId, lessonId);
      res.status(200).json(result);
    });
  }

  // Instructor routes
  async createCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateCourseBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const uid = Number(req.getSubject());
      const result = await this.service.createCourse(uid, body);
      res.status(201).json({ id: result.id });
    });
  }

  async listMyCourses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const query = new ListMyCoursesQuery(req.query);
      const uid = Number(req.getSubject());
      const result = await this.service.listMyCourses(uid, {
        status: query.status,
        q: query.q,
        page: query.page,
        page_size: query.page_size,
        sort_by: query.sort_by,
        sort_dir: query.sort_dir,
      });
      res.status(200).json(result);
    });
  }

  async getMyCourseDashboardStats(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const stats = await this.service.getMyCourseDashboardStats(uid);
      res.status(200).json(stats);
    });
  }

  async getMyRevenueSummary(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const from = req.query.from != null ? String(req.query.from) : undefined;
      const to = req.query.to != null ? String(req.query.to) : undefined;
      const data = await this.service.getMyRevenueSummary(uid, { from, to });
      res.status(200).json(data);
    });
  }

  async getMyRevenueTrend(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const from = req.query.from != null ? String(req.query.from) : undefined;
      const to = req.query.to != null ? String(req.query.to) : undefined;
      const data = await this.service.getMyRevenueTrend(uid, { from, to });
      res.status(200).json(data);
    });
  }

  async listMyRevenueTransactions(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const from = req.query.from != null ? String(req.query.from) : undefined;
      const to = req.query.to != null ? String(req.query.to) : undefined;
      const page = req.query.page != null ? Number(req.query.page) : undefined;
      const page_size = req.query.page_size != null ? Number(req.query.page_size) : undefined;
      const data = await this.service.listMyRevenueTransactions(uid, {
        from,
        to,
        page,
        page_size,
      });
      res.status(200).json(data);
    });
  }

  async getMyCourseDetail(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const course = await this.service.getMyCourseDetail(uid, courseId);
      res.status(200).json(course);
    });
  }

  async getMyCourseManagerOverview(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const data = await this.service.getMyCourseManagerOverview(uid, courseId);
      res.status(200).json(data);
    });
  }

  async getMyCoursePrerequisiteGraph(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const graph = await this.service.getMyCoursePrerequisiteGraph(uid, courseId);
      res.status(200).json(graph);
    });
  }

  async listMyCoursePrerequisiteOptions(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const items = await this.service.listMyCoursePrerequisiteOptions(uid, courseId);
      res.status(200).json({ items });
    });
  }

  async updateMyCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new UpdateCourseBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      await this.service.updateMyCourse(uid, courseId, body);
      res.sendStatus(204);
    });
  }

  async setMyCourseStatus(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new SetCourseStatusBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      await this.service.setMyCourseStatus(uid, courseId, body.status as CourseStatus);
      res.sendStatus(204);
    });
  }

  async softDeleteMyCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      await this.service.softDeleteMyCourse(uid, courseId);
      res.sendStatus(204);
    });
  }

  async hardDeleteMyCourse(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      await this.service.hardDeleteMyCourse(uid, courseId);
      res.sendStatus(204);
    });
  }

  async getMyCourseContentTree(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const tree = await this.service.getMyCourseContentTree(uid, courseId);
      res.status(200).json(tree);
    });
  }

  async getMyCourseCompletionRules(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const rules = await this.service.getMyCourseCompletionRules(uid, courseId);
      res.status(200).json(rules);
    });
  }

  async updateMyCourseCompletionRules(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const body = new UpdateCourseCompletionRulesBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const rules = await this.service.updateMyCourseCompletionRules(uid, courseId, body);
      res.status(200).json(rules);
    });
  }

  async listMyCourseLearnerProgress(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const page = req.query.page ? Number(req.query.page) : 1;
      const page_size = req.query.page_size ? Number(req.query.page_size) : 20;
      const q = req.query.q != null ? String(req.query.q) : undefined;
      const result = await this.service.listMyCourseLearnerProgress(uid, courseId, { page, page_size, q });
      res.status(200).json(result);
    });
  }

  async listPendingReviewCourses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const query = new ListPendingReviewCoursesQuery(req.query);
      const result = await this.service.listPendingReviewCourses(uid, {
        page: query.page,
        page_size: query.page_size,
        q: query.q,
      });
      res.status(200).json(result);
    });
  }

  async listAdminCourses(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const query = new ListAdminCoursesQuery(req.query);
      const result = await this.service.listAdminCourses(uid, {
        page: query.page,
        page_size: query.page_size,
        q: query.q,
        status: query.status,
        sort_by: query.sort_by,
        sort_dir: query.sort_dir,
      });
      res.status(200).json(result);
    });
  }

  async reviewCourseByAdmin(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const body = new ReviewCourseBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      await this.service.reviewCourseByAdmin(uid, courseId, body.decision, body.note);
      res.sendStatus(204);
    });
  }

  async listPendingLessonResourcesByAdmin(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const query = new ListPendingLessonResourcesQuery(req.query);
      const uid = Number(req.getSubject());
      const result = await this.service.listPendingLessonResourcesByAdmin(uid, {
        page: query.page,
        page_size: query.page_size,
        q: query.q,
        kind: query.kind,
        course_id: query.course_id,
      });
      res.status(200).json(result);
    });
  }

  async listMyRejectedLessonResources(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.listMyRejectedLessonResources(uid, courseId);
      res.status(200).json(result);
    });
  }

  async listMyPendingLessonResources(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.listMyPendingLessonResources(uid, courseId);
      res.status(200).json(result);
    });
  }

  async listMyApprovedLessonResources(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.listMyApprovedLessonResources(uid, courseId);
      res.status(200).json(result);
    });
  }

  async reviewLessonResourceByAdmin(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new ReviewLessonResourceBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const uid = Number(req.getSubject());
      const resourceId = Number(req.params.resourceId);
      await this.service.reviewLessonResourceByAdmin(uid, resourceId, body.decision, body.note);
      res.sendStatus(204);
    });
  }

  async getLessonResourceReviewTimelineByAdmin(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const resourceId = Number(req.params.resourceId);
      const timeline = await this.service.getLessonResourceReviewTimelineByAdmin(uid, resourceId);
      res.status(200).json(timeline);
    });
  }

  async getCourseReviewTimelineByAdmin(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const timeline = await this.service.getCourseReviewTimelineByAdmin(uid, courseId);
      res.status(200).json(timeline);
    });
  }

  async getMyCourseReviewTimeline(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const timeline = await this.service.getMyCourseReviewTimeline(uid, courseId);
      res.status(200).json(timeline);
    });
  }

  async createModule(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateModuleBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const result = await this.service.createModule(uid, courseId, body);
      res.status(201).json({ id: result.id });
    });
  }

  async updateModule(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new UpdateModuleBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const moduleId = Number(req.params.moduleId);
      await this.service.updateModule(uid, courseId, moduleId, body);
      res.sendStatus(204);
    });
  }

  async deleteModule(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const moduleId = Number(req.params.moduleId);
      await this.service.deleteModule(uid, courseId, moduleId);
      res.sendStatus(204);
    });
  }

  async createLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateLessonBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const moduleId = Number(req.params.moduleId);
      const result = await this.service.createLesson(uid, courseId, moduleId, body);
      res.status(201).json({ id: result.id });
    });
  }

  async updateLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new UpdateLessonBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      await this.service.updateLesson(uid, courseId, lessonId, body);
      res.sendStatus(204);
    });
  }

  async deleteLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      await this.service.deleteLesson(uid, courseId, lessonId);
      res.sendStatus(204);
    });
  }

  async reorderContent(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new ReorderContentBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      await this.service.reorderCourseContent(uid, courseId, body);
      res.sendStatus(204);
    });
  }

  async listLessonResources(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const resources = await this.service.listLessonResources(uid, courseId, lessonId);
      res.status(200).json({ items: resources });
    });
  }

  async createLessonYoutubeResource(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateLessonYoutubeResourceBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const result = await this.service.createLessonYoutubeResource(uid, courseId, lessonId, body as any);
      res.status(201).json({ id: result.id, review_status: 'pending' });
    });
  }

  async deleteLessonResource(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const resourceId = Number(req.params.resourceId);
      await this.service.deleteLessonResource(uid, courseId, resourceId);
      res.sendStatus(204);
    });
  }

  async viewLessonResource(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const resourceId = Number(req.params.resourceId);
      const { url, mime_type, filename } = await this.service.getLessonResourceViewUrl(
        uid,
        courseId,
        resourceId
      );

      const lowerUrl = String(url || '').toLowerCase();
      const isYoutube =
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be') ||
        lowerUrl.includes('/youtube/embed/');
      const mime = String(mime_type || '').toLowerCase();
      const ext = String(filename || '').toLowerCase().split('.').pop() || '';
      const isOfficeDoc =
        ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) ||
        mime.includes('msword') ||
        mime.includes('officedocument') ||
        mime.includes('application/vnd.ms-');
      if (isYoutube) {
        res.status(200).json({ url, mime_type, filename });
        return;
      }
      if (isOfficeDoc) {
        res.status(200).json({ url, mime_type, filename });
        return;
      }

      try {
        const axRes = await axios.get(url, {
          responseType: 'stream',
          validateStatus: () => true,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: '*/*',
          },
        });
        if (axRes.status !== 200) {
          res.status(502).json({ message: 'Không thể tải file từ kho lưu trữ.' });
          return;
        }

        res.setHeader('Content-Type', mime_type || 'application/octet-stream');
        const safeName = (filename || 'file').replace(/"/g, '%22');
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
        axRes.data.pipe(res);
      } catch (e: any) {
        const code = String(e?.code || e?.cause?.code || '');
        // Fallback cho môi trường nội bộ không resolve DNS cloud storage:
        // trả URL gốc để FE mở trực tiếp thay vì fail toàn bộ endpoint.
        if (code === 'ENOTFOUND') {
          res.status(200).json({ url, mime_type, filename });
          return;
        }
        throw e;
      }
    });
  }

  async getManualQuizForLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const quiz = await this.service.getManualQuizForLesson(uid, courseId, lessonId);
      res.status(200).json({ quiz });
    });
  }

  async upsertManualQuizForLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new UpsertManualQuizBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const result = await this.service.upsertManualQuizForLesson(uid, courseId, lessonId, body as any);
      res.status(200).json(result);
    });
  }

  async generateManualQuizByAi(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new GenerateManualQuizAiBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const result = await this.service.generateManualQuizQuestionsWithAi(uid, courseId, lessonId, body as any);
      res.status(200).json({ success: true, data: result });
    });
  }

  async getLearnerQuizTake(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const payload = await this.service.getLearnerQuizForLesson(uid, courseId, lessonId);
      res.status(200).json({ quiz: payload });
    });
  }

  async submitLearnerQuizTake(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new SubmitLearnerQuizBody(req.body);
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const result = await this.service.submitLearnerQuiz(uid, courseId, lessonId, { answers: body.answers });
      res.status(200).json(result);
    });
  }

  async listQuizLearnerScoresForLesson(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.listQuizLearnerScoresForLesson(uid, courseId, lessonId);
      res.status(200).json({ success: true, data });
    });
  }

  async getQuizAttemptDetailForTeacher(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const attemptId = Number(req.params.attemptId);
      const data = await this.service.getQuizAttemptDetailForTeacher(uid, courseId, lessonId, attemptId);
      res.status(200).json({ success: true, data });
    });
  }

  async getMyLearningActivity(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const data = await this.service.getMyLearningActivity(uid);
      res.status(200).json(data);
    });
  }

  /** Learner: get quiz questions for chatbot context (without correct answers) */
  async getQuizQuestionsForLearner(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.getQuizQuestionsForLearner(uid, courseId, lessonId);
      res.status(200).json(data);
    });
  }

  /** Learner: get transcript for chatbot context */
  async getLessonTranscript(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const data = await this.service.getLessonTranscriptForLearner(uid, courseId, lessonId);
      res.status(200).json(data);
    });
  }

  async getLessonTranscriptChunk(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const lessonId = Number(req.params.lessonId);
      const fromSec = Number(req.query.from) || 0;
      const toSec = Number(req.query.to) || 0;
      const data = await this.service.getLessonTranscriptChunkForLearner(uid, courseId, lessonId, fromSec, toSec);
      res.status(200).json(data);
    });
  }
}