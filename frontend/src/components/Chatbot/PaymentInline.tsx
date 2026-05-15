import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, CreditCard, Smartphone, QrCode, RefreshCw } from 'lucide-react';
import { PAYMENTS_API } from '../../api/payments';
import { url } from '../../baseUrl';
import { useAuth } from '../../contexts/Auth';
import './PaymentInline.css';

type PaymentAction = {
    type: 'create_order';
    courseId: number;
    orderId: number;
    paymentUrl: string;
    amount: number;
    courseTitle: string;
};

type Props = {
    action: PaymentAction;
    onClose: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
};

type PaymentMethod = 'momo_wallet' | 'atm_card' | 'visa_master' | 'qr_bank';
type BankOption = { id: string; name: string; short: string };

const bankOptions: BankOption[] = [
    { id: 'vcb', name: 'Vietcombank', short: 'VCB' },
    { id: 'bidv', name: 'BIDV', short: 'BIDV' },
    { id: 'vtb', name: 'VietinBank', short: 'VTB' },
    { id: 'tcb', name: 'Techcombank', short: 'TCB' },
    { id: 'mb', name: 'MB Bank', short: 'MB' },
    { id: 'acb', name: 'ACB', short: 'ACB' },
];

const methodOptions = [
    { id: 'momo_wallet' as PaymentMethod, label: 'Ví MoMo', desc: 'Thanh toán tức thì', logo: 'MoMo', badge: 'Phổ biến' },
    { id: 'atm_card' as PaymentMethod, label: 'Thẻ ATM', desc: 'Qua cổng NAPAS', logo: 'ATM', badge: 'Bảo mật' },
    { id: 'qr_bank' as PaymentMethod, label: 'QR ngân hàng', desc: 'Quét mã QR', logo: 'QR', badge: 'Nhanh' },
];

function formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

export function PaymentInline({ action, onClose, onSuccess, onError }: Props) {
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('momo_wallet');
    const [selectedBank, setSelectedBank] = useState<string>('vcb');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handlePayment = async () => {
        setIsProcessing(true);
        setProcessingStep('Đang khởi tạo...');
        setHasError(false);
        setErrorMessage('');

        try {
            setProcessingStep('Đang xác thực thanh toán...');
            await new Promise((resolve) => setTimeout(resolve, 500));
            setProcessingStep('Đang xác nhận giao dịch...');
            await new Promise((resolve) => setTimeout(resolve, 600));

            const res = await fetch(`${url}${PAYMENTS_API.completeMockOrder(action.orderId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ decision: 'paid' }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(json?.message || 'Thanh toán thất bại');
            }

            setIsSuccess(true);
            setProcessingStep('Thanh toán thành công!');

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Payment error:', error);
            setHasError(true);
            setErrorMessage(error?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
            onError(error?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetry = () => {
        setHasError(false);
        setErrorMessage('');
    };

    const handleOpenExternal = () => {
        window.open(action.paymentUrl, '_blank');
        onClose();
    };

    if (isSuccess) {
        return (
            <div className="payment-inline payment-inline--success">
                <div className="payment-inline__success-icon">
                    <CheckCircle size={48} />
                </div>
                <div className="payment-inline__success-title">Thanh toán thành công!</div>
                <div className="payment-inline__success-subtitle">
                    Bạn đã đăng ký khóa {action.courseTitle}
                </div>
                <button className="payment-inline__btn payment-inline__btn--primary" onClick={() => {
                    onClose();
                    navigate(`/courses/${action.courseId}`);
                }}>
                    Vào học ngay
                </button>
            </div>
        );
    }

    if (isProcessing) {
        return (
            <div className="payment-inline payment-inline--processing">
                <div className="payment-inline__processing-icon">
                    <Loader2 size={40} className="spin" />
                </div>
                <div className="payment-inline__processing-title">Đang xử lý thanh toán</div>
                <div className="payment-inline__processing-step">{processingStep}</div>
            </div>
        );
    }

    return (
        <div className="payment-inline">
            <div className="payment-inline__header">
                <h4>Thanh toán</h4>
                <button className="payment-inline__close" onClick={onClose}>
                    <XCircle size={18} />
                </button>
            </div>

            <div className="payment-inline__course">
                <div className="payment-inline__course-icon">
                    <CreditCard size={20} />
                </div>
                <div className="payment-inline__course-info">
                    <span className="payment-inline__course-title">{action.courseTitle}</span>
                    <span className="payment-inline__course-amount">{formatVnd(action.amount)}</span>
                </div>
            </div>

            {hasError && (
                <div className="payment-inline__error">
                    <XCircle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="payment-inline__methods">
                <div className="payment-inline__methods-title">Chọn phương thức</div>
                {methodOptions.map((method) => (
                    <button
                        key={method.id}
                        className={`payment-inline__method ${selectedMethod === method.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedMethod(method.id)}
                    >
                        <div className="payment-inline__method-logo">
                            {method.id === 'momo_wallet' && <Smartphone size={18} />}
                            {method.id === 'atm_card' && <CreditCard size={18} />}
                            {method.id === 'qr_bank' && <QrCode size={18} />}
                        </div>
                        <div className="payment-inline__method-info">
                            <span className="payment-inline__method-label">{method.label}</span>
                            <span className="payment-inline__method-desc">{method.desc}</span>
                        </div>
                        <span className="payment-inline__method-badge">{method.badge}</span>
                    </button>
                ))}
            </div>

            {selectedMethod === 'qr_bank' && (
                <div className="payment-inline__bank-picker">
                    <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="payment-inline__bank-select"
                    >
                        {bankOptions.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                                {bank.short} - {bank.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="payment-inline__actions">
                {hasError ? (
                    <button className="payment-inline__btn payment-inline__btn--primary" onClick={handleRetry}>
                        <RefreshCw size={16} />
                        Thử lại
                    </button>
                ) : (
                    <button className="payment-inline__btn payment-inline__btn--primary" onClick={handlePayment}>
                        Thanh toán {formatVnd(action.amount)}
                    </button>
                )}
                <button className="payment-inline__btn payment-inline__btn--secondary" onClick={handleOpenExternal}>
                    Mở trang thanh toán
                </button>
            </div>
        </div>
    );
}
