import { expect, test } from '@playwright/test';

import { advancedGame, seedSave } from './support/game-states';

test.describe('Moduswechsel im fortgeschrittenen Spiel', () => {
  test.beforeEach(async ({ page }) => {
    await seedSave(page, advancedGame(Date.now()).save);
    await page.goto('./');
    await expect(page.getByTestId('shell.zoom.map')).toBeVisible();
  });

  test('Zoom-Leiste, Zurück-Knopf und Browser-Verlauf', async ({ page }) => {
    await page.getByTestId('shell.zoom.map').click();
    await expect(page).toHaveURL(/\/umgebung$/);
    await expect(page.getByTestId('sonar.status.range')).toBeVisible();

    await page.getByTestId('shell.zoom.gen').click();
    await expect(page).toHaveURL(/\/genom$/);
    await expect(page.getByTestId('genome.tree.svg')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/umgebung$/);
    await expect(page.getByTestId('shell.zoom.map')).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('shell.back').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('shell.zoom.scene')).toHaveAttribute('aria-current', 'page');
  });

  test('Tasten W, G und Esc', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Tastenkürzel gibt es nur am Desktop');
    await page.keyboard.press('w');
    await expect(page).toHaveURL(/\/umgebung$/);
    await page.keyboard.press('g');
    await expect(page).toHaveURL(/\/genom$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Schublade öffnet und schließt', async ({ page }) => {
    const tab = page.getByTestId('hud.drawers.pheromones.tab');
    const panel = page.getByTestId('hud.drawers.pheromones.panel');
    await expect(panel).toBeHidden();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('hud.pheromones.total')).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
  });
});
