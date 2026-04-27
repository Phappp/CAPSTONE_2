import crypto from 'crypto';
import axios from 'axios';
import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import PaymentEvent from '../../../../../internal/model/payment_event';
import PaymentOrder from '../../../../../internal/model/payment_order';
import PaymentRevenueLedger from '../../../../../internal/model/payment_revenue_ledger';
import { MomoCallbackResult, PaymentOrderDetail, PaymentService } from '../types';
import env from '../../../utils/env';

function toMap(input: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

function hashMomo(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export class PaymentServiceImpl implements PaymentService {
  private getPlatformFeeRate(): number {
    const raw = Number(env.PLATFORM_FEE_RATE);
    if (!Number.isFinite(raw)) return 0.2;
    if (raw < 0) return 0;
    if (raw > 1) return 1;
    return raw;
  }

  private async recordRevenueSplitInTx(
    manager: any,
    order: PaymentOrder
  ): Promise<void> {
    const ledgerRepo = manager.getRepository(PaymentRevenueLedger);
    const existing = await ledgerRepo.findOne({
      where: { order_id: Number((order as any).id) } as any,
    });
    if (existing) return;

    const courseRepo = manager.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: Number((order as any).course_id) } as any });
    if (!course) return;

    const gross = Number((order as any).amount || 0);
    if (!Number.isFinite(gross) || gross <= 0) return;
    const rate = this.getPlatformFeeRate();
    const fee = Number((gross * rate).toFixed(2));
    const net = Number((gross - fee).toFixed(2));
    const rateBps = Math.round(rate * 10000);

    await ledgerRepo.save(
      ledgerRepo.create({
        order_id: Number((order as any).id),
        course_id: Number((order as any).course_id),
        teacher_user_id: Number((course as any).created_by),
        gross_amount: gross,
        system_fee_amount: fee,
        net_amount: net,
        system_fee_rate_bps: rateBps,
        currency: String((order as any).currency || 'VND'),
        recognized_at: (order as any).paid_at ? new Date((order as any).paid_at) : new Date(),
        status: 'recognized',
        reversed_at: null,
      } as any)
    );
  }

  private buildMomoCreateSignature(data: {
    accessKey: string;
    amount: string;
    extraData: string;
    ipnUrl: string;
    orderId: string;
    orderInfo: string;
    partnerCode: string;
    redirectUrl: string;
    requestId: string;
    requestType: string;
  }): string {
    return [
      `accessKey=${data.accessKey}`,
      `amount=${data.amount}`,
      `extraData=${data.extraData}`,
      `ipnUrl=${data.ipnUrl}`,
      `orderId=${data.orderId}`,
      `orderInfo=${data.orderInfo}`,
      `partnerCode=${data.partnerCode}`,
      `redirectUrl=${data.redirectUrl}`,
      `requestId=${data.requestId}`,
      `requestType=${data.requestType}`,
    ].join('&');
  }

  private buildMomoCallbackSignature(payload: Record<string, string>): string {
    return [
      `accessKey=${payload.accessKey || ''}`,
      `amount=${payload.amount || ''}`,
      `extraData=${payload.extraData || ''}`,
      `message=${payload.message || ''}`,
      `orderId=${payload.orderId || ''}`,
      `orderInfo=${payload.orderInfo || ''}`,
      `orderType=${payload.orderType || ''}`,
      `partnerCode=${payload.partnerCode || ''}`,
      `payType=${payload.payType || ''}`,
      `requestId=${payload.requestId || ''}`,
      `responseTime=${payload.responseTime || ''}`,
      `resultCode=${payload.resultCode || ''}`,
      `transId=${payload.transId || ''}`,
    ].join('&');
  }

  private toOrderDetail(entity: PaymentOrder): PaymentOrderDetail {
    return {
      id: Number((entity as any).id),
      course_id: Number((entity as any).course_id),
      user_id: Number((entity as any).user_id),
      provider: 'momo',
      status: String((entity as any).status) as any,
      amount: Number((entity as any).amount),
      currency: String((entity as any).currency || 'VND'),
      provider_order_ref: ((entity as any).provider_order_ref ?? null) as string | null,
      provider_txn_ref: ((entity as any).provider_txn_ref ?? null) as string | null,
      paid_at: (entity as any).paid_at ? new Date((entity as any).paid_at).toISOString() : null,
      expired_at: (entity as any).expired_at ? new Date((entity as any).expired_at).toISOString() : null,
      created_at: new Date((entity as any).created_at).toISOString(),
      updated_at: new Date((entity as any).updated_at).toISOString(),
    };
  }

  private async createOrUpdateEnrollmentInTx(manager: any, userId: number, courseId: number): Promise<void> {
    const enrollRepo = manager.getRepository(CourseEnrollment);
    const existing = await enrollRepo.findOne({ where: { user_id: userId, course_id: courseId } as any });
    if (existing) return;
    await enrollRepo.save(
      enrollRepo.create({
        user_id: userId,
        course_id: courseId,
        status: 'active',
        progress_percent: 0,
        enrolled_at: new Date(),
        last_accessed_at: new Date(),
      } as any)
    );
  }

  async createMomoOrder(input: { userId: number; courseId: number }) {
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const orderRepo = AppDataSource.getRepository(PaymentOrder);
    const now = new Date();

    const course = await courseRepo
      .createQueryBuilder('c')
      .where('c.id = :courseId', { courseId: input.courseId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .getOne();
    if (!course) throw new Error('Khóa học không tồn tại hoặc chưa được xuất bản.');

    const price = Number((course as any).price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Khóa học này không yêu cầu thanh toán.');
    }

    const enrolled = await enrollmentRepo.findOne({
      where: { user_id: input.userId, course_id: input.courseId, status: 'active' as any } as any,
    });
    if (enrolled) throw new Error('Bạn đã đăng ký khóa học này rồi.');

    const paidOrder = await orderRepo.findOne({
      where: { user_id: input.userId, course_id: input.courseId, status: 'paid' as any } as any,
      order: { id: 'DESC' } as any,
    });
    if (paidOrder) {
      return {
        order_id: Number((paidOrder as any).id),
        payment_url: '',
        status: 'paid' as const,
        amount: Number((paidOrder as any).amount),
        currency: String((paidOrder as any).currency || 'VND'),
        expires_at: null,
      };
    }

    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const order = await orderRepo.save(
      orderRepo.create({
        user_id: input.userId,
        course_id: input.courseId,
        provider: 'momo',
        amount: price,
        currency: 'VND',
        status: 'pending',
        provider_order_ref: null,
        provider_txn_ref: null,
        raw_return_payload: null,
        paid_at: null,
        expired_at: expiresAt,
      } as any)
    );
    const orderId = Number((order as any).id);
    const txnRef = `MOMO_C${input.courseId}U${input.userId}O${orderId}`;
    await orderRepo.update({ id: orderId } as any, { provider_order_ref: txnRef } as any);

    if (env.PAYMENT_MOCK) {
      return {
        order_id: orderId,
        payment_url: `${env.CLIENT_URL}/mock-payment?order_id=${orderId}`,
        status: 'pending' as const,
        amount: price,
        currency: 'VND',
        expires_at: expiresAt.toISOString(),
      };
    }

    if (
      !env.MOMO_PARTNER_CODE ||
      !env.MOMO_ACCESS_KEY ||
      !env.MOMO_SECRET_KEY ||
      !env.MOMO_RETURN_URL ||
      !env.MOMO_NOTIFY_URL ||
      !env.MOMO_ENDPOINT
    ) {
      throw new Error('MoMo chưa được cấu hình đầy đủ ở backend.');
    }

    const amount = String(Math.round(price));
    const requestId = `${txnRef}_${Date.now()}`;
    const extraData = '';
    const requestType = 'captureWallet';
    const orderInfo = `Thanh toan khoa hoc #${input.courseId}`;
    const redirectUrl = env.MOMO_RETURN_URL;
    const ipnUrl = env.MOMO_NOTIFY_URL;

    const rawSignature = this.buildMomoCreateSignature({
      accessKey: env.MOMO_ACCESS_KEY,
      amount,
      extraData,
      ipnUrl,
      orderId: txnRef,
      orderInfo,
      partnerCode: env.MOMO_PARTNER_CODE,
      redirectUrl,
      requestId,
      requestType,
    });
    const signature = hashMomo(rawSignature, env.MOMO_SECRET_KEY);
    const requestBody = {
      partnerCode: env.MOMO_PARTNER_CODE,
      accessKey: env.MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId: txnRef,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      lang: 'vi',
      autoCapture: true,
      signature,
    };

    const momoRes = await axios
      .post(env.MOMO_ENDPOINT, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      })
      .then((r) => r.data as any);
    const resultCode = Number(momoRes?.resultCode ?? -1);
    if (resultCode !== 0) {
      await orderRepo.update(
        { id: orderId } as any,
        { status: 'failed', raw_return_payload: (momoRes || null) as any } as any
      );
      throw new Error(String(momoRes?.message || 'Không thể tạo đơn thanh toán MoMo.'));
    }
    const paymentUrl = String(momoRes?.payUrl || '');
    if (!paymentUrl) {
      throw new Error('Không nhận được liên kết thanh toán từ MoMo.');
    }

    return {
      order_id: orderId,
      payment_url: paymentUrl,
      status: 'pending' as const,
      amount: price,
      currency: 'VND',
      expires_at: expiresAt.toISOString(),
    };
  }

  async getOrderForUser(userId: number, orderId: number): Promise<PaymentOrderDetail> {
    const repo = AppDataSource.getRepository(PaymentOrder);
    const row = await repo.findOne({ where: { id: orderId, user_id: userId } as any });
    if (!row) throw new Error('Không tìm thấy đơn thanh toán.');
    return this.toOrderDetail(row as any);
  }

  async completeMockOrder(
    userId: number,
    orderId: number,
    decision: 'paid' | 'failed'
  ): Promise<PaymentOrderDetail> {
    if (!env.PAYMENT_MOCK) {
      throw new Error('Mock payment chưa được bật.');
    }
    const orderRepo = AppDataSource.getRepository(PaymentOrder);
    const order = await orderRepo.findOne({ where: { id: orderId, user_id: userId } as any });
    if (!order) throw new Error('Không tìm thấy đơn thanh toán.');
    if (String((order as any).status) !== 'pending') {
      return this.toOrderDetail(order as any);
    }

    if (decision === 'failed') {
      await orderRepo.update(
        { id: orderId } as any,
        {
          status: 'failed',
          raw_return_payload: { source: 'mock', decision: 'failed' } as any,
        } as any
      );
      const updated = await orderRepo.findOne({ where: { id: orderId, user_id: userId } as any });
      if (!updated) throw new Error('Không tìm thấy đơn thanh toán.');
      return this.toOrderDetail(updated as any);
    }

    await AppDataSource.transaction(async (manager) => {
      const txOrderRepo = manager.getRepository(PaymentOrder);
      await txOrderRepo.update(
        { id: orderId } as any,
        {
          status: 'paid',
          paid_at: new Date(),
          provider_txn_ref: `MOCK_TXN_${orderId}`,
          raw_return_payload: { source: 'mock', decision: 'paid' } as any,
        } as any
      );
      const fresh = await txOrderRepo.findOne({ where: { id: orderId } as any });
      if (fresh) {
        await this.recordRevenueSplitInTx(manager, fresh as any);
      }
      await this.createOrUpdateEnrollmentInTx(
        manager,
        userId,
        Number((order as any).course_id)
      );
    });

    const updated = await orderRepo.findOne({ where: { id: orderId, user_id: userId } as any });
    if (!updated) throw new Error('Không tìm thấy đơn thanh toán.');
    return this.toOrderDetail(updated as any);
  }

  private async processMomoCallback(
    query: Record<string, string | undefined>,
    source: 'ipn' | 'return'
  ): Promise<MomoCallbackResult> {
    const eventRepo = AppDataSource.getRepository(PaymentEvent);
    const orderRepo = AppDataSource.getRepository(PaymentOrder);
    const payload = toMap(query);
    const signature = payload.signature || '';
    const expectedHash = hashMomo(this.buildMomoCallbackSignature(payload), env.MOMO_SECRET_KEY || '');
    const verified = Boolean(signature) && signature.toLowerCase() === expectedHash.toLowerCase();
    const orderRef = payload.orderId || '';
    const resultCode = payload.resultCode || '';
    const message = payload.message || '';

    const order = orderRef
      ? await orderRepo.findOne({
          where: { provider_order_ref: orderRef } as any,
        })
      : null;
    const orderId = order ? Number((order as any).id) : null;

    if (orderId) {
      await eventRepo.save(
        eventRepo.create({
          order_id: orderId,
          event_type: `momo_${source}`,
          verified,
          payload: toMap(query) as any,
        } as any)
      );
    }

    if (!verified || !order) {
      return {
        order_id: orderId,
        verified,
        paid: false,
        result_code: resultCode,
        message,
      };
    }

    const paid = resultCode === '0';
    if (!paid) {
      if (String((order as any).status) === 'pending') {
        await orderRepo.update(
          { id: Number((order as any).id) } as any,
          {
            status: 'failed',
            raw_return_payload: toMap(query) as any,
          } as any
        );
      }
      return {
        order_id: Number((order as any).id),
        verified: true,
        paid: false,
        result_code: resultCode,
        message,
      };
    }

    await AppDataSource.transaction(async (manager) => {
      const txOrderRepo = manager.getRepository(PaymentOrder);
      const fresh = await txOrderRepo.findOne({
        where: { id: Number((order as any).id) } as any,
      });
      if (!fresh) return;
      const currentStatus = String((fresh as any).status || '');
      if (currentStatus !== 'paid') {
        await txOrderRepo.update(
          { id: Number((fresh as any).id) } as any,
          {
            status: 'paid',
            paid_at: new Date(),
            provider_txn_ref: query.transId || null,
            raw_return_payload: toMap(query) as any,
          } as any
        );
      }
      const paidOrder = await txOrderRepo.findOne({ where: { id: Number((fresh as any).id) } as any });
      if (paidOrder) {
        await this.recordRevenueSplitInTx(manager, paidOrder as any);
      }
      await this.createOrUpdateEnrollmentInTx(
        manager,
        Number((fresh as any).user_id),
        Number((fresh as any).course_id)
      );
    });

    return {
      order_id: Number((order as any).id),
      verified: true,
      paid: true,
      result_code: resultCode,
      message,
    };
  }

  async handleMomoIpn(query: Record<string, string | undefined>): Promise<{ resultCode: number; message: string }> {
    const result = await this.processMomoCallback(query, 'ipn');
    if (!result.order_id) return { resultCode: -1, message: 'Order not found' };
    if (!result.verified) return { resultCode: -1, message: 'Invalid signature' };
    return { resultCode: 0, message: 'Confirm Success' };
  }

  async handleMomoReturn(query: Record<string, string | undefined>): Promise<MomoCallbackResult> {
    return this.processMomoCallback(query, 'return');
  }
}

