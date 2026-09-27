import { test, expect } from '@playwright/test';

test('opens Settings and downloads the trace log', async ({ page }) => {
  await page.goto('/');

  const settings = page.getByRole('button', { name: 'Open settings' });
  await expect(settings).toBeVisible();
  await settings.screenshot({ path: 'test-results/settings-button.png' });

  await settings.click();
  await expect(page.getByText('Settings', { exact: true })).toBeVisible();
  await expect(page.getByText('Trace Log', { exact: true })).toBeVisible();
  await expect(page.getByText(/events recorded/)).toBeVisible();
  await page.screenshot({ path: 'test-results/settings-modal.png' });

  await page.getByRole('button', { name: 'Clear Trace Log' }).click();
  await expect(page.getByText('Trace log cleared.')).toBeVisible();
  await expect(page.getByText('0 events recorded.')).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start Classic Run' }).click();
  await settings.click();
  await expect(page.getByText('1 event recorded.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Trace Log' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^crazy-cribbage-trace-.*\.json$/);
});
