# LearnerCourseHubPage — UI Specification

**Source:** `frontend/src/pages/leaner/LearnerCourseHubPage.tsx`
**Route:** `/my-courses/:id/:slug`
**Purpose:** Personalized learner "course hub" that surfaces enrollment metadata, progress, leaderboard ranking, and entry points into the roadmap/learning experience for an enrolled course.

## Overview
The page lives in the learner-protected layout (`LearnerSidebarLayout` + `Authentication`). It loads four parallel resources for the supplied `courseId`: `COURSES_API.learning(courseId)` for course detail, `COURSES_API.progress(courseId)` for completion state, `COURSES_API.leaderboard(courseId)` for ranking, and `COURSES_API.catalogPrerequisiteGraph(slug)` for an optional dependency graph rendered inside a modal. The hero block displays the course thumbnail, level/language/instructor metadata, a progress bar derived from `progress.progress_percent || course.enrollment.progress_percent`, and the current learner's rank. A right-side panel lists the leaderboard with gold/silver/bronze accents and an "is_me" highlight. The prerequisite graph opens in a modal-overlay that, when clicked from inside, navigates to the public course detail via `window.open`.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | Click      | Button       | learnerHub__back | "← Dashboard"; navigates to `/student/dashboard`. |
| 2   | View       | Heading      | learnerHub__topbarTitle | Static text "Tổng quan khóa học". |
| 3   | View       | Avatar       | AvatarMenu | Embedded `<AvatarMenu />`. |
| 4   | Error      | Container    | learnerHub__error | Visible when `error` is set; shows title "Không thể mở khóa học", `error` body, and a primary button. |
| 5   | Click      | Button       | Error → Về Dashboard | Returns the user to `/student/dashboard` after a load failure. |
| 6   | Loading    | Text         | learnerHub__loading | "Đang tải..." displayed when `loading && !course`. |
| 7   | View       | Image        | learnerHub__thumb | Course thumbnail or fallback `<div class="learnerHub__thumbPlaceholder">No image</div>`. |
| 8   | View       | Heading      | learnerHub__title | Renders `course.title`. |
| 9   | View       | Text         | learnerHub__meta | "{levelLabel(level)} · {languageLabel(language)} · Giảng viên: {names}". Instructor segment omitted if list empty. |
| 10  | View       | Text         | learnerHub__desc | Renders `course.short_description` or fallback "Chưa có mô tả ngắn." with modifier class `learnerHub__desc--empty`. |
| 11  | Click      | Button       | Học tiếp Button | Primary CTA; navigates to `/learning/{courseId}/{slug || course.slug}`; disabled if `courseId` is falsy. |
| 12  | Click      | Button       | Sơ đồ tiên quyết Button | Opens the prerequisite graph modal by setting `graphModalOpen=true`. |
| 13  | Click      | Button       | Tải lại xếp hạng Button | Re-invokes `fetchLeaderboard()` ignoring errors. |
| 14  | View       | Text         | learnerHub__progressLabel | Static label "Tiến độ của bạn". |
| 15  | View       | Text         | learnerHub__progressPct | "{progressPercent}%" computed from progress data with fallback to `course.enrollment.progress_percent`. |
| 16  | View       | ProgressBar  | learnerHub__progressBar | `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=progressPercent`; fill clamped to `[0, 100]`. |
| 17  | View       | Text         | learnerHub__progressMeta | "Hoàn thành: {completedLessons} / {totalLessons} bài" followed by "· Hạng của bạn: #{myRank}" if `myRank != null`. |
| 18  | View       | Heading      | learnerHub__cardTitle (Leaderboard) | "Bảng xếp hạng". |
| 19  | View       | Text         | learnerHub__cardHint | "Top {leaderboard.top_limit ?? 100} + bạn (nếu ngoài top)". |
| 20  | View (items) | List item | learnerHub__leaderboardItem | One row per leaderboard entry; medal classes `--gold`, `--silver`, `--bronze` for ranks 1/2/3, `--me` when `is_me`. |
| 21  | View       | Text         | learnerHub__leaderboardRank | Displays `#{rank}`. |
| 22  | View       | Avatar       | learnerHub__leaderboardAvatar | Uses `avatar_url`, else placeholder with first-letter initial. |
| 23  | View       | Text         | learnerHub__leaderboardName | Displays `full_name`. |
| 24  | View       | Text         | learnerHub__leaderboardScore | Displays `{progress_percent}%`. |
| 25  | Empty      | Text         | learnerHub__empty | "Chưa có dữ liệu bảng xếp hạng." when leaderboard list is empty. |
| 26  | View       | Heading      | Info Card Title | "Thông tin"; hint "Một số thông tin cơ bản". |
| 27  | View       | List item    | Info Row Trạng thái | "Trạng thái" with `course.enrollment.status` (defaults to "active"). |
| 28  | View       | List item    | Info Row Slug | "Slug" with `course.slug`. |
| 29  | View (modal) | Modal     | Prerequisite Graph Modal | `role="dialog"`, `aria-modal="true"`; visible when `graphModalOpen` is true. |
| 30  | Click      | Button       | Đóng Button | Sets `graphModalOpen=false`. |
| 31  | View       | Container    | PrerequisiteGraph | Renders `<PrerequisiteGraph data={prerequisiteGraph} showCompletionStatus />`; clicking a node opens `/courses/{slug}` in a new tab via `window.open`. |

## States & Validation Notes
- The page redirects to `/student/dashboard` when `courseId` is invalid.
- `loading` toggles only for the initial parallel load; subsequent leaderboard refresh ignores errors silently.
- Progress fallback hierarchy: `progress.total_lessons` → sum of `course.modules[].lessons.length`; `progress.completed_lessons` → `progress.completed_lesson_ids.length`.
- `progressPercent` falls back to `course.enrollment.progress_percent` and finally `0`.
- Prerequisite graph errors are swallowed (the section is optional).
- Modal stops propagation: clicking the body does not close it (close is only via the explicit "Đóng" button).
