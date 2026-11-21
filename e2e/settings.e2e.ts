import { expect, test } from '@playwright/test';

import { advancedGame, seedSave } from './support/game-states';

/** Nahrung über einer Million, damit das Zahlenformat Kurzform und Exponent unterscheidet. */
const RICH_FOOD = 2_500_000;

test.describe('Einstellungen', () => {
  test.beforeEach(async ({ page }) => {
    await seedSave(page, advancedGame(Date.now(), 0, RICH_FOOD).save);
    await page.goto('./');
    await page.getByTestId('settings.open').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Zahlenformat umschalten wirkt auf die Ressourcen', async ({ page }) => {
    await expect(page.getByTestId('hud.resources.food')).toContainText('Mio.');
    const scientific = page.getByTestId('settings.number-format.scientific');
    // Das Radio ist `sr-only`; geklickt wird wie vom Spieler auf das Label.
    await page.locator('label', { has: scientific }).click();
    await expect(scientific).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    // Die Nahrung liegt über einer Million: kurz „Mio.“, wissenschaftlich mit Exponent.
    await expect(page.getByTestId('hud.resources.food')).not.toContainText('Mio.');
    await expect(page.getByTestId('hud.resources.food')).toContainText(/\d,\d+e\d/);
  });

  test('Export zeigt den Spielstand, kaputter Import meldet einen Fehler', async ({ page }) => {
    await page.getByTestId('settings.export.open').click();
    await expect(page.getByTestId('settings.export.text')).not.toHaveValue('');
    await page.getByTestId('settings.back').click();

    await page.getByTestId('settings.import.open').click();
    await page.getByTestId('settings.import.text').fill('kein Spielstand');
    await page.getByTestId('settings.import.submit').click();
    await page.getByTestId('settings.import.confirm').click();
    await expect(page.getByTestId('settings.import.error')).toBeVisible();
  });
});
