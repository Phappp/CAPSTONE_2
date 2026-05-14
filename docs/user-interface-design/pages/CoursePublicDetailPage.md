# CoursePublicDetailPage — UI Specification

**Source:** `frontend/src/pages/leaner/CoursePublicDetailPage.tsx`
**Route:** `/courses/:slug`
**Purpose:** Public-facing course detail page that lets a learner inspect course metadata, prerequisites, modules, instructors, and enroll or purchase the course.

## Overview
The page is rendered inside `LearnerSidebarLayout` and is gated by `Authentication` for roles `learner`/`student`. It loads four backend resources in parallel: course detail (`COURSES_API.catalogDetail(slug)`), full prerequisite catalog (`COURSES_API.catalog`), the current learner's enrollment status map (`COURSES_API.myEnrollments`), and a prerequisite graph (`COURSES_API.catalogPrerequisiteGraph(slug)`). Enrollment is gated by prerequisite completion: when a linked prerequisite course is not marked `completed`, the primary enroll/checkout actions are disabled. Free courses use `COURSES_API.enroll(courseId)`; paid courses create a MoMo order via `PAYMENTS_API.createMomoOrder` and redirect to the returned `payment_url`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Container    | course-detail-header-bg | Header strip containing back button and avatar menu. |
| 2   | Click      | Button       | Back to Courses Button | Calls `navigate("/courses")`; disabled while `loading`. Renders `ArrowLeft` icon and label "Back to Courses". |
| 3   | View       | Avatar       | AvatarMenu | Renders `<AvatarMenu />` for profile/logout actions. |
| 4   | View (course loaded) | Container | course-hero | Hero section whose background uses `course.thumbnail_url` when present. |
| 5   | View       | Badge        | badge-level | Displays localized level via `levelLabel(course.level)` with custom color/background. |
| 6   | View       | Badge        | badge-status | Shows `"FREE"` when `course.price === 0`, otherwise `"PAID"`. |
| 7   | View (is_enrolled) | Badge | badge-enrolled | Shows `CheckCircle` icon and label "Enrolled" when `course.is_enrolled` is true. |
| 8   | View       | Heading      | course-hero-title | Renders `course.title`. |
| 9   | View       | Text         | course-hero-description | Renders `course.short_description` or fallback "No description provided.". |
| 10  | View       | Text         | hero-stat Learners | `Users` icon plus `{course.learners_count?.toLocaleString() || 0} learners`. |
| 11  | View       | Text         | hero-stat Modules | `Layers3` icon plus `{course.modules_count || 0} modules`. |
| 12  | View       | Text         | hero-stat Lessons | `ListChecks` icon plus `{course.lessons_count || 0} lessons`. |
| 13  | View       | Text         | hero-stat Duration | `Clock` icon plus `formatDuration(course.total_duration_minutes)`. |
| 14  | View       | Text         | hero-stat Language | `Globe` icon plus `languageLabel(course.language)` (returns "Tiếng Việt", "English", or raw code). |
| 15  | Click (is_enrolled) | Button | btn-continue | Label "Continue Learning"; navigates to `/my-courses/{course.id}/{course.slug}`. |
| 16  | Click (!is_enrolled, prerequisites unfinished) | Button | btn-enroll (locked) | Disabled with `Lock` icon and label "Prerequisites Required"; no action. |
| 17  | Click (!is_enrolled, paid, prerequisites OK) | Button | btn-enroll (paid) | Renders `DollarSign` icon and `formatVnd(course.price)`; calls `checkoutPaidCourse()` (MoMo). |
| 18  | Click (!is_enrolled, free, prerequisites OK) | Button | btn-enroll (free) | Renders `GraduationCap` icon and "Enroll for Free"; calls `enroll()` after `window.confirm("Enroll in this course?")`. |
| 19  | Click      | Button       | btn-dashboard | Navigates to `/student/dashboard`; label "Go to Dashboard" with `ChevronRight`. |
| 20  | Loading    | Spinner      | spinner-large | Visible when `loading` true; sibling Text "Loading course details...". |
| 21  | Error      | Card         | error-card | Shows warning emoji, heading "Unable to load course", `error` message, and retry button. |
| 22  | Click (Error) | Button    | btn-retry | Calls `window.location.reload()`. |
| 23  | View (learning_objectives present) | Card | What You'll Learn Card | `Target` icon, heading "What You'll Learn", grid of objectives parsed via `toStringList`. |
| 24  | View       | List item    | objective-item | `CheckCircle` icon plus parsed objective string. |
| 25  | View (modules present) | Card | Course Content Card | `BookOpen` icon and heading "Course Content"; lists `course.modules`. |
| 26  | Click      | Button       | module-header | Toggles `expandedModules[module.id]`; displays index (zero-padded), `module.title`, `{module.lessons.length} lessons`, and chevron rotation. |
| 27  | View (expanded) | List item | lesson-item | Lists lessons numbered `{lidx+1}. {lesson.title}`; uses `Play` icon when `lesson.is_free_preview`, else `Lock` icon. |
| 28  | View (free preview) | Badge | preview-badge | Renders label "Preview" on free-preview lessons. |
| 29  | View (prerequisites present) | Card | Prerequisites Card | `Shield` icon, heading "Prerequisites"; grid of `prerequisite-card-new`. |
| 30  | View       | Image        | prereq-image | Shows `thumbnail_url` for catalog-linked prereqs; otherwise `BookOpen` placeholder. |
| 31  | Click (linked) | Button   | prereq-title-btn | Navigates to `/courses/{item.slug}`. |
| 32  | View (non-linked) | Text  | prereq-title | Shows raw prerequisite string. |
| 33  | View (linked) | Badge     | prereq-status | "Completed" with `CheckCircle` when `status === "completed"`, else "Not Completed" with `XCircle`. |
| 34  | View (unfinished prereqs) | Container | prereq-warning | `Lock` icon plus message "Complete all prerequisite courses before enrolling in this course.". |
| 35  | Click      | Button       | btn-view-graph | Sets `graphModalOpen=true`; label "View Prerequisite Graph" with `TrendingUp` icon. |
| 36  | View (full_description present) | Card | Full Description Card | `FileText` icon, heading "Full Description"; HTML body via `dangerouslySetInnerHTML`. |
| 37  | View (instructors present) | Card | Instructors Card | `GraduationCap` icon; pluralizes label "Instructor(s)" based on count. |
| 38  | View       | Avatar       | instructor-avatar | Renders `avatar_url` or initial-letter placeholder. |
| 39  | View       | Badge        | primary-badge | Shows "Primary" next to instructor name when `is_primary` is true. |
| 40  | View       | Card         | Course Statistics Card | `BarChart3` icon and rows mirroring hero stats (learners, modules, lessons, duration, language). |
| 41  | View (paid, !enrolled) | Card | price-card | Shows `formatVnd(course.price)`, three feature rows ("Full lifetime access", "Certificate of completion", "30-day money-back guarantee"). |
| 42  | Click (paid, !enrolled) | Button | price-enroll-btn | Disabled when prerequisites unfinished; label `"Buy Now - {formatVnd(price)}"` else `"Complete Prerequisites First"`. |
| 43  | View (free, !enrolled) | Card | free-card | `Sparkles` icon, heading "Free Course", subtext "Enroll now and start learning today at no cost!". |
| 44  | Click (free, !enrolled) | Button | free-enroll-btn | Calls `enroll()`; disabled when prerequisites unfinished (label switches to "Complete Prerequisites First"). |
| 45  | View (graphModalOpen) | Modal | Prerequisite Graph Modal | Overlay closes on backdrop click; modal body renders `<PrerequisiteGraph data={prerequisiteGraph} />`. |
| 46  | Click      | Button       | modal-close (✕) | Closes the prerequisite graph modal. |
| 47  | Click      | Button       | modal-btn-close | Footer close button labeled "Close". |

## States & Validation Notes
- `loading` is true while any of the four initial fetches run; hero, content and sidebar cards are hidden in favor of `spinner-large`.
- `error` (string) is set when course detail fetch fails; renders the dedicated `error-card` and disables `back-button`.
- `hasUnfinishedPrerequisites` is computed from `prerequisiteItems.some(x => x.isLinkedCourse && !x.isCompleted)` and disables enroll/checkout actions in the hero, sidebar, and free badge.
- Enroll flow requires `window.confirm("Enroll in this course?")`; on success calls `fetchDetail()` and an alert "Successfully enrolled! Go to Student Dashboard to view your courses.".
- Paid checkout flow: when API returns `status === "paid"`, alerts "You have already paid for this course. Go to Dashboard to continue learning." and navigates to `/my-courses/{id}/{slug}`. When `payment_url` missing throws "No payment URL received from MoMo.".
- `toStringList` accepts arrays, JSON strings, or newline/bullet-separated strings; empty values resolve to `[]`.
- Module accordion state is local (`expandedModules` record keyed by module id).
- `useEffect` redirects to `/courses` when `slug` is empty.
