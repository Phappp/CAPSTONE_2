import { Response, NextFunction } from 'express';
import { HttpRequest } from '../../../types';
import { AdminUserService } from '../domain/service';
import {
  BulkActionDto,
  ListAuditLogsDto,
  ListUsersDto,
  UpdateRoleDto,
  UpdateStatusDto,
} from './dto';
import {
  BulkUserActionRequest,
  ListAuditLogsQuery,
  ListUsersQuery,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '../types';

export class AdminUserController {
  private service: AdminUserService;

  constructor(service: AdminUserService) {
    this.service = service;
  }

  async listUsers(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const q = req.query as unknown as ListUsersDto;

      const page = q.page ? parseInt(q.page, 10) : 1;
      const limit = q.limit ? parseInt(q.limit, 10) : 10;

      const query: ListUsersQuery = {
        page: Number.isNaN(page) ? 1 : page,
        limit: Number.isNaN(limit) ? 10 : limit,
        role: (q.role as any) || 'all',
        status: (q.status as any) || 'all',
        search: q.search,
        joinedFrom: q.joined_from ? new Date(q.joined_from) : null,
        joinedTo: q.joined_to ? new Date(q.joined_to) : null,
        includeDeleted: q.include_deleted === 'true',
      };

      const result = await this.service.listUsers(subject, query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      const body = req.body as UpdateStatusDto;

      const payload: UpdateUserStatusRequest = {
        status: body.status as any,
        reason: body.reason,
      };

      await this.service.updateUserStatus(subject, userId, payload, {
        ip: this.getRequestIp(req),
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      const body = req.body as UpdateRoleDto;

      const payload: UpdateUserRoleRequest = {
        role: body.role as any,
      };

      await this.service.updateUserRole(subject, userId, payload, {
        ip: this.getRequestIp(req),
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async bulkAction(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const body = req.body as BulkActionDto;

      const payload: BulkUserActionRequest = {
        user_ids: body.user_ids,
        action: body.action as any,
        role: body.role as any,
      };

      await this.service.bulkAction(subject, payload, {
        ip: this.getRequestIp(req),
      });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        code: 'ADMIN_BULK_ACTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async softDelete(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      await this.service.softDeleteUser(subject, userId, {
        ip: this.getRequestIp(req),
        reason: (req.body as any)?.reason,
      } as any);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      const result = await this.service.resetPassword(subject, userId, {
        ip: this.getRequestIp(req),
      });
      res.json({
        success: true,
        data: {
          temp_password: result.temp_password,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async restoreUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      await this.service.restoreUser(subject, userId, {
        ip: this.getRequestIp(req),
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async hardDelete(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const userId = Number(req.params.userId);
      await this.service.hardDeleteUser(subject, userId, {
        ip: this.getRequestIp(req),
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async listAuditLogs(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = Number(req.getSubject());
      const q = req.query as unknown as ListAuditLogsDto;

      const page = q.page ? parseInt(q.page, 10) : 1;
      const limit = q.limit ? parseInt(q.limit, 10) : 20;
      const actorUserId = q.actor_user_id ? parseInt(q.actor_user_id, 10) : NaN;

      const query: ListAuditLogsQuery = {
        page: Number.isNaN(page) ? 1 : page,
        limit: Number.isNaN(limit) ? 20 : limit,
        actor_user_id: Number.isNaN(actorUserId) ? null : actorUserId,
        action: q.action ?? null,
        from: q.from ? new Date(q.from) : null,
        to: q.to ? new Date(q.to) : null,
      };

      const result = await this.service.listAuditLogs(subject, query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  private getRequestIp(req: HttpRequest): string | null {
    const xf = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xf) ? xf[0] : xf;
    const ip = (forwarded || (req as any).ip || (req.connection as any)?.remoteAddress) as
      | string
      | undefined;
    return ip ? String(ip).split(',')[0].trim() : null;
  }
}

