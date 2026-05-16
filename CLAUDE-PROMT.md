Role: Senior UI/UX Engineer & Frontend Architect
Task: Enhance and modernize the UI/UX design of 7 individual HTML files inside the `learner` directory, converting them into polished React+TypeScript components while strictly preserving existing operational logic.

[CONTEXT & PROJECT STRUCTURE]
The project is a modern React web application built with:

- Build Tool: Vite
- Language: TypeScript (React.FC)
- Styling: Dedicated CSS files per page component
- File Location: Files are already split and located inside `src/pages/learner/`

[INPUT DATA - TARGET FILES]
You will process the following 7 distinct files within `src/pages/learner/`:

1. Learner Dashboard (`LearnerDashboard.tsx` / `.css`)
2. My Course Page (`MyCoursePage.tsx` / `.css`)
3. My Certificates (`MyCertificates.tsx` / `.css`)
4. Learning Workspace (`LearningWorkspace.tsx` / `.css`)
5. Assignment & Submission (`AssignmentSubmission.tsx` / `.css`)
6. Live Sessions Schedule (`LiveSessionsSchedule.tsx` / `.css`)
7. Profile & Settings (`ProfileSettings.tsx` / `.css`)

[STRICT REFACTORING CONSTRAINT: UI/UX ONLY]

- NO FUNCTIONAL CHANGES: Do not touch, alter, or remove any form submission handlers, API fetching logic, state hooks, props definition, or dynamic data bindings.
- NO BACKEND REFACTOR: Preserve all existing variable names, structural logic loops, and conditional rendering conditions.

[UI/UX MODERNIZATION RULES]

1. Visual Upgrade: Apply a clean, modern, premium SaaS dashboard aesthetic. Optimize shadows (box-shadow), card corners (border-radius), layout borders, and alignment.
2. Micro-interactions: Add smooth CSS transitions (`transition: all 0.2s ease-in-out`) for all hover, active, and focus states on buttons, inputs, navigation links, and clickable cards.
3. Typography & Spacing: Clean up text hierarchy using proportional sizing and optimize whitespace padding/margin to prevent cramped UI layouts.
4. CSS Scoping: All styles must be contained within their respective `.css` companion files. Use unique prefixes to completely prevent global style pollution.
5. Code Quality: Ensure valid JSX syntax (e.g., `className`, `htmlFor`, object notation for inline styles) and preserve TypeScript types.

[OUTPUT EXPECTED]
Directly edit and overwrite the files in the directory. Organize your work and process each page systematically. For each page, deliver the modified:

- `src/pages/learner/[PageName].tsx`
- `src/pages/learner/[PageName].css`

Please read the target files in `src/pages/learner/` and apply these precise visual upgrades now.

Please apply the prompt rules to update only the LearnerDashboard files first. Once done, let me know so we can move to the next file.
