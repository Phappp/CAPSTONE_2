import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { LiveSessionService } from '../types';
import { CreateLiveSessionBody, UpdateLiveSessionBody, ListLiveSessionQuery } from './dto';

export class LiveSessionController extends BaseController {
  service: LiveSessionService;

  constructor(service: LiveSessionService) {
    super();
    this.service = service;
  }

  async createSession(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new CreateLiveSessionBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const uid = Number(req.getSubject());
      const result = await this.service.createSession(uid, body);
      res.status(201).json({ id: result.id });
    });
  }

  async listSessions(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const query = new ListLiveSessionQuery(req.query);
      const uidRaw = (req as any)?.getSubject?.();
      const uid = uidRaw != null ? Number(uidRaw) : undefined;

      const result = await this.service.listSessions({
        courseId: query.courseId,
        hostId: query.hostId,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      });
      res.status(200).json(result);
    });
  }

  async getSessionById(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const sessionId = Number(req.params.id);
      const uidRaw = (req as any)?.getSubject?.();
      const uid = uidRaw != null ? Number(uidRaw) : undefined;

      const session = await this.service.getSessionById(uid || 0, sessionId);
      res.status(200).json(session);
    });
  }

  async updateSession(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const body = new UpdateLiveSessionBody(req.body);
      const sessionId = Number(req.params.id);
      const uid = Number(req.getSubject());

      await this.service.updateSession(uid, sessionId, body);
      res.sendStatus(204);
    });
  }

  async deleteSession(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const sessionId = Number(req.params.id);
      const uid = Number(req.getSubject());

      await this.service.deleteSession(uid, sessionId);
      res.sendStatus(204);
    });
  }

  async startSession(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const sessionId = Number(req.params.id);
      const uid = Number(req.getSubject());

      const session = await this.service.startSession(uid, sessionId);
      res.status(200).json(session);
    });
  }

  async endSession(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const sessionId = Number(req.params.id);
      const uid = Number(req.getSubject());

      const session = await this.service.endSession(uid, sessionId);
      res.status(200).json(session);
    });
  }
}
