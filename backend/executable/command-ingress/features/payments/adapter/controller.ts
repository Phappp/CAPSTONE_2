import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { PaymentService } from '../types';
import env from '../../../utils/env';

export class PaymentController extends BaseController {
  service: PaymentService;

  constructor(service: PaymentService) {
    super();
    this.service = service;
  }

  async createMomoOrder(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const courseId = Number((req.body as any)?.course_id);
      if (!courseId || Number.isNaN(courseId)) throw new Error('course_id không hợp lệ.');
      const result = await this.service.createMomoOrder({ userId: uid, courseId });
      res.status(201).json(result);
    });
  }

  async getMyOrder(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const orderId = Number(req.params.id);
      if (!orderId || Number.isNaN(orderId)) throw new Error('order id không hợp lệ.');
      const row = await this.service.getOrderForUser(uid, orderId);
      res.status(200).json(row);
    });
  }

  async completeMockOrder(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const uid = Number(req.getSubject());
      const orderId = Number(req.params.id);
      if (!orderId || Number.isNaN(orderId)) throw new Error('order id không hợp lệ.');
      const decisionRaw = String((req.body as any)?.decision || '').toLowerCase();
      if (decisionRaw !== 'paid' && decisionRaw !== 'failed') {
        throw new Error("decision phải là 'paid' hoặc 'failed'.");
      }
      const row = await this.service.completeMockOrder(uid, orderId, decisionRaw as 'paid' | 'failed');
      res.status(200).json(row);
    });
  }

  async momoIpn(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const payload = req.body as Record<string, string | undefined>;
      const result = await this.service.handleMomoIpn(payload);
      res.status(200).json(result);
    });
  }

  async momoReturn(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const payload = req.query as Record<string, string | undefined>;
      const result = await this.service.handleMomoReturn(payload);
      const target = new URL('/payment-result', env.CLIENT_URL);
      if (result.order_id) target.searchParams.set('order_id', String(result.order_id));
      target.searchParams.set('verified', result.verified ? '1' : '0');
      target.searchParams.set('paid', result.paid ? '1' : '0');
      if (result.result_code) target.searchParams.set('result_code', result.result_code);
      if (result.message) target.searchParams.set('message', result.message);
      res.redirect(target.toString());
    });
  }
}

