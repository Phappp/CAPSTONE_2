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
  UpdateCourseCompletionRulesBody,
  ListMyCoursesQuery,
  ListPublishedCoursesQuery,
  ReorderContentBody,
  SetCourseStatusBody,
  UpdateCourseBody,
  UpdateLessonBody,
  UpdateModuleBody,
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

  async getMyCourseDetail(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const course = await this.service.getMyCourseDetail(uid, courseId);
      res.status(200).json(course);
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
      res.status(201).json({ id: result.id });
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
    });
  }
}