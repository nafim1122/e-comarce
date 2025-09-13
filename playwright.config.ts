import { PlaywrightTestConfig } from '@playwright/test';

// ensure Playwright runner has VITE_FORCE_LOCAL set so helper code paths that
// check process.env will see local-mode enabled. The dev server is also
// started with the same env below.
process.env.VITE_FORCE_LOCAL = process.env.VITE_FORCE_LOCAL ?? 'true';

const config: PlaywrightTestConfig = {
  timeout: 60_000,
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE || 'http://localhost:8080',
  headless: true,
  viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE || 'http://localhost:8080',
    // ensure the started dev server runs with local-mode enabled
    env: {
      VITE_FORCE_LOCAL: 'true',
      // preserve any existing environment vars when Playwright spawns the server
      ...process.env,
    },
    reuseExistingServer: false,
    timeout: 60_000,
    cwd: process.cwd(),
  },
};

export default config;
