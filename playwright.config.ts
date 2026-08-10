import { defineConfig, devices } from '@playwright/test'
import { config as loadEnvironment } from 'dotenv'

loadEnvironment({ path: '.env.test.local' })
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const localE2E = process.env.E2E_LOCAL_MODE === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL,
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: localE2E ? {
    command: 'node node_modules/next/dist/bin/next dev',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  } : process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
