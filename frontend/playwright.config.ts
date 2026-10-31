import { defineConfig, devices } from '@playwright/test'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('E2E requires an isolated local test deployment')
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, retries: process.env.CI ? 1 : 0,
  timeout: 30000, expect: { timeout: 10000 },
  reporter: [['list'], ['html', {open:'never'}], ['junit', {outputFile:'test-results/junit.xml'}]],
  use: {baseURL, screenshot:'only-on-failure', trace:'retain-on-failure', video:'retain-on-failure'},
  projects: [{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
})
