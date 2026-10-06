import { defineConfig, devices } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT ?? '4173'
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.webkit\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox',
      retries: 1,
      testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.webkit\.spec\.ts/],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      retries: 1,
      testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.webkit\.spec\.ts/],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-iphone',
      testMatch: /.*\.webkit\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
  ],
})
