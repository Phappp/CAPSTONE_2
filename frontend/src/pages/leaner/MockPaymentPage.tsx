import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { PAYMENTS_API } from "../../api/payments";
import { useAuth } from "../../contexts/Auth";
import "./MockPaymentPage.css";

type OrderDetail = {
  id: number;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  amount: number;
  currency: string;
  expired_at?: string | null;
};

type PaymentMethod = "momo_wallet" | "atm_card" | "visa_master" | "qr_bank";
type BankOption = { id: string; name: string; short: string };

function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} VND`;
  }
}

export default function MockPaymentPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const orderId = Number(search.get("order_id") || 0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [successNotice, setSuccessNotice] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("momo_wallet");
  const [selectedBank, setSelectedBank] = useState<string>("vcb");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const canComplete = useMemo(() => order?.status === "pending", [order?.status]);
  const methodOptions: Array<{ id: PaymentMethod; label: string; desc: string; badge: string; logo: string }> = [
    { id: "momo_wallet", label: "Ví MoMo", desc: "Thanh toán tức thì bằng số dư ví hoặc thẻ liên kết.", badge: "Phổ biến", logo: "MoMo" },
    { id: "atm_card", label: "Thẻ ATM nội địa", desc: "Thanh toán qua cổng NAPAS và Internet Banking.", badge: "Bảo mật 3D", logo: "ATM" },
    { id: "visa_master", label: "Visa/Master/JCB", desc: "Hỗ trợ thẻ quốc tế, xác thực OTP.", badge: "Quốc tế", logo: "VISA" },
    { id: "qr_bank", label: "Quét QR ngân hàng", desc: "Dùng app ngân hàng bất kỳ để quét mã QR.", badge: "Nhanh", logo: "QR" },
  ];
  const bankOptions: BankOption[] = [
    { id: "vcb", name: "Vietcombank", short: "VCB" },
    { id: "bidv", name: "BIDV", short: "BIDV" },
    { id: "vtb", name: "VietinBank", short: "VTB" },
    { id: "tcb", name: "Techcombank", short: "TCB" },
    { id: "mb", name: "MB Bank", short: "MB" },
    { id: "acb", name: "ACB", short: "ACB" },
  ];
  const selectedMethodMeta = useMemo(
    () => methodOptions.find((x) => x.id === selectedMethod) || methodOptions[0],
    [methodOptions, selectedMethod]
  );
  const selectedBankMeta = useMemo(
    () => bankOptions.find((x) => x.id === selectedBank) || bankOptions[0],
    [bankOptions, selectedBank]
  );

  const secondsLeft = useMemo(() => {
    if (!order?.expired_at) return null;
    const target = new Date(order.expired_at).getTime();
    if (!Number.isFinite(target)) return null;
    return Math.max(0, Math.floor((target - nowTick) / 1000));
  }, [order?.expired_at, nowTick]);

  const countdownLabel = useMemo(() => {
    if (secondsLeft == null) return "15:00";
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  useEffect(() => {
    if (!orderId || Number.isNaN(orderId)) {
      setError("Thiếu thông tin đơn thanh toán.");
      return;
    }
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${url}${PAYMENTS_API.orderById(orderId)}`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        const json = (await res.json().catch(() => ({}))) as Partial<OrderDetail> & { message?: string };
        if (!res.ok) throw new Error(json?.message || "Không thể tải đơn thanh toán.");
        if (!alive) return;
        setOrder(json as OrderDetail);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Không thể tải đơn thanh toán.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [orderId, accessToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const complete = async (decision: "paid" | "failed") => {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    if (decision === "paid") {
      setProcessingStep("Đang khởi tạo phiên thanh toán...");
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      setProcessingStep(`Đang xác thực ${selectedMethodMeta.label}...`);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setProcessingStep("Đang xác nhận giao dịch...");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
    }
    try {
      const res = await fetch(`${url}${PAYMENTS_API.completeMockOrder(orderId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(json?.message || "Không thể cập nhật thanh toán mock.");
      if (decision === "paid") {
        setSuccessNotice(true);
        window.setTimeout(() => {
          navigate(`/payment-result?order_id=${orderId}`);
        }, 1500);
        return;
      }
      navigate(`/payment-result?order_id=${orderId}`);
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật thanh toán mock.");
    } finally {
      setSubmitting(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="mock-checkout">
      <div className="mock-checkout__container">
        <div className="mock-checkout__header">
          <h1 className="mock-checkout__title">Thanh toán khóa học</h1>
          <AvatarMenu />
        </div>

        {loading ? <div className="mock-checkout__alert">Đang tải đơn thanh toán...</div> : null}
        {error ? <div className="mock-checkout__alert mock-checkout__alert--error">{error}</div> : null}

        {order ? (
          <div className="mock-checkout__layout">
            <section className="mock-checkout__panel">
              <div className="mock-chip">Checkout Demo (auto success)</div>
              <h3 className="mock-checkout__panelTitle">Chọn phương thức thanh toán</h3>
              <p className="mock-checkout__panelDesc">
                Trải nghiệm luồng thanh toán như môi trường thật. Giao dịch demo sẽ tự động thành công.
              </p>

              <div className="mock-methods">
                {methodOptions.map((method) => {
                  const selected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={!canComplete || submitting}
                      className={`mock-method ${selected ? "is-selected" : ""}`}
                    >
                      <div className="mock-method__top">
                        <span className="mock-method__left">
                          <span className="mock-logo">{method.logo}</span>
                          <span className="mock-method__label">{method.label}</span>
                        </span>
                        <span className="mock-method__badge">{method.badge}</span>
                      </div>
                      <div className="mock-method__desc">{method.desc}</div>
                    </button>
                  );
                })}
              </div>

              {selectedMethod === "qr_bank" ? (
                <div className="mock-bank-picker">
                  <label htmlFor="mock-bank-select" className="mock-bank-picker__label">
                    Chọn ngân hàng để quét QR
                  </label>
                  <select
                    id="mock-bank-select"
                    className="mock-bank-picker__select"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    disabled={!canComplete || submitting}
                  >
                    {bankOptions.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.short} - {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <label className="mock-policy">
                <input
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  disabled={!canComplete || submitting}
                />
                <span>Tôi đồng ý với điều khoản thanh toán và chính sách hoàn tiền của nền tảng.</span>
              </label>

              <div className="mock-actions">
                <button
                  type="button"
                  className="mock-btn mock-btn--primary"
                  onClick={() => void complete("paid")}
                  disabled={!canComplete || submitting || !acceptedPolicy}
                >
                  {submitting ? "Đang xử lý..." : "Thanh toán ngay"}
                </button>
                <button
                  type="button"
                  className="mock-btn"
                  onClick={() => void complete("failed")}
                  disabled={!canComplete || submitting}
                >
                  Mô phỏng thất bại
                </button>
                <button
                  type="button"
                  className="mock-btn"
                  onClick={() => navigate(`/payment-result?order_id=${order.id}`)}
                  disabled={submitting}
                >
                  Xem kết quả
                </button>
              </div>

              {submitting ? (
                <div className="mock-processing">
                  <div className="mock-spinner" />
                  <span>{processingStep || "Đang xử lý..."}</span>
                </div>
              ) : null}
            </section>

            <aside className="mock-summary">
              <h3 className="mock-summary__title">Thông tin đơn hàng</h3>
              <div className="mock-summary__row">
                <span>Mã đơn</span>
                <strong>#{order.id}</strong>
              </div>
              <div className="mock-summary__row">
                <span>Trạng thái</span>
                <strong className={`mock-status mock-status--${order.status}`}>{order.status}</strong>
              </div>
              <div className="mock-summary__row">
                <span>Phương thức</span>
                <strong>{selectedMethodMeta.label}</strong>
              </div>
              {selectedMethod === "qr_bank" ? (
                <div className="mock-summary__row">
                  <span>Ngân hàng</span>
                  <strong>{selectedBankMeta.name}</strong>
                </div>
              ) : null}
              <div className="mock-summary__row">
                <span>Tạm tính</span>
                <strong>{formatVnd(Number(order.amount || 0))}</strong>
              </div>
              <div className="mock-summary__row">
                <span>Phí cổng</span>
                <strong>{formatVnd(0)}</strong>
              </div>
              <div className="mock-summary__row mock-summary__row--total">
                <span>Tổng cộng</span>
                <strong>{formatVnd(Number(order.amount || 0))}</strong>
              </div>
              <div className="mock-summary__timer">
                <span>Đơn hết hạn sau</span>
                <strong>{countdownLabel}</strong>
              </div>
              <div className="mock-security">
                <span>🔒 Kết nối mã hóa TLS 1.2</span>
                <span>✅ Chuẩn bảo mật PCI DSS</span>
              </div>
            </aside>
          </div>
        ) : null}

        {successNotice ? (
          <div className="mock-success-overlay" role="status" aria-live="polite">
            <div className="mock-success-card">
              <div className="mock-success-check">✓</div>
              <div className="mock-success-title">Thanh toán thành công</div>
              <div className="mock-success-subtitle">Giao dịch đã được xác nhận. Đang chuyển đến trang kết quả...</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
