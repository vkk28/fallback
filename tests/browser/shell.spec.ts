import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mobile/desktop shell is accessible and never invents account or financial success', async ({ page }) => {
  let accountRequests = 0;
  page.on('request', request => { if (/privy\.io|walletconnect\.com/.test(new URL(request.url()).hostname)) accountRequests++; });
  for (const width of [320, 375, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const signIn = page.getByRole('button', { name: /Sign in/ });
    await expect(signIn).toBeVisible();
    await expect(page.getByText('Room to breathe.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: `docs/evidence/uiux-shell-${width}.png`, fullPage: true });
  }
  expect(accountRequests).toBe(0); // Public browsing should not initialize accounts before sign-in intent.
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
});

test('requesting email sign-in opens the actual provider UI without submitting credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
});

test('About is public, explains the tradeoffs and has accessible navigation at phone and desktop sizes', async ({ page }) => {
  let accountRequests = 0;
  page.on('request', request => { if (/privy\.io|walletconnect\.com/.test(new URL(request.url()).hostname)) accountRequests++; });
  await page.goto('/');
  await page.getByRole('link', { name: 'About Fallback', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  for (const width of [320, 375, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Family backup.Agreed before you need it.');
    const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    await expect(navigation.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('aria-current', 'page');
    for (const name of ['Home', 'Activity', 'Account', 'About']) await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How to use Fallback', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why choose it over another way?', exact: true })).toBeVisible();
    await expect(page.getByText('Illustration only · not your balance', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if ([375, 1280].includes(width)) await page.screenshot({ path: `docs/evidence/about-${width}.png`, fullPage: true });
    if (width === 1280) await page.screenshot({ path: 'docs/evidence/about-preview.png' });
  }
  expect(accountRequests).toBe(0);
  await page.getByRole('link', { name: 'Compare options', exact: true }).click();
  await expect(page).toHaveURL(/#about-alternatives$/);
  const heading = page.getByRole('heading', { name: 'Why choose it over another way?', exact: true });
  await expect(heading).toBeInViewport();
  await page.goto('/about');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content', exact: true })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Set up a test plan', exact: true })).toHaveAttribute('href', '/new');
});

test('financial APIs fail closed when authentication is missing; no financial response is cached', async ({ page }) => {
  await page.goto('/');
  const response = await page.request.get('/api/plans');
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toContain('no-store');
  const session = await page.request.get('/api/session', { headers: { Authorization: 'Bearer invalid' } });
  expect([401, 503]).toContain(session.status());
});

test('scheduler discovery and batch enqueue reject missing relay authentication and foreign origins', async ({ request }) => {
  const discovery = await request.get('/api/scheduler/candidates');
  expect(discovery.status()).toBe(401);
  expect(discovery.headers()['cache-control']).toContain('no-store');
  const enqueue = await request.post('/api/scheduler/enqueue-batch', { headers: { Origin: 'http://localhost:3000' }, data: { batchId: '12345678-1234-4234-8234-123456789012', candidates: [] } });
  expect(enqueue.status()).toBe(401);
  expect(enqueue.headers()['cache-control']).toContain('no-store');
  const foreign = await request.post('/api/scheduler/enqueue-batch', { headers: { Origin: 'https://untrusted.example' }, data: {} });
  expect(foreign.status()).toBe(403);
});

test('service worker caches only safe assets, supports offline shell and queues no money actions', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const urls = await page.evaluate(async () => {
    const requests = await Promise.all((await caches.keys()).map(async k => (await caches.open(k)).keys()));
    return requests.flat().map(r => new URL(r.url).pathname);
  });
  expect(urls.every(u => u.startsWith('/_next/static/') || u.startsWith('/icons/') || u === '/offline.html')).toBe(true);
  expect(urls.some(u => u.startsWith('/api/'))).toBe(false);
  await context.setOffline(true);
  await page.goto('/setup');
  await expect(page.getByRole('heading', { name: 'You’re offline.' })).toBeVisible();
  await expect(page.getByText('No money action is queued for replay.')).toBeVisible();
});


test('invitation preview starts automatically before sign-in; invalid links have recovery without account SDK initialization', async ({ page }) => {
  let accounts = 0;
  page.on('request', request => { if (/privy\.io|walletconnect\.com/.test(new URL(request.url()).hostname)) accounts++; });
  await page.goto('/invite');
  await expect(page.getByText('This invitation link is incomplete.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Home', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Read this invitation' })).toHaveCount(0);
  expect(accounts).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
