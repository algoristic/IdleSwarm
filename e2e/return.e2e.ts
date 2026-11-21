import { expect, test } from '@playwright/test';

import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import { advancedGame, seedSave } from './support/game-states';

test('Rückkehr-Zusammenfassung nach einer Stunde Abwesenheit', async ({ page }) => {
  await seedSave(page, advancedGame(Date.now(), MS_PER_HOUR).save);
  await page.goto('./');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('hud.return.duration')).toBeVisible();
  await expect(page.getByTestId('hud.return.food')).toBeVisible();
  await page.getByTestId('hud.return.continue').click();
  await expect(dialog).toBeHidden();
});
