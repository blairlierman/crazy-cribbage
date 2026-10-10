import { expect, test, type Page } from '@playwright/test';

async function startTwinHandsScenario(page: Page, scenario: 'single_go' | 'double_go') {
  await page.goto(`/?twoHandE2EScenario=${scenario}&twoHandE2EDisableBoardModal=1`);
  await page.getByRole('button', { name: 'Start Twin Hands Run' }).click();
  await page
    .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /^Choose .+:/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Continue to Play' }).click();
}

test('Twin Hands awards go when both seats cannot play', async ({ page }) => {
  await startTwinHandsScenario(page, 'single_go');

  await expect(page.getByText('Pegging Pile — Count 30 • Active: Top')).toBeVisible();

  await page.getByRole('button', { name: 'Go!' }).click();
  await expect(page.getByText('Bottom gets go (+1)')).toBeVisible();
  await expect(page.getByText('Pegging Pile — Count 0 • Active: Top')).toBeVisible();
});

test('Twin Hands handles consecutive go awards in one pegging sequence', async ({ page }) => {
  await startTwinHandsScenario(page, 'double_go');

  await page.getByRole('button', { name: 'Go!' }).click();
  await expect(page.getByText('Bottom gets go (+1)')).toBeVisible();

  await page.getByRole('button', { name: '8 of hearts' }).click();
  await page.getByRole('button', { name: 'K of hearts' }).click();
  await page.getByRole('button', { name: 'K of clubs' }).click();
  await page.getByRole('button', { name: '2 of spades' }).click();
  await page.getByRole('button', { name: 'Go!' }).click();

  const goAwards = page.getByText('Bottom gets go (+1)');
  await expect(goAwards).toHaveCount(2);
  await expect(page.getByText('Pegging Pile — Count 0 • Active: Top')).toBeVisible();
});
