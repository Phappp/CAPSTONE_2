import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { CourseService, CourseStatus } from '../types';
import {
  CreateCourseBody,
  CreateLessonBody,
  CreateModuleBody,
  ListMyCoursesQuery,
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

  async deleteLessonResource(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number(req.params.id);
      const resourceId = Number(req.params.resourceId);
      await this.service.deleteLessonResource(uid, courseId, resourceId);
      res.sendStatus(204);
    });
  }
}

