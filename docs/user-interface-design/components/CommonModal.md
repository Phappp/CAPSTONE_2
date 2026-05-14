# CommonModal — UI Specification

**Source:** `frontend/src/components/CommonModal.tsx`
**Type:** Shared Component
**Purpose:** Reusable confirmation/alert modal component supporting five visual variants and optional cancel button.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | — | Controls visibility; renders nothing when false. |
| `title` | `string` | — | Heading text shown in the modal header. |
| `message` | `string` | — | Body paragraph text. |
| `variant` | `"info" \| "warning" \| "error" \| "success" \| "question"` | `"info"` | Determines icon and accent colors. |
| `confirmText` | `string` | `"Đồng ý"` | Label for the confirm button. |
| `cancelText` | `string` | `"Hủy"` | Label for the cancel button. |
| `showCancel` | `boolean` | `false` | When true, renders the secondary cancel button. |
| `destructive` | `boolean` | `false` | When true, styles the confirm button with danger class. |
| `onConfirm` | `() => void` | — | Invoked when confirm is clicked; modal closes after. |
| `onClose` | `() => void` | — | Invoked when modal is dismissed (close icon, overlay, Escape). |
| `onCancel` | `() => void` | — | Optional handler invoked when cancel is clicked, before `onClose`. |
| `closeOnOverlayClick` | `boolean` | `true` | When true, clicking outside the card closes the modal. |
| `closeOnEscape` | `boolean` | `true` | When true, pressing Escape closes the modal. |

## Overview

`CommonModal` is a presentational overlay modal that renders an icon-decorated card with title, body, and one or two footer buttons. The component locks page scroll while open, listens for the Escape key, and dispatches `onConfirm` followed by `onClose` on confirmation. It exports five pre-configured wrappers: `InfoModal`, `WarningModal`, `ErrorModal`, `SuccessModal`, `ConfirmModal` (which sets `variant="question"` and `showCancel=true`). A `showConfirmModal()` helper signature is exported but is a placeholder.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View · open | Container | `.common-modal-overlay` | Backdrop covering viewport; `onClick` triggers `handleOverlayClick` which closes when `closeOnOverlayClick`. |
| 2 | View · open | Container | `.common-modal-card.{variant}` | Modal card; `onClick` stops propagation so card clicks do not close. |
| 3 | View · open | Icon | Variant icon | One of `Info`, `AlertTriangle`, `AlertCircle`, `CheckCircle`, `HelpCircle` (lucide-react, size 20); background/foreground colors per `variantColors[variant]`. |
| 4 | View · open | Text | Title | Renders the `title` prop in `.common-modal-title`. |
| 5 | Click | Button | Close icon | Renders `<X size=18>`; `aria-label="Đóng"`; calls `onClose`. |
| 6 | View · open | Text | Body message | Renders the `message` prop in `.common-modal-message` paragraph. |
| 7 | View · showCancel | Button | Cancel | Secondary button labelled `cancelText` (default "Hủy"); calls `handleCancel` which invokes `onCancel?.()` then `onClose()`. |
| 8 | Click | Button | Confirm | Labelled `confirmText` (default "Đồng ý"); class `common-modal-btn-danger` when `destructive`, else `common-modal-btn-primary`; calls `handleConfirm` which invokes `onConfirm()` then `onClose()`. |
| 9 | Keypress · open · closeOnEscape | Behavior | Escape key handler | Listens for `keydown` Escape and calls `onClose()`. |
| 10 | View · open | Behavior | Body scroll lock | Sets `document.body.style.overflow = "hidden"` while open; restored on close/unmount. |

## States & Validation Notes

- `if (!open) return null;` — when closed the component renders nothing.
- The icon and accent palette are looked up via `variantIcons[variant]` and `variantColors[variant]`. Each `variant` is a `ModalVariant` union.
- Confirm flow always closes the modal regardless of `onConfirm` outcome (no async error handling here).
- Cancel flow invokes `onCancel` only when supplied, otherwise falls through to `onClose`.
- The exported `showConfirmModal` helper currently resolves to `true` immediately; intended as a placeholder for a global modal manager.
