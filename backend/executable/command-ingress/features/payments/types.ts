export type PaymentProvider = 'momo';
export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export type CreateMomoOrderResult = {
  order_id: number;
  payment_url: string;
  status: PaymentOrderStatus;
  amount: number;
  currency: string;
  expires_at: string | null;
};

export type PaymentOrderDetail = {
  id: number;
  course_id: number;
  user_id: number;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  amount: number;
  currency: string;
  provider_order_ref: string | null;
  provider_txn_ref: string | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MomoCallbackResult = {
  order_id: number | null;
  verified: boolean;
  paid: boolean;
  result_code: string;
  message: string;
};

export interface PaymentService {
  createMomoOrder(input: {
    userId: number;
    courseId: number;
  }): Promise<CreateMomoOrderResult>;
  getOrderForUser(userId: number, orderId: number): Promise<PaymentOrderDetail>;
  completeMockOrder(
    userId: number,
    orderId: number,
    decision: 'paid' | 'failed'
  ): Promise<PaymentOrderDetail>;
  handleMomoIpn(payload: Record<string, any>): Promise<{ resultCode: number; message: string }>;
  handleMomoReturn(query: Record<string, string | undefined>): Promise<MomoCallbackResult>;
}

