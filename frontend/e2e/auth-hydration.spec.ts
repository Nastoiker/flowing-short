import { test, expect } from '@playwright/test'

for (const path of ['/authorization', '/registration']) {
  test(`${path} cannot submit before JavaScript, and native fallback never puts credentials in URL`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    try {
      await page.goto(path)
      const form = page.locator('main form')
      await expect(form.locator('input[name="email"]')).toBeDisabled()
      await expect(form.locator('input[type="password"]').first()).toBeDisabled()
      await expect(form.locator('button[type="submit"]')).toBeDisabled()
      await expect(form.locator('noscript')).toBeVisible()

      // Simulate a browser extension re-enabling the controls: native submission must
      // still use a POST body, even when React's submit handler cannot run.
      await page.route(`**${path}`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Captured native fallback</p>' }))
      const request = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === path)
      await form.evaluate((element: HTMLFormElement) => {
        element.querySelector('fieldset')!.disabled = false
        element.querySelector<HTMLInputElement>('input[name="email"]')!.value = 'prehydrate@example.test'
        element.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'SyntheticPassword123!'
        element.requestSubmit()
      })
      const submitted = await request
      expect(submitted.method()).toBe('POST')
      expect(new URL(submitted.url()).search).toBe('')
      expect(submitted.postData()).toContain('prehydrate%40example.test')
      expect(submitted.postData()).toContain('SyntheticPassword123')
    } finally {
      await context.close()
    }
  })

  test(`${path} stays disabled while hydration chunks are delayed, then submits only through API`, async ({ page }) => {
    let release!: () => void
    const chunksReady = new Promise<void>(resolve => { release = resolve })
    await page.route('**/_next/static/**/*.js', async route => {
      await chunksReady
      await route.continue()
    })
    const credentialRequests: { method: string; url: string }[] = []
    page.on('request', request => {
      if (/email=|password=|hashpassword=/.test(request.url())) credentialRequests.push({ method: request.method(), url: request.url() })
    })
    try {
      // DOMContentLoaded waits for deferred scripts, so inspect streamed HTML before it.
      await page.goto(path, { waitUntil: 'commit' })
      const form = page.locator('main form')
      await expect(form.locator('input[name="email"]')).toBeDisabled()
      await expect(form.locator('input[type="password"]').first()).toBeDisabled()
      await expect(form.locator('button[type="submit"]')).toBeDisabled()
      release()
      await expect(form.locator('input[name="email"]')).toBeEnabled()
      await form.locator('input[name="email"]').fill('prehydrate@example.test')
      await form.locator('input[type="password"]').first().fill('SyntheticPassword123!')
      if (path === '/registration') {
        await form.locator('input[name="login"]').fill('Synthetic User')
        await form.locator('input[name="confirm"]').fill('SyntheticPassword123!')
      }
      const endpoint = path === '/registration' ? '/api/auth/register' : '/api/auth/login'
      await page.route(`**${endpoint}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      const request = page.waitForRequest(request => new URL(request.url()).pathname === endpoint)
      await form.locator('button[type="submit"]').click()
      const submitted = await request
      expect(submitted.method()).toBe('POST')
      expect(new URL(submitted.url()).search).toBe('')
      await expect(form.getByRole('alert')).toBeVisible()
      expect(credentialRequests).toEqual([])
      expect(new URL(page.url()).pathname).toBe(path)
    } finally {
      release()
    }
  })
}
