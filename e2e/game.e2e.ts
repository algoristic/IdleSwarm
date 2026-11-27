import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('zeigt das HUD mit Werten', async ({ page }) => {
  await expect(page.getByTestId('game.hud.food.value')).toHaveText(/\d/);
  await expect(page.getByTestId('game.hud.eggs.value')).toHaveText(/\d/);
  await expect(page.getByTestId('game.hud.harvest.value')).toHaveText(/\d/);
  await expect(page.getByTestId('game.toasts.welcome')).toBeVisible();
});

test('wechselt die Ansichten über die Ansichtswahl', async ({ page }) => {
  const swarm = page.getByTestId('game.views.swarm');
  const map = page.getByTestId('game.views.map');
  const upgrades = page.getByTestId('game.views.upgrades');

  await expect(swarm).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('game.ctx.swarm')).toBeVisible();

  await map.click();
  await expect(page).toHaveURL(/\/umgebung$/);
  await expect(map).toHaveAttribute('aria-current', 'page');
  await expect(swarm).not.toHaveAttribute('aria-current');
  await expect(page.getByTestId('game.ctx.map')).toBeVisible();
  await expect(page.getByTestId('game.ctx.swarm')).toHaveCount(0);

  await upgrades.click();
  await expect(page).toHaveURL(/\/ausbau$/);
  await expect(upgrades).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('game.ctx.upgrades')).toBeVisible();

  await swarm.click();
  await expect(page).not.toHaveURL(/\/(umgebung|ausbau)$/);
  await expect(swarm).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('game.ctx.swarm')).toBeVisible();
});

test('klappt das Blatt über den Griff', async ({ page }) => {
  const grip = page.getByTestId('game.swarm.sheet.grip');

  await expect(grip).toHaveAttribute('aria-expanded', 'true');
  await grip.click();
  await expect(grip).toHaveAttribute('aria-expanded', 'false');
  await grip.click();
  await expect(grip).toHaveAttribute('aria-expanded', 'true');
});

test('öffnet und schließt das Menü', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Menü' });

  await page.getByRole('button', { name: 'Menü' }).click();
  await expect(dialog).toBeVisible();
  await page.getByTestId('game.menu.close').click();
  await expect(dialog).toBeHidden();
});
