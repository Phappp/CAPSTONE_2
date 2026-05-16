import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { PAYMENTS_API } from "../../api/payments";
import { useAuth } from "../../contexts/Auth";

type OrderDetail = {
  id: number;
  course_id: number;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  amount: number;
  currency: string;
};

function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
      amount
    );
  } catch {
    return `${amount} VND`;
  }
}

export default function PaymentResultPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const orderId = Number(search.get("order_id") || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);

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
        if (!res.ok) throw new Error(json?.message || "Không thể tải trạng thái đơn.");
        if (!alive) return;
        setOrder(json as OrderDetail);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Không thể tải trạng thái đơn.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [orderId, accessToken]);

  const statusLabel = useMemo(() => {
    if (!order) return "";
    if (order.status === "paid") return "Thanh toán thành công";
    if (order.status === "pending") return "Đang chờ xác nhận thanh toán";
    if (order.status === "failed") return "Thanh toán thất bại";
    if (order.status === "expired") return "Đơn thanh toán đã hết hạn";
    if (order.status === "refunded") return "Đơn đã hoàn tiền";
    return order.status;
  }, [order]);

  return (
    <div className="catalog">
      <div className="catalog__container">
        <div className="catalog__headerRow">
          <h1 className="catalog__title">Kết quả thanh toán</h1>
          <AvatarMenu />
        </div>

        {loading ? <div className="errorBox">Đang tải trạng thái thanh toán...</div> : null}
        {error ? <div className="errorBox">{error}</div> : null}

        {order ? (
          <div className="card" style={{ maxWidth: 680, margin: "16px auto" }}>
            <div className="card__body">
              <h3 className="card__title">{statusLabel}</h3>
              <p className="card__desc">Mã đơn: #{order.id}</p>
              <p className="card__desc">Số tiền: {formatVnd(Number(order.amount || 0))}</p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {order.status === "paid" ? (
                  <button className="btn btn--primary" onClick={() => navigate("/student/dashboard")} type="button">
                    Vào dashboard học viên
                  </button>
                ) : (
                  <button className="btn btn--primary" onClick={() => navigate(`/courses`)} type="button">
                    Quay lại danh sách khóa học
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

