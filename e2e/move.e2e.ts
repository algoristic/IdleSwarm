import { expect, test } from '@playwright/test';

import { advancedGame, seedSave } from './support/game-states';

test('Weiterziehen: Ziel wählen, aufbrechen, Reise im Titel und im Log', async ({ page }) => {
  const game = advancedGame(Date.now());
  await seedSave(page, game.save);
  await page.goto('./umgebung');
  await expect(page.getByTestId('sonar.status.site')).toBeVisible();

  // Auf dem Smartphone liegen Zielliste und Detail im eingeklappten Sheet.
  const sheetToggle = page.getByTestId('sonar.sheet.toggle');
  if (await sheetToggle.isVisible()) {
    await sheetToggle.click();
  }
  await page.getByTestId('sonar.targets.toggle').click();
  await page.getByTestId(`sonar.targets.${game.departTarget}.select`).click();
  const depart = page.getByTestId('sonar.detail.depart');
  await expect(depart).toBeEnabled();
  await depart.click();

  await expect(page.getByTestId('sonar.status.travel')).toBeVisible();
  await expect(page.getByTestId('sonar.status.site')).toHaveCount(0);

  await page.getByTestId('shell.back').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('hud.log.entry').first()).toBeVisible();
  await expect(page.getByTestId('hud.site.travel')).toBeVisible();
});
