import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './teams/sat-app/test-flows/playwright',
  fullyParallel: false,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cd apps/mobile && npx expo start --port 8081 --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
