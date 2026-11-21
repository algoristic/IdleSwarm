import { expect, test } from '@playwright/test';

test.describe('neues Spiel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('hud.resources.food')).toBeVisible();
  });

  test('zeigt Ressourcen und Startteile, Gesperrtes fehlt', async ({ page }) => {
    await expect(page.getByTestId('hud.units.drones.buy')).toBeVisible();
    await expect(page.getByTestId('hud.units.queens.buy')).toBeVisible();
    await expect(page.getByTestId('shell.zoom.scene')).toBeVisible();

    await expect(page.getByTestId('hud.units.soldiers.buy')).toHaveCount(0);
    await expect(page.getByTestId('shell.zoom.map')).toHaveCount(0);
    await expect(page.getByTestId('shell.zoom.gen')).toHaveCount(0);
    await expect(page.getByTestId('hud.drawers.pheromones.tab')).toHaveCount(0);
    await expect(page.getByTestId('hud.resources.dna')).toHaveCount(0);
  });

  test('Hinweis „collect“ lässt sich wegklicken', async ({ page }) => {
    const hint = page.getByTestId('onboarding.hint.collect');
    await expect(hint).toBeVisible();
    await hint.getByTestId('onboarding.hint.dismiss').click();
    await expect(hint).toHaveCount(0);
    await expect(page.getByTestId('onboarding.hint.card')).toHaveCount(0);
  });

  test('Drohne kaufen erhöht die Anzahl', async ({ page }) => {
    const count = page.getByTestId('hud.units.drones.count');
    await expect(count).toHaveText('0');
    await page.getByTestId('hud.units.drones.buy').click();
    await expect(count).toHaveText('1');
  });

  test('Umgebung ist vor der Freischaltung nicht erreichbar', async ({ page }) => {
    await page.goto('./umgebung');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('hud.units.drones.buy')).toBeVisible();
  });
});
