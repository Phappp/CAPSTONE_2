# LearningModuleLessonsPage — UI Specification

**Source:** `frontend/src/pages/leaner/LearningModuleLessonsPage.tsx`
**Route:** `/learning/:id/:slug/modules/:moduleId`
**Purpose:** Lists the lessons of a single module within an enrolled course, applying lock/open/completed state and surfacing the optional pre-selected lesson or assessment from the query string.

## Overview
The page is rendered inside `LearnerSidebarLayout` (learner-only). It fetches course content via `COURSES_API.learning(courseId)` and progress via `COURSES_API.progress(courseId)`, then resolves the active module by id. The header shows the course title, overall percent, and which chapter index is active. The body renders a module-scoped tree using the shared `<LearnerCourseContentTree>` component in `variant="module-lessons"`. The module is treated as locked when its `open_at` is in the future, when no lesson is unlocked yet, or when progress hasn't been loaded; locked modules display a blocking message instead of the lesson tree. Optional query params `?lesson=` and `?assessment=quiz|assignment` pre-select a lesson and assessment type inside the tree component.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Click      | Button       | learningModuleLessonsPage__back | "← Quay lại"; navigates to `/learning/{courseId}/{slug}`; disabled while initial load is in flight. |
| 2   | View       | Avatar       | AvatarMenu | Embedded `<AvatarMenu />`. |
| 3   | Loading    | Text         | learningModuleLessonsPage__loading | Shows "Đang tải..." when `loading && !course`. |
| 4   | Error      | Container    | learningModuleLessonsPage__errorBox | Visible when `error` is set; renders title "Không thể mở trang bài học" plus message and a back button labeled "Quay lại". |
| 5   | View       | Text         | learningModuleLessonsPage__title | Course title displayed in the header center. |
| 6   | View       | Text         | learningModuleLessonsPage__meta | "Tiến độ: {progressPercent}% · Chương {index + 1}" with the chapter index computed from `course.modules`. |
| 7   | View       | Heading      | learningModuleLessonsPage__moduleTitle | Renders `selectedModule.title`. |
| 8   | View (allCompleted) | Badge | pill--completed | Renders "Hoàn thành" when all lessons in the module are in `completed_lesson_ids`. |
| 9   | View (moduleNotOpenedYet) | Badge | pill--locked (time) | Renders "Bị khóa (mở {formatTimeVi(open_at)})" when `open_at` is in the future. |
| 10  | View (locked) | Badge | pill--locked | Renders "Bị khóa" when no lesson is unlocked. |
| 11  | View (unlocked) | Badge | pill--unlocked | Renders "Đã mở" otherwise. |
| 12  | View (locked) | Text | learningModuleLessonsPage__empty | "Chương này đang bị khóa. Vui lòng hoàn thành chương trước để mở." when the module is not unlocked. |
| 13  | View (unlocked) | Container | LearnerCourseContentTree | Renders the shared tree with `courseId`, `courseSlug`, `modules=[selectedModule]`, `courseThumbnailUrl`, `progress`, `refreshProgress=fetchProgress`, `variant="module-lessons"`, `initialLessonId`, `initialAssessmentKind`. |

## States & Validation Notes
- `courseId` and `moduleId` are parsed via `Number(useParams().*)`; if `selectedModule` cannot be resolved after load, the component returns `null`.
- `moduleNotOpenedYet` requires `selectedModule.open_at` to be a valid future timestamp.
- `moduleUnlocked` is true when at least one lesson id appears in `progress.unlocked_lesson_ids`, with a fallback to "first lesson exists" when `progress` has not loaded yet.
- `allCompleted` requires every lesson id in the module to appear in `progress.completed_lesson_ids`.
- `initialLessonId` is only forwarded when the `lesson` query param parses to a finite positive integer.
- `initialAssessmentKind` accepts only the literals `"quiz"` or `"assignment"`; any other value resolves to `null`.
- `formatTimeVi` formats `open_at` as `HH:mm` using `vi-VN` locale.
- The shared `<LearnerCourseContentTree>` owns lesson cards, video/quiz/assignment launchers, and heartbeat tracking inside the module.
