import { defineConfig, devices } from '@playwright/test';

/**
 * MindBridge — Live Demo Playwright Configuration
 *
 * Optimized for "click-and-watch" automated demonstrations:
 *   - Always headed so the browser window is visible.
 *   - slowMo: 1000 ms so each interaction is comfortably observable.
 *   - Single-worker / fully sequential — Acts 1 → 4 share live database state.
 *   - Generous timeouts to accommodate live API + LLM-backed flows.
 *
 * Required environment variables (set via .env.local or shell):
 *   PLAYWRIGHT_BASE_URL   - Frontend origin (default http://localhost:5173)
 *   PLAYWRIGHT_API_URL    - Backend origin  (default http://localhost:3000)
 *
 * The demo spec assumes `npm run db:seed` has already executed inside the
 * backend workspace and that BOTH the frontend dev server (vite) and the
 * backend (`npm run dev`) are running.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: false,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30 * 1000,
    navigationTimeout: 60 * 1000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: 1000,
      args: ['--start-maximized'],
    },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'live-demo',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
