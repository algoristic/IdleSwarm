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
  // Der Bot-Stand brütet in der Stunde; die Brutkosten stehen unter der gesammelten Nahrung.
  await expect(page.getByTestId('hud.return.food-spent')).toBeVisible();
  await page.getByTestId('hud.return.continue').click();
  await expect(dialog).toBeHidden();
  // Danach liegt der Fokus auf dem Titel der Szene (Futterstelle), nicht auf `body`.
  const title = page
    .getByRole('region', { name: 'Schwarm' })
    .filter({ has: page.getByTestId('hud.site.type') });
  await expect(title).toBeFocused();
});
