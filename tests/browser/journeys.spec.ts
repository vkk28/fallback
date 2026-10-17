import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
// Use the installed TS compiler dependency; no new application/runtime dependency.
const esbuild = require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild')) as typeof import('esbuild');
let bundle: string, css: string;
test.beforeAll(async () => {
  css = await readFile('apps/web/app/globals.css', 'utf8');
  const result = await esbuild.build({ entryPoints: ['tests/browser/fixtures/journeys.tsx'], bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_PRIVY_APP_ID': '"ui-fixture"' }, plugins: [{ name: 'isolated-ui-fixtures', setup(build) { build.onResolve({ filter: /^@privy-io\/react-auth$/ }, () => ({ path: resolve('tests/browser/fixtures/provider.ts') })); build.onResolve({ filter: /^\.\/account-gate$/ }, () => ({ path: resolve('tests/browser/fixtures/account-gate.tsx') })); build.onResolve({ filter: /^next\/(link|navigation)$/ }, () => ({ path: resolve('tests/browser/fixtures/navigation.tsx') })); } }] });
  bundle = result.outputFiles![0]!.text;
});
test.beforeEach(async ({ page }) => {
  // This route exists only in this fresh Playwright context, never in the app.
  await page.route('**/__ui-fixture*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Isolated Fallback UI test</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="app"></div><script>' + bundle.replaceAll('</script', '<\\/script') + '</script></body></html>' }));
});
test('isolated active-plan fixture: review is focused, approval does not deposit, and confirmed permission survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/__ui-fixture?scenario=active');
  await page.getByLabel('Amount · FBTEST', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Review deposit permission' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeFocused();
  await expect(dialog.getByText(/permission does not move money/)).toBeVisible();
  await expect(new AxeBuilder({ page }).analyze().then(r => r.violations)).resolves.toEqual([]);
  await dialog.getByRole('button', { name: 'Allow this exact deposit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Permission confirmed. Finish your deposit.' })).toBeVisible();
  expect(await page.evaluate(() => window.fixtureAuthorizations)).toBe(1);
  expect(await page.evaluate(() => window.fixtureCalls.filter(c => c === 'POST transactions').length)).toBe(1);
  await page.reload();
  await expect(page.getByLabel('Amount · FBTEST', { exact: true })).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Add money', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.fixtureAuthorizations)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('isolated recovery fixture: Check status never requests a signature or posts a retry', async ({ page }) => {
  await page.goto('/__ui-fixture?scenario=pending');
  await page.getByRole('button', { name: 'Check status', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review authorization' })).toBeVisible();
  expect(await page.evaluate(() => window.fixtureAuthorizations)).toBe(0);
  expect(await page.evaluate(() => window.fixtureCalls.some(c => c.startsWith('POST transactions')))).toBe(false);
});
test('isolated draft fixture: errors identify fields, saved progress survives reload and stays scoped to its actor', async ({ page }) => {
  await page.goto('/__ui-fixture?scenario=create');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('What is this plan for?')).toBeFocused();
  await page.getByLabel('What is this plan for?').fill('Private preliminary test draft');
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(page.getByText('Progress saved privately to your account.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('What is this plan for?')).toHaveValue('Private preliminary test draft');
  await page.goto('/__ui-fixture?scenario=create&actor=someone-else');
  await expect(page.getByLabel('What is this plan for?')).toHaveValue('');
});
test('isolated role fixtures: payee/supporter cannot fund an active plan; zero refund has a reason; profile is prefilled', async ({ page }) => {
  for (const role of ['payee', 'supporter', 'closed']) {
    await page.goto(`/__ui-fixture?scenario=${role}`);
    await expect(page.getByLabel('Amount · FBTEST', { exact: true })).toHaveCount(0);
    if (role === 'closed') await expect(page.getByRole('heading', { name: 'No unused money available to return' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.goto('/__ui-fixture?scenario=account');
  await expect(page.getByLabel('Display name')).toHaveValue('Saved fixture name');
});
test('isolated new-person invitation: no address needed, reload lists it, revocation and replacement remain separate from money', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/__ui-fixture?scenario=onboarding');
  await expect(page.getByText(/Anyone holding this link can claim/)).toBeVisible();
  await page.getByRole('button', { name: 'Prepare invitation', exact: true }).click();
  await expect(page.getByText('Private link request · open')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Private link request · open')).toBeVisible();
  await page.getByRole('button', { name: 'Revoke invitation' }).click();
  await expect(page.getByText('Private link request · revoked')).toBeVisible();
  await page.getByRole('button', { name: 'Prepare replacement' }).click();
  await page.getByRole('button', { name: 'Replace invitation', exact: true }).click();
  await expect(page.getByText('Private link request · replaced')).toBeVisible();
  await expect(page.getByText('Private link request · open')).toBeVisible();
  await page.getByLabel('How to invite').selectOption('email');
  await expect(page.getByLabel('Recipient’s sign-in email')).toBeVisible();
  await expect(page.getByLabel(/The person agreed/)).toBeDisabled();
  expect(await page.evaluate(() => window.fixtureAuthorizations)).toBe(0);
  expect(await page.evaluate(() => window.fixtureCalls.some(c => c.startsWith('POST transactions')))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('isolated invitation review: sign-in return/reload retain the token; decline does not join or authorize money', async ({ page }) => {
  const tokens: string[] = [];
  await page.route('**/api/invitations/preview', async route => {
    tokens.push(route.request().postDataJSON().token);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ planId: 'fixture-plan', label: 'Synthetic new-person request', requestedBy: 'Fixture owner', role: 'payee', payee: null, intendedAddress: null, requiresVerifiedEmail: false, expiresAt: new Date(Date.now() + 86400_000).toISOString(), terms: { amount: '1000000', minimumReserve: '1000000', maximumReserve: '3000000', perPaymentCap: '1000000', firstDue: String(Math.floor(Date.now() / 1000) + 172800), interval: '86400', grace: '3600', fundingDeadline: String(Math.floor(Date.now() / 1000) + 86400), count: 2, coverBps: 10000 } }) });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/__ui-fixture?scenario=invite#' + 't'.repeat(43));
  await expect(page.getByRole('button', { name: 'Join this plan', exact: true })).toBeDisabled();
  await page.goto('/__ui-fixture?scenario=invite');
  await expect(page.getByText('Synthetic new-person request', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Decline invitation' })).toBeVisible();
  expect(tokens.length).toBeGreaterThanOrEqual(3); expect(tokens.every(t => t === 't'.repeat(43))).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Decline invitation' }).click();
  await expect(page.getByRole('heading', { name: 'Invitation declined' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('fallback:invitation-intent'))).toBeNull();
  expect(await page.evaluate(() => window.fixtureCalls.includes('POST invitations/accept'))).toBe(false);
  expect(await page.evaluate(() => window.fixtureAuthorizations)).toBe(0);
  await page.goto('/__ui-fixture?scenario=invite#' + 'u'.repeat(43));
  await expect(page.getByRole('heading', { name: 'Invitation declined' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Join this plan', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Decline invitation', exact: true })).toBeEnabled();
  expect(tokens.at(-1)).toBe('u'.repeat(43));
});
