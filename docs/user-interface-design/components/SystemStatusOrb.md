# SystemStatusOrb — UI Specification

**Source:** `frontend/src/components/SystemStatusOrb.tsx`
**Type:** Shared Component
**Purpose:** Global ambient pill that reflects the application's runtime network status by wrapping `window.fetch` and watching `offline` events, displaying processing, success, error, idle, or offline tones.

## Props

This component accepts no props.

## Overview

On mount, the component swaps `window.fetch` for a wrapped version that increments `pendingRequestCount` on every call, sets `status` to `processing`, and after the response resolves updates the status to `success`, `error`, or back toward `idle`. An `offline` event listener forces the tone to `offline` with `expanded=true`. A separate effect manages auto-collapse: while `processing` the pill stays expanded; while `idle` it collapses after 500 ms; non-idle/non-processing states reset to `IDLE_STATUS` after 1800 ms. The wrapped fetch and listener are restored on unmount.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `status-orb-wrap processing` | Outer wrapper anchoring the pill. |
| 2 | View | Container | `status-pill` | Pill element with `role="status"` and `aria-live="polite"`; appends `expanded` class when `expanded` is true. |
| 3 | Loading | Spinner | `Loader2` (lucide) | Visible when `status.tone === "processing"`; size 16 with `status-orb-spin` class. |
| 4 | View | Icon | `status-idle-ring` + `Activity` (lucide) | Renders when not in processing tone; size-12 activity glyph inside a ring. |
| 5 | View | Icon | `status-dot {tone}` | Colored dot reflecting the active tone (`idle`, `processing`, `success`, `error`, `offline`). |
| 6 | View | Text | `status-pill-label` | Default label uses `status.label` (idle: "Ready", success: "Success", error: "Error", offline: "Offline"). |
| 7 | Loading | Text | `processing-label` | Visible during processing — renders "Processing" plus three animated `wave-dots` `<i>` markers. |
| 8 | Validation | Behavior | Pending request counter | `pendingRequestCount` is decremented in both success and error branches and clamped at zero before status resolution. |

## States & Validation Notes

- `tone` enum: `"idle" | "processing" | "success" | "error" | "offline"`.
- The processing label uses three animated wave dots marked `aria-hidden="true"` to stay screen-reader friendly.
- Auto-collapse for the idle tone is debounced through `window.setTimeout` and cleared on subsequent status changes.
- The wrapped `window.fetch` rethrows the original error after recording the error tone so calling code is not affected.
- The component does not handle the `online` event — once `offline` is forced, the next successful fetch will restore the tone via the wrapped `success` branch.
- `IDLE_STATUS` is reused as both the initial state and the fallback after the 1800 ms timeout for non-processing/non-idle tones.
