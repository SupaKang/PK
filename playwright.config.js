import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'sprint-eval',
      testDir: './eval/scripts',
      testMatch: '**/*.js',
    },
    {
      name: 'integration',
      testDir: './eval/integration',
      testMatch: '**/*.spec.js',
    },
  ],
  webServer: {
    command: 'npx vite --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
