import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { PAYMENTS_API } from "../../api/payments";
import { COURSES_API } from "../../api/courses";
import { useAuth } from "../../contexts/Auth";
import "./PaymentResultPage.css";

type OrderDetail = {
  id: number;
  course_id: number;
  user_id: number;
  provider: "momo";
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  amount: number;
  currency: string;
  provider_order_ref: string | null;
  provider_txn_ref: string | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
};

type CourseSummary = {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  thumbnail_url: string | null;
  level: string;
  instructors: Array<{ id: number; full_name: string; avatar_url: string | null }>;
  price: number;
  original_price: number;
  learners_count: number;
};

function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} VND`;
  }
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "—";
  }
}

function formatDateShort(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return "—";
  }
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; className: string; steps: string[] }> = {
  paid: {
    label: "Thanh toán thành công",
    icon: "check_circle",
    className: "success",
    steps: ["Tạo đơn hàng", "Chọn phương thức", "Xác nhận thanh toán", "Hoàn tất"],
  },
  pending: {
    label: "Đang chờ xác nhận thanh toán",
    icon: "hourglass_empty",
    className: "pending",
    steps: ["Tạo đơn hàng", "Chọn phương thức", "Xác nhận thanh toán", "Hoàn tất"],
  },
  failed: {
    label: "Thanh toán thất bại",
    icon: "cancel",
    className: "failed",
    steps: ["Tạo đơn hàng", "Chọn phương thức", "Xác nhận thanh toán", "Hoàn tất"],
  },
  expired: {
    label: "Đơn thanh toán đã hết hạn",
    icon: "schedule",
    className: "expired",
    steps: ["Tạo đơn hàng", "Chọn phương thức", "Xác nhận thanh toán", "Hoàn tất"],
  },
  refunded: {
    label: "Đơn đã hoàn tiền",
    icon: "replay",
    className: "refunded",
    steps: ["Tạo đơn hàng", "Chọn phương thức", "Xác nhận thanh toán", "Hoàn tất"],
  },
};

function StatusStepper({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const activeIndex =
    status === "paid" ? 4
    : status === "pending" ? 2
    : status === "failed" || status === "expired" ? 3
    : 1;

  return (
    <div className="pr-stepper">
      {cfg.steps.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex - 1;
        const cls = done ? "done" : current ? "current" : "";
        return (
          <div key={i} className={`pr-step ${cls}`}>
            <div className="pr-step__dot">
              {done ? (
                <span className="material-symbols-outlined">check</span>
              ) : (
                <span className="pr-step__num">{i + 1}</span>
              )}
            </div>
            <span className="pr-step__label">{step}</span>
            {i < cfg.steps.length - 1 && <div className="pr-step__line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function PaymentResultPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const orderId = Number(search.get("order_id") || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

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
    return () => { alive = false; };
  }, [orderId, accessToken]);

  // Load course info by course_id
  useEffect(() => {
    if (!order?.course_id) return;
    let alive = true;
    const loadCourse = async () => {
      setLoadingCourse(true);
      try {
        // Try catalog endpoint first
        const res = await fetch(`${url}${COURSES_API.catalogDetail(String(order.course_id))}`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!alive) return;
          setCourse({
            id: data.id,
            title: data.title,
            slug: data.slug,
            short_description: data.short_description || "",
            thumbnail_url: data.thumbnail_url,
            level: data.level || "",
            instructors: data.instructors || [],
            price: data.price || 0,
            original_price: data.original_price || data.price || 0,
            learners_count: data.learners_count || 0,
          });
        }
      } catch {
        // Silently fail course info loading
      } finally {
        if (alive) setLoadingCourse(false);
      }
    };
    void loadCourse();
    return () => { alive = false; };
  }, [order?.course_id, accessToken]);

  const cfg = useMemo(() => {
    if (!order) return null;
    return STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  }, [order]);

  const isSuccess = order?.status === "paid";

  return (
    <div className="pr-page">
      <div className="pr-page__container">
        <div className="pr-header">
          <h1 className="pr-header__title">Kết quả thanh toán</h1>
          <AvatarMenu />
        </div>

        {loading && (
          <div className="pr-loading">
            <div className="pr-loading__spinner" />
            <span>Đang tải trạng thái thanh toán...</span>
          </div>
        )}

        {error && (
          <div className="pr-error">
            <span className="material-symbols-outlined pr-error__icon">error</span>
            <div>
              <p className="pr-error__title">Đã xảy ra lỗi</p>
              <p className="pr-error__msg">{error}</p>
            </div>
          </div>
        )}

        {order && cfg && (
          <div className="pr-content">
            {/* Hero Banner */}
            <div className={`pr-hero pr-hero--${cfg.className}`}>
              <div className={`pr-hero__icon pr-hero__icon--${cfg.className}`}>
                <span className="material-symbols-outlined">{cfg.icon}</span>
              </div>
              <div className="pr-hero__text">
                <h2 className="pr-hero__title">{cfg.label}</h2>
                {isSuccess && (
                  <p className="pr-hero__sub">
                    Cảm ơn bạn! Khóa học đã được kích hoạt thành công. Chúc bạn học tập hiệu quả!
                  </p>
                )}
                {!isSuccess && order.status === "pending" && (
                  <p className="pr-hero__sub">
                    Đơn hàng của bạn đang chờ được xử lý. Vui lòng hoàn tất thanh toán trước khi đơn hết hạn.
                  </p>
                )}
                {!isSuccess && (order.status === "failed" || order.status === "expired") && (
                  <p className="pr-hero__sub">
                    Rất tiếc, giao dịch không thành công. Bạn có thể thử lại hoặc liên hệ hỗ trợ.
                  </p>
                )}
                {order.status === "refunded" && (
                  <p className="pr-hero__sub">
                    Tiền đã được hoàn về tài khoản của bạn. Cảm ơn bạn đã sử dụng dịch vụ.
                  </p>
                )}
              </div>
            </div>

            {/* Stepper */}
            <div className="pr-card pr-card--stepper">
              <h3 className="pr-card__title">Trạng thái đơn hàng</h3>
              <StatusStepper status={order.status} />
            </div>

            <div className="pr-grid">
              {/* Left: Order Details */}
              <div className="pr-grid__main">
                {/* Order Details Card */}
                <div className="pr-card">
                  <h3 className="pr-card__title">
                    <span className="material-symbols-outlined pr-card__icon">receipt_long</span>
                    Chi tiết đơn hàng
                  </h3>
                  <div className="pr-details">
                    <div className="pr-detail-row">
                      <span className="pr-detail-row__label">Mã đơn hàng</span>
                      <span className="pr-detail-row__value pr-detail-row__value--mono">#{order.id}</span>
                    </div>
                    <div className="pr-detail-row">
                      <span className="pr-detail-row__label">Mã giao dịch</span>
                      <span className="pr-detail-row__value pr-detail-row__value--mono">
                        {order.provider_txn_ref || order.provider_order_ref || "—"}
                      </span>
                    </div>
                    <div className="pr-detail-row">
                      <span className="pr-detail-row__label">Nhà cung cấp</span>
                      <span className="pr-detail-row__value">
                        <span className="pr-provider-badge">
                          <span className="material-symbols-outlined">qr_code</span>
                          MoMo
                        </span>
                      </span>
                    </div>
                    <div className="pr-detail-row">
                      <span className="pr-detail-row__label">Trạng thái</span>
                      <span className={`pr-status-badge pr-status-badge--${cfg.className}`}>
                        <span className="material-symbols-outlined">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="pr-detail-row">
                      <span className="pr-detail-row__label">Ngày tạo đơn</span>
                      <span className="pr-detail-row__value">{formatDate(order.created_at)}</span>
                    </div>
                    {order.paid_at && (
                      <div className="pr-detail-row">
                        <span className="pr-detail-row__label">Ngày thanh toán</span>
                        <span className="pr-detail-row__value">{formatDate(order.paid_at)}</span>
                      </div>
                    )}
                    {order.expired_at && (
                      <div className="pr-detail-row">
                        <span className="pr-detail-row__label">Hạn thanh toán</span>
                        <span className="pr-detail-row__value">{formatDate(order.expired_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary Card */}
                <div className="pr-card">
                  <h3 className="pr-card__title">
                    <span className="material-symbols-outlined pr-card__icon">payments</span>
                    Thông tin thanh toán
                  </h3>
                  <div className="pr-payment-summary">
                    <div className="pr-payment-row">
                      <span>Giá khóa học</span>
                      <span>{formatVnd(Number(order.amount || 0))}</span>
                    </div>
                    <div className="pr-payment-row">
                      <span>Phí cổng thanh toán</span>
                      <span className="pr-payment-row__free">Miễn phí</span>
                    </div>
                    <div className="pr-payment-row pr-payment-row--total">
                      <span>Tổng thanh toán</span>
                      <strong>{formatVnd(Number(order.amount || 0))}</strong>
                    </div>
                  </div>
                  <div className="pr-security-note">
                    <span className="material-symbols-outlined">lock</span>
                    <span>Thanh toán được bảo mật bởi MoMo. Dữ liệu mã hóa TLS 1.2.</span>
                  </div>
                </div>
              </div>

              {/* Right: Course Info */}
              <div className="pr-grid__sidebar">
                {loadingCourse ? (
                  <div className="pr-card pr-card--skeleton">
                    <div className="pr-skeleton pr-skeleton--thumb" />
                    <div className="pr-skeleton pr-skeleton--title" />
                    <div className="pr-skeleton pr-skeleton--text" />
                    <div className="pr-skeleton pr-skeleton--text pr-skeleton--short" />
                  </div>
                ) : course ? (
                  <div className="pr-card">
                    <h3 className="pr-card__title">
                      <span className="material-symbols-outlined pr-card__icon">school</span>
                      Khóa học đã mua
                    </h3>
                    <div className="pr-course">
                      {course.thumbnail_url && (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="pr-course__thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="pr-course__info">
                        <h4 className="pr-course__title">{course.title}</h4>
                        {course.instructors.length > 0 && (
                          <div className="pr-course__instructor">
                            {course.instructors.map((inst) => (
                              <div key={inst.id} className="pr-instructor">
                                {inst.avatar_url ? (
                                  <img src={inst.avatar_url} alt={inst.full_name} className="pr-instructor__avatar" />
                                ) : (
                                  <div className="pr-instructor__avatar pr-instructor__avatar--placeholder">
                                    {inst.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="pr-instructor__name">{inst.full_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {course.level && (
                          <span className="pr-course__level">
                            <span className="material-symbols-outlined">signal_cellular_alt</span>
                            {course.level}
                          </span>
                        )}
                      </div>
                    </div>
                    {course.short_description && (
                      <p className="pr-course__desc">{course.short_description}</p>
                    )}
                    <div className="pr-course__stats">
                      <div className="pr-course__stat">
                        <span className="material-symbols-outlined">group</span>
                        <span>{course.learners_count.toLocaleString("vi-VN")} học viên</span>
                      </div>
                      {course.original_price > course.price && (
                        <div className="pr-course__stat">
                          <span className="pr-original-price">{formatVnd(course.original_price)}</span>
                        </div>
                      )}
                      <div className="pr-course__stat pr-course__stat--price">
                        <strong>{formatVnd(course.price)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pr-card">
                    <h3 className="pr-card__title">
                      <span className="material-symbols-outlined pr-card__icon">school</span>
                      Thông tin khóa học
                    </h3>
                    <p className="pr-card__desc pr-card__desc--muted">
                      Không thể tải thông tin khóa học.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pr-card pr-card--actions">
                  {isSuccess ? (
                    <>
                      <button
                        type="button"
                        className="pr-btn pr-btn--primary pr-btn--full"
                        onClick={() => navigate(`/student/dashboard`)}
                      >
                        <span className="material-symbols-outlined">home</span>
                        Vào dashboard học viên
                      </button>
                      <button
                        type="button"
                        className="pr-btn pr-btn--outline pr-btn--full"
                        onClick={() => navigate(`/courses/${order.course_id}/learning`)}
                      >
                        <span className="material-symbols-outlined">play_arrow</span>
                        Bắt đầu học ngay
                      </button>
                    </>
                  ) : order.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        className="pr-btn pr-btn--primary pr-btn--full"
                        onClick={() => navigate(`/mock-payment?order_id=${orderId}`)}
                      >
                        <span className="material-symbols-outlined">payment</span>
                        Thanh toán ngay
                      </button>
                      <button
                        type="button"
                        className="pr-btn pr-btn--outline pr-btn--full"
                        onClick={() => navigate("/courses")}
                      >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Quay lại khóa học
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pr-btn pr-btn--primary pr-btn--full"
                        onClick={() => navigate(`/mock-payment?order_id=${orderId}`)}
                      >
                        <span className="material-symbols-outlined">refresh</span>
                        Thử lại thanh toán
                      </button>
                      <button
                        type="button"
                        className="pr-btn pr-btn--outline pr-btn--full"
                        onClick={() => navigate("/courses")}
                      >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Khám phá khóa học khác
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="pr-btn pr-btn--ghost pr-btn--full"
                    onClick={() => navigate("/student/dashboard")}
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    Trang chủ
                  </button>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="pr-help">
              <span className="material-symbols-outlined">support_agent</span>
              <div>
                <p className="pr-help__title">Bạn cần hỗ trợ?</p>
                <p className="pr-help__desc">
                  Nếu có bất kỳ thắc mắc nào về đơn hàng, vui lòng liên hệ bộ phận hỗ trợ qua email{" "}
                  <a href="mailto:support@example.com" className="pr-help__link">support@example.com</a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
