Role: Senior Frontend Architect & Refactoring Specialist
Task: Convert the newly added HTML files inside the teacher/course manager directory into modular React+TypeScript components, delete obsolete UI files, update the router system (`App.tsx`), and bind frontend states with existing Backend APIs without changing any backend code.

[CONTEXT & TARGET ARTIFACTS]
Based on the provided directory layout, we have raw HTML templates (marked as 'U') that need to be transformed into production-ready React components matching our architectural framework.

Target Conversion & Replacement Mapping:
1. `AssignmentBuilder.html` -> Convert and integrate logic with -> `src/pages/courseManager/TeacherAssignmentEditorPage.tsx`
2. `CourseBuilder.html` -> Convert and integrate logic with -> `src/pages/courseManager/TeacherCourseContentBuilderPage.tsx`
3. `CourseManager.html` -> Convert and integrate logic with -> `src/pages/courseManager/TeacherCourseDetailPage.tsx`
4. `CourseManagerDashboard.html` -> Convert and integrate logic with -> `src/pages/courseManager/TeacherDashboard.tsx`
5. `DiscussionBoardManagement.html` -> Convert to -> `src/pages/courseManager/DiscussionBoardManagementPage.tsx` & `.css`
6. `GradingFeedbackStation.html` -> Convert and integrate logic with -> `src/pages/courseManager/TeacherGradingCenterPage.tsx`
7. `StudentAnalytics.html` -> Convert to -> `src/pages/courseManager/StudentAnalyticsPage.tsx` & `.css`

[INSTRUCTIONS & COMPLIANCE RULES]

1. PURGE REDUNDANT LEGACY & RAW HTML FILES:
   - Once a template is successfully converted, permanently remove/delete the raw `.html` source files from the directory to keep the workspace clean.
   - Clean up any old, unused placeholder page components that are completely replaced by these new layouts.

2. TARGETED CONVERSION & UI MODERNIZATION:
   - Convert all listed templates into fully typed TypeScript Functional Components (`React.FC`).
   - Translate all standard HTML markup to JSX (`className`, `htmlFor`, object style notation).
   - Extract styling blocks into their respective scoped `.css` companion files. Ensure class definitions use explicit, unique scoping prefixes to block global styling pollution.
   - Inject modern micro-interactions (hover, focus, transitions) onto all action triggers, course management nodes, grading matrix cells, and analytics graphs.

3. FRONTEND TO BACKEND DATA BINDING (API LINKS):
   - Inspect the existing data-fetching routines or Axios hooks inside `src/api/` related to course creation, module building, grade submission, assignment details, and class statistics.
   - Inject the functional state hooks, props definitions, and request/mutation hooks directly into the new component bodies.
   - Match variable signatures exactly with the backend JSON schemas.
   - CRITICAL CONSTRAINT: Absolutely DO NOT rewrite, modify, or touch any backend server code or database controllers.

4. MASTER ROUTING SYNCHRONIZATION (`App.tsx`):
   - Refactor `src/App.tsx` to clear out broken imports of deleted files and attach the updated components.
   - Ensure these teacher-facing screens are securely wrapped under the proper `<Authentication allowedRoles={["course_manager", "teacher"]}>` middleware blocks.

[OUTPUT EXPECTED]
Directly modify the filesystem layout. Ensure the entire course management ecosystem is tightly integrated with backend endpoints and compiles perfectly with zero TypeScript compiler errors.

Please begin the automated migration, cleanup, and routing refactor now.
