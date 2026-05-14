# CourseAssessmentModal — UI Specification

**Source:** `frontend/src/components/CourseAssessmentModal.tsx`
**Type:** Shared Component
**Purpose:** Modal container that hosts the quiz and assignment authoring tools under a two-tab interface for course teachers.

## Props

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | — | Controls visibility; the modal renders nothing when false. |
| `onClose` | `() => void` | — | Dismiss handler invoked on overlay click, close button, or Escape key. |
| `tab` | `"quiz" \| "assignment"` | — | Currently active tab. |
| `onTabChange` | `(t: CourseAssessmentModalTab) => void` | — | Notifies parent of tab switches. |
| `courses` | `CourseBrief[]` | — | Forwarded to inner editors. |
| `token` | `string \| null` | — | Forwarded bearer token. |
| `loading` | `boolean` | — | Forwarded loading flag. |
| `quizPanelCourseId` | `number \| null` | — | Selected course id for the quiz panel. |
| `onQuizPanelCourseIdChange` | `(id: number \| null) => void` | — | Updates the quiz panel course selection. |
| `pickedLessonId` | `number \| null` | — | Lesson chosen from the content tree (synchronizes both editors). |

## Overview

This component is opened by the teacher course studio when launching the "Soạn Quizz & bài tập" composition workflow. It renders a full-screen overlay panel with a title block, two tabs ("Quizz trắc nghiệm", "Bài tập"), and a body that mounts either `<ManualQuizEditor>` or `<AssignmentEditor>` based on `tab`. The component manages two side effects while open: locking body scroll and binding an Escape-key listener that calls `onClose`. State branches: closed (no render), open + quiz tab, open + assignment tab.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View · open | Container | `.course-assessment-modal-overlay` | Full-screen backdrop with `role="presentation"`; `onClick` triggers `onClose`. |
| 2 | View · open | Modal | `.course-assessment-modal-panel` | Dialog container with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="course-assessment-modal-title"`; stops click propagation. |
| 3 | View · open | Heading | "Soạn Quizz & bài tập" | `<h2 id="course-assessment-modal-title">`. |
| 4 | View · open | Text | Sub instruction | "Chọn tab bên dưới và bài học trong form. Từ cây nội dung: menu **⋯** trên từng bài hoặc nút bài đầu chương." |
| 5 | Click | Button | Close (×) | `aria-label="Đóng"`; renders character "×"; calls `onClose`. |
| 6 | View · open | Tab | "Quizz trắc nghiệm" | Tablist role; `aria-selected={tab === "quiz"}`; toggles via `onTabChange("quiz")`; gains `is-active` class when active. |
| 7 | View · open | Tab | "Bài tập" | Tablist role; `aria-selected={tab === "assignment"}`; toggles via `onTabChange("assignment")`. |
| 8 | View · open · tab=quiz | Container | `<ManualQuizEditor>` body | Renders the quiz editor with `courses`, `token`, `loading`, `selectedCourseId={quizPanelCourseId}`, `onSelectedCourseIdChange`, `pickedLessonId`. |
| 9 | View · open · tab=assignment | Container | `<AssignmentEditor>` body | Renders the assignment editor with `courses`, `token`, `loading`, `pickedLessonId`. |
| 10 | Keypress · open | Behavior | Escape handler | Window-level `keydown` listener invokes `onClose()` when key is Escape. |
| 11 | View · open | Behavior | Body scroll lock | Sets `document.body.style.overflow = "hidden"` while open; restores previous value on unmount/close. |

## States & Validation Notes

- `if (!open) return null;` — modal returns nothing when closed.
- The Escape listener and body scroll lock are installed only while `open` is true and are cleaned up on transitions or unmount.
- Both tabs are mounted exclusively (no preserved state across switches in this component). Tab persistence is the parent's responsibility through `tab` and `onTabChange`.
- Aria attributes `role="dialog"` and `aria-modal="true"` provide assistive-tech semantics; tabs use `role="tab"` and `aria-selected`.
