import { expect, test, type Page } from '@playwright/test';

async function startTwinHandsScenario(page: Page, scenario: 'single_go' | 'double_go') {
  await page.addInitScript((scenarioName: 'single_go' | 'double_go') => {
    (window as Window & { __CRAZY_CRIBBAGE_E2E_TWO_HAND_SCENARIO__?: 'single_go' | 'double_go' }).__CRAZY_CRIBBAGE_E2E_TWO_HAND_SCENARIO__ =
      scenarioName;
  }, scenario);

  await page.goto('/');
  await page.getByRole('button', { name: 'Start Twin Hands Run' }).click();
  await page.getByRole('button', { name: 'Continue to Play' }).click();
}

test('Twin Hands awards go when both seats cannot play', async ({ page }) => {
  await startTwinHandsScenario(page, 'single_go');

  await expect(page.getByText('Pegging Pile — Count 30 • Active: Top')).toBeVisible();

  await page.getByRole('button', { name: 'Go!' }).click();
  await expect(page.getByText('Top Hand 🔵 — Go!')).toBeVisible();
  await page.getByRole('button', { name: 'Go!' }).click();

  await expect(page.getByText('Top gets go (+1)')).toBeVisible();
  await expect(page.getByText('Pegging Pile — Count 0 • Active: Bottom')).toBeVisible();
});

test('Twin Hands handles consecutive go awards in one pegging sequence', async ({ page }) => {
  await startTwinHandsScenario(page, 'double_go');

  await page.getByRole('button', { name: 'Go!' }).click();
  await page.getByRole('button', { name: 'Go!' }).click();
  await expect(page.getByText('Top gets go (+1)')).toBeVisible();

  await page.getByRole('button', { name: 'A of spades' }).click();
  await page.getByRole('button', { name: '9 of hearts' }).click();
  await page.getByRole('button', { name: 'K of hearts' }).click();
  await page.getByRole('button', { name: 'K of clubs' }).click();

  await page.getByRole('button', { name: 'Go!' }).click();
  await page.getByRole('button', { name: 'Go!' }).click();

  await expect(page.getByText('Bottom gets go (+1)')).toBeVisible();
  await expect(page.getByText('Pegging Pile — Count 0 • Active: Top')).toBeVisible();
  await expect(page.getByText(/Top gets go \(\+1\)/)).toBeVisible();
});
