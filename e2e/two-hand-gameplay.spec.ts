import { expect, test, type Page } from '@playwright/test';

async function startTwinHandsScenario(
  page: Page,
  scenario: 'discard_flow' | 'pegging_score' | 'show_progression' | 'winning_go' | 'loss_at_limit',
  disableBoardModal = true,
) {
  const boardModalParam = disableBoardModal ? '&twoHandE2EDisableBoardModal=1' : '';
  await page.goto(`/?twoHandE2EScenario=${scenario}${boardModalParam}`);
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

test('run-start card reward allows browsing and choosing an improvement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Classic Run' }).click();

  await expect(page.getByText('Run Started!')).toBeVisible();
  await page
    .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
    .first()
    .click();
  await expect(page.getByText('Choose an improvement')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Choose .+:/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Choose a different card' }).click();
  await expect(page.getByText('Choose one of these cards')).toBeVisible();

  await page
    .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
    .nth(1)
    .click();
  await page
    .getByRole('button', { name: /^Choose .+:/ })
    .first()
    .click();
  await expect(page.getByText('Round 1 (to 31)')).toBeVisible();
});

test('Twin Hands shows its board preview and progress modal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Twin Hands Run' }).click();
  await page
    .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /^Choose .+:/ })
    .first()
    .click();

  await expect(page.getByText('Round Board Preview')).toBeVisible();
  await expect(page.getByText(/Reach 45 board progress/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Play' }).click();

  await expect(page.getByText('Twin Hands • Round 1 (to 45)')).toBeVisible();
  await page.getByRole('button', { name: 'Open board progress' }).click();
  await expect(page.getByText('Board Progress', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Board Progress', { exact: true })).not.toBeVisible();
});

test('Twin Hands requires each seat to discard before pegging', async ({ page }) => {
  await startTwinHandsScenario(page, 'discard_flow');

  await page.getByText('Confirm Top discard (0/2)').click();
  await expect(page.getByText(/Top Hand 🔵.*discard 2/)).toBeVisible();
  await page.getByRole('button', { name: 'K of clubs', exact: true }).click();
  await page.getByText('Confirm Top discard (1/2)').click();
  await expect(page.getByText(/Top Hand 🔵.*discard 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Q of clubs', exact: true }).click();
  await page.getByText('Confirm Top discard (2/2)').click();

  await expect(page.getByText(/Top Hand 🔵.*waiting/)).toBeVisible();
  await expect(page.getByText('Bottom Hand 🟡 — discard 2')).toBeVisible();
  await page.getByRole('button', { name: '6 of hearts', exact: true }).click();
  await page.getByRole('button', { name: '5 of hearts', exact: true }).click();
  await page.getByText('Confirm Bottom discard (2/2)').click();

  await expect(page.getByText('Pegging Pile — Count 0 • Active: Bottom')).toBeVisible();
});

test('Twin Hands scores pegging combinations and resets the pile at 31', async ({ page }) => {
  await startTwinHandsScenario(page, 'pegging_score');

  await page.getByRole('button', { name: '5 of clubs', exact: true }).click();
  await expect(page.getByText('Pegging Pile — Count 15 • Active: Top')).toBeVisible();
  await expect(page.getByText('Bottom: Fifteen for 2, Three of a kind for 6')).toBeVisible();

  await page.getByRole('button', { name: '10 of clubs', exact: true }).click();
  await expect(page.getByText('Pegging Pile — Count 25 • Active: Bottom')).toBeVisible();
  await page.getByRole('button', { name: '6 of clubs', exact: true }).click();
  await expect(page.getByText('Bottom: 31 for 2')).toBeVisible();
  await expect(page.getByText('Pegging Pile — Count 0 • Active: Top')).toBeVisible();
});

test('Twin Hands scores both hands and advances to the next hand', async ({ page }) => {
  await startTwinHandsScenario(page, 'show_progression');

  await expect(page.getByText('Hand Results')).toBeVisible();
  await expect(page.getByText(/Top hand: \+\d+ pts/)).toBeVisible();
  await expect(page.getByText(/Bottom hand: \+\d+ pts/)).toBeVisible();
  await expect(page.getByText(/Crib: \+\d+ pts/)).toBeVisible();
  await expect(page.getByText(/Combined this hand: \+\d+ pts/)).toBeVisible();

  await page.getByText('Next Hand →').click();
  await expect(page.getByText('2/2', { exact: true })).toBeVisible();
  await expect(page.getByText(/Top Hand 🔵.*discard 2/)).toBeVisible();
});

test('Twin Hands completes a round, offers an upgrade, and advances', async ({ page }) => {
  await startTwinHandsScenario(page, 'winning_go');

  await expect(page.getByText('44/45 board progress')).toBeVisible();
  await page.getByRole('button', { name: 'Go!' }).click();
  await page.getByText('Continue →').click();

  await expect(page.getByText('Round Complete!')).toBeVisible();
  await expect(page.getByText('Choose an Upgrade:')).toBeVisible();
  await page.getByText('Skip Upgrade').click();

  await expect(page.getByText('Round Board Preview')).toBeVisible();
  await page.getByText('Twin Hands • Round 2 (to 95)').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Continue to Play' }).click();
  await expect(page.getByText('Twin Hands • Round 2 (to 95)')).toBeVisible();
});

test('Twin Hands ends the run when the last hand cannot clear the target', async ({ page }) => {
  await startTwinHandsScenario(page, 'loss_at_limit');

  await expect(page.getByText(/Out of hands\. Finished at \d+\/45\./)).toBeVisible();
  await page.getByText('Continue →').click();
  await expect(page.getByText('Defeated!')).toBeVisible();
  await page.getByText('Back to Menu').click();
  await expect(page.getByText('Run Over')).toBeVisible();
  await page.getByText('New Run').click();
  await expect(page.getByRole('button', { name: 'Start Twin Hands Run' })).toBeVisible();
});
