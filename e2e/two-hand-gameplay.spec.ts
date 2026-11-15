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
  if (scenario === 'show_progression' || scenario === 'loss_at_limit') {
    await expect(page.getByText('Halfway Reward')).toBeVisible();
    await page
      .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
      .first()
      .click();
    await page
      .getByRole('button', { name: /^Choose .+:/ })
      .first()
      .click();
  }
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

test('Classic keeps the player hand on one row on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Classic Run' }).click();
  await page
    .getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /^Choose .+:/ })
    .first()
    .click();

  const cardButtons = page.getByRole('button', { name: / of (clubs|diamonds|hearts|spades)$/ });
  await expect(cardButtons).toHaveCount(6);
  const cardTops = await cardButtons.evaluateAll((buttons) =>
    buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
  );
  expect(new Set(cardTops).size).toBe(1);
  const cardBounds = await cardButtons.first().boundingBox();
  expect(cardBounds!.width).toBeGreaterThan(45);
});

test('Twin Hands keeps each hand on one row on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await startTwinHandsScenario(page, 'discard_flow');

  const getCardRowTops = async (ranks: string[]) =>
    Promise.all(
      ranks.map(async (rank) => {
        const card = page.getByText(rank, { exact: true }).first();
        await expect(card).toBeVisible();
        const bounds = await card.boundingBox();
        return Math.round(bounds!.y);
      }),
    );

  expect(new Set(await getCardRowTops(['7', '8', '9', 'J', 'Q', 'K'])).size).toBe(1);
  expect(new Set(await getCardRowTops(['A', '2', '3', '4', '5', '6'])).size).toBe(1);
  const activeCardButton = page.getByRole('button', { name: '7 of clubs' });
  const activeCard = await activeCardButton.boundingBox();
  expect(activeCard!.width).toBeGreaterThan(45);
  const rankFontSize = await activeCardButton
    .getByText('7', { exact: true })
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  const suitFontSize = await activeCardButton
    .getByText('♣', { exact: true })
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(rankFontSize).toBeGreaterThan(16);
  expect(suitFontSize).toBeGreaterThan(14);
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
  const resultTitle = await page.getByText('Hand Results', { exact: true }).boundingBox();
  expect(resultTitle).not.toBeNull();
  expect(resultTitle!.y).toBeLessThan(400);

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
