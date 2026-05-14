// CommonModal.tsx
import { useEffect, useCallback } from "react";
import {
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import "./CommonModal.css";

export type ModalVariant = "info" | "warning" | "error" | "success" | "question";

type CommonModalProps = {
  open: boolean;
  title: string;
  message: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
};

const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
  question: HelpCircle,
};

const variantColors = {
  info: { bg: "#e2f6ff", color: "#0b5f84" },
  warning: { bg: "#fef3c7", color: "#d97706" },
  error: { bg: "#fef2f2", color: "#dc2626" },
  success: { bg: "#dcfce7", color: "#16a34a" },
  question: { bg: "#e0e7ff", color: "#4f46e5" },
};

export default function CommonModal(props: CommonModalProps) {
  const {
    open,
    title,
    message,
    variant = "info",
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    showCancel = false,
    destructive = false,
    onConfirm,
    onClose,
    onCancel,
    closeOnOverlayClick = true,
    closeOnEscape = true,
  } = props;

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape" && open) {
        onClose();
      }
    },
    [closeOnEscape, open, onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  if (!open) return null;

  const IconComponent = variantIcons[variant];
  const iconColors = variantColors[variant];

  return (
    <div className="common-modal-overlay" onClick={handleOverlayClick}>
      <div
        className={`common-modal-card ${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="common-modal-header">
          <div
            className={`common-modal-icon ${variant}`}
            style={{ backgroundColor: iconColors.bg, color: iconColors.color }}
          >
            <IconComponent size={20} />
          </div>
          <div className="common-modal-title">{title}</div>
          <button
            type="button"
            className="common-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="common-modal-body">
          <p className="common-modal-message">{message}</p>
        </div>

        <div className="common-modal-footer">
          {showCancel && (
            <button
              type="button"
              className="common-modal-btn common-modal-btn-secondary"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`common-modal-btn ${
              destructive
                ? "common-modal-btn-danger"
                : "common-modal-btn-primary"
            }`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Convenience wrapper for alert-style modals
export function showConfirmModal(
  props: Omit<CommonModalProps, "open" | "onClose" | "onConfirm">
): Promise<boolean> {
  return new Promise((resolve) => {
    // This is a helper - you'd need to implement a global modal manager
    // or use a state management solution for this pattern
    // For now, this is just a type helper
    resolve(true);
  });
}

// Pre-configured modal variants
export const InfoModal = (props: Omit<CommonModalProps, "variant">) => (
  <CommonModal {...props} variant="info" />
);

export const WarningModal = (props: Omit<CommonModalProps, "variant">) => (
  <CommonModal {...props} variant="warning" />
);

export const ErrorModal = (props: Omit<CommonModalProps, "variant">) => (
  <CommonModal {...props} variant="error" />
);

export const SuccessModal = (props: Omit<CommonModalProps, "variant">) => (
  <CommonModal {...props} variant="success" />
);

export const ConfirmModal = (props: Omit<CommonModalProps, "variant">) => (
  <CommonModal {...props} variant="question" showCancel={true} />
);