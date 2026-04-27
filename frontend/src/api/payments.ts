const PAYMENTS_API_BASE = "/api/v1/payments";

export const PAYMENTS_API = {
  createMomoOrder: `${PAYMENTS_API_BASE}/momo/orders`,
  orderById: (id: number | string) => `${PAYMENTS_API_BASE}/orders/${id}`,
  completeMockOrder: (id: number | string) => `${PAYMENTS_API_BASE}/orders/${id}/mock-complete`,
};

